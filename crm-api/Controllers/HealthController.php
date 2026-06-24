<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDOException;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;

final class HealthController
{
    public function ping(): void
    {
        $dbStatus = 'ok';
        try {
            $pdo = Database::getConnection();
            $pdo->query('SELECT 1');
        } catch (\PDOException $e) {
            $dbStatus = 'error';
        }

        $totalSpace = disk_total_space(__DIR__);
        $freeSpace = disk_free_space(__DIR__);
        $diskPct = $totalSpace > 0 ? round(($freeSpace / $totalSpace) * 100, 2) : 0;

        $crons = [];
        if ($dbStatus === 'ok') {
            try {
                $stmt = $pdo->query('SELECT job_name, last_run_status, last_run_at FROM cron_health');
                $crons = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            } catch (\PDOException $e) {
                // Ignore cron read failures if table doesn't exist yet
            }
        }

        Response::json([
            'success' => true,
            'data' => [
                'status' => 'ok',
                'php_version' => PHP_VERSION,
                'db' => $dbStatus,
                'disk_free_pct' => $diskPct,
                'crons' => $crons,
                'timestamp' => gmdate('Y-m-d\TH:i:s\Z')
            ]
        ]);
    }
}
