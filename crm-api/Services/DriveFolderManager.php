<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use TGA\CRM\Config\Environment;

class DriveFolderManager
{
    /**
     * Traverses or creates a folder path in Google Drive, returning the final Folder ID.
     * Starts from the root folder defined by DRIVE_BACKUP_FOLDER_ID.
     */
    public static function ensurePath(Drive $drive, string $path): string
    {
        $rootFolderId = Environment::getRequired('DRIVE_BACKUP_FOLDER_ID');
        $parts = array_filter(explode('/', $path));
        
        $currentParentId = $rootFolderId;
        
        foreach ($parts as $folderName) {
            $folderName = trim($folderName);
            if ($folderName === '') {
                continue;
            }
            
            // Search for folder in current parent
            $query = sprintf(
                "name = '%s' and mimeType = 'application/vnd.google-apps.folder' and '%s' in parents and trashed = false",
                str_replace("'", "\\'", $folderName),
                $currentParentId
            );
            
            $results = $drive->files->listFiles([
                'q' => $query,
                'spaces' => 'drive',
                'fields' => 'files(id, name)',
                'pageSize' => 1
            ]);
            
            if (count($results->getFiles()) > 0) {
                // Folder exists, traverse down
                $currentParentId = $results->getFiles()[0]->getId();
            } else {
                // Create folder
                $meta = new DriveFile([
                    'name' => $folderName,
                    'mimeType' => 'application/vnd.google-apps.folder',
                    'parents' => [$currentParentId],
                ]);
                $created = $drive->files->create($meta, [
                    'fields' => 'id'
                ]);
                $currentParentId = $created->getId();
            }
        }
        
        return $currentParentId;
    }

    /**
     * Uploads a database backup to Google Drive under the Backup root folder.
     */
    public static function uploadBackup(Drive $drive, string $localFilePath, string $subfolderName, string $displayFilename): string
    {
        $rootFolderId = Environment::getRequired('DRIVE_BACKUP_FOLDER_ID');
        $folderId = self::ensurePath($drive, "Database_Backups/{$subfolderName}");

        $meta = new DriveFile([
            'name' => $displayFilename,
            'parents' => [$folderId],
        ]);

        $driveClient = $drive->getClient();
        $driveClient->setDefer(true);

        $request = $drive->files->create($meta, [
            'uploadType' => 'resumable'
        ]);

        $media = new \Google\Http\MediaFileUpload(
            $driveClient,
            $request,
            'application/gzip',
            null,
            true,
            5 * 1024 * 1024
        );
        $media->setFileSize(filesize($localFilePath));

        $status = false;
        $handle = fopen($localFilePath, "rb");
        if (!$handle) {
            throw new \RuntimeException("Could not open backup file for Drive upload: {$localFilePath}");
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
        $driveClient->setDefer(false);

        if (!$status || !$status->getId()) {
            throw new \RuntimeException('Failed to upload backup to Drive.');
        }

        return $status->getId();
    }
}
