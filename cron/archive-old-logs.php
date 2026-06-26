<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only'); }

require_once __DIR__ . '/../crm-api/autoload.php';

use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;
use TGA\CRM\Services\CronHealth;

Environment::load(__DIR__ . '/../crm-api/.env');

set_time_limit(300); // 5 minutes max
CronHealth::start('archive_old_logs');
$startTime = microtime(true);

try {
    $pdo = Database::getConnection();

    $twoYearsAgo  = date('Y-m-d', strtotime('-2 years'));
    $fiveYearsAgo = date('Y-m-d', strtotime('-5 years'));

    // Archive activity_logs in batches
    $archived = 0;
    do {
        $pdo->exec("
            INSERT INTO activity_logs_archive
            SELECT * FROM activity_logs
            WHERE created_at < '{$twoYearsAgo}'
            LIMIT 1000
        ");

        $affected = $pdo->exec("
            DELETE FROM activity_logs
            WHERE created_at < '{$twoYearsAgo}'
            LIMIT 1000
        ");
        $archived += $affected;
    } while ($affected >= 1000);

    // Delete old security events
    $pdo->exec("
        DELETE FROM security_events
        WHERE created_at < '{$fiveYearsAgo}'
        LIMIT 1000
    ");

    $duration = (int) ((microtime(true) - $startTime) * 1000);
    CronHealth::success('archive_old_logs', $duration, "Archived: {$archived} rows");

} catch (\Throwable $e) {
    CronHealth::failure('archive_old_logs', $e->getMessage());
}
