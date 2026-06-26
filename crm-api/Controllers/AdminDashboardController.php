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
        $pendingAgentsStmt = $this->pdo->query("
            SELECT a.id, a.agency_name, a.agency_country, a.registration_number, u.email, a.created_at
            FROM agents a
            JOIN users u ON a.user_id = u.id
            WHERE a.status = 'pending' AND a.deleted_at IS NULL AND u.deleted_at IS NULL
            ORDER BY a.created_at DESC
            LIMIT 6
        ");
        $pendingAgentsPreview = [];
        foreach ($pendingAgentsStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $pendingAgentsPreview[] = [
                'id' => (int)$row['id'],
                'agency_name' => $row['agency_name'],
                'agency_country' => $row['agency_country'],
                'registration_number' => $row['registration_number'],
                'email' => $row['email'],
                'created_at' => $row['created_at']
            ];
        }

        // 4. Pending Documents Preview (limit 6)
        $pendingDocsStmt = $this->pdo->query("
            SELECT dr.id, dr.document_type, dr.status, dr.created_at, app.reference_number, u.first_name, u.last_name
            FROM document_requests dr
            JOIN applications app ON dr.application_id = app.id
            JOIN students s ON app.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE dr.status = 'submitted'
            ORDER BY dr.created_at DESC
            LIMIT 6
        ");
        $pendingDocumentsPreview = [];
        foreach ($pendingDocsStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $studentName = trim((string)EncryptionService::decrypt($row['first_name']) . ' ' . (string)EncryptionService::decrypt($row['last_name']));
            $pendingDocumentsPreview[] = [
                'id' => (int)$row['id'],
                'document_type' => $row['document_type'],
                'status' => $row['status'],
                'created_at' => $row['created_at'],
                'reference_number' => $row['reference_number'],
                'student_name' => $studentName ?: 'Unknown'
            ];
        }

        // 5. Recent stage movements (limit 5)
        $recentStageStmt = $this->pdo->query("
            SELECT 
                al.id, 
                al.target_id AS application_id, 
                JSON_UNQUOTE(JSON_EXTRACT(al.before_value, '$.status')) AS from_status,
                JSON_UNQUOTE(JSON_EXTRACT(al.after_value, '$.status')) AS to_status,
                al.created_at,
                app.reference_number,
                u.first_name AS student_first,
                u.last_name AS student_last
            FROM activity_logs al
            JOIN applications app ON al.target_id = app.id
            JOIN students s ON app.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE al.action = 'application.status_changed' AND al.target_type = 'application' AND app.deleted_at IS NULL
            ORDER BY al.created_at DESC
            LIMIT 5
        ");
        $recentStageMovement = [];
        foreach ($recentStageStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $studentName = trim((string)EncryptionService::decrypt($row['student_first']) . ' ' . (string)EncryptionService::decrypt($row['student_last']));
            $recentStageMovement[] = [
                'id' => (int)$row['id'],
                'application_id' => (int)$row['application_id'],
                'from_status' => $row['from_status'],
                'to_status' => $row['to_status'],
                'created_at' => $row['created_at'],
                'reference_number' => $row['reference_number'],
                'student_name' => $studentName ?: 'Unknown'
            ];
        }

        // 6. Assignees list
        $assigneesStmt = $this->pdo->query("
            SELECT a.id, u.email, r.name as role, u.status
            FROM admins a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN roles r ON a.role_id = r.id
            WHERE a.deleted_at IS NULL AND u.deleted_at IS NULL
        ");
        $assignees = [];
        foreach ($assigneesStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $assignees[] = [
                'id' => (int)$row['id'],
                'email' => $row['email'],
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
            'cron_health' => $cronHealth
        ];

        Response::success('Dashboard statistics loaded successfully', ['stats' => $stats]);
    }
}
