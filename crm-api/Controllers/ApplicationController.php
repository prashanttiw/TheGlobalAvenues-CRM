<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Models\ApplicationModel;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\AgentAccessService;
use TGA\CRM\Services\StateManager;
use TGA\CRM\Services\SystemSettings;
use Exception;

class ApplicationController
{
    /**
     * Statuses for which the student's profile is considered "ready" — i.e. personal
     * details + required documents are complete enough to allow an application to
     * auto-submit immediately upon creation instead of stopping at draft. Mirrors
     * students.profile_status values reachable via StudentController::submitReadinessFor().
     */
    private const READY_PROFILE_STATUSES = ['documents_submitted', 'documents_verified', 'application_in_progress', 'application_submitted', 'offer_received', 'admitted', 'enrolled'];

    private PDO $pdo;
    private ApplicationModel $model;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
        $this->model = new ApplicationModel($this->pdo);
    }

    private function getApplicationCap(): int
    {
        return (int) SystemSettings::get('max_active_applications_per_student', 3);
    }

    private function countActiveApplications(int $studentId): int
    {
        $stmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM applications WHERE student_id = ? AND status NOT IN ('withdrawn','rejected') AND deleted_at IS NULL"
        );
        $stmt->execute([$studentId]);
        return (int) $stmt->fetchColumn();
    }

    private function nextPreferenceRank(int $studentId): int
    {
        $stmt = $this->pdo->prepare(
            "SELECT COALESCE(MAX(preference_rank), 0) + 1 FROM applications
             WHERE student_id = ? AND status NOT IN ('withdrawn','rejected') AND deleted_at IS NULL"
        );
        $stmt->execute([$studentId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * Single source of truth for creating a draft application, used by both the student's
     * own self-service create and the admin/agent create-on-behalf-of path. Enforces the
     * per-student active-applications cap and the existing one-draft-per-intake uniqueness
     * rule, then auto-submits immediately if the student's profile is already "ready" —
     * otherwise leaves it as a draft for the caller to finish via the readiness flow.
     *
     * @return array{application: array, auto_submitted: bool}
     */
    private function createDraftApplication(
        int $studentId,
        int $intakeId,
        ?int $agentIdAtSubmission,
        string $createdByType,
        int $createdById,
        ?string $notes
    ): array {
        $cap = $this->getApplicationCap();
        $activeCount = $this->countActiveApplications($studentId);
        if ($activeCount >= $cap) {
            Response::error(
                "This student already has {$activeCount} active application(s), which is the maximum allowed ({$cap}). Withdraw an existing application to free up a slot.",
                'APPLICATION_CAP_REACHED',
                409
            );
        }

        // Check draft limit per intake per student (unchanged from prior behavior)
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM applications WHERE student_id = ? AND intake_id = ? AND status = 'draft' AND deleted_at IS NULL");
        $stmt->execute([$studentId, $intakeId]);
        if ((int) $stmt->fetchColumn() > 0) {
            Response::error('A draft application for this intake already exists.', 'CONFLICT', 409);
        }

        $pid = UlidGenerator::generate();
        $id = $this->model->insertWithReference([
            'public_id' => $pid,
            'student_id' => $studentId,
            'intake_id' => $intakeId,
            'agent_id_at_submission' => $agentIdAtSubmission,
            'status' => 'draft',
            'notes' => trim($notes ?? ''),
            'created_by_type' => $createdByType,
            'created_by_id' => $createdById,
            'preference_rank' => $this->nextPreferenceRank($studentId),
        ]);

        ActivityLogger::log('application.created', 'application', $id, $createdById, [], ['status' => 'draft']);

        $autoSubmitted = false;
        $stmt = $this->pdo->prepare("SELECT profile_status FROM students WHERE id = ?");
        $stmt->execute([$studentId]);
        $profileStatus = $stmt->fetchColumn();

        if (in_array($profileStatus, self::READY_PROFILE_STATUSES, true)) {
            try {
                StateManager::transition($this->pdo, $id, 'submitted', $createdByType, $createdById);
                $autoSubmitted = true;
            } catch (Exception $e) {
                // Leave as draft if the transition unexpectedly fails — the caller can submit manually later.
            }
        }

        $application = $this->model->findById($id);
        return ['application' => $application, 'auto_submitted' => $autoSubmitted];
    }

    public function createDraft(): void
    {
        $user = AuthMiddleware::user();
        $utype = $user['utype'] ?? $user['user_type'] ?? '';

        if ($utype !== 'admin' && $utype !== 'agent') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        if ($utype === 'admin') {
            RBACMiddleware::requirePermission('applications', 'create');
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $studentPid = $input['student_pid'] ?? '';
        $intakePid = $input['intake_pid'] ?? '';

        if (!$studentPid || !$intakePid) {
            Response::error('Student and Intake are required', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM students WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$studentPid]);
        $studentId = $stmt->fetchColumn();

        $stmt = $this->pdo->prepare("SELECT id FROM intakes WHERE public_id = ?");
        $stmt->execute([$intakePid]);
        $intakeId = $stmt->fetchColumn();

        if (!$studentId || !$intakeId) {
            Response::error('Invalid student or intake', 'NOT_FOUND', 404);
        }

        $agentId = null;
        if ($utype === 'agent') {
            $agent = AgentAccessService::resolveAgent($this->pdo, (int) $user['id']);
            // SECURITY: an agent may only create applications for students in their own subtree —
            // previously unchecked, any approved agent could create a draft for any student_pid.
            AgentAccessService::assertCanAccessStudent($this->pdo, $agent, (int) $studentId);
            $agentId = (int) $agent['id'];
        }

        $result = $this->createDraftApplication(
            (int) $studentId,
            (int) $intakeId,
            $agentId,
            $utype === 'agent' ? 'agent' : 'admin',
            (int) $user['id'],
            $input['notes'] ?? null
        );

        Response::json($result, 201);
    }

    public function updateStatus(string $pid): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $application = $this->model->findByPublicId($pid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $newStatus = $input['status'] ?? '';

        if (!$newStatus) {
            Response::error('New status is required', 'VALIDATION_ERROR', 400);
        }

        // Determine acting user type
        $byUserType = 'admin'; // Since this is an admin endpoint. If agents can update, logic can be added.
        $byUserId = $user['id'] ?? 0;

        try {
            StateManager::transition($this->pdo, $application['id'], $newStatus, $byUserType, $byUserId);
        } catch (Exception $e) {
            $code = $e->getCode() === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
            Response::error($e->getMessage(), $code, $e->getCode() ?: 500);
        }

        $updatedApp = $this->model->findById($application['id']);
        Response::json(['success' => true, 'application' => $updatedApp]);
    }

    public function withdraw(string $pid): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'student' && ($user['user_type'] ?? '') !== 'student') {
            Response::error('Only students can withdraw applications', 'FORBIDDEN', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $reason = trim($input['withdrawal_reason'] ?? '');

        if (!$reason) {
            Response::error('Withdrawal reason is required', 'VALIDATION_ERROR', 400);
        }

        $application = $this->model->findByPublicId($pid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        // Verify ownership
        $stmt = $this->pdo->prepare("SELECT id FROM students WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $studentId = $stmt->fetchColumn();

        if ($application['student_id'] !== $studentId) {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        try {
            StateManager::transition($this->pdo, $application['id'], 'withdrawn', 'student', (int)$user['id'], ['withdrawal_reason' => $reason]);
        } catch (Exception $e) {
            $code = $e->getCode() === 400 ? 'VALIDATION_ERROR' : ($e->getCode() === 403 ? 'FORBIDDEN' : 'SERVER_ERROR');
            Response::error($e->getMessage(), $code, $e->getCode() ?: 500);
        }

        Response::json(['success' => true, 'message' => 'Application withdrawn']);
    }

    public function agentWithdraw(string $pid): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'agent' && ($user['user_type'] ?? '') !== 'agent') {
            Response::error('Only agents can use this endpoint', 'FORBIDDEN', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $reason = trim($input['withdrawal_reason'] ?? '');

        if (!$reason) {
            Response::error('Withdrawal reason is required', 'VALIDATION_ERROR', 400);
        }

        $application = $this->model->findByPublicId($pid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM agents WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $agentId = $stmt->fetchColumn();

        // Verify agent is associated with this student
        $stmt = $this->pdo->prepare("SELECT agent_id FROM students WHERE id = ?");
        $stmt->execute([$application['student_id']]);
        $studentAgentId = $stmt->fetchColumn();

        if ($studentAgentId != $agentId) {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        try {
            StateManager::transition($this->pdo, $application['id'], 'withdrawn', 'agent', (int)$user['id'], ['withdrawal_reason' => $reason]);
        } catch (Exception $e) {
            $code = $e->getCode() === 400 ? 'VALIDATION_ERROR' : ($e->getCode() === 403 ? 'FORBIDDEN' : 'SERVER_ERROR');
            Response::error($e->getMessage(), $code, $e->getCode() ?: 500);
        }

        Response::json(['success' => true, 'message' => 'Application withdrawn by agent']);
    }

    public function adminWithdraw(string $pid): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $reason = trim($input['withdrawal_reason'] ?? '');

        if (!$reason) {
            Response::error('Withdrawal reason is required', 'VALIDATION_ERROR', 400);
        }

        $application = $this->model->findByPublicId($pid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        try {
            StateManager::transition($this->pdo, $application['id'], 'withdrawn', 'admin', (int)$user['id'], ['withdrawal_reason' => $reason]);
        } catch (Exception $e) {
            $code = $e->getCode() === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
            Response::error($e->getMessage(), $code, $e->getCode() ?: 500);
        }

        Response::json(['success' => true, 'message' => 'Application withdrawn by admin']);
    }

    public function studentSubmit(string $pid): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'student' && ($user['user_type'] ?? '') !== 'student') {
            Response::error('Only students can submit applications', 'FORBIDDEN', 403);
        }

        $application = $this->model->findByPublicId($pid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        if ($application['status'] !== 'draft') {
            Response::error('Only draft applications can be submitted', 'VALIDATION_ERROR', 400);
        }

        // Verify ownership
        $stmt = $this->pdo->prepare("SELECT id FROM students WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $studentId = $stmt->fetchColumn();

        if ($application['student_id'] !== $studentId) {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        try {
            StateManager::transition($this->pdo, $application['id'], 'submitted', 'student', (int)$user['id']);
        } catch (Exception $e) {
            $code = $e->getCode() === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
            Response::error($e->getMessage(), $code, $e->getCode() ?: 500);
        }

        Response::json(['success' => true, 'message' => 'Application submitted successfully']);
    }

    public function agentSubmit(string $pid): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'agent' && ($user['user_type'] ?? '') !== 'agent') {
            Response::error('Only agents can use this endpoint', 'FORBIDDEN', 403);
        }

        $application = $this->model->findByPublicId($pid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        if ($application['status'] !== 'draft') {
            Response::error('Only draft applications can be submitted', 'VALIDATION_ERROR', 400);
        }

        $agent = AgentAccessService::resolveAgent($this->pdo, (int) $user['id']);
        AgentAccessService::assertCanAccessStudent($this->pdo, $agent, (int) $application['student_id']);

        try {
            StateManager::transition($this->pdo, $application['id'], 'submitted', 'agent', (int) $user['id']);
        } catch (Exception $e) {
            $code = $e->getCode() === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR';
            Response::error($e->getMessage(), $code, $e->getCode() ?: 500);
        }

        Response::json(['success' => true, 'message' => 'Application submitted successfully']);
    }

    public function reorderPreferences(): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'student' && ($user['user_type'] ?? '') !== 'student') {
            Response::error('Only students can reorder their own applications', 'FORBIDDEN', 403);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM students WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $studentId = $stmt->fetchColumn();
        if (!$studentId) {
            Response::error('Student profile not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $order = $input['order'] ?? [];
        if (!is_array($order) || count($order) === 0) {
            Response::error('order must be a non-empty array of application public_ids', 'VALIDATION_ERROR', 400);
        }

        // Resolve and validate every id belongs to this student and is still active
        $placeholders = implode(',', array_fill(0, count($order), '?'));
        $stmt = $this->pdo->prepare(
            "SELECT id, public_id FROM applications
             WHERE public_id IN ({$placeholders}) AND student_id = ? AND status NOT IN ('withdrawn','rejected') AND deleted_at IS NULL"
        );
        $stmt->execute([...$order, $studentId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (count($rows) !== count($order)) {
            Response::error('One or more applications could not be reordered (not found, not yours, or withdrawn/rejected).', 'VALIDATION_ERROR', 400);
        }

        $idByPid = [];
        foreach ($rows as $row) {
            $idByPid[$row['public_id']] = (int) $row['id'];
        }

        try {
            $this->pdo->beginTransaction();
            $updateStmt = $this->pdo->prepare("UPDATE applications SET preference_rank = ? WHERE id = ?");
            foreach ($order as $index => $pid) {
                $updateStmt->execute([$index + 1, $idByPid[$pid]]);
            }
            $this->pdo->commit();
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }

        Response::json(['success' => true, 'message' => 'Preferences reordered']);
    }

    public function listApplications(): void
    {
        RBACMiddleware::requirePermission('applications', 'view');

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 20;
        $offset = ($page - 1) * $perPage;
        $status = trim((string) ($_GET['status'] ?? ''));
        $universityPid = trim((string) ($_GET['university_pid'] ?? ''));
        $search = trim((string) ($_GET['search'] ?? ''));

        $conditions = ['a.deleted_at IS NULL'];
        $params = [];

        if ($status !== '') {
            $conditions[] = 'a.status = ?';
            $params[] = $status;
        }
        if ($universityPid !== '') {
            $conditions[] = 'u.public_id = ?';
            $params[] = $universityPid;
        }
        if ($search !== '') {
            $conditions[] = '(a.reference_number LIKE ? OR s.full_name LIKE ? OR c.name LIKE ? OR u.name LIKE ?)';
            $like = '%' . $search . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
        $where = implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare("
            SELECT COUNT(*)
            FROM applications a
            JOIN students s ON a.student_id = s.id
            JOIN intakes i ON a.intake_id = i.id
            JOIN courses c ON i.course_id = c.id
            JOIN universities u ON c.university_id = u.id
            WHERE {$where}
        ");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->pdo->prepare("
            SELECT a.public_id, a.reference_number, a.status, a.submitted_at, a.created_at,
                   i.public_id as intake_pid, i.name as intake_name, i.intake_month, i.intake_year,
                   c.name as course_name, c.degree_level as course_level,
                   u.name as university_name,
                   s.full_name as student_name, s.public_id as student_pid,
                   ag.full_name as agent_name
            FROM applications a
            JOIN students s ON a.student_id = s.id
            JOIN intakes i ON a.intake_id = i.id
            JOIN courses c ON i.course_id = c.id
            JOIN universities u ON c.university_id = u.id
            LEFT JOIN agents ag ON a.agent_id_at_submission = ag.id
            WHERE {$where}
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
        ");
        $bindIndex = 1;
        foreach ($params as $value) {
            $stmt->bindValue($bindIndex++, $value);
        }
        $stmt->bindValue($bindIndex++, $perPage, PDO::PARAM_INT);
        $stmt->bindValue($bindIndex++, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $applications,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage),
                'has_next' => ($page * $perPage) < $total
            ]
        ]);
    }

    public function getApplication(string $pid): void
    {
        RBACMiddleware::requirePermission('applications', 'view');

        $stmt = $this->pdo->prepare("
            SELECT a.id, a.public_id, a.reference_number, a.status, a.submitted_at, a.created_at, a.notes, a.withdrawal_reason,
                   i.public_id as intake_pid, i.name as intake_name, i.intake_month, i.intake_year,
                   i.tuition_fee_amount, i.tuition_fee_currency,
                   c.name as course_name, c.degree_level as course_level,
                   u.name as university_name,
                   s.full_name as student_name, s.public_id as student_pid,
                   ag.full_name as agent_name
            FROM applications a
            JOIN students s ON a.student_id = s.id
            JOIN intakes i ON a.intake_id = i.id
            JOIN courses c ON i.course_id = c.id
            JOIN universities u ON c.university_id = u.id
            LEFT JOIN agents ag ON a.agent_id_at_submission = ag.id
            WHERE a.public_id = ? AND a.deleted_at IS NULL
        ");
        $stmt->execute([$pid]);
        $application = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("
            SELECT au.public_id, au.direction, au.item_type, au.content, au.created_at, au.is_visible_to_agent,
                   f.public_id as file_public_id, f.display_filename as file_name
            FROM application_updates au
            LEFT JOIN files f ON au.file_id = f.id
            WHERE au.application_id = ?
            ORDER BY au.created_at DESC
        ");
        $stmt->execute([$application['id']]);
        $application['timeline'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $this->pdo->prepare("
            SELECT dr.public_id, dr.doc_label, dr.description, dr.deadline, dr.status, dr.rejection_reason
            FROM document_requests dr
            WHERE dr.application_id = ?
            ORDER BY dr.created_at DESC
        ");
        $stmt->execute([$application['id']]);
        $application['document_requests'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $this->pdo->prepare("
            SELECT ap.public_id, ap.label, ap.amount, ap.currency, ap.payment_link, ap.due_date, ap.status
            FROM application_payments ap
            WHERE ap.application_id = ?
            ORDER BY ap.created_at DESC
        ");
        $stmt->execute([$application['id']]);
        $application['payments'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        unset($application['id']);

        Response::json(['application' => $application]);
    }

    public function studentCreate(): void
    {
        $user = AuthMiddleware::user();
        $utype = $user['utype'] ?? $user['user_type'] ?? '';
        
        if ($utype !== 'student') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $programPid = $input['program_id'] ?? '';
        $intakePid = $input['intake_id'] ?? '';

        if (!$programPid || !$intakePid) {
            Response::error('Program and Intake details are required', 'VALIDATION_ERROR', 400);
        }

        // Find student ID from user ID
        $stmt = $this->pdo->prepare("SELECT id, public_id, agent_id, profile_status FROM students WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $student = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$student) {
            Response::error('Student profile not found', 'NOT_FOUND', 404);
        }
        $studentId = $student['id'];

        // Profile completeness is no longer a pre-creation wall — the draft is created
        // regardless, and createDraftApplication() auto-submits it if the profile already
        // qualifies, or leaves it as a draft for the student to finish via the readiness flow.

        // Find course ID by public_id
        $stmt = $this->pdo->prepare("SELECT id FROM courses WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$programPid]);
        $courseId = $stmt->fetchColumn();
        if (!$courseId) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        // Find the intake by public_id, scoped to the course (intakes has no deleted_at column — hard-delete only, see 016_create_intakes_table.sql)
        $stmt = $this->pdo->prepare("
            SELECT id, status FROM intakes
            WHERE public_id = ? AND course_id = ?
        ");
        $stmt->execute([$intakePid, $courseId]);
        $intake = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$intake) {
            Response::error('Intake not found for the selected course', 'NOT_FOUND', 404);
        }

        // Check if the intake is open for applications
        if ($intake['status'] !== 'open') {
            Response::error('The selected intake is closed for applications', 'VALIDATION_ERROR', 400);
        }

        $intakeId = $intake['id'];

        $result = $this->createDraftApplication(
            (int) $studentId,
            (int) $intakeId,
            $student['agent_id'] ? (int) $student['agent_id'] : null,
            'student',
            (int) $user['id'],
            $input['notes'] ?? null
        );

        Response::json($result, 201);
    }

    public function getApplicationDetail(): void
    {
        $pid = $_GET['id'] ?? '';
        if (!$pid) {
            Response::error('Application ID is required', 'VALIDATION_ERROR', 400);
        }
        $this->getApplication($pid);
    }
}
