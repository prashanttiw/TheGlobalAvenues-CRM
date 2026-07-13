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
use TGA\CRM\Services\HtmlSanitizer;

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
        $perPage = isset($_GET['per_page']) ? max(1, min(100, (int)$_GET['per_page'])) : 20;
        $offset = ($page - 1) * $perPage;

        $sort = ($_GET['sort'] ?? 'desc') === 'asc' ? 'ASC' : 'DESC';
        $noticeType = in_array($_GET['notice_type'] ?? '', ['notice', 'event'], true) ? $_GET['notice_type'] : null;
        $search = trim((string) ($_GET['search'] ?? ''));

        $conditions = ['n.deleted_at IS NULL'];
        $bindParams = [];
        if ($noticeType !== null) {
            $conditions[] = 'n.notice_type = ?';
            $bindParams[] = $noticeType;
        }
        if ($search !== '') {
            // n.content is raw TipTap HTML, so a match can land inside markup rather than visible
            // text — acceptable for a first pass, title matches cover the common case.
            $conditions[] = '(n.title LIKE ? OR n.content LIKE ?)';
            $like = '%' . $search . '%';
            $bindParams[] = $like;
            $bindParams[] = $like;
        }
        $where = 'WHERE ' . implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM notices n {$where}");
        $countStmt->execute($bindParams);
        $total = (int) $countStmt->fetchColumn();

        $listStmt = $this->pdo->prepare("
            SELECT n.id, n.public_id, n.title, n.notice_type, n.status,
                   n.published_at, n.expires_at, n.created_at,
                   n.visible_to_students, n.visible_to_agents, n.visible_to_admins,
                   f.public_id AS attachment_public_id,
                   f.display_filename AS attachment_filename
            FROM notices n
            LEFT JOIN files f ON f.id = n.attachment_file_id AND f.deleted_at IS NULL
            {$where}
            ORDER BY COALESCE(n.published_at, n.created_at) {$sort}
            LIMIT ? OFFSET ?
        ");
        $listStmt->execute(array_merge($bindParams, [$perPage, $offset]));
        $notices = $listStmt->fetchAll(PDO::FETCH_ASSOC);
        $totalPages = $total > 0 ? (int) ceil($total / $perPage) : 1;

        Response::success('OK', [
            'data' => $notices,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
            ],
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
        $title = trim(strip_tags($input['title'] ?? ''));
        $content = trim($input['content'] ?? '');

        if (!$title || !$content) {
            Response::error('Title and content are required', 'VALIDATION_ERROR', 400);
        }

        // Strip dangerous HTML while preserving safe rich-text tags from TipTap
        $content = HtmlSanitizer::clean($content);

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

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $updateData = [];

        $fields = ['title', 'content', 'event_date', 'event_location', 'expires_at'];
        foreach ($fields as $field) {
            if (isset($input[$field])) {
                if ($field === 'title') {
                    $updateData[$field] = trim(strip_tags($input[$field]));
                } elseif ($field === 'content') {
                    $updateData[$field] = HtmlSanitizer::clean($input[$field]);
                } else {
                    $updateData[$field] = $input[$field];
                }
            }
        }

        if (isset($input['notice_type'])) {
            $updateData['notice_type'] = in_array($input['notice_type'], ['notice', 'event'], true)
                ? $input['notice_type']
                : $notice['notice_type'];
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

        $this->model->softDelete($notice['id']);
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

        ActivityLogger::log('notice.published', 'notice', $notice['id'], (int)$user['id'], [], ['title' => $notice['title']]);

        Response::json(['success' => true, 'message' => 'Notice published and notifications dispatched']);
    }

    public function studentFeed(): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'student') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, min(50, (int) $_GET['per_page'])) : 10;
        $offset = ($page - 1) * $perPage;
        $noticeType = $_GET['notice_type'] ?? null;
        if (!in_array($noticeType, ['notice', 'event'], true)) {
            $noticeType = null;
        }

        $sort = ($_GET['sort'] ?? 'desc') === 'asc' ? 'ASC' : 'DESC';
        $total = $this->model->countFeedForStudent($noticeType);
        $notices = $this->model->getFeedForStudent((int) $user['sub'], $perPage, $offset, $noticeType, $sort);
        $totalPages = $total > 0 ? (int) ceil($total / $perPage) : 1;

        Response::success('OK', [
            'notices' => $notices,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
            ],
        ]);
    }

    public function agentFeed(): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'agent') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, min(50, (int) $_GET['per_page'])) : 20;
        $offset = ($page - 1) * $perPage;
        $sort = ($_GET['sort'] ?? 'desc') === 'asc' ? 'ASC' : 'DESC';
        $noticeType = in_array($_GET['notice_type'] ?? '', ['notice', 'event'], true) ? $_GET['notice_type'] : null;

        $total = $this->model->countFeedForAgent($noticeType);
        $notices = $this->model->getFeedForAgent((int)$user['sub'], $perPage, $offset, $noticeType, $sort);
        $totalPages = $total > 0 ? (int) ceil($total / $perPage) : 1;

        Response::success('OK', [
            'notices' => $notices,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
            ],
        ]);
    }

    public function adminFeed(): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'admin') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, min(50, (int) $_GET['per_page'])) : 20;
        $offset = ($page - 1) * $perPage;
        $sort = ($_GET['sort'] ?? 'desc') === 'asc' ? 'ASC' : 'DESC';
        $noticeType = in_array($_GET['notice_type'] ?? '', ['notice', 'event'], true) ? $_GET['notice_type'] : null;

        $total = $this->model->countFeedForAdmin($noticeType);
        $notices = $this->model->getFeedForAdmin($perPage, $offset, $noticeType, $sort);
        $totalPages = $total > 0 ? (int) ceil($total / $perPage) : 1;

        Response::success('OK', [
            'notices' => $notices,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
            ],
        ]);
    }

    public function uploadAttachment(string $pid): void
    {
        RBACMiddleware::requirePermission('notices', 'edit');
        $user = AuthMiddleware::user();

        $notice = $this->model->findByPublicId($pid);
        if (!$notice) {
            Response::error('Notice not found', 'NOT_FOUND', 404);
        }

        if (!isset($_FILES['attachment'])) {
            Response::error('No attachment received by server. Check PHP upload settings.', 'VALIDATION_ERROR', 400);
        }
        $uploadError = (int) $_FILES['attachment']['error'];
        if ($uploadError !== UPLOAD_ERR_OK) {
            $uploadMaxSize = ini_get('upload_max_filesize');
            $errorMsg = match ($uploadError) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => "File too large. Server upload limit is {$uploadMaxSize}. Increase upload_max_filesize in php.ini.",
                UPLOAD_ERR_PARTIAL   => 'Upload interrupted — file was only partially received.',
                UPLOAD_ERR_NO_FILE   => 'No file was sent.',
                UPLOAD_ERR_NO_TMP_DIR => 'Server tmp directory missing. Check PHP configuration.',
                UPLOAD_ERR_CANT_WRITE => 'Server cannot write the uploaded file. Check disk permissions.',
                default              => "Upload failed (PHP error code {$uploadError}).",
            };
            Response::error($errorMsg, 'VALIDATION_ERROR', 400);
        }

        $fileService = new FileUploadService();
        $uploadResult = $fileService->upload(
            $this->pdo,
            $_FILES['attachment'],
            'other',
            'notice',
            $notice['id'],
            'admin',
            (int)$user['id'],
            null,
            true,
            'notices',
            1,
            null,
            10
        );

        $stmt = $this->pdo->prepare("SELECT id FROM files WHERE public_id = ?");
        $stmt->execute([$uploadResult['public_id']]);
        $fileId = (int) $stmt->fetchColumn();

        $this->pdo->prepare("UPDATE notices SET attachment_file_id = ? WHERE id = ?")
            ->execute([$fileId, $notice['id']]);

        ActivityLogger::log('notice.attachment_uploaded', 'notice', $notice['id'], (int)$user['id']);

        Response::json(['success' => true, 'file_public_id' => $uploadResult['public_id']]);
    }
}
