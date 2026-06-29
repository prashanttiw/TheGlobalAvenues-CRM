<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only'); }

require_once __DIR__ . '/../crm-api/autoload.php';

// If composer autoload exists, load it to get Google SDK
if (file_exists(__DIR__ . '/../crm-api/vendor/autoload.php')) {
    require_once __DIR__ . '/../crm-api/vendor/autoload.php';
}

use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;
use TGA\CRM\Services\CronHealth;
use TGA\CRM\Services\DriveFolderManager;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\DriveService;

Environment::load(__DIR__ . '/../crm-api/.env');

set_time_limit(280); // 5 min cron limit
CronHealth::start('sync_drive');
$startTime = microtime(true);

try {
    $pdo = Database::getConnection();

    $drive = DriveService::getDrive();
    $client = $drive->getClient();

    // Batch of 20 to avoid API rate limits and execution timeouts
    $stmt = $pdo->query("
        SELECT * FROM files
        WHERE (drive_sync_status = 'pending' OR (drive_sync_status = 'failed' AND sync_attempts < 3))
          AND deleted_at IS NULL
        ORDER BY created_at ASC
        LIMIT 20
    ");
    $pending = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $processedCount = 0;

    foreach ($pending as $file) {
        // Build absolute path
        $projectRoot = dirname(__DIR__);
        $absolutePath = $projectRoot . DIRECTORY_SEPARATOR . $file['storage_path'];

        if (!file_exists($absolutePath)) {
            ActivityLogger::log('file.missing_from_disk', 'file', $file['id'], null, [], $file);
            $pdo->prepare("UPDATE files SET drive_sync_status='failed' WHERE id=?")->execute([$file['id']]);
            continue;
        }

        try {
            $folderId = DriveFolderManager::ensurePath($drive, $file['drive_folder_path']);

            $meta = new \Google\Service\Drive\DriveFile([
                'name'    => $file['display_filename'],
                'parents' => [$folderId],
            ]);

            // Use chunked resumable upload to prevent memory exhaustion on large files
            $client->setDefer(true);
            $request = $drive->files->create($meta, [
                'uploadType' => 'resumable'
            ]);
            
            $media = new \Google\Http\MediaFileUpload(
                $client, 
                $request, 
                $file['mime_type'], 
                null, 
                true, 
                5 * 1024 * 1024
            );
            $media->setFileSize(filesize($absolutePath));
            
            $status = false;
            $handle = fopen($absolutePath, "rb");
            if (!$handle) {
                throw new \RuntimeException('Failed to open physical file for reading.');
            }

            while (!$status && !feof($handle)) {
                $chunk = fread($handle, 5 * 1024 * 1024);
                
                $chunkRetries = 3;
                for ($attempt = 0; $attempt < $chunkRetries; $attempt++) {
                    try {
                        $status = $media->nextChunk($chunk);
                        break;
                    } catch (\Throwable $e) {
                        if ($attempt === $chunkRetries - 1) {
                            throw $e;
                        }
                        // Exponential backoff with jitter
                        usleep(((1 << $attempt) * 1000000) + rand(0, 1000000));
                    }
                }
            }
            fclose($handle);
            
            $client->setDefer(false);
            
            // $status holds the returned DriveFile object upon completion
            $result = $status;

            if ($result && $result->getId()) {
                $pdo->prepare("
                    UPDATE files SET drive_file_id=?, drive_sync_status='synced', updated_at=NOW()
                    WHERE id=?
                ")->execute([$result->getId(), $file['id']]);
                $processedCount++;
            } else {
                throw new \RuntimeException('Failed to get Drive File ID after upload.');
            }

        } catch (\Throwable $e) {
            error_log("[Drive Sync Error] File ID {$file['id']}: " . $e->getMessage());
            $pdo->prepare("UPDATE files SET drive_sync_status='failed', sync_attempts = sync_attempts + 1 WHERE id=?")->execute([$file['id']]);
        }
    }

    $duration = (int) ((microtime(true) - $startTime) * 1000);
    CronHealth::success('sync_drive', $duration, "{$processedCount} files processed");

} catch (\Throwable $e) {
    CronHealth::failure('sync_drive', $e->getMessage());
}
