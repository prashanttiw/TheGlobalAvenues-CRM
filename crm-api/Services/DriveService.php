<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use Google\Client;
use Google\Service\Drive;
use TGA\CRM\Config\Environment;

class DriveService
{
    private static ?Drive $driveInstance = null;

    /**
     * Get a configured Google Drive Service instance.
     */
    public static function getDrive(): Drive
    {
        if (self::$driveInstance === null) {
            $driveConfigPath = Environment::get('DRIVE_SERVICE_ACCOUNT_JSON', '');
            if (empty($driveConfigPath) || !file_exists($driveConfigPath)) {
                throw new \RuntimeException('Missing or invalid DRIVE_SERVICE_ACCOUNT_JSON configuration');
            }

            $client = new Client();
            $client->setAuthConfig($driveConfigPath);
            $client->addScope(Drive::DRIVE);
            self::$driveInstance = new Drive($client);
        }

        return self::$driveInstance;
    }

    /**
     * Delete a file from Google Drive by its file ID.
     */
    public static function deleteFile(string $driveFileId): bool
    {
        try {
            $drive = self::getDrive();
            $drive->files->delete($driveFileId);
            return true;
        } catch (\Throwable $e) {
            error_log("[DriveService Error] Failed to delete file {$driveFileId} from Google Drive: " . $e->getMessage());
            throw $e;
        }
    }
}
