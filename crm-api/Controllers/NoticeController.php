<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Models\NoticeModel;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\NotificationService;
use TGA\CRM\Services\FileUploadService;

class NoticeController
{
    private PDO $pdo;
    private NoticeModel $model;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
        $this->model = new NoticeModel($this->pdo);
    }

    public function adminList(): void
    {
        RBACMiddleware::requirePermission('notices', 'view');

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 20;
        $offset = ($page - 1) * $perPage;

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM notices WHERE deleted_at IS NULL");
        $countStmt->execute();
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->pdo->prepare("
            SELECT id, public_id, title, notice_type, status, published_at, expires_at, created_at,
                   visible_to_students, visible_to_agents, visible_to_admins 
            FROM notices 
            WHERE deleted_at IS NULL 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $perPage, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $notices = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $notices,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage),
                'has_next' => ($page * $perPage) < $total
            ]
        ]);
    }

    public function adminGet(string $pid): void
    {
        RBACMiddleware::requirePermission('notices', 'view');

        $notice = $this->model->findByPublicId($pid);
        if (!$notice) {
            Response::error('Notice not found', 'NOT_FOUND', 404);
        }

        Response::json(['notice' => $notice]);
    }

    public function create(): void
    {
        RBACMiddleware::requirePermission('notices', 'create');
        $user = AuthMiddleware::user();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $title = trim($input['title'] ?? '');
        $content = trim($input['content'] ?? '');

        if (!$title || !$content) {
            Response::error('Title and content are required', 'VALIDATION_ERROR', 400);
        }

        $pid = UlidGenerator::generate();
        $id = $this->model->insert([
            'public_id' => $pid,
            'title' => $title,
            'content' => $content,
            'notice_type' => in_array($input['notice_type'] ?? '', ['notice', 'event']) ? $input['notice_type'] : 'notice',
            'event_date' => $input['event_date'] ?? null,
            'event_location' => $input['event_location'] ?? null,
            'visible_to_students' => !empty($input['visible_to_students']) ? 1 : 0,
            'visible_to_agents' => !empty($input['visible_to_agents']) ? 1 : 0,
            'visible_to_admins' => !empty($input['visible_to_admins']) ? 1 : 0,
            'expires_at' => $input['expires_at'] ?? null,
            'status' => 'draft',
            'created_by' => $user['id']
        ]);

        ActivityLogger::log('notice.created', 'notice', $id, (int)$user['id'], [], ['title' => $title]);

        $notice = $this->model->findById($id);
        Response::json(['notice' => $notice], 201);
    }

    public function update(string $pid): void
    {
        RBACMiddleware::requirePermission('notices', 'edit');
        $user = AuthMiddleware::user();

        $notice = $this->model->findByPublicId($pid);
        if (!$notice) {
            Response::error('Notice not found', 'NOT_FOUND', 404);
        }

        if ($notice['status'] === 'published') {
            Response::error('Cannot edit a published notice. Unpublish or delete it.', 'VALIDATION_ERROR', 400);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $updateData = [];

        $fields = ['title', 'content', 'notice_type', 'event_date', 'event_location', 'expires_at'];
        foreach ($fields as $field) {
            if (isset($input[$field])) {
                $updateData[$field] = $input[$field];
            }
        }

        if (isset($input['visible_to_students'])) $updateData['visible_to_students'] = !empty($input['visible_to_students']) ? 1 : 0;
        if (isset($input['visible_to_agents'])) $updateData['visible_to_agents'] = !empty($input['visible_to_agents']) ? 1 : 0;
        if (isset($input['visible_to_admins'])) $updateData['visible_to_admins'] = !empty($input['visible_to_admins']) ? 1 : 0;

        if (!empty($updateData)) {
            $this->model->update($notice['id'], $updateData);
            ActivityLogger::log('notice.updated', 'notice', $notice['id'], (int)$user['id']);
        }

        $updatedNotice = $this->model->findById($notice['id']);
        Response::json(['notice' => $updatedNotice]);
    }

    public function delete(string $pid): void
    {
        RBACMiddleware::requirePermission('notices', 'delete');
        $user = AuthMiddleware::user();

        $notice = $this->model->findByPublicId($pid);
        if (!$notice) {
            Response::error('Notice not found', 'NOT_FOUND', 404);
        }

        $this->model->softDeleteWithCascade($notice['id']);
        ActivityLogger::log('notice.deleted', 'notice', $notice['id'], (int)$user['id']);

        Response::json(['success' => true, 'message' => 'Notice deleted']);
    }

    public function publish(string $pid): void
    {
        RBACMiddleware::requirePermission('notices', 'edit');
        $user = AuthMiddleware::user();

        $notice = $this->model->findByPublicId($pid);
        if (!$notice) {
            Response::error('Notice not found', 'NOT_FOUND', 404);
        }

        if ($notice['status'] === 'published') {
            Response::json(['success' => true, 'message' => 'Notice is already published']);
            return;
        }

        $this->pdo->prepare("UPDATE notices SET status = 'published', published_at = NOW() WHERE id = ?")
            ->execute([$notice['id']]);

        // Chunked Notification Publishing Logic
        $recipients = [];

        if ((int)$notice['visible_to_students'] === 1) {
            $studentIds = $this->pdo->query("SELECT id FROM users WHERE user_type = 'student' AND status = 'active' AND deleted_at IS NULL")
                ->fetchAll(PDO::FETCH_COLUMN);
            $recipients = array_merge($recipients, $studentIds);
        }

        if ((int)$notice['visible_to_agents'] === 1) {
            $agentIds = $this->pdo->query("SELECT u.id FROM users u JOIN agents a ON a.user_id = u.id WHERE u.status = 'active' AND a.status = 'approved' AND u.deleted_at IS NULL")
                ->fetchAll(PDO::FETCH_COLUMN);
            $recipients = array_merge($recipients, $agentIds);
        }

        if ((int)$notice['visible_to_admins'] === 1) {
            $adminIds = $this->pdo->query("SELECT id FROM users WHERE user_type = 'admin' AND status = 'active' AND deleted_at IS NULL")
                ->fetchAll(PDO::FETCH_COLUMN);
            $recipients = array_merge($recipients, $adminIds);
        }

        $recipients = array_unique($recipients);
        $chunks = array_chunk($recipients, 1000);

        foreach ($chunks as $chunk) {
            NotificationService::fire('notice.published', [
                'title' => $notice['title'],
                'content_preview' => substr(strip_tags($notice['content'] ?? ''), 0, 200),
                'portal_url' => $_ENV['FRONTEND_URL'] ?? 'https://theglobalavenues.com/portal'
            ], $chunk);
        }

        ActivityLogger::log('notice.published', 'notice', $notice['id'], (int)$user['id'], null, ['title' => $notice['title']]);

        Response::json(['success' => true, 'message' => 'Notice published and notifications dispatched']);
    }

    public function studentFeed(): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'student') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $notices = $this->model->getFeedForStudent((int)$user['sub']);
        Response::json(['data' => $notices]);
    }

    public function agentFeed(): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'agent') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $notices = $this->model->getFeedForAgent((int)$user['sub']);
        Response::json(['data' => $notices]);
    }

    public function adminFeed(): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'admin') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $notices = $this->model->getFeedForAdmin();
        Response::json(['data' => $notices]);
    }

    public function uploadAttachment(string $pid): void
    {
        RBACMiddleware::requirePermission('notices', 'edit');
        $user = AuthMiddleware::user();

        $notice = $this->model->findByPublicId($pid);
        if (!$notice) {
            Response::error('Notice not found', 'NOT_FOUND', 404);
        }

        if (!isset($_FILES['attachment']) || $_FILES['attachment']['error'] !== UPLOAD_ERR_OK) {
            Response::error('No file uploaded or upload error', 'VALIDATION_ERROR', 400);
        }

        $fileId = FileUploadService::store($_FILES['attachment'], 'notice', $notice['id'], true);
        if (!$fileId) {
            Response::error('File upload failed', 'INTERNAL_ERROR', 500);
        }

        $this->pdo->prepare("UPDATE notices SET attachment_file_id = ? WHERE id = ?")
            ->execute([$fileId, $notice['id']]);

        ActivityLogger::log('notice.attachment_uploaded', 'notice', $notice['id'], (int)$user['id']);

        Response::json(['success' => true, 'file_id' => $fileId]);
    }
}
