<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

require_once __DIR__ . '/../crm-api/autoload.php';

// If composer autoload exists, load it to get Google SDK
if (file_exists(__DIR__ . '/../crm-api/vendor/autoload.php')) {
    require_once __DIR__ . '/../crm-api/vendor/autoload.php';
}

use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;
use TGA\CRM\Services\CronHealth;
use TGA\CRM\Services\DriveService;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\NotificationService;

Environment::load(__DIR__ . '/../crm-api/.env');

set_time_limit(110); // Prevent cron overlaps on slow API
CronHealth::start('retry_pending_erasures');
$startTime = microtime(true);

try {
    $pdo = Database::getConnection();

    // Find files with erasure_status = 'erase_pending_remote_delete'
    // Limit to 10 per execution to avoid execution timeout
    $stmt = $pdo->prepare("
        SELECT * FROM files 
        WHERE erasure_status = 'erase_pending_remote_delete'
        ORDER BY updated_at ASC
        LIMIT 10
    ");
    $stmt->execute();
    $pending = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $processedCount = 0;

    foreach ($pending as $file) {
        $driveFileId = $file['drive_file_id'];
        
        if (empty($driveFileId)) {
            // Succeeded by skipping (no drive file ID to delete remotely)
            $pdo->prepare("
                UPDATE files 
                SET deleted_at = NOW(),
                    erasure_status = 'erased',
                    erasure_local_deleted_at = NOW(),
                    erasure_drive_deleted_at = NULL,
                    erasure_drive_last_error = NULL
                WHERE id = ?
            ")->execute([$file['id']]);

            // Local delete
            $projectRoot = dirname(__DIR__);
            $absolutePath = $projectRoot . DIRECTORY_SEPARATOR . $file['storage_path'];
            if (!file_exists($absolutePath) && file_exists($file['storage_path'])) {
                $absolutePath = $file['storage_path'];
            }
            if (file_exists($absolutePath)) {
                @unlink($absolutePath);
            }

            // Log activity completion
            ActivityLogger::log(
                'file.permanently_erased',
                'file',
                $file['id'],
                null,
                [],
                ['public_id' => $file['public_id'], 'status' => 'erased', 'note' => 'Erase retry completed, no Drive file ID found']
            );

            $processedCount++;
            continue;
        }

        try {
            // Delete from Drive with exponential backoff
            $retries = 3;
            for ($attempt = 0; $attempt < $retries; $attempt++) {
                try {
                    DriveService::deleteFile($driveFileId);
                    break;
                } catch (\Throwable $e) {
                    if ($attempt === $retries - 1) {
                        throw $e;
                    }
                    usleep(((1 << $attempt) * 1000000) + rand(0, 1000000));
                }
            }

            // Success! Complete erasure (update status + local delete)
            $pdo->prepare("
                UPDATE files 
                SET deleted_at = NOW(),
                    erasure_status = 'erased',
                    erasure_local_deleted_at = NOW(),
                    erasure_drive_deleted_at = NOW(),
                    erasure_drive_last_error = NULL
                WHERE id = ?
            ")->execute([$file['id']]);

            // Local delete
            $projectRoot = dirname(__DIR__);
            $absolutePath = $projectRoot . DIRECTORY_SEPARATOR . $file['storage_path'];
            if (!file_exists($absolutePath) && file_exists($file['storage_path'])) {
                $absolutePath = $file['storage_path'];
            }
            if (file_exists($absolutePath)) {
                @unlink($absolutePath);
            }

            // Log activity completion
            ActivityLogger::log(
                'file.permanently_erased',
                'file',
                $file['id'],
                null,
                [],
                ['public_id' => $file['public_id'], 'status' => 'erased', 'note' => 'Erase retry completed successfully']
            );

            $processedCount++;

        } catch (\Throwable $e) {
            $newRetryCount = $file['erasure_retry_count'] + 1;
            
            $pdo->prepare("
                UPDATE files 
                SET erasure_drive_last_error = ?,
                    erasure_retry_count = ?
                WHERE id = ?
            ")->execute([$e->getMessage(), $newRetryCount, $file['id']]);

            error_log("[Erasure Retry Error] File ID {$file['id']} (attempt {$newRetryCount}): " . $e->getMessage());

            // If retry count reaches/exceeds 5 attempts, notify super admin
            if ($newRetryCount >= 5) {
                // Fetch super admin user IDs
                $superAdminUserIds = NotificationService::getSuperAdminUserIds();

                if (!empty($superAdminUserIds)) {
                    NotificationService::fire(
                        'system.erase_remote_delete_failed',
                        [
                            'file_name' => $file['display_filename'],
                            'public_id' => $file['public_id'],
                            'attempts'  => $newRetryCount,
                            'error'     => $e->getMessage()
                        ],
                        $superAdminUserIds
                    );
                }
            }
        }
    }

    $duration = (int) ((microtime(true) - $startTime) * 1000);
    CronHealth::success('retry_pending_erasures', $duration, "{$processedCount} erasures processed");

} catch (\Throwable $e) {
    CronHealth::failure('retry_pending_erasures', $e->getMessage());
}
