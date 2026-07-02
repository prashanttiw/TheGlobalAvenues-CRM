<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Models\CourseModel;
use TGA\CRM\Models\UniversityModel;
use TGA\CRM\Services\ActivityLogger;

class CourseController
{
    private PDO $pdo;
    private CourseModel $model;
    private UniversityModel $uniModel;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
        $this->model = new CourseModel($this->pdo);
        $this->uniModel = new UniversityModel($this->pdo);
    }

    public function adminList(string $uniPid): void
    {
        RBACMiddleware::requirePermission('courses', 'view');

        $uni = $this->uniModel->findByPublicId($uniPid);
        if (!$uni) {
            Response::error('University not found', 'NOT_FOUND', 404);
        }

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 20;
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM courses WHERE university_id = ? AND deleted_at IS NULL");
        $countStmt->execute([$uni['id']]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->pdo->prepare("
            SELECT c.*,
                   (SELECT MIN(i.tuition_fee_amount) FROM intakes i WHERE i.course_id = c.id AND i.status != 'closed') as min_tuition_fee,
                   (SELECT MAX(i.tuition_fee_amount) FROM intakes i WHERE i.course_id = c.id AND i.status != 'closed') as max_tuition_fee,
                   (SELECT i.tuition_fee_currency FROM intakes i WHERE i.course_id = c.id AND i.status != 'closed' LIMIT 1) as tuition_fee_currency,
                   (SELECT COUNT(*) FROM intakes i WHERE i.course_id = c.id AND i.status = 'open') as open_intake_count
            FROM courses c
            WHERE c.university_id = ? AND c.deleted_at IS NULL
            ORDER BY c.name ASC LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $uni['id'], PDO::PARAM_INT);
        $stmt->bindValue(2, $perPage, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $courses,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage),
                'has_next' => ($page * $perPage) < $total
            ]
        ]);
    }

    public function create(string $uniPid): void
    {
        RBACMiddleware::requirePermission('courses', 'create');
        $user = AuthMiddleware::user();

        $uni = $this->uniModel->findByPublicId($uniPid);
        if (!$uni) {
            Response::error('University not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($input['name'] ?? '');

        if (!$name) {
            Response::error('Course name is required', 'VALIDATION_ERROR', 400);
        }

        $pid = UlidGenerator::generate();
        $id = $this->model->insert([
            'public_id' => $pid,
            'university_id' => $uni['id'],
            'name' => $name,
            'degree_level' => trim($input['degree_level'] ?? ''),
            'duration_months' => isset($input['duration_months']) ? (int)$input['duration_months'] : null,
            'language' => trim($input['language'] ?? 'English'),
            'description' => trim($input['description'] ?? ''),
            'eligibility_criteria' => trim($input['eligibility_criteria'] ?? ''),
            'status' => 'active',
            'created_by' => $user['id'] ?? null
        ]);

        ActivityLogger::log('course.created', 'course', $id, $user['id'] ?? null, [], ['name' => $name, 'university_id' => $uni['id']]);

        $course = $this->model->findById($id);
        Response::json(['course' => $course], 201);
    }

    public function adminGet(string $pid): void
    {
        RBACMiddleware::requirePermission('courses', 'view');

        $course = $this->model->findByPublicId($pid);
        if (!$course) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("
            SELECT MIN(tuition_fee_amount) as min_fee, MAX(tuition_fee_amount) as max_fee,
                   (SELECT tuition_fee_currency FROM intakes WHERE course_id = ? AND status != 'closed' LIMIT 1) as currency,
                   SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count
            FROM intakes WHERE course_id = ? AND status != 'closed'
        ");
        $stmt->execute([$course['id'], $course['id']]);
        $fees = $stmt->fetch(PDO::FETCH_ASSOC);

        $course['min_tuition_fee'] = $fees['min_fee'];
        $course['max_tuition_fee'] = $fees['max_fee'];
        $course['tuition_fee_currency'] = $fees['currency'];
        $course['open_intake_count'] = (int) ($fees['open_count'] ?? 0);

        Response::json(['course' => $course]);
    }

    /**
     * Courses have no fee column of their own — tuition lives on intakes. This sets a single
     * fee value across every non-closed intake for the course, so the course-level "Fee Range"
     * cell can stay inline-editable without pretending fees belong to the course.
     */
    public function updateFee(string $pid): void
    {
        RBACMiddleware::requirePermission('courses', 'edit');
        $user = AuthMiddleware::user();

        $course = $this->model->findByPublicId($pid);
        if (!$course) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $amount = isset($input['amount']) && $input['amount'] !== '' ? (float) $input['amount'] : null;
        $currency = trim((string) ($input['currency'] ?? 'EUR')) ?: 'EUR';

        if ($amount === null || $amount < 0) {
            Response::error('A valid fee amount is required', 'VALIDATION_ERROR', 400);
        }

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM intakes WHERE course_id = ? AND status != 'closed'");
        $countStmt->execute([$course['id']]);
        if ((int) $countStmt->fetchColumn() === 0) {
            Response::error('This course has no open or upcoming intakes to price yet — add an intake first.', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare("UPDATE intakes SET tuition_fee_amount = ?, tuition_fee_currency = ? WHERE course_id = ? AND status != 'closed'");
        $stmt->execute([$amount, $currency, $course['id']]);

        ActivityLogger::log('course.fee_updated', 'course', $course['id'], $user['id'] ?? null, [], ['amount' => $amount, 'currency' => $currency]);

        Response::json(['success' => true, 'min_tuition_fee' => $amount, 'max_tuition_fee' => $amount, 'tuition_fee_currency' => $currency]);
    }

    public function update(string $pid): void
    {
        RBACMiddleware::requirePermission('courses', 'edit');
        $user = AuthMiddleware::user();

        $course = $this->model->findByPublicId($pid);
        if (!$course) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $updateData = [];
        $fields = ['name', 'degree_level', 'duration_months', 'language', 'description', 'eligibility_criteria', 'status'];
        foreach ($fields as $field) {
            if (isset($input[$field])) {
                if ($field === 'duration_months') {
                    $updateData[$field] = (int)$input[$field];
                } elseif ($field === 'status' && !in_array($input[$field], ['active', 'inactive'])) {
                    continue;
                } else {
                    $updateData[$field] = trim((string)$input[$field]);
                }
            }
        }

        if (!empty($updateData)) {
            $this->model->update($course['id'], $updateData);
            ActivityLogger::log('course.updated', 'course', $course['id'], $user['id'] ?? null, [], $updateData);
        }

        $updatedCourse = $this->model->findById($course['id']);
        Response::json(['course' => $updatedCourse]);
    }

    public function delete(string $pid): void
    {
        RBACMiddleware::requirePermission('courses', 'delete');
        $user = AuthMiddleware::user();

        $course = $this->model->findByPublicId($pid);
        if (!$course) {
            Response::error('Course not found', 'NOT_FOUND', 404);
        }

        $this->model->softDeleteWithCascade($course['id']);
        
        ActivityLogger::log('course.deleted', 'course', $course['id'], $user['id'] ?? null);

        Response::json(['success' => true, 'message' => 'Course deleted successfully']);
    }

    public function publicList(string $uniPid): void
    {
        $uni = $this->uniModel->findByPublicId($uniPid);
        if (!$uni || $uni['status'] !== 'active') {
            Response::error('University not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("
            SELECT c.*,
                   (SELECT MIN(tuition_fee_amount) FROM intakes i WHERE i.course_id = c.id AND i.status = 'open') as min_tuition_fee,
                   (SELECT MAX(tuition_fee_amount) FROM intakes i WHERE i.course_id = c.id AND i.status = 'open') as max_tuition_fee,
                   (SELECT MIN(tuition_fee_currency) FROM intakes i WHERE i.course_id = c.id AND i.status = 'open' AND i.tuition_fee_amount IS NOT NULL LIMIT 1) as tuition_fee_currency
            FROM courses c
            WHERE c.university_id = ? AND c.status = 'active' AND c.deleted_at IS NULL
            ORDER BY c.name ASC
        ");
        $stmt->execute([$uni['id']]);
        $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(['courses' => $courses]);
    }
}
