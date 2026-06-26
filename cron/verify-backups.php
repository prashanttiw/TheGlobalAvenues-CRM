<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only'); }

require_once __DIR__ . '/../crm-api/autoload.php';

// If composer autoload exists, load it to get Google SDK
if (file_exists(__DIR__ . '/../crm-api/vendor/autoload.php')) {
    require_once __DIR__ . '/../crm-api/vendor/autoload.php';
}

use TGA\CRM\Config\Environment;
use TGA\CRM\Services\CronHealth;
use TGA\CRM\Services\DriveFolderManager;

Environment::load(__DIR__ . '/../crm-api/.env');

set_time_limit(120);
CronHealth::start('verify_backups');
$startTime = microtime(true);

try {
    $driveConfigPath = Environment::get('DRIVE_SERVICE_ACCOUNT_JSON', '');
    if (empty($driveConfigPath) || !file_exists($driveConfigPath)) {
        throw new \RuntimeException('Missing DRIVE_SERVICE_ACCOUNT_JSON');
    }

    $client = new \Google\Client();
    $client->setAuthConfig($driveConfigPath);
    $client->addScope(\Google\Service\Drive::DRIVE);
    $drive = new \Google\Service\Drive($client);

    // Verify daily backup folder
    $folderId = DriveFolderManager::ensurePath($drive, "Database_Backups/daily");
    
    $query = sprintf(
        "'%s' in parents and trashed = false",
        str_replace("'", "\\'", $folderId)
    );
    
    $results = $drive->files->listFiles([
        'q' => $query,
        'orderBy' => 'createdTime desc',
        'fields' => 'files(id, name, size, createdTime)',
        'pageSize' => 1
    ]);
    
    $files = $results->getFiles();
    if (count($files) === 0) {
        throw new \RuntimeException("No recent daily backups found in Drive.");
    }
    
    $latest = $files[0];
    $size = (int) $latest->getSize();
    
    if ($size < 1024) { // Less than 1KB is suspicious
        throw new \RuntimeException("Latest backup '{$latest->getName()}' is suspiciously small ({$size} bytes).");
    }

    $duration = (int) ((microtime(true) - $startTime) * 1000);
    CronHealth::success('verify_backups', $duration, "Latest backup '{$latest->getName()}' verified ok ({$size} bytes).");

} catch (\Throwable $e) {
    CronHealth::failure('verify_backups', $e->getMessage());
}
