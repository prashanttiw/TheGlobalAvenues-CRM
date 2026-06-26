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
use TGA\CRM\Services\PhpMysqlDump;
use TGA\CRM\Services\DriveFolderManager;
use TGA\CRM\Services\SystemSettings;
use TGA\CRM\Services\BackupRetentionManager;

Environment::load(__DIR__ . '/../crm-api/.env');

set_time_limit(600); // 10 min max for backups
CronHealth::start('backup_db');
$startTime = microtime(true);

$today = date('Y-m-d');
$filename = "tga_crm_{$today}.sql.gz";

$projectRoot = dirname(__DIR__);
$backupDir = $projectRoot . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'backups';

if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

$tmpPath = $backupDir . DIRECTORY_SEPARATOR . $filename;

// Determine if exec/mysqldump is allowed
$execEnabled = function_exists('exec') && !in_array('exec', array_map('trim', explode(',', ini_get('disable_functions'))));

$code = 1;
if ($execEnabled) {
    exec(sprintf(
        'mysqldump -u%s -p%s -h%s %s 2>/dev/null | gzip > %s',
        escapeshellarg(Environment::get('DB_USER', '')),
        escapeshellarg(Environment::get('DB_PASS', '')),
        escapeshellarg(Environment::get('DB_HOST', '')),
        escapeshellarg(Environment::get('DB_NAME', '')),
        escapeshellarg($tmpPath)
    ), $output, $code);
}

if ($code !== 0 || !file_exists($tmpPath)) {
    // Option B: PHP PDO dump fallback
    try {
        $tmpPath = PhpMysqlDump::dump(Database::getConnection(), $tmpPath);
    } catch (\Throwable $e) {
        CronHealth::failure('backup_db', "Backup creation failed: " . $e->getMessage());
        exit(1);
    }
}

// Upload to Drive
try {
    $driveConfigPath = Environment::get('DRIVE_SERVICE_ACCOUNT_JSON', '');
    if (empty($driveConfigPath) || !file_exists($driveConfigPath)) {
        throw new \RuntimeException('Missing or invalid DRIVE_SERVICE_ACCOUNT_JSON configuration');
    }

    $client = new \Google\Client();
    $client->setAuthConfig($driveConfigPath);
    $client->addScope(\Google\Service\Drive::DRIVE);
    $drive = new \Google\Service\Drive($client);

    // Daily Backup
    DriveFolderManager::uploadBackup($drive, $tmpPath, 'daily', $filename);

    // Weekly: Monday
    if (date('N') === '1') {
        DriveFolderManager::uploadBackup($drive, $tmpPath, 'weekly', $filename);
    }
    
    // Monthly: 1st
    if (date('j') === '1') {
        DriveFolderManager::uploadBackup($drive, $tmpPath, 'monthly', $filename);
    }

    // Enforce retention
    BackupRetentionManager::enforce($drive, SystemSettings::getAll());

    // Cleanup local file
    if (file_exists($tmpPath)) {
        unlink($tmpPath);
    }

    $duration = (int) ((microtime(true) - $startTime) * 1000);
    CronHealth::success('backup_db', $duration, "Backup: {$filename}");

} catch (\Throwable $e) {
    // Cleanup partial local file if we crash during upload
    if (file_exists($tmpPath)) {
        unlink($tmpPath);
    }
    CronHealth::failure('backup_db', "Drive Sync failed: " . $e->getMessage());
}
