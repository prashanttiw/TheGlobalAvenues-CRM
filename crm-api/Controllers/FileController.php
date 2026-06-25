<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Services\ActivityLogger;

class FileController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function download(string $pid): void
    {
        $stmt = $this->pdo->prepare("SELECT * FROM files WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$pid]);
        $fileRecord = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$fileRecord) {
            Response::error('File not found', 'NOT_FOUND', 404);
        }

        if (!(bool)$fileRecord['is_public']) {
            $user = AuthMiddleware::user();
            $hasAccess = false;

            if (($user['utype'] ?? $user['user_type']) === 'admin') {
                $hasAccess = true;
            } else {
                // Determine user specific ID
                if (($user['utype'] ?? $user['user_type']) === 'student') {
                    $stmt = $this->pdo->prepare("SELECT id FROM students WHERE user_id = ? AND deleted_at IS NULL");
                    $stmt->execute([$user['id']]);
                    $studentId = $stmt->fetchColumn();

                    if ($studentId) {
                        // Check if student uploaded it
                        if ($fileRecord['uploaded_by_type'] === 'student' && $fileRecord['uploaded_by_id'] == $studentId) {
                            $hasAccess = true;
                        } else {
                            // Check if linked to an application owned by the student
                            $stmt = $this->pdo->prepare("
                                SELECT 1 FROM applications a
                                LEFT JOIN application_updates au ON au.application_id = a.id
                                LEFT JOIN document_requests dr ON dr.application_id = a.id
                                WHERE a.student_id = ? AND (au.file_id = ? OR dr.submitted_file_id = ?)
                                LIMIT 1
                            ");
                            $stmt->execute([$studentId, $fileRecord['id'], $fileRecord['id']]);
                            if ($stmt->fetchColumn()) {
                                $hasAccess = true;
                            }
                        }
                    }
                } elseif (($user['utype'] ?? $user['user_type']) === 'agent') {
                    $stmt = $this->pdo->prepare("SELECT id FROM agents WHERE user_id = ? AND deleted_at IS NULL");
                    $stmt->execute([$user['id']]);
                    $agentId = $stmt->fetchColumn();

                    if ($agentId) {
                        // Check if agent uploaded it
                        if ($fileRecord['uploaded_by_type'] === 'agent' && $fileRecord['uploaded_by_id'] == $agentId) {
                            $hasAccess = true;
                        } else {
                            // Check if linked to an application managed by the agent
                            $stmt = $this->pdo->prepare("
                                SELECT 1 FROM applications a
                                LEFT JOIN application_updates au ON au.application_id = a.id
                                LEFT JOIN document_requests dr ON dr.application_id = a.id
                                WHERE a.agent_id_at_submission = ? AND (au.file_id = ? OR dr.submitted_file_id = ?)
                                LIMIT 1
                            ");
                            $stmt->execute([$agentId, $fileRecord['id'], $fileRecord['id']]);
                            if ($stmt->fetchColumn()) {
                                $hasAccess = true;
                            }
                        }
                    }
                }
            }

            if (!$hasAccess) {
                Response::error('Access denied to this file', 'FORBIDDEN', 403);
            }

        } else {
            $user = null;
        }

        // Determine actual disk path.
        // FileUploadService stored it usually in `storage/private/...` or `storage/public/...` but let's assume `file_path` is the absolute path or relative to project root.
        $baseDir = dirname(__DIR__, 2); // Assuming crm-api is root, and storage is at project root. Wait.
        // Actually, let's just use the stored file_path directly. If it's absolute, it works.
        // Let's assume file_path is relative to project root, e.g. "storage/private/..."
        $absolutePath = $baseDir . DIRECTORY_SEPARATOR . $fileRecord['file_path'];

        if (!file_exists($absolutePath)) {
            // Fallback in case file_path was stored absolute already
            if (file_exists($fileRecord['file_path'])) {
                $absolutePath = $fileRecord['file_path'];
            } else {
                Response::error('Physical file is missing from storage', 'NOT_FOUND', 404);
            }
        }

        if (!empty($fileRecord['checksum_sha256'])) {
            $computedChecksum = hash_file('sha256', $absolutePath);
            if ($computedChecksum !== $fileRecord['checksum_sha256']) {
                $userId = isset($user) ? $user['id'] : null;
                $stmt = $this->pdo->prepare("
                    INSERT INTO security_events (event_type, user_id, identifier, details)
                    VALUES ('file_integrity_failure', ?, ?, ?)
                ");
                $stmt->execute([
                    $userId,
                    $fileRecord['public_id'],
                    json_encode([
                        'expected' => $fileRecord['checksum_sha256'],
                        'computed' => $computedChecksum,
                        'file_path' => $fileRecord['file_path']
                    ], JSON_UNESCAPED_SLASHES)
                ]);
                Response::error('File integrity verification failed', 'SERVER_ERROR', 500);
            }
        }

        // Clean output buffer before streaming binary data
        if (ob_get_level()) {
            ob_end_clean();
        }

        $mimeType = mime_content_type($absolutePath);
        if (!$mimeType) {
            $mimeType = 'application/octet-stream';
        }

        $disposition = (strpos($mimeType, 'image/') === 0) ? 'inline' : 'attachment';

        header('Content-Description: File Transfer');
        header('Content-Type: ' . $mimeType);
        header('Content-Disposition: ' . $disposition . '; filename="' . basename($fileRecord['display_filename']) . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($absolutePath));

        // Use chunked fread for streaming to prevent high memory usage
        // Spec explicitly demands: "Use chunked fread for file downloads. GD library for images. No X-Sendfile."
        $file = @fopen($absolutePath, 'rb');
        if (!$file) {
            Response::error('Could not read file', 'SERVER_ERROR', 500);
        }

        while (!feof($file)) {
            echo fread($file, 8192); // Stream 8KB chunks
            flush();
        }
        
        fclose($file);

        if ($user) {
            ActivityLogger::log(
                'file.downloaded',
                'file',
                $fileRecord['id'],
                $user['id'],
                [],
                ['public_id' => $fileRecord['public_id']]
            );
        }

        exit;
    }
}
