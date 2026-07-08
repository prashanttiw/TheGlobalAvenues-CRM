<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Services\AdminPageAccessService;
use TGA\CRM\Services\EncryptionService;

final class AdminDashboardController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function summary(): void
    {
        AuthMiddleware::requireAuth();
        $payload = AuthMiddleware::user();

        if (($payload['utype'] ?? '') !== 'admin' && ($payload['user_type'] ?? '') !== 'admin') {
            Response::error('Access denied.', 'FORBIDDEN', 403);
        }

        // 1. Core counters
        $totalApplications = (int) $this->pdo->query("SELECT COUNT(*) FROM applications WHERE deleted_at IS NULL")->fetchColumn();
        $pendingAgentApprovals = (int) $this->pdo->query("SELECT COUNT(*) FROM agents WHERE status = 'pending' AND deleted_at IS NULL")->fetchColumn();
        $pendingDocumentReviews = (int) $this->pdo->query("SELECT COUNT(*) FROM document_requests WHERE status = 'submitted'")->fetchColumn();
        $activeStudents = (int) $this->pdo->query("SELECT COUNT(*) FROM students WHERE deleted_at IS NULL")->fetchColumn();
        $activeAgents = (int) $this->pdo->query("SELECT COUNT(*) FROM agents WHERE status = 'approved' AND deleted_at IS NULL")->fetchColumn();
        $activeUniversities = (int) $this->pdo->query("SELECT COUNT(*) FROM universities WHERE deleted_at IS NULL")->fetchColumn();
        $activePrograms = (int) $this->pdo->query("SELECT COUNT(*) FROM courses WHERE deleted_at IS NULL")->fetchColumn();

        // 2. Applications by stage
        $stageStmt = $this->pdo->query("
            SELECT status, COUNT(*) AS total
            FROM applications
            WHERE deleted_at IS NULL
            GROUP BY status
        ");
        $applicationsByStage = $stageStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($applicationsByStage as &$item) {
            $item['total'] = (int)$item['total'];
        }

        // 3. Recent stage movements (limit 5)
        // Fixed: was referencing non-existent u.first_name/u.last_name; student names live in students.full_name
        $recentStageStmt = $this->pdo->query("
            SELECT
                COALESCE(
                    JSON_UNQUOTE(JSON_EXTRACT(al.before_value, '$.status')),
                    JSON_UNQUOTE(JSON_EXTRACT(al.before_value, '$.old_status'))
                ) AS from_status,
                COALESCE(
                    JSON_UNQUOTE(JSON_EXTRACT(al.after_value, '$.status')),
                    JSON_UNQUOTE(JSON_EXTRACT(al.after_value, '$.new_status'))
                ) AS to_status,
                al.created_at,
                app.reference_number,
                s.full_name AS student_name
            FROM activity_logs al
            JOIN applications app ON al.target_id = app.id
            JOIN students s ON app.student_id = s.id
            WHERE al.action = 'application.status_changed' AND al.target_type = 'application' AND app.deleted_at IS NULL
            ORDER BY al.created_at DESC
            LIMIT 5
        ");
        $recentStageMovement = [];
        foreach ($recentStageStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $recentStageMovement[] = [
                'from_status' => $row['from_status'],
                'to_status' => $row['to_status'],
                'created_at' => $row['created_at'],
                'reference_number' => $row['reference_number'],
                'student_name' => $row['student_name'] ?: 'Unknown'
            ];
        }

        // 4. Assignees list — decrypt email; public_id used as key (integer id never leaves backend)
        $assigneesStmt = $this->pdo->query("
            SELECT a.public_id, u.email, r.name as role, u.status
            FROM admins a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN roles r ON a.role_id = r.id
            WHERE u.deleted_at IS NULL
        ");
        $assignees = [];
        foreach ($assigneesStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $assignees[] = [
                'public_id' => $row['public_id'],
                'email' => EncryptionService::decrypt($row['email']) ?: '',
                'role' => $row['role'] ?? 'admin',
                'status' => $row['status']
            ];
        }

        // 5. Dynamic permissions check
        $perms = (array) ($payload['perms'] ?? []);
        $isSuper = !empty($payload['is_super']) || in_array('*', $perms, true);

        $hasPerm = function (string $module, string $action) use ($perms, $isSuper): bool {
            return $isSuper || in_array("{$module}.{$action}", $perms, true);
        };

        $permissions = [
            // Full admin roster access (emails, phone, page grants) — matches the RBAC guard on getUsers().
            'canManageUsers' => $hasPerm('user_management', 'view'),
            // Narrower: lets an admin without user_management access still browse the agents-only
            // slice of the "Users" directory tab (getUsers() leaves role=agent/student ungated).
            'canViewAgentDirectory' => $hasPerm('agents', 'view'),
            'canReviewDocuments' => $hasPerm('documents', 'edit') || $hasPerm('document_requests', 'edit') || $hasPerm('document_requests', 'view'),
            'canManageCatalog' => $hasPerm('universities', 'edit') || $hasPerm('courses', 'edit'),
            'canViewAuditLog' => $hasPerm('audit_logs', 'view') || $hasPerm('logs', 'view') || $isSuper,
            'canApproveAgents' => $hasPerm('agents', 'approve') || $hasPerm('agents', 'edit'),
            'allowedStages' => ['inquiry', 'profile_review', 'applied', 'documents_submitted', 'under_review', 'offer_received', 'conditional_offer', 'unconditional_offer', 'enrolled', 'cas_coe_issued', 'visa_applied', 'visa_approved', 'visa_rejected', 'pre_departure', 'departed', 'deferred', 'withdrawn', 'rejected']
        ];

        $stats = [
            'totalApplications' => $totalApplications,
            'pendingAgentApprovals' => $pendingAgentApprovals,
            'pendingDocumentReviews' => $pendingDocumentReviews,
            'activeStudents' => $activeStudents,
            'activeAgents' => $activeAgents,
            'activeUniversities' => $activeUniversities,
            'activePrograms' => $activePrograms,
            'applicationsByStage' => $applicationsByStage,
            'recentStageMovement' => $recentStageMovement,
            'assignees' => $assignees,
            'permissions' => $permissions,
        ];

        Response::success('Dashboard statistics loaded successfully', ['stats' => $stats]);
    }

    /**
     * Fetch all users list for admin users page
     */
    public function getUsers(): void
    {
        AuthMiddleware::requireAuth();
        $payload = AuthMiddleware::user();

        if (($payload['utype'] ?? '') !== 'admin' && ($payload['user_type'] ?? '') !== 'admin') {
            Response::error('Access denied.', 'FORBIDDEN', 403);
        }

        $role = $_GET['role'] ?? '';
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 20;
        $offset = ($page - 1) * $perPage;

        $status = $_GET['status'] ?? '';
        $search = trim($_GET['q'] ?? '');

        $params = [];

        // Default: admin users only (for /admin/users page).
        // Legacy: role=student or role=agent lets old dashboard query those user types.
        if ($role === 'student' || $role === 'agent') {
            $where = "WHERE u.deleted_at IS NULL AND u.user_type = ?";
            $params[] = $role;
        } else {
            // Everything else (unset/'admin'/'super_admin'/a named role) returns the admin
            // roster — decrypted emails, phone, page-access grants. Gate it: without this,
            // any authenticated admin (even one with zero page grants) could list every
            // other admin's PII directly.
            RBACMiddleware::requirePermission('user_management', 'view');
            $where = "WHERE u.deleted_at IS NULL AND u.user_type = 'admin'";
            if ($role === 'super_admin') {
                $where .= " AND adm.is_super_admin = 1";
            } elseif ($role && $role !== 'admin') {
                // Filter by specific named role (e.g. 'notices_manager')
                $where .= " AND r.name = ? AND adm.is_super_admin = 0";
                $params[] = $role;
            }
        }

        if ($status) {
            $where .= " AND u.status = ?";
            $params[] = $status;
        }

        if ($search) {
            $where .= " AND adm.full_name LIKE ?";
            $params[] = '%' . $search . '%';
        }

        $countStmt = $this->pdo->prepare("
            SELECT COUNT(*) 
            FROM users u 
            LEFT JOIN admins adm ON u.id = adm.user_id
            LEFT JOIN roles r ON adm.role_id = r.id
            {$where}
        ");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $this->pdo->prepare("
            SELECT u.id, u.public_id, u.email, u.phone, u.status, u.created_at, u.last_login_at,
                   adm.full_name, adm.is_super_admin,
                   COALESCE(r.name, CASE WHEN adm.is_super_admin = 1 THEN 'super_admin' ELSE NULL END) AS role,
                   r.public_id AS role_public_id,
                   GROUP_CONCAT(DISTINCT CONCAT(p.module, '.', p.action) SEPARATOR ',') AS perm_keys
            FROM users u
            LEFT JOIN admins adm ON u.id = adm.user_id
            LEFT JOIN roles r ON adm.role_id = r.id
            LEFT JOIN role_permissions rp ON rp.role_id = r.id
            LEFT JOIN permissions p ON p.id = rp.permission_id
            {$where}
            GROUP BY u.id
            ORDER BY adm.is_super_admin DESC, u.created_at DESC
            LIMIT ? OFFSET ?
        ");
        
        $bindIdx = 1;
        foreach ($params as $val) {
            $stmt->bindValue($bindIdx++, $val);
        }
        $stmt->bindValue($bindIdx++, $perPage, PDO::PARAM_INT);
        $stmt->bindValue($bindIdx++, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $decryptMaybe = static function (mixed $val): ?string {
            if (!is_string($val) || $val === '') {
                return null;
            }
            try {
                return EncryptionService::decrypt($val);
            } catch (\Throwable $e) {
                return null;
            }
        };

        $users = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $email = $decryptMaybe($row['email']);
            $phone = $decryptMaybe($row['phone'] ?? null);

            $fullName = (string)($row['full_name'] ?? '');
            $nameParts = preg_split('/\s+/', trim($fullName), 2) ?: [];
            $firstName = $nameParts[0] ?? '';
            $lastName = $nameParts[1] ?? '';
            $isSuperAdmin = (int)($row['is_super_admin'] ?? 0) === 1;

            // Resolve pageKey => 'read'|'write' from the aggregated permission string
            $pages = [];
            if (!$isSuperAdmin && !empty($row['perm_keys'])) {
                $pages = AdminPageAccessService::resolveAccessLevels(explode(',', $row['perm_keys']));
            }

            $users[] = [
                'public_id'       => $row['public_id'],
                'email'           => $email ?: '',
                'phone'           => $phone,
                'role'            => $row['role'] ?? ($isSuperAdmin ? 'super_admin' : 'admin'),
                'role_public_id'  => $row['role_public_id'] ?? null,
                'status'          => $row['status'],
                'is_super_admin'  => $isSuperAdmin,
                'created_at'      => $row['created_at'],
                'last_login_at'   => $row['last_login_at'] ?? null,
                'firstName'       => $firstName ?: 'Portal',
                'lastName'        => $lastName ?: 'User',
                'pages'           => $pages,
            ];
        }

        Response::json([
            'users' => $users,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => (int)ceil($total / $perPage),
                'has_next' => ($page * $perPage) < $total
            ]
        ]);
    }

    /**
     * Get specific user detail with decrypted profile PII
     */
    public function getUserDetail(): void
    {
        AuthMiddleware::requireAuth();
        $payload = AuthMiddleware::user();

        if (($payload['utype'] ?? '') !== 'admin' && ($payload['user_type'] ?? '') !== 'admin') {
            Response::error('Access denied.', 'FORBIDDEN', 403);
        }

        $publicId = trim($_GET['public_id'] ?? '');
        if (!$publicId) {
            Response::error('User public_id is required', 'BAD_REQUEST', 400);
        }

        $stmt = $this->pdo->prepare("
            SELECT u.id, u.public_id, u.email, u.phone, u.status, u.created_at, u.user_type, u.last_login_at,
                   CASE
                       WHEN u.user_type = 'admin' THEN COALESCE(r.name, CASE WHEN adm.is_super_admin = 1 THEN 'super_admin' ELSE 'admin' END)
                       ELSE u.user_type
                   END AS role
            FROM users u
            LEFT JOIN admins adm ON u.id = adm.user_id
            LEFT JOIN roles r ON adm.role_id = r.id
            WHERE u.public_id = ? AND u.deleted_at IS NULL
        ");
        $stmt->execute([$publicId]);
        $userRow = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$userRow) {
            Response::error('User not found', 'NOT_FOUND', 404);
        }

        $userId = (int)$userRow['id']; // internal integer — used for profile sub-queries only

        $decryptMaybe = static function (mixed $val): ?string {
            if (!is_string($val) || $val === '') {
                return null;
            }
            try {
                return EncryptionService::decrypt($val);
            } catch (\Throwable $e) {
                return null;
            }
        };

        $profRow = null;
        if ($userRow['user_type'] === 'student') {
            $profStmt = $this->pdo->prepare("
                SELECT s.id, s.public_id, s.full_name, s.date_of_birth, s.nationality,
                       s.passport_number, s.passport_expiry, s.phone_in_profile, s.lead_source, s.profile_status,
                       ag.agency_name AS agent_name
                FROM students s
                LEFT JOIN agents ag ON s.agent_id = ag.id AND ag.deleted_at IS NULL
                WHERE s.user_id = ? AND s.deleted_at IS NULL
            ");
            $profStmt->execute([$userId]);
            $profRow = $profStmt->fetch(PDO::FETCH_ASSOC);
            if ($profRow) {
                $profRow['passport_number'] = $decryptMaybe($profRow['passport_number'] ?? null);
                $profRow['phone_in_profile'] = $decryptMaybe($profRow['phone_in_profile'] ?? null);
            }
        } elseif ($userRow['user_type'] === 'agent') {
            $profStmt = $this->pdo->prepare("
                SELECT a.id, a.public_id, a.full_name, a.agency_name, a.country, a.business_reg_number,
                       a.partnership_scope, a.referral_code, a.status, a.tier,
                       pa.agency_name AS parent_agent_name
                FROM agents a
                LEFT JOIN agents pa ON a.parent_agent_id = pa.id AND pa.deleted_at IS NULL
                WHERE a.user_id = ? AND a.deleted_at IS NULL
            ");
            $profStmt->execute([$userId]);
            $profRow = $profStmt->fetch(PDO::FETCH_ASSOC);
        } elseif ($userRow['user_type'] === 'admin') {
            $profStmt = $this->pdo->prepare("
                SELECT adm.id, adm.public_id, adm.full_name, adm.is_super_admin
                FROM admins adm
                WHERE adm.user_id = ?
            ");
            $profStmt->execute([$userId]);
            $profRow = $profStmt->fetch(PDO::FETCH_ASSOC);
        }

        Response::json([
            'user' => [
                'public_id' => $userRow['public_id'],
                'email' => $decryptMaybe($userRow['email']),
                'phone' => $decryptMaybe($userRow['phone'] ?? null),
                'role' => $userRow['role'],
                'status' => $userRow['status'],
                'createdAt' => $userRow['created_at'],
                'emailVerified' => true,
                'lastLogin' => $userRow['last_login_at'],
                'profile' => $profRow ?: null
            ]
        ]);
    }

    /**
     * Update user status or role (admin-only)
     */
    public function updateUser(): void
    {
        AuthMiddleware::requireAuth();
        $payload = AuthMiddleware::user();

        if (($payload['utype'] ?? '') !== 'admin' && ($payload['user_type'] ?? '') !== 'admin') {
            Response::error('Access denied.', 'FORBIDDEN', 403);
        }
        RBACMiddleware::requirePermission('user_management', 'edit');

        $input = json_decode(file_get_contents('php://input'), true);
        $publicId = trim($input['public_id'] ?? '');
        if (!$publicId) {
            Response::error('User public_id is required', 'BAD_REQUEST', 400);
        }

        $stmt = $this->pdo->prepare("SELECT id, public_id, user_type, status FROM users WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$publicId]);
        $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$userRow) {
            Response::error('User not found', 'NOT_FOUND', 404);
        }
        $userId = (int)$userRow['id']; // internal integer — used for UPDATE statements only

        $before = ['status' => $userRow['status']];
        $after = [];

        if (isset($input['status'])) {
            $upStmt = $this->pdo->prepare("UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?");
            $upStmt->execute([$input['status'], $userId]);
            $after['status'] = $input['status'];
            
            if ($userRow['user_type'] === 'agent') {
                $upAgent = $this->pdo->prepare("UPDATE agents SET status = ?, updated_at = NOW() WHERE user_id = ?");
                $upAgent->execute([$input['status'], $userId]);
            }
        }

        // Page-based access update (primary path for regular admins)
        if (isset($input['pages']) && is_array($input['pages']) && $userRow['user_type'] === 'admin') {
            if ($userId === (int)($payload['sub'] ?? 0)) {
                Response::error('You cannot change your own access level.', 'SELF_ROLE_CHANGE', 400);
            }

            $curAdmStmt = $this->pdo->prepare("SELECT is_super_admin FROM admins WHERE user_id = ? LIMIT 1");
            $curAdmStmt->execute([$userId]);
            $curAdm = $curAdmStmt->fetch(PDO::FETCH_ASSOC);
            if ($curAdm && (int)$curAdm['is_super_admin'] === 1) {
                Response::error('Super admin access is permanent and cannot be changed.', 'SUPER_ADMIN_PROTECTED', 403);
            }

            $pages = AdminPageAccessService::sanitizePageAccess($input['pages']);
            AdminPageAccessService::apply($this->pdo, $userId, (string)$userRow['public_id'], $pages);
            $after['pages'] = $pages;
        }

        // Role string update — kept for super_admin promotion (legacy support)
        if (isset($input['role']) && $userRow['user_type'] === 'admin') {
            $roleName = $input['role'];

            // You cannot change your own access level
            if ($userId === (int)($payload['sub'] ?? 0)) {
                Response::error('You cannot change your own access level.', 'SELF_ROLE_CHANGE', 400);
            }

            // Super admin access is permanent — cannot be removed through the UI
            $curAdmStmt = $this->pdo->prepare("SELECT is_super_admin FROM admins WHERE user_id = ? LIMIT 1");
            $curAdmStmt->execute([$userId]);
            $curAdm = $curAdmStmt->fetch(PDO::FETCH_ASSOC);
            if ($curAdm && (int)$curAdm['is_super_admin'] === 1 && $roleName !== 'super_admin') {
                Response::error('Super admin access is permanent and cannot be removed.', 'SUPER_ADMIN_PROTECTED', 403);
            }

            if ($roleName === 'super_admin') {
                $upAdm = $this->pdo->prepare("UPDATE admins SET is_super_admin = 1, role_id = NULL, updated_at = NOW() WHERE user_id = ?");
                $upAdm->execute([$userId]);
            } else {
                $rStmt = $this->pdo->prepare("SELECT id FROM roles WHERE name = ?");
                $rStmt->execute([$roleName]);
                $roleId = $rStmt->fetchColumn();

                $upAdm = $this->pdo->prepare("UPDATE admins SET is_super_admin = 0, role_id = ?, updated_at = NOW() WHERE user_id = ?");
                $upAdm->execute([$roleId ?: null, $userId]);
            }
            $after['role'] = $roleName;
        }

        // Log to activity logs
        \TGA\CRM\Services\ActivityLogger::log(
            'user.updated',
            'user',
            $userId,
            (int)$payload['id'],
            $before,
            $after
        );

        // Fetch and return the updated user detail
        $_GET['public_id'] = $publicId;
        $this->getUserDetail();
    }

    /**
     * Soft-delete an admin account (super_admin only, cannot self-delete)
     */
    public function deleteAdmin(string $publicId): void
    {
        AuthMiddleware::requireAuth();
        $payload = AuthMiddleware::user();

        if (($payload['utype'] ?? '') !== 'admin' && ($payload['user_type'] ?? '') !== 'admin') {
            Response::error('Access denied.', 'FORBIDDEN', 403);
        }

        $callerStmt = $this->pdo->prepare(
            "SELECT id, is_super_admin FROM admins WHERE user_id = ? LIMIT 1"
        );
        $callerStmt->execute([(int)$payload['sub']]);
        $caller = $callerStmt->fetch(PDO::FETCH_ASSOC);
        if (!$caller || (int)$caller['is_super_admin'] !== 1) {
            Response::error('Only super admins can delete admin accounts.', 'FORBIDDEN', 403);
        }

        $targetStmt = $this->pdo->prepare(
            "SELECT u.id, u.public_id, a.is_super_admin FROM users u
             JOIN admins a ON a.user_id = u.id
             WHERE u.public_id = ? AND u.user_type = 'admin' AND u.deleted_at IS NULL LIMIT 1"
        );
        $targetStmt->execute([$publicId]);
        $target = $targetStmt->fetch(PDO::FETCH_ASSOC);

        if (!$target) {
            Response::error('Admin account not found.', 'NOT_FOUND', 404);
        }

        // Super admin accounts are protected — cannot be deleted through the UI
        if ((int)($target['is_super_admin'] ?? 0) === 1) {
            Response::error('Super admin accounts cannot be deleted. Demote to a regular admin role first (via database) before removing.', 'SUPER_ADMIN_PROTECTED', 403);
        }

        $callerIntId   = (int)($payload['sub'] ?? 0);
        $callerPublicId = (string)($payload['pid'] ?? '');
        $isSelf = ((int)$target['id'] === $callerIntId && $callerIntId > 0)
               || ($callerPublicId !== '' && $target['public_id'] === $callerPublicId);
        if ($isSelf) {
            Response::error('You cannot delete your own account.', 'SELF_DELETE', 400);
        }

        $this->pdo->prepare(
            "UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?"
        )->execute([(int)$target['id']]);

        \TGA\CRM\Services\ActivityLogger::log(
            'admin.deleted',
            'user',
            (int)$target['id'],
            (int)$payload['sub'],
            ['status' => 'active'],
            ['deleted' => true]
        );

        Response::json(['success' => true, 'message' => 'Admin account deleted.']);
    }

    /**
     * Returns the static catalogue of available admin pages and their descriptions.
     * Used by the frontend to render the page-access checkbox grid.
     */
    public function availablePages(): void
    {
        AuthMiddleware::requireAuth();
        $payload = AuthMiddleware::user();

        if (($payload['utype'] ?? '') !== 'admin' && ($payload['user_type'] ?? '') !== 'admin') {
            Response::error('Access denied.', 'FORBIDDEN', 403);
        }

        Response::json(['pages' => AdminPageAccessService::availablePages()]);
    }
}
