<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDOException;
use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;
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

        $uploadsWritable = is_writable(__DIR__ . '/../uploads');
        $logsWritable = is_writable(__DIR__ . '/../logs');

        $crons = [];
        if ($dbStatus === 'ok') {
            try {
                $stmt = $pdo->query('SELECT job_name, last_run_status, last_run_at FROM cron_health');
                $crons = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            } catch (\PDOException $e) {
                // Ignore cron read failures if table doesn't exist yet
            }
        }

        // SMTP reachability check (socket-level, no auth)
        $smtpStatus = 'unconfigured';
        $smtpHost = Environment::get('MAIL_HOST', '');
        $smtpPort = (int) Environment::get('MAIL_PORT', '587');
        if (!empty($smtpHost)) {
            $smtpStatus = 'error';
            try {
                $sock = @fsockopen($smtpHost, $smtpPort, $errno, $errstr, 3);
                if ($sock) {
                    fclose($sock);
                    $smtpStatus = 'ok';
                }
            } catch (\Throwable $e) {
                $smtpStatus = 'error';
            }
        }

        // Google Drive service account file check
        $driveStatus = 'unconfigured';
        $driveJsonPath = Environment::get('DRIVE_SERVICE_ACCOUNT_JSON', '');
        if (!empty($driveJsonPath)) {
            $driveStatus = file_exists($driveJsonPath) ? 'credentials_ok' : 'credentials_missing';
        }

        Response::json([
            'success' => true,
            'data' => [
                'status' => 'ok',
                'php_version' => PHP_VERSION,
                'db' => $dbStatus,
                'smtp' => $smtpStatus,
                'drive' => $driveStatus,
                'disk_free_pct' => $diskPct,
                'permissions' => [
                    'uploads_writable' => $uploadsWritable,
                    'logs_writable' => $logsWritable
                ],
                'crons' => $crons,
                'timestamp' => gmdate('Y-m-d\TH:i:s\Z')
            ]
        ]);
    }
}
