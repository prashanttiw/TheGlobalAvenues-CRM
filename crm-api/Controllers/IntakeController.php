<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use PDOException;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Models\IntakeModel;
use TGA\CRM\Models\CourseModel;
use TGA\CRM\Services\ActivityLogger;

class IntakeController
{
    private PDO $pdo;
    private IntakeModel $model;
    private CourseModel $courseModel;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
        $this->model = new IntakeModel($this->pdo);
        $this->courseModel = new CourseModel($this->pdo);
    }

    public function adminList(string $coursePid): void
    {
        RBACMiddleware::requirePermission('intakes', 'view');

        $course = $this->courseModel->findByPublicId($coursePid);
        if (!$course) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 20;
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM intakes WHERE course_id = ?");
        $countStmt->execute([$course['id']]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->pdo->prepare("
            SELECT i.*, 
                   (SELECT COUNT(*) FROM applications a WHERE a.intake_id = i.id AND a.deleted_at IS NULL) as application_count
            FROM intakes i
            WHERE i.course_id = ?
            ORDER BY i.course_start_date ASC
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $course['id'], PDO::PARAM_INT);
        $stmt->bindValue(2, $perPage, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $intakes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $intakes,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage),
                'has_next' => ($page * $perPage) < $total
            ]
        ]);
    }

    public function create(string $coursePid): void
    {
        RBACMiddleware::requirePermission('intakes', 'create');
        $user = AuthMiddleware::user();

        $course = $this->courseModel->findByPublicId($coursePid);
        if (!$course) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $this->validateIntakeInput($input);

        $allowedStatuses = ['upcoming', 'open', 'closed'];
        $status = in_array($input['status'] ?? '', $allowedStatuses, true) ? $input['status'] : 'upcoming';

        $pid = UlidGenerator::generate();
        $id = $this->model->insert([
            'public_id' => $pid,
            'course_id' => $course['id'],
            'name' => trim($input['name'] ?? ''),
            'intake_month' => isset($input['intake_month']) ? (int)$input['intake_month'] : null,
            'intake_year' => isset($input['intake_year']) ? (int)$input['intake_year'] : null,
            'application_open_date' => $input['application_open_date'] ?? null,
            'application_deadline' => $input['application_deadline'] ?? null,
            'course_start_date' => $input['course_start_date'] ?? null,
            'tuition_fee_amount' => isset($input['tuition_fee_amount']) ? (float)$input['tuition_fee_amount'] : null,
            'tuition_fee_currency' => trim($input['tuition_fee_currency'] ?? 'EUR'),
            'requirements_notes' => trim($input['requirements_notes'] ?? ''),
            'status' => $status,
            'created_by' => $user['id'] ?? null
        ]);

        ActivityLogger::log('intake.created', 'intake', $id, $user['id'] ?? null, [], ['name' => $input['name'], 'course_id' => $course['id']]);

        $intake = $this->model->findById($id);
        Response::json(['intake' => $intake], 201);
    }

    public function adminGet(string $pid): void
    {
        RBACMiddleware::requirePermission('intakes', 'view');

        $intake = $this->model->findByPublicId($pid);
        if (!$intake) {
            Response::error('Intake not found', 'NOT_FOUND', 404);
        }

        Response::json(['intake' => $intake]);
    }

    public function update(string $pid): void
    {
        RBACMiddleware::requirePermission('intakes', 'edit');
        $user = AuthMiddleware::user();

        $intake = $this->model->findByPublicId($pid);
        if (!$intake) {
            Response::error('Intake not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        // Merge with existing for validation
        $mergedInput = array_merge($intake, $input);
        $this->validateIntakeInput($mergedInput);

        $updateData = [];
        $fields = [
            'name', 'intake_month', 'intake_year', 'application_open_date', 
            'application_deadline', 'course_start_date', 'tuition_fee_amount', 
            'tuition_fee_currency', 'requirements_notes'
        ];
        
        foreach ($fields as $field) {
            if (array_key_exists($field, $input)) {
                if (in_array($field, ['intake_month', 'intake_year'])) {
                    $updateData[$field] = $input[$field] !== null ? (int)$input[$field] : null;
                } elseif ($field === 'tuition_fee_amount') {
                    $updateData[$field] = $input[$field] !== null ? (float)$input[$field] : null;
                } else {
                    $updateData[$field] = $input[$field] !== null ? trim((string)$input[$field]) : null;
                }
            }
        }

        if (!empty($updateData)) {
            $this->model->update($intake['id'], $updateData);
            ActivityLogger::log('intake.updated', 'intake', $intake['id'], $user['id'] ?? null, [], $updateData);
        }

        $updatedIntake = $this->model->findById($intake['id']);
        Response::json(['intake' => $updatedIntake]);
    }

    public function delete(string $pid): void
    {
        RBACMiddleware::requirePermission('intakes', 'delete');
        $user = AuthMiddleware::user();

        $intake = $this->model->findByPublicId($pid);
        if (!$intake) {
            Response::error('Intake not found', 'NOT_FOUND', 404);
        }

        try {
            $this->model->delete($intake['id']);
            ActivityLogger::log('intake.deleted', 'intake', $intake['id'], $user['id'] ?? null);
            Response::json(['success' => true, 'message' => 'Intake deleted successfully']);
        } catch (PDOException $e) {
            // Check for foreign key constraint violation
            if ($e->getCode() == '23000') {
                Response::error('Cannot delete intake because it has active applications.', 'CONFLICT', 409);
            }
            throw $e;
        }
    }

    public function cloneIntake(string $pid): void
    {
        RBACMiddleware::requirePermission('intakes', 'create');
        $user = AuthMiddleware::user();

        $intake = $this->model->findByPublicId($pid);
        if (!$intake) {
            Response::error('Intake not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($input['name'] ?? $intake['name'] . ' (Copy)');

        $newPid = UlidGenerator::generate();
        $id = $this->model->insert([
            'public_id' => $newPid,
            'course_id' => $intake['course_id'],
            'name' => $name,
            'intake_month' => $intake['intake_month'],
            'intake_year' => $intake['intake_year'],
            'application_open_date' => null, // Clear dates
            'application_deadline' => null,
            'course_start_date' => null,
            'tuition_fee_amount' => $intake['tuition_fee_amount'],
            'tuition_fee_currency' => $intake['tuition_fee_currency'],
            'requirements_notes' => $intake['requirements_notes'],
            'status' => 'upcoming',
            'cloned_from_intake_id' => $intake['id'],
            'created_by' => $user['id'] ?? null
        ]);

        ActivityLogger::log('intake.cloned', 'intake', $id, $user['id'] ?? null, [], ['cloned_from' => $intake['id']]);

        $clonedIntake = $this->model->findById($id);
        Response::json(['intake' => $clonedIntake], 201);
    }

    public function updateStatus(string $pid): void
    {
        RBACMiddleware::requirePermission('intakes', 'edit');
        $user = AuthMiddleware::user();

        $intake = $this->model->findByPublicId($pid);
        if (!$intake) {
            Response::error('Intake not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $newStatus = $input['status'] ?? '';

        $validTransitions = [
            'upcoming' => ['open', 'closed'],
            'open' => ['closed'],
            'closed' => [] // Cannot reopen a closed intake automatically without specific business logic
        ];

        if (!isset($validTransitions[$intake['status']]) || !in_array($newStatus, $validTransitions[$intake['status']])) {
            Response::error('Invalid status transition', 'VALIDATION_ERROR', 400);
        }

        $this->model->update($intake['id'], ['status' => $newStatus]);
        
        ActivityLogger::log('intake.status_updated', 'intake', $intake['id'], $user['id'] ?? null, ['old_status' => $intake['status']], ['new_status' => $newStatus]);

        $updatedIntake = $this->model->findById($intake['id']);
        Response::json(['intake' => $updatedIntake]);
    }

    // --- Public Endpoints ---

    public function publicList(string $coursePid): void
    {
        $course = $this->courseModel->findByPublicId($coursePid);
        if (!$course || $course['status'] !== 'active' || $course['deleted_at'] !== null) {
            Response::error('Course not found or inactive', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("
            SELECT * FROM intakes 
            WHERE course_id = ? AND status IN ('upcoming', 'open') 
            ORDER BY course_start_date ASC
        ");
        $stmt->execute([$course['id']]);
        $intakes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(['intakes' => $intakes]);
    }

    private function validateIntakeInput(array $input): void
    {
        $name = trim($input['name'] ?? '');
        if (!$name) {
            Response::error('Intake name is required', 'VALIDATION_ERROR', 400);
        }

        $deadline = $input['application_deadline'] ?? null;
        $start = $input['course_start_date'] ?? null;

        if ($deadline && $start) {
            if (strtotime($deadline) >= strtotime($start)) {
                Response::error('Application deadline must be before course start date', 'VALIDATION_ERROR', 400);
            }
        }
    }
}
