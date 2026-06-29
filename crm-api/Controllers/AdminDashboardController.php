<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
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

        // 3. Pending Agents Preview (limit 6)
        // Columns fixed: a.country (not agency_country), a.business_reg_number (not registration_number)
        $pendingAgentsStmt = $this->pdo->query("
            SELECT a.public_id, a.agency_name, a.country, a.business_reg_number, u.email, a.created_at
            FROM agents a
            JOIN users u ON a.user_id = u.id
            WHERE a.status = 'pending' AND a.deleted_at IS NULL AND u.deleted_at IS NULL
            ORDER BY a.created_at DESC
            LIMIT 6
        ");
        $pendingAgentsPreview = [];
        foreach ($pendingAgentsStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $pendingAgentsPreview[] = [
                'public_id' => $row['public_id'],
                'agency_name' => $row['agency_name'],
                'agency_country' => $row['country'],
                'registration_number' => $row['business_reg_number'],
                'email' => EncryptionService::decrypt($row['email']) ?: '',
                'created_at' => $row['created_at']
            ];
        }

        // 4. Pending Documents Preview (limit 6)
        // Fixed: was referencing non-existent u.first_name/u.last_name; student names live in students.full_name
        $pendingDocsStmt = $this->pdo->query("
            SELECT dr.public_id, dr.document_type, dr.status, dr.created_at, app.reference_number, s.full_name AS student_name
            FROM document_requests dr
            JOIN applications app ON dr.application_id = app.id
            JOIN students s ON app.student_id = s.id
            WHERE dr.status = 'submitted'
            ORDER BY dr.created_at DESC
            LIMIT 6
        ");
        $pendingDocumentsPreview = [];
        foreach ($pendingDocsStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $pendingDocumentsPreview[] = [
                'public_id' => $row['public_id'],
                'document_type' => $row['document_type'],
                'status' => $row['status'],
                'created_at' => $row['created_at'],
                'reference_number' => $row['reference_number'],
                'student_name' => $row['student_name'] ?: 'Unknown'
            ];
        }

        // 5. Recent stage movements (limit 5)
        // Fixed: was referencing non-existent u.first_name/u.last_name; student names live in students.full_name
        $recentStageStmt = $this->pdo->query("
            SELECT
                JSON_UNQUOTE(JSON_EXTRACT(al.before_value, '$.status')) AS from_status,
                JSON_UNQUOTE(JSON_EXTRACT(al.after_value, '$.status')) AS to_status,
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

        // 6. Assignees list — decrypt email; public_id used as key (integer id never leaves backend)
        $assigneesStmt = $this->pdo->query("
            SELECT a.public_id, u.email, r.name as role, u.status
            FROM admins a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN roles r ON a.role_id = r.id
            WHERE a.deleted_at IS NULL AND u.deleted_at IS NULL
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

        // 7. Dynamic permissions check
        $perms = (array) ($payload['perms'] ?? []);
        $isSuper = !empty($payload['is_super']) || in_array('*', $perms, true);

        $hasPerm = function (string $module, string $action) use ($perms, $isSuper): bool {
            return $isSuper || in_array("{$module}.{$action}", $perms, true);
        };

        $permissions = [
            'canManageUsers' => $hasPerm('users', 'view') || $hasPerm('users', 'edit') || $hasPerm('agents', 'view'),
            'canReviewDocuments' => $hasPerm('documents', 'edit') || $hasPerm('document_requests', 'edit') || $hasPerm('document_requests', 'view'),
            'canManageCatalog' => $hasPerm('universities', 'edit') || $hasPerm('courses', 'edit'),
            'canViewAuditLog' => $hasPerm('audit_logs', 'view') || $hasPerm('logs', 'view') || $isSuper,
            'canApproveAgents' => $hasPerm('agents', 'approve') || $hasPerm('agents', 'edit'),
            'allowedStages' => ['inquiry', 'profile_review', 'applied', 'documents_submitted', 'under_review', 'offer_received', 'conditional_offer', 'unconditional_offer', 'enrolled', 'cas_coe_issued', 'visa_applied', 'visa_approved', 'visa_rejected', 'pre_departure', 'departed', 'deferred', 'withdrawn', 'rejected']
        ];

        // 8. Cron health
        $cronHealth = $this->pdo->query("
            SELECT job_name, last_run_status, last_run_at, last_run_duration_ms, last_error
            FROM cron_health
            ORDER BY job_name
        ")->fetchAll(PDO::FETCH_ASSOC);

        // 9. File Sync Health
        $syncThresholdMinutes = 30;
        $fileSyncQuery = $this->pdo->query("
            SELECT
                SUM(CASE WHEN drive_sync_status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
                SUM(CASE WHEN drive_sync_status = 'pending'
                         AND created_at < DATE_SUB(NOW(), INTERVAL $syncThresholdMinutes MINUTE)
                    THEN 1 ELSE 0 END) AS stuck_pending_count,
                SUM(CASE WHEN drive_sync_status = 'pending' THEN 1 ELSE 0 END) AS total_pending_count
            FROM files
            WHERE deleted_at IS NULL AND drive_sync_status IN ('pending', 'failed')
        ")->fetch(PDO::FETCH_ASSOC);

        $fileSyncHealth = [
            'failed_count' => (int)($fileSyncQuery['failed_count'] ?? 0),
            'stuck_pending_count' => (int)($fileSyncQuery['stuck_pending_count'] ?? 0),
            'total_pending_count' => (int)($fileSyncQuery['total_pending_count'] ?? 0)
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
            'pendingAgentsPreview' => $pendingAgentsPreview,
            'pendingDocumentsPreview' => $pendingDocumentsPreview,
            'recentStageMovement' => $recentStageMovement,
            'assignees' => $assignees,
            'permissions' => $permissions,
            'cron_health' => $cronHealth,
            'file_sync_health' => $fileSyncHealth
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

        $params = [];
        $where = "WHERE u.deleted_at IS NULL";
        
        if ($role) {
            if ($role === 'student' || $role === 'agent') {
                $where .= " AND u.user_type = ?";
                $params[] = $role;
            } else {
                $where .= " AND u.user_type = 'admin'";
                if ($role === 'super_admin') {
                    $where .= " AND adm.is_super_admin = 1";
                } else {
                    $where .= " AND r.name = ? AND adm.is_super_admin = 0";
                    $params[] = $role;
                }
            }
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
            SELECT u.id, u.public_id, u.email, u.phone, u.status, u.created_at, u.user_type,
                   COALESCE(s.full_name, a.full_name, adm.full_name) AS full_name,
                   CASE 
                       WHEN u.user_type = 'admin' THEN COALESCE(r.name, CASE WHEN adm.is_super_admin = 1 THEN 'super_admin' ELSE 'admin' END)
                       ELSE u.user_type
                   END AS role
            FROM users u
            LEFT JOIN students s ON u.id = s.user_id AND s.deleted_at IS NULL
            LEFT JOIN agents a ON u.id = a.user_id AND a.deleted_at IS NULL
            LEFT JOIN admins adm ON u.id = adm.user_id
            LEFT JOIN roles r ON adm.role_id = r.id
            {$where}
            ORDER BY u.created_at DESC
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
                return $val;
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
            
            $users[] = [
                'public_id' => $row['public_id'],
                'email' => $email ?: '',
                'phone' => $phone,
                'role' => $row['role'],
                'status' => $row['status'],
                'created_at' => $row['created_at'],
                'firstName' => $firstName ?: 'Portal',
                'lastName' => $lastName ?: 'User'
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
                return $val;
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

        if (isset($input['role']) && $userRow['user_type'] === 'admin') {
            $roleName = $input['role'];
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
}
