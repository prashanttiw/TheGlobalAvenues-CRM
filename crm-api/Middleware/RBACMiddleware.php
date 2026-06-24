<?php

declare(strict_types=1);

namespace TGA\CRM\Middleware;

use PDO;
use TGA\CRM\Helpers\Response;

final class RBACMiddleware {

    public static function requirePermission(string $module, string $action): void
    {
        $user = AuthMiddleware::user();
        self::enforce($user, $module, $action);
    }

    /**
     * Enforce a module+action permission for admin users.
     * Super-admins bypass all checks.
     * Non-admin user types (student, agent) are never checked here —
     * use RoleMiddleware::enforce() for portal-gate checks first.
     */
    public static function enforce(
        array  $user,          // JWT payload (must include 'sub', 'utype', 'perms' or 'is_super')
        string $module,        // e.g. 'agents'
        string $action         // e.g. 'approve'
    ): void {
        $perms = (array) ($user['perms'] ?? []);

        // Super admin bypass
        if (!empty($user['is_super']) || in_array('*', $perms, true)) {
            return;
        }
        // Only admin users have module-level RBAC
        if (($user['utype'] ?? '') !== 'admin' && ($user['user_type'] ?? '') !== 'admin') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }
        $permKey = $module . '.' . $action;
        if (!in_array($permKey, $perms, true)) {
            Response::error(
                "You do not have '{$action}' permission on '{$module}'.",
                'PERMISSION_DENIED',
                403
            );
        }
    }

    /**
     * Build the permissions array at login time (stored in JWT payload).
     * Called once during AuthController::login() for admin users.
     */
    public static function loadPermissionsForAdmin(int $adminId, PDO $pdo): array {
        // Check is_super_admin first
        $adminRow = $pdo->prepare(
            'SELECT a.is_super_admin, a.role_id FROM admins a WHERE a.user_id = ? LIMIT 1'
        );
        $adminRow->execute([$adminId]);
        $admin = $adminRow->fetch(PDO::FETCH_ASSOC);
        
        if (!$admin) return [];
        if ((int)$admin['is_super_admin'] === 1) {
            // Return a sentinel — RBACMiddleware checks is_super in JWT
            return ['*'];
        }
        if ($admin['role_id'] === null) return [];
        
        // Fetch permissions for this role
        $stmt = $pdo->prepare(
            'SELECT p.module, p.action
             FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = ?'
        );
        $stmt->execute([(int)$admin['role_id']]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return array_map(fn($r) => $r['module'] . '.' . $r['action'], $rows);
    }

    /**
     * Assert that $targetAgentId is within $requestingAgentId's subtree.
     * Uses root_agent_id for O(1) performance instead of a recursive CTE.
     */
    public static function assertAgentSubtreeAccess(
        int $requestingAgentId,
        int $targetAgentId,
        PDO $pdo
    ): void {
        // Fetch the requesting agent's root
        $req = $pdo->prepare(
            'SELECT root_agent_id, tier FROM agents WHERE id = ? AND deleted_at IS NULL LIMIT 1'
        );
        $req->execute([$requestingAgentId]);
        $reqAgent = $req->fetch(PDO::FETCH_ASSOC);
        
        if (!$reqAgent) {
            Response::error('Agent not found', 'NOT_FOUND', 404);
        }
        
        // A tier-1 agent can access all agents sharing their root (which is themselves)
        $targetCheck = $pdo->prepare(
            'SELECT id FROM agents WHERE id = ? AND root_agent_id = ? AND deleted_at IS NULL LIMIT 1'
        );
        $targetCheck->execute([$targetAgentId, $reqAgent['root_agent_id']]);
        
        if (!$targetCheck->fetch()) {
            Response::error('Access denied — student not in your network', 'FORBIDDEN', 403);
        }
    }
}
