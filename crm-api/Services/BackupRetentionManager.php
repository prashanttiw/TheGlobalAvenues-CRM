<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use Google\Service\Drive;

class BackupRetentionManager
{
    /**
     * Enforces retention policy on backups stored in Drive.
     * Expected settings keys:
     * - backup_retention_daily (e.g. 7)
     * - backup_retention_weekly (e.g. 4)
     * - backup_retention_monthly (e.g. 12)
     */
    public static function enforce(Drive $drive, array $settings): void
    {
        $policies = [
            'daily'   => (int)($settings['backup_retain_daily'] ?? 7),
            'weekly'  => (int)($settings['backup_retain_weekly'] ?? 4),
            'monthly' => (int)($settings['backup_retain_monthly'] ?? 12),
        ];

        foreach ($policies as $subfolder => $limit) {
            if ($limit <= 0) continue;

            try {
                $folderId = DriveFolderManager::ensurePath($drive, "Database_Backups/{$subfolder}");
                
                // Get all files in this folder ordered by createdTime descending
                $query = sprintf(
                    "'%s' in parents and trashed = false",
                    str_replace("'", "\\'", $folderId)
                );
                
                $results = $drive->files->listFiles([
                    'q' => $query,
                    'orderBy' => 'createdTime desc',
                    'fields' => 'files(id, name, createdTime)',
                ]);
                
                $files = $results->getFiles();
                
                // Keep the first $limit files, delete the rest
                if (count($files) > $limit) {
                    $filesToDelete = array_slice($files, $limit);
                    foreach ($filesToDelete as $fileToDelete) {
                        try {
                            $drive->files->delete($fileToDelete->getId());
                            error_log("[BackupRetention] Deleted old {$subfolder} backup: {$fileToDelete->getName()}");
                        } catch (\Throwable $e) {
                            error_log("[BackupRetention] Failed to delete file {$fileToDelete->getId()}: " . $e->getMessage());
                        }
                    }
                }
            } catch (\Throwable $e) {
                error_log("[BackupRetention] Failed to enforce policy for {$subfolder}: " . $e->getMessage());
            }
        }
    }
}
