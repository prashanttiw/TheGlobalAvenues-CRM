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

class TimelineController
{
    private PDO $pdo;
    private ApplicationModel $appModel;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
        $this->appModel = new ApplicationModel($this->pdo);
    }

    public function adminList(string $appPid): void
    {
        RBACMiddleware::requirePermission('applications', 'view');

        $application = $this->appModel->findByPublicId($appPid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 20;
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM application_updates WHERE application_id = ? AND deleted_at IS NULL");
        $countStmt->execute([$application['id']]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->pdo->prepare("
            SELECT au.*, f.public_id as file_public_id, f.display_filename as file_name, f.file_path
            FROM application_updates au
            LEFT JOIN files f ON au.file_id = f.id
            WHERE au.application_id = ? AND au.deleted_at IS NULL
            ORDER BY au.created_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $application['id'], PDO::PARAM_INT);
        $stmt->bindValue(2, $perPage, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $timeline = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $timeline,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage),
                'has_next' => ($page * $perPage) < $total
            ]
        ]);
    }

    public function adminAddNote(string $appPid): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $application = $this->appModel->findByPublicId($appPid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $content = trim($input['content'] ?? '');
        $itemType = in_array($input['item_type'] ?? '', ['note', 'link']) ? $input['item_type'] : 'note';
        $isVisibleToAgent = isset($input['is_visible_to_agent']) ? (int)$input['is_visible_to_agent'] : 1;

        if (!$content) {
            Response::error('Content is required', 'VALIDATION_ERROR', 400);
        }

        $pid = UlidGenerator::generate();
        $stmt = $this->pdo->prepare("
            INSERT INTO application_updates
            (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id, is_visible_to_agent)
            VALUES (?, ?, 'admin_to_student', ?, ?, 'admin', ?, ?)
        ");
        $stmt->execute([
            $pid,
            $application['id'],
            $itemType,
            $content,
            $user['id'] ?? null,
            $isVisibleToAgent
        ]);

        $updateId = (int)$this->pdo->lastInsertId();
        ActivityLogger::log('application_update.added', 'application_update', $updateId, $user['id'] ?? null);

        Response::json(['success' => true, 'public_id' => $pid], 201);
    }

    public function agentList(string $appPid): void
    {
        RBACMiddleware::requirePermission('applications', 'view');
        $user = AuthMiddleware::user();

        $application = $this->appModel->findByPublicId($appPid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM agents WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $agentId = $stmt->fetchColumn();

        if ($application['agent_id_at_submission'] && $application['agent_id_at_submission'] !== $agentId) {
             Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 20;
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM application_updates WHERE application_id = ? AND is_visible_to_agent = 1 AND deleted_at IS NULL");
        $countStmt->execute([$application['id']]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->pdo->prepare("
            SELECT au.*, f.public_id as file_public_id, f.display_filename as file_name, f.file_path
            FROM application_updates au
            LEFT JOIN files f ON au.file_id = f.id
            WHERE au.application_id = ? AND au.is_visible_to_agent = 1 AND au.deleted_at IS NULL
            ORDER BY au.created_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $application['id'], PDO::PARAM_INT);
        $stmt->bindValue(2, $perPage, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $timeline = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $timeline,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage),
                'has_next' => ($page * $perPage) < $total
            ]
        ]);
    }

    public function agentAddNote(string $appPid): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $application = $this->appModel->findByPublicId($appPid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM agents WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $agentId = $stmt->fetchColumn();

        if ($application['agent_id_at_submission'] && $application['agent_id_at_submission'] !== $agentId) {
             Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $content = trim($input['content'] ?? '');
        $itemType = in_array($input['item_type'] ?? '', ['note', 'link']) ? $input['item_type'] : 'note';

        if (!$content) {
            Response::error('Content is required', 'VALIDATION_ERROR', 400);
        }

        $pid = UlidGenerator::generate();
        $stmt = $this->pdo->prepare("
            INSERT INTO application_updates
            (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id, is_visible_to_agent)
            VALUES (?, ?, 'student_to_admin', ?, ?, 'agent', ?, 1)
        ");
        $stmt->execute([
            $pid,
            $application['id'],
            $itemType,
            $content,
            $user['id'] ?? null
        ]);

        $updateId = (int)$this->pdo->lastInsertId();
        ActivityLogger::log('application_update.added', 'application_update', $updateId, $user['id'] ?? null);

        Response::json(['success' => true, 'public_id' => $pid], 201);
    }

    public function adminDeleteNote(string $appPid, string $notePid): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $application = $this->appModel->findByPublicId($appPid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("SELECT id, application_id FROM application_updates WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$notePid]);
        $note = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$note || $note['application_id'] !== $application['id']) {
            Response::error('Timeline item not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("UPDATE application_updates SET deleted_at = NOW() WHERE id = ?");
        $stmt->execute([$note['id']]);

        ActivityLogger::log('application_update.deleted', 'application_update', $note['id'], $user['id'] ?? null);

        Response::json(['success' => true, 'message' => 'Timeline item deleted successfully']);
    }

    public function studentList(string $appPid): void
    {
        $user = AuthMiddleware::user();

        $application = $this->appModel->findByPublicId($appPid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM students WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $studentId = $stmt->fetchColumn();

        if ($application['student_id'] !== $studentId) {
             Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 20;
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM application_updates WHERE application_id = ? AND deleted_at IS NULL");
        $countStmt->execute([$application['id']]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->pdo->prepare("
            SELECT au.*, f.public_id as file_public_id, f.display_filename as file_name, f.file_path
            FROM application_updates au
            LEFT JOIN files f ON au.file_id = f.id
            WHERE au.application_id = ? AND au.deleted_at IS NULL
            ORDER BY au.created_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $application['id'], PDO::PARAM_INT);
        $stmt->bindValue(2, $perPage, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $timeline = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $timeline,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage),
                'has_next' => ($page * $perPage) < $total
            ]
        ]);
    }
}
