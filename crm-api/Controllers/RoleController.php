<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use Exception;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Services\ActivityLogger;

final class RoleController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    // ─── List Roles ─────────────────────────────────────────────────────────────
    public function list(): void
    {
        RBACMiddleware::requirePermission('user_management', 'view');

        $stmt = $this->pdo->query(
            'SELECT r.id, r.public_id, r.name, r.description, r.created_at,
                    COUNT(a.id) AS admin_count
             FROM roles r
             LEFT JOIN admins a ON a.role_id = r.id AND a.deleted_at IS NULL
             GROUP BY r.id
             ORDER BY r.name ASC'
        );
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(['roles' => $roles]);
    }

    // ─── Create Role ─────────────────────────────────────────────────────────────
    public function create(): void
    {
        $user = AuthMiddleware::user();
        $this->assertSuperAdmin((int) $user['sub']);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($input['name'] ?? '');
        $description = trim($input['description'] ?? '');
        $permissions = is_array($input['permissions'] ?? null) ? $input['permissions'] : [];

        if (!$name) {
            Response::error('Role name is required', 'VALIDATION_ERROR', 400);
        }

        // Check uniqueness
        $checkStmt = $this->pdo->prepare('SELECT COUNT(*) FROM roles WHERE name = ?');
        $checkStmt->execute([$name]);
        if ((int) $checkStmt->fetchColumn() > 0) {
            Response::error('A role with this name already exists', 'DUPLICATE_ROLE', 409);
        }

        try {
            $this->pdo->beginTransaction();

            $publicId = UlidGenerator::generate();
            $roleStmt = $this->pdo->prepare(
                'INSERT INTO roles (public_id, name, description) VALUES (?, ?, ?)'
            );
            $roleStmt->execute([$publicId, $name, $description ?: null]);
            $roleId = (int) $this->pdo->lastInsertId();

            $this->insertPermissions($roleId, $permissions);

            $this->pdo->commit();

            ActivityLogger::log('role.created', 'role', $roleId, (int) $user['sub'], [], ['name' => $name, 'permissions' => $permissions]);

            Response::json([
                'success' => true,
                'message' => 'Role created successfully',
                'role' => ['public_id' => $publicId, 'name' => $name]
            ], 201);

        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    // ─── Update Role ─────────────────────────────────────────────────────────────
    public function update(string $publicId): void
    {
        $user = AuthMiddleware::user();
        $this->assertSuperAdmin((int) $user['sub']);

        $roleStmt = $this->pdo->prepare('SELECT id, name FROM roles WHERE public_id = ? LIMIT 1');
        $roleStmt->execute([$publicId]);
        $role = $roleStmt->fetch(PDO::FETCH_ASSOC);

        if (!$role) {
            Response::error('Role not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($input['name'] ?? $role['name']);
        $description = $input['description'] ?? null;
        $permissions = is_array($input['permissions'] ?? null) ? $input['permissions'] : null;

        try {
            $this->pdo->beginTransaction();

            $before = ['name' => $role['name'], 'permissions' => $this->loadPermissionsForRole((int) $role['id'])];

            $this->pdo->prepare('UPDATE roles SET name = ?, description = ? WHERE id = ?')
                ->execute([$name, $description, (int) $role['id']]);

            if ($permissions !== null) {
                $this->pdo->prepare('DELETE FROM role_permissions WHERE role_id = ?')->execute([(int) $role['id']]);
                $this->insertPermissions((int) $role['id'], $permissions);
            }

            $this->pdo->commit();

            $after = ['name' => $name, 'permissions' => $permissions ?? $before['permissions']];
            ActivityLogger::log('role.updated', 'role', (int) $role['id'], (int) $user['sub'], $before, $after);

            Response::json(['success' => true, 'message' => 'Role updated successfully']);

        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    // ─── Delete Role ─────────────────────────────────────────────────────────────
    public function delete(string $publicId): void
    {
        $user = AuthMiddleware::user();
        $this->assertSuperAdmin((int) $user['sub']);

        $roleStmt = $this->pdo->prepare('SELECT id, name FROM roles WHERE public_id = ? LIMIT 1');
        $roleStmt->execute([$publicId]);
        $role = $roleStmt->fetch(PDO::FETCH_ASSOC);

        if (!$role) {
            Response::error('Role not found', 'NOT_FOUND', 404);
        }

        // Guard: Cannot delete a role that has admins assigned
        $countStmt = $this->pdo->prepare('SELECT COUNT(*) FROM admins WHERE role_id = ? AND deleted_at IS NULL');
        $countStmt->execute([(int) $role['id']]);
        $count = (int) $countStmt->fetchColumn();

        if ($count > 0) {
            Response::error(
                "Cannot delete role — {$count} admin(s) are still assigned to it.",
                'ROLE_IN_USE',
                409
            );
        }

        $this->pdo->prepare('DELETE FROM roles WHERE id = ?')->execute([(int) $role['id']]);

        ActivityLogger::log('role.deleted', 'role', (int) $role['id'], (int) $user['sub'], ['name' => $role['name']], []);

        Response::json(['success' => true, 'message' => 'Role deleted successfully']);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────
    private function assertSuperAdmin(int $userId): void
    {
        $stmt = $this->pdo->prepare('SELECT is_super_admin FROM admins WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$admin || (int) $admin['is_super_admin'] !== 1) {
            Response::error('Only super admins can manage roles', 'FORBIDDEN', 403);
        }
    }

    private function insertPermissions(int $roleId, array $permissions): void
    {
        if (empty($permissions)) {
            return;
        }

        // Resolve permission IDs from module.action strings
        $stmt = $this->pdo->prepare('SELECT id, module, action FROM permissions');
        $stmt->execute();
        $allPerms = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $permMap = [];
        foreach ($allPerms as $p) {
            $permMap[$p['module'] . '.' . $p['action']] = (int) $p['id'];
        }

        $insertStmt = $this->pdo->prepare(
            'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
        );

        foreach ($permissions as $permKey) {
            if (isset($permMap[$permKey])) {
                $insertStmt->execute([$roleId, $permMap[$permKey]]);
            }
        }
    }

    private function loadPermissionsForRole(int $roleId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT CONCAT(p.module, \'.\', p.action) AS perm_key
             FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = ?'
        );
        $stmt->execute([$roleId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
}
