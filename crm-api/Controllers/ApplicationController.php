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
use TGA\CRM\Services\StateManager;
use Exception;

class ApplicationController
{
    private PDO $pdo;
    private ApplicationModel $model;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
        $this->model = new ApplicationModel($this->pdo);
    }

    public function createDraft(): void
    {
        RBACMiddleware::requirePermission('applications', 'create');
        $user = AuthMiddleware::user();

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
        if ($user) {
            $stmt = $this->pdo->prepare("SELECT id FROM agents WHERE user_id = ? AND deleted_at IS NULL");
            $stmt->execute([$user['id']]);
            $foundAgentId = $stmt->fetchColumn();
            if ($foundAgentId) {
                $agentId = $foundAgentId;
            }
        }

        // Check draft limit per intake per student
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM applications WHERE student_id = ? AND intake_id = ? AND status = 'draft' AND deleted_at IS NULL");
        $stmt->execute([$studentId, $intakeId]);
        if ((int)$stmt->fetchColumn() > 0) {
            Response::error('Student already has a draft application for this intake', 'CONFLICT', 409);
        }

        $pid = UlidGenerator::generate();
        $id = $this->model->insertWithReference([
            'public_id' => $pid,
            'student_id' => $studentId,
            'intake_id' => $intakeId,
            'agent_id_at_submission' => $agentId,
            'status' => 'draft',
            'notes' => trim($input['notes'] ?? '')
        ]);

        ActivityLogger::log('application.created', 'application', $id, $user['id'] ?? null, [], ['status' => 'draft']);

        $application = $this->model->findById($id);
        Response::json(['application' => $application], 201);
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

    public function listApplications(): void
    {
        RBACMiddleware::requirePermission('applications', 'view');

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 20;
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM applications WHERE deleted_at IS NULL");
        $countStmt->execute();
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
            WHERE a.deleted_at IS NULL
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $perPage, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
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
}
