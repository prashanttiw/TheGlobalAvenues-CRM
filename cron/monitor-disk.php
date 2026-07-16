<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only'); }

require_once __DIR__ . '/../crm-api/autoload.php';

use TGA\CRM\Config\Environment;
use TGA\CRM\Services\CronHealth;
use TGA\CRM\Services\SystemSettings;
use TGA\CRM\Services\NotificationService;

Environment::load(__DIR__ . '/../crm-api/.env');

set_time_limit(60);
CronHealth::start('monitor_disk');
$startTime = microtime(true);

try {
    $warnPct = (int)SystemSettings::get('disk_warn_threshold_pct', '80');
    $critPct = (int)SystemSettings::get('disk_critical_threshold_pct', '95');

    $projectRoot = dirname(__DIR__);
    $storagePath = $projectRoot . DIRECTORY_SEPARATOR . 'storage';

    if (!is_dir($storagePath)) {
        throw new \RuntimeException("Storage path does not exist: {$storagePath}");
    }

    $total = disk_total_space($storagePath);
    $free  = disk_free_space($storagePath);
    
    if ($total === false || $free === false || $total <= 0) {
        throw new \RuntimeException("Could not read disk space metrics.");
    }

    $usedPct = round(($total - $free) / $total * 100, 1);
    $freeGb = round($free / 1e9, 1);

    if ($usedPct >= $critPct) {
        NotificationService::fire('system.disk_critical', [
            'used_pct' => $usedPct, 
            'free_gb' => $freeGb
        ], NotificationService::getSuperAdminUserIds());
    } elseif ($usedPct >= $warnPct) {
        NotificationService::fire('system.disk_warning', [
            'used_pct' => $usedPct, 
            'free_gb' => $freeGb
        ], NotificationService::getSuperAdminUserIds());
    }

    $duration = (int) ((microtime(true) - $startTime) * 1000);
    CronHealth::success('monitor_disk', $duration, "Disk used: {$usedPct}%");

} catch (\Throwable $e) {
    CronHealth::failure('monitor_disk', $e->getMessage());
    exit(1);
}
