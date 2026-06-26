<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Models\UniversityModel;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\FileUploadService;
use TGA\CRM\Config\Environment;

class UniversityController
{
    private PDO $pdo;
    private UniversityModel $model;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
        $this->model = new UniversityModel($this->pdo);
    }

    // --- Admin Endpoints ---

    public function adminList(): void
    {
        RBACMiddleware::requirePermission('universities', 'view');

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 20;

        $result = $this->model->paginate($page, $perPage);
        
        $appUrl = Environment::get('APP_URL') ?: 'http://localhost';
        foreach ($result['data'] as &$uni) {
            $this->formatLogo($uni, $appUrl);
        }

        Response::json($result);
    }

    public function adminGet(string $pid): void
    {
        RBACMiddleware::requirePermission('universities', 'view');

        $uni = $this->model->findByPublicId($pid);
        if (!$uni) {
            Response::error('University not found', 'NOT_FOUND', 404);
        }

        $appUrl = Environment::get('APP_URL') ?: 'http://localhost';
        $this->formatLogo($uni, $appUrl);

        Response::json(['university' => $uni]);
    }

    public function create(): void
    {
        RBACMiddleware::requirePermission('universities', 'create');
        $user = AuthMiddleware::user();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $name = trim($input['name'] ?? '');
        $country = trim($input['country'] ?? '');

        if (!$name || !$country) {
            Response::error('Name and country are required', 'VALIDATION_ERROR', 400);
        }

        $pid = UlidGenerator::generate();
        $id = $this->model->insert([
            'public_id' => $pid,
            'name' => $name,
            'country' => $country,
            'city' => trim($input['city'] ?? ''),
            'description' => trim($input['description'] ?? ''),
            'ranking_info' => trim($input['ranking_info'] ?? ''),
            'website_url' => trim($input['website_url'] ?? ''),
            'partnership_type' => in_array($input['partnership_type'] ?? '', ['exclusive', 'non_exclusive']) 
                ? $input['partnership_type'] 
                : 'non_exclusive',
            'status' => 'active',
            'created_by' => $user['id'] ?? null
        ]);

        ActivityLogger::log('university.created', 'university', $id, $user['id'] ?? null, [], ['name' => $name]);

        $uni = $this->model->findById($id);
        Response::json(['university' => $uni], 201);
    }

    public function update(string $pid): void
    {
        RBACMiddleware::requirePermission('universities', 'edit');
        $user = AuthMiddleware::user();

        $uni = $this->model->findByPublicId($pid);
        if (!$uni) {
            Response::error('University not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $updateData = [];
        $fields = ['name', 'country', 'city', 'description', 'ranking_info', 'website_url', 'partnership_type', 'status'];
        foreach ($fields as $field) {
            if (isset($input[$field])) {
                $val = trim((string)$input[$field]);
                if ($field === 'partnership_type' && !in_array($val, ['exclusive', 'non_exclusive'])) {
                    continue;
                }
                if ($field === 'status' && !in_array($val, ['active', 'inactive'])) {
                    continue;
                }
                $updateData[$field] = $val;
            }
        }

        if (!empty($updateData)) {
            $this->model->update($uni['id'], $updateData);
            ActivityLogger::log('university.updated', 'university', $uni['id'], $user['id'] ?? null, [], $updateData);
        }

        $updatedUni = $this->model->findById($uni['id']);
        Response::json(['university' => $updatedUni]);
    }

    public function delete(string $pid): void
    {
        RBACMiddleware::requirePermission('universities', 'delete');
        $user = AuthMiddleware::user();

        $uni = $this->model->findByPublicId($pid);
        if (!$uni) {
            Response::error('University not found', 'NOT_FOUND', 404);
        }

        $this->model->softDeleteWithCascade($uni['id']);
        
        ActivityLogger::log('university.deleted', 'university', $uni['id'], $user['id'] ?? null);

        Response::json(['success' => true, 'message' => 'University deleted successfully']);
    }

    public function uploadLogo(string $pid): void
    {
        RBACMiddleware::requirePermission('universities', 'edit');
        $user = AuthMiddleware::user();

        $uni = $this->model->findByPublicId($pid);
        if (!$uni) {
            Response::error('University not found', 'NOT_FOUND', 404);
        }

        if (!isset($_FILES['logo']) || $_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
            Response::error('No logo file uploaded or upload error', 'VALIDATION_ERROR', 400);
        }

        $fileService = new FileUploadService();
        $uploadResult = $fileService->upload(
            $this->pdo,
            $_FILES['logo'],
            'logo',
            'university',
            $uni['id'],
            'admin',
            $user['id'] ?? 0,
            null,
            true, // isPublic
            'universities' // customStoragePath
        );

        $stmt = $this->pdo->prepare("SELECT id FROM files WHERE public_id = ?");
        $stmt->execute([$uploadResult['public_id']]);
        $fileId = $stmt->fetchColumn();

        // Create 400px thumbnail using GD
        $this->createThumbnail($uploadResult['absolute_path'], $uploadResult['mime_type']);

        $this->model->update($uni['id'], ['logo_file_id' => $fileId]);

        ActivityLogger::log('university.logo_uploaded', 'university', $uni['id'], $user['id'] ?? null);

        $updatedUni = $this->model->findById($uni['id']);
        $appUrl = Environment::get('APP_URL') ?: 'http://localhost';
        $this->formatLogo($updatedUni, $appUrl);

        Response::json(['success' => true, 'university' => $updatedUni]);
    }

    private function createThumbnail(string $sourcePath, string $mimeType): void
    {
        $maxWidth = 400;
        
        list($origWidth, $origHeight) = getimagesize($sourcePath);
        if (!$origWidth || !$origHeight) return;

        $ratio = $maxWidth / $origWidth;
        $newWidth = $maxWidth;
        $newHeight = (int)($origHeight * $ratio);

        $thumb = imagecreatetruecolor($newWidth, $newHeight);

        if ($mimeType === 'image/png') {
            imagealphablending($thumb, false);
            imagesavealpha($thumb, true);
            $transparent = imagecolorallocatealpha($thumb, 255, 255, 255, 127);
            imagefilledrectangle($thumb, 0, 0, $newWidth, $newHeight, $transparent);
            $source = imagecreatefrompng($sourcePath);
        } else {
            $source = imagecreatefromjpeg($sourcePath);
        }

        imagecopyresampled($thumb, $source, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);

        $ext = pathinfo($sourcePath, PATHINFO_EXTENSION);
        $uuid = pathinfo($sourcePath, PATHINFO_FILENAME);
        $thumbPath = dirname($sourcePath) . '/' . $uuid . '_thumb.' . $ext;

        if ($mimeType === 'image/png') {
            imagepng($thumb, $thumbPath);
        } else {
            imagejpeg($thumb, $thumbPath, 85);
        }

        imagedestroy($thumb);
        imagedestroy($source);
    }

    // --- Public Endpoints ---

    public function publicList(): void
    {
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 20;
        $offset = ($page - 1) * $perPage;

        $stmt = $this->pdo->prepare("
            SELECT u.*,
                   (SELECT COUNT(*) FROM courses c WHERE c.university_id = u.id AND c.status = 'active' AND c.deleted_at IS NULL) as course_count
            FROM universities u
            WHERE u.status = 'active' AND u.deleted_at IS NULL
            ORDER BY u.name ASC
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $perPage, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $unis = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $countStmt = $this->pdo->query("SELECT COUNT(*) FROM universities WHERE status = 'active' AND deleted_at IS NULL");
        $total = (int) $countStmt->fetchColumn();

        $appUrl = Environment::get('APP_URL') ?: 'http://localhost';
        foreach ($unis as &$uni) {
            $this->formatLogo($uni, $appUrl);
        }

        Response::json([
            'data' => $unis,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage)
            ]
        ]);
    }

    public function publicGet(string $pid): void
    {
        $uni = $this->model->findByPublicId($pid);
        if (!$uni || $uni['status'] !== 'active') {
            Response::error('University not found', 'NOT_FOUND', 404);
        }

        $appUrl = Environment::get('APP_URL') ?: 'http://localhost';
        $this->formatLogo($uni, $appUrl);

        // Fetch active courses with open intakes count
        $stmt = $this->pdo->prepare("
            SELECT c.*,
                   (SELECT COUNT(*) FROM intakes i WHERE i.course_id = c.id AND i.status = 'open' AND i.deleted_at IS NULL) as open_intake_count
            FROM courses c
            WHERE c.university_id = ? AND c.status = 'active' AND c.deleted_at IS NULL
            ORDER BY c.name ASC
        ");
        $stmt->execute([$uni['id']]);
        $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $uni['courses'] = $courses;

        Response::json(['university' => $uni]);
    }

    private function formatLogo(array &$uni, string $appUrl): void
    {
        if (!empty($uni['logo_file_id'])) {
            if (!isset($uni['stored_filename'])) {
                $stmt = $this->pdo->prepare("SELECT stored_filename FROM files WHERE id = ?");
                $stmt->execute([$uni['logo_file_id']]);
                $uni['stored_filename'] = $stmt->fetchColumn();
            }
            if ($uni['stored_filename']) {
                $ext = pathinfo($uni['stored_filename'], PATHINFO_EXTENSION);
                $uuid = pathinfo($uni['stored_filename'], PATHINFO_FILENAME);
                $uni['logo_url'] = "{$appUrl}/uploads/public/universities/{$uni['stored_filename']}";
                $uni['logo_thumb_url'] = "{$appUrl}/uploads/public/universities/{$uuid}_thumb.{$ext}";
            } else {
                $uni['logo_url'] = null;
                $uni['logo_thumb_url'] = null;
            }
        } else {
            $uni['logo_url'] = null;
            $uni['logo_thumb_url'] = null;
        }
        unset($uni['stored_filename']);
    }
}
