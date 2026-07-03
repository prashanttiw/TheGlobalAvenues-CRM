<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\DriveService;
use TGA\CRM\Helpers\FileHelper;

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
        // FileUploadService stored it usually in `storage/private/...` or `storage/public/...` but let's assume `storage_path` is the absolute path or relative to project root.
        $baseDir = dirname(__DIR__, 2); // Assuming crm-api is root, and storage is at project root. Wait.
        // Actually, let's just use the stored storage_path directly. If it's absolute, it works.
        // Let's assume storage_path is relative to project root, e.g. "storage/private/..."
        $absolutePath = $baseDir . DIRECTORY_SEPARATOR . $fileRecord['storage_path'];

        if (!file_exists($absolutePath)) {
            // Fallback in case storage_path was stored absolute already
            if (file_exists($fileRecord['storage_path'])) {
                $absolutePath = $fileRecord['storage_path'];
            } else {
                Response::error('Physical file is missing from storage', 'NOT_FOUND', 404);
            }
        }

        if (!empty($fileRecord['checksum_sha256'])) {
            $computedChecksum = hash_file('sha256', $absolutePath);
            if ($computedChecksum !== $fileRecord['checksum_sha256']) {
                $userId = isset($user) ? (int) $user['id'] : null;
                \TGA\CRM\Services\SecurityEventLogger::log(
                    'file_integrity_failure',
                    $userId,
                    $fileRecord['public_id'],
                    \TGA\CRM\Middleware\RateLimitMiddleware::getIpAddress(),
                    [
                        'expected' => $fileRecord['checksum_sha256'],
                        'computed' => $computedChecksum,
                        'storage_path' => $fileRecord['storage_path'],
                    ]
                );
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

    /**
     * Permanently erase a file from both Google Drive and local storage.
     * Super admin only, requires a deletion reason.
     */
    public function permanentErase(string $pid): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();

        // 1. Enforce super-admin-only restriction
        $adminStmt = $this->pdo->prepare('SELECT id, is_super_admin FROM admins WHERE user_id = ? LIMIT 1');
        $adminStmt->execute([$user['id']]);
        $admin = $adminStmt->fetch(PDO::FETCH_ASSOC);

        if (!$admin || !(int)$admin['is_super_admin']) {
            Response::error('Super admin access required', 'FORBIDDEN', 403);
        }

        // 2. Validate request body has required deletion reason
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $reason = trim($input['reason'] ?? '');
        if (!$reason) {
            Response::error('Deletion reason is required', 'VALIDATION_ERROR', 400);
        }

        // 3. Find the file record (even if soft-deleted)
        $stmt = $this->pdo->prepare("SELECT * FROM files WHERE public_id = ?");
        $stmt->execute([$pid]);
        $fileRecord = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$fileRecord) {
            Response::error('File not found', 'NOT_FOUND', 404);
        }

        // If already erased
        if ($fileRecord['erasure_status'] === 'erased') {
            Response::json(['success' => true, 'message' => 'File has already been permanently erased.']);
        }

        $driveFileId = $fileRecord['drive_file_id'];
        $driveSyncStatus = $fileRecord['drive_sync_status'];

        $attemptDriveDelete = ($driveSyncStatus === 'synced' && !empty($driveFileId));

        if ($attemptDriveDelete) {
            try {
                // Delete from Google Drive
                DriveService::deleteFile($driveFileId);
                
                // Drive delete succeeded
                $this->pdo->prepare("
                    UPDATE files 
                    SET deleted_at = NOW(),
                        deleted_by = ?,
                        deletion_reason = ?,
                        erasure_status = 'erased',
                        erasure_local_deleted_at = NOW(),
                        erasure_drive_deleted_at = NOW(),
                        erasure_drive_last_error = NULL
                    WHERE id = ?
                ")->execute([$admin['id'], $reason, $fileRecord['id']]);

                // Delete local file
                $baseDir = dirname(__DIR__, 2);
                $absolutePath = $baseDir . DIRECTORY_SEPARATOR . $fileRecord['storage_path'];
                if (!file_exists($absolutePath) && file_exists($fileRecord['storage_path'])) {
                    $absolutePath = $fileRecord['storage_path'];
                }
                if (file_exists($absolutePath)) {
                    @unlink($absolutePath);
                }

                // Log activity
                ActivityLogger::log(
                    'file.permanently_erased',
                    'file',
                    $fileRecord['id'],
                    $user['id'],
                    [],
                    ['public_id' => $fileRecord['public_id'], 'reason' => $reason, 'status' => 'erased']
                );

                Response::json(['success' => true, 'message' => 'File permanently erased from local storage and Google Drive.']);

            } catch (\Throwable $e) {
                // Drive delete failed
                $this->pdo->prepare("
                    UPDATE files 
                    SET erasure_status = 'erase_pending_remote_delete',
                        erasure_drive_last_error = ?,
                        erasure_retry_count = erasure_retry_count + 1
                    WHERE id = ?
                ")->execute([$e->getMessage(), $fileRecord['id']]);

                // Log activity for failure/incomplete erase
                ActivityLogger::log(
                    'file.erase_failed_pending',
                    'file',
                    $fileRecord['id'],
                    $user['id'],
                    [],
                    ['public_id' => $fileRecord['public_id'], 'reason' => $reason, 'error' => $e->getMessage(), 'status' => 'erase_pending_remote_delete']
                );

                Response::json([
                    'success' => false,
                    'error' => 'DRIVE_DELETE_FAILED',
                    'message' => 'Google Drive deletion failed. Local file preserved. Erasure marked pending and will retry in background.',
                    'details' => $e->getMessage()
                ], 502); // 502 Bad Gateway/API failure
            }
        } else {
            // Never synced or sync pending. Skip Drive delete, go straight to local delete.
            $this->pdo->prepare("
                UPDATE files 
                SET deleted_at = NOW(),
                    deleted_by = ?,
                    deletion_reason = ?,
                    erasure_status = 'erased',
                    erasure_local_deleted_at = NOW(),
                    erasure_drive_deleted_at = NULL,
                    erasure_drive_last_error = NULL
                WHERE id = ?
            ")->execute([$admin['id'], $reason, $fileRecord['id']]);

            // Delete local file
            $baseDir = dirname(__DIR__, 2);
            $absolutePath = $baseDir . DIRECTORY_SEPARATOR . $fileRecord['storage_path'];
            if (!file_exists($absolutePath) && file_exists($fileRecord['storage_path'])) {
                $absolutePath = $fileRecord['storage_path'];
            }
            if (file_exists($absolutePath)) {
                @unlink($absolutePath);
            }

            // Log activity
            ActivityLogger::log(
                'file.permanently_erased',
                'file',
                $fileRecord['id'],
                $user['id'],
                [],
                ['public_id' => $fileRecord['public_id'], 'reason' => $reason, 'status' => 'erased']
            );

            Response::json(['success' => true, 'message' => 'File permanently erased locally (never synced to Drive).']);
        }
    }
}
