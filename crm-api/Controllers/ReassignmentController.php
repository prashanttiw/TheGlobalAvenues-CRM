<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Paginator;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Models\ReassignmentModel;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\EncryptionService;
use TGA\CRM\Services\NotificationService;

final class ReassignmentController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    private function decryptMaybe(mixed $value): ?string
    {
        if (!is_string($value) || $value === '') {
            return null;
        }

        try {
            return EncryptionService::decrypt($value);
        } catch (\Throwable) {
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STUDENT: Submit reassignment request  POST /student/agent/reassignment-request
    // ─────────────────────────────────────────────────────────────────────────

    public function studentRequest(): void
    {
        AuthMiddleware::requireAuth();
        $user  = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $reason             = trim($input['reason']               ?? '');
        $requestedAgentCode = trim($input['requested_agent_code'] ?? '');

        if (strlen($reason) < 10) {
            Response::error('Please provide a reason of at least 10 characters.', 'VALIDATION_ERROR', 422);
        }

        try {
            $this->pdo->beginTransaction();

            // Resolve student record using LEFT JOIN for self-registered students (no agent)
            // LOCK ROW to prevent concurrent duplicate request insertion
            $stmt = $this->pdo->prepare(
                "SELECT s.id, s.agent_lock_status, s.agent_id,
                        a.referral_code AS agent_referral_code, a.full_name AS agent_name,
                        a.user_id AS agent_user_id
                 FROM students s
                 LEFT JOIN agents a ON a.id = s.agent_id
                 WHERE s.user_id = ? AND s.deleted_at IS NULL
                 FOR UPDATE"
            );
            $stmt->execute([$user['id']]);
            $student = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$student) {
                $this->pdo->rollBack();
                Response::error('Student profile not found.', 'NOT_FOUND', 404);
            }

            // Guard: agent lock (enrolled students cannot reassign)
            if ($student['agent_lock_status'] === 'locked') {
                $this->pdo->rollBack();
                Response::error(
                    'Agent reassignment is not available after university admission.',
                    'REASSIGNMENT_LOCKED', 403
                );
            }

            // Guard: no duplicate pending request
            if (ReassignmentModel::findPendingByStudentId((int)$student['id'], $this->pdo)) {
                $this->pdo->rollBack();
                Response::error(
                    'You already have a pending reassignment request.',
                    'REQUEST_ALREADY_PENDING', 409
                );
            }

            // Guard: if they have no current agent, requestedAgentCode is required
            if (!$student['agent_id'] && !$requestedAgentCode) {
                $this->pdo->rollBack();
                Response::error(
                    'Please provide a preferred agent code.',
                    'VALIDATION_ERROR', 422
                );
            }

            // Resolve requested agent (optional if they already have one, but required if not)
            $requestedAgentId = null;
            if ($requestedAgentCode) {
                // Guard: same agent check
                if ($student['agent_id'] && $requestedAgentCode === $student['agent_referral_code']) {
                    $this->pdo->rollBack();
                    Response::error(
                        'You are already assigned to this agent.',
                        'SAME_AGENT', 422
                    );
                }

                // Guard: requested agent must be APPROVED
                $agentStmt = $this->pdo->prepare(
                    "SELECT id FROM agents WHERE referral_code = ? AND status = 'approved' AND deleted_at IS NULL"
                );
                $agentStmt->execute([$requestedAgentCode]);
                $requestedAgentId = $agentStmt->fetchColumn();

                if (!$requestedAgentId) {
                    $this->pdo->rollBack();
                    Response::error(
                        'The requested agent code is invalid or the agent is not active.',
                        'AGENT_NOT_FOUND', 422
                    );
                }
            }

            // INSERT reassignment request
            $this->pdo->prepare(
                "INSERT INTO agent_reassignment_requests
                     (public_id, student_id, current_agent_id, requested_agent_id, reason, status, created_at)
                 VALUES (?, ?, ?, ?, ?, 'pending', NOW())"
            )->execute([
                UlidGenerator::generate(),
                $student['id'],
                $student['agent_id'] ?: null,
                $requestedAgentId ?: null,
                $reason,
            ]);

            ActivityLogger::log('reassignment.requested', 'student', (int)$student['id']);

            $this->pdo->commit();

            // Notify all admins outside of transaction — get admin user IDs
            $adminStmt = $this->pdo->prepare(
                "SELECT u.id FROM users u JOIN admins adm ON adm.user_id = u.id WHERE u.status = 'active'"
            );
            $adminStmt->execute();
            $adminUserIds = array_column($adminStmt->fetchAll(PDO::FETCH_ASSOC), 'id');

            NotificationService::fire('agent.reassignment_requested', [
                'student_name'        => $user['name'] ?? 'Student',
                'current_agent_name'  => $student['agent_name'] ?? 'None',
                'reason'              => $reason,
            ], $adminUserIds);

            Response::json([
                'data' => ['message' => 'Your reassignment request has been submitted and is pending admin review.'],
            ], 201);
            
        } catch (\Exception $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STUDENT: View current agent + pending request  GET /student/agent
    // ─────────────────────────────────────────────────────────────────────────

    public function studentViewAgent(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();

        $stmt = $this->pdo->prepare(
            "SELECT s.id, s.agent_lock_status, s.agent_id,
                    a.public_id AS agent_public_id, a.full_name AS agent_name,
                    a.agency_name, a.tier, a.referral_code, a.country,
                    au.email AS agent_email, au.phone AS agent_phone
             FROM students s
             LEFT JOIN agents a ON a.id = s.agent_id
             LEFT JOIN users au ON au.id = a.user_id
             WHERE s.user_id = ? AND s.deleted_at IS NULL"
        );
        $stmt->execute([$user['id']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Response::error('Student profile not found.', 'NOT_FOUND', 404);
        }

        // Check for pending reassignment
        $pending = ReassignmentModel::findPendingByStudentId((int)$row['id'], $this->pdo);
        $pendingData = null;
        if ($pending) {
            $detailStmt = $this->pdo->prepare(
                "SELECT arr.public_id, arr.status, arr.reason, arr.created_at,
                        ra.full_name AS requested_agent_name
                 FROM agent_reassignment_requests arr
                 LEFT JOIN agents ra ON ra.id = arr.requested_agent_id
                 WHERE arr.id = ?"
            );
            $detailStmt->execute([$pending['id']]);
            $pendingData = $detailStmt->fetch(PDO::FETCH_ASSOC);
        }

        Response::success('Agent assignment retrieved.', [
            'current_agent' => $row['agent_id'] ? [
                'public_id'    => $row['agent_public_id'],
                'full_name'    => $row['agent_name'],
                'agency_name'  => $row['agency_name'],
                'tier'         => (int) $row['tier'],
                'referral_code' => $row['referral_code'],
                'country'      => $row['country'],
                'email'        => $this->decryptMaybe($row['agent_email']),
                'phone'        => $this->decryptMaybe($row['agent_phone']),
            ] : null,
            'agent_lock_status'    => $row['agent_lock_status'],
            'can_request_reassignment' => $row['agent_lock_status'] !== 'locked' && !$pending,
            'pending_reassignment' => $pendingData,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: List all reassignment requests  GET /admin/reassignment-requests
    // Filters: status, student_search, page, per_page
    // ─────────────────────────────────────────────────────────────────────────

    public function adminList(): void
    {
        RBACMiddleware::requirePermission('students', 'approve');
        $pager  = Paginator::fromQuery($_GET);
        $status = trim($_GET['status']         ?? 'pending');
        $search = trim($_GET['student_search'] ?? '');

        $conditions = ['1=1'];
        $params     = [];

        if ($status) {
            $conditions[] = "arr.status = :status";
            $params['status'] = $status;
        }
        if ($search) {
            $conditions[] = "s.full_name LIKE :search";
            $params['search'] = "%{$search}%";
        }
        $where = implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM agent_reassignment_requests arr
             JOIN students s ON s.id = arr.student_id WHERE {$where}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dataStmt = $this->pdo->prepare(
            "SELECT arr.public_id, arr.status, arr.reason, arr.review_notes,
                    arr.created_at, arr.reviewed_at,
                    s.public_id AS student_public_id, s.full_name AS student_name, s.profile_status,
                    ca.full_name AS current_agent_name, ca.referral_code AS current_agent_code,
                    ra.full_name AS requested_agent_name, ra.referral_code AS requested_agent_code,
                    fa.full_name AS final_agent_name
             FROM agent_reassignment_requests arr
             JOIN students s ON s.id = arr.student_id
             LEFT JOIN agents ca ON ca.id = arr.current_agent_id
             LEFT JOIN agents ra ON ra.id = arr.requested_agent_id
             LEFT JOIN agents fa ON fa.id = arr.final_agent_id
             WHERE {$where}
             ORDER BY arr.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $k => $v) {
            $dataStmt->bindValue(":{$k}", $v);
        }
        $dataStmt->bindValue(':limit',  $pager['per_page'], PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $pager['offset'],   PDO::PARAM_INT);
        $dataStmt->execute();
        $requests = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $requests,
            'meta' => [
                'total'       => $total,
                'page'        => $pager['page'],
                'per_page'    => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Get single request  GET /admin/reassignment-requests/:pid
    // ─────────────────────────────────────────────────────────────────────────

    public function adminGet(string $pid): void
    {
        RBACMiddleware::requirePermission('students', 'approve');

        $stmt = $this->pdo->prepare(
            "SELECT arr.public_id, arr.status, arr.reason, arr.review_notes,
                    arr.created_at, arr.reviewed_at,
                    s.public_id AS student_public_id, s.full_name AS student_name,
                    s.profile_status, s.agent_lock_status,
                    ca.public_id AS current_agent_pid, ca.full_name AS current_agent_name,
                    ca.referral_code AS current_agent_code,
                    ra.public_id AS requested_agent_pid, ra.full_name AS requested_agent_name,
                    ra.referral_code AS requested_agent_code, ra.status AS requested_agent_status,
                    fa.full_name AS final_agent_name
             FROM agent_reassignment_requests arr
             JOIN students s ON s.id = arr.student_id
             LEFT JOIN agents ca ON ca.id = arr.current_agent_id
             LEFT JOIN agents ra ON ra.id = arr.requested_agent_id
             LEFT JOIN agents fa ON fa.id = arr.final_agent_id
             WHERE arr.public_id = ?"
        );
        $stmt->execute([$pid]);
        $request = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$request) {
            Response::error('Request not found.', 'NOT_FOUND', 404);
        }

        Response::json(['data' => $request]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Approve request  PUT /admin/reassignment-requests/:pid/approve
    // Input: { "new_agent_code": "TGA-XXX999" (optional override), "notes": "..." }
    // USES SELECT FOR UPDATE — race-condition safe
    // ─────────────────────────────────────────────────────────────────────────

    public function adminApprove(string $pid): void
    {
        RBACMiddleware::requirePermission('students', 'approve');
        $user  = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $overrideAgentCode = trim($input['new_agent_code'] ?? '');
        $notes             = trim($input['notes']          ?? '');

        try {
            $this->pdo->beginTransaction();

            // CRITICAL: Lock the row to prevent concurrent approval race condition
            $request = ReassignmentModel::findForUpdate($pid, $this->pdo);

            if (!$request) {
                $this->pdo->rollBack();
                Response::error('Request not found.', 'NOT_FOUND', 404);
            }

            if ($request['status'] !== 'pending') {
                $this->pdo->rollBack();
                Response::error(
                    'This request has already been processed.',
                    'ALREADY_PROCESSED', 409
                );
            }

            // Resolve final agent: override code takes priority, then requested agent
            $newAgentId   = null;
            $newAgentData = null;

            if ($overrideAgentCode) {
                $agentStmt = $this->pdo->prepare(
                    "SELECT id, full_name, user_id FROM agents
                     WHERE referral_code = ? AND status = 'approved' AND deleted_at IS NULL"
                );
                $agentStmt->execute([$overrideAgentCode]);
                $newAgentData = $agentStmt->fetch(PDO::FETCH_ASSOC);

                if (!$newAgentData) {
                    $this->pdo->rollBack();
                    Response::error(
                        'The provided agent code is invalid or the agent is not approved.',
                        'AGENT_NOT_FOUND', 422
                    );
                }
                $newAgentId = (int) $newAgentData['id'];
            } elseif ($request['requested_agent_id']) {
                $agentStmt = $this->pdo->prepare(
                    "SELECT id, full_name, user_id FROM agents WHERE id = ? AND status = 'approved'"
                );
                $agentStmt->execute([$request['requested_agent_id']]);
                $newAgentData = $agentStmt->fetch(PDO::FETCH_ASSOC);

                if (!$newAgentData) {
                    $this->pdo->rollBack();
                    Response::error(
                        'The requested agent is no longer available. Provide a new_agent_code.',
                        'AGENT_NOT_FOUND', 422
                    );
                }
                $newAgentId = (int) $newAgentData['id'];
            } else {
                $this->pdo->rollBack();
                Response::error(
                    'No target agent specified. Provide new_agent_code in the request body.',
                    'AGENT_REQUIRED', 422
                );
            }

            // Fetch student + old agent info for notifications (use LEFT JOIN for optional agent)
            $studentStmt = $this->pdo->prepare(
                "SELECT s.id AS student_id, s.user_id AS student_user_id, s.full_name AS student_name,
                        a.id AS old_agent_id, a.user_id AS old_agent_user_id, a.full_name AS old_agent_name
                 FROM students s 
                 LEFT JOIN agents a ON a.id = s.agent_id
                 WHERE s.id = ?"
            );
            $studentStmt->execute([$request['student_id']]);
            $studentData = $studentStmt->fetch(PDO::FETCH_ASSOC);

            // UPDATE student agent assignment
            $this->pdo->prepare(
                "UPDATE students SET agent_id = ?, updated_at = NOW() WHERE id = ?"
            )->execute([$newAgentId, $request['student_id']]);

            // UPDATE request record
            $this->pdo->prepare(
                "UPDATE agent_reassignment_requests
                 SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(),
                     review_notes = ?, final_agent_id = ?
                 WHERE id = ?"
            )->execute([
                $user['sub'],
                $notes ?: null,
                $newAgentId,
                $request['id'],
            ]);

            $this->pdo->commit();

            // Activity log
            ActivityLogger::log(
                'student.agent_reassigned',
                'student',
                (int)$request['student_id'],
                null,
                ['agent_id' => $studentData['old_agent_id']],
                ['agent_id' => $newAgentId]
            );

            // Notifications
            NotificationService::fire('agent.reassignment_approved', [
                'student_name'   => $studentData['student_name'],
                'new_agent_name' => $newAgentData['full_name'],
            ], [$studentData['student_user_id']]);

            if ($studentData['old_agent_user_id']) {
                NotificationService::fire('agent.reassignment_lost', [
                    'agent_name'   => $studentData['old_agent_name'],
                    'student_name' => $studentData['student_name'],
                ], [$studentData['old_agent_user_id']]);
            }

            NotificationService::fire('agent.reassignment_gained', [
                'agent_name'   => $newAgentData['full_name'],
                'student_name' => $studentData['student_name'],
            ], [$newAgentData['user_id']]);

            Response::json([
                'data' => [
                    'success'         => true,
                    'new_agent_name'  => $newAgentData['full_name'],
                    'student_name'    => $studentData['student_name'],
                ],
            ]);

        } catch (\Exception $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Deny request  PUT /admin/reassignment-requests/:pid/deny
    // Input: { "notes": "..." }
    // ─────────────────────────────────────────────────────────────────────────

    public function adminDeny(string $pid): void
    {
        RBACMiddleware::requirePermission('students', 'approve');
        $user  = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $notes = trim($input['notes'] ?? '');

        try {
            $this->pdo->beginTransaction();

            $request = ReassignmentModel::findForUpdate($pid, $this->pdo);

            if (!$request) {
                $this->pdo->rollBack();
                Response::error('Request not found.', 'NOT_FOUND', 404);
            }

            if ($request['status'] !== 'pending') {
                $this->pdo->rollBack();
                Response::error('This request has already been processed.', 'ALREADY_PROCESSED', 409);
            }

            $this->pdo->prepare(
                "UPDATE agent_reassignment_requests
                 SET status = 'denied', reviewed_by = ?, reviewed_at = NOW(), review_notes = ?
                 WHERE id = ?"
            )->execute([$user['sub'], $notes ?: null, $request['id']]);

            // Get student user_id for notification
            $studentStmt = $this->pdo->prepare(
                "SELECT u.id AS user_id, s.full_name FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = ?"
            );
            $studentStmt->execute([$request['student_id']]);
            $studentInfo = $studentStmt->fetch(PDO::FETCH_ASSOC);

            $this->pdo->commit();

            ActivityLogger::log('reassignment.denied', 'student', (int)$request['student_id']);

            NotificationService::fire('agent.reassignment_denied', [
                'student_name' => $studentInfo['full_name'] ?? 'Student',
                'review_notes' => $notes ?: 'No reason provided.',
            ], [$studentInfo['user_id']]);

            Response::json(['data' => ['message' => 'Reassignment request denied.']]);

        } catch (\Exception $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Reassignment history for a student  GET /admin/students/:pid/reassignment-history
    // ─────────────────────────────────────────────────────────────────────────

    public function adminStudentHistory(string $studentPid): void
    {
        RBACMiddleware::requirePermission('students', 'view');

        $stmt = $this->pdo->prepare(
            "SELECT id FROM students WHERE public_id = ? AND deleted_at IS NULL"
        );
        $stmt->execute([$studentPid]);
        $studentId = $stmt->fetchColumn();

        if (!$studentId) {
            Response::error('Student not found.', 'NOT_FOUND', 404);
        }

        $history = ReassignmentModel::historyByStudentId((int) $studentId, $this->pdo);
        Response::json(['data' => $history]);
    }
}
