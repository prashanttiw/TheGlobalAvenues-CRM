<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

/**
 * Basic scaffold for CronHealth for Phase 6.2 compatibility.
 * Will be fully implemented in 6.14 Cron Health Dashboard.
 */
final class CronHealth
{
    public static function start(string $cronName): void
    {
        try {
            $pdo = \TGA\CRM\Config\Database::getConnection();
            $stmt = $pdo->prepare("
                INSERT INTO cron_health (job_name, last_run_at, last_run_status, last_run_duration_ms, last_error, run_count)
                VALUES (?, NOW(), 'running', 0, NULL, 1)
                ON DUPLICATE KEY UPDATE last_run_at = NOW(), last_run_status = 'running', last_error = NULL, run_count = run_count + 1
            ");
            $stmt->execute([$cronName]);
        } catch (\Throwable $e) {
            error_log("[CronHealth] start failed for $cronName: " . $e->getMessage());
        }
    }

    public static function success(string $cronName, int $durationMs, string $details = ''): void
    {
        try {
            $pdo = \TGA\CRM\Config\Database::getConnection();
            $stmt = $pdo->prepare("
                UPDATE cron_health 
                SET last_run_status = 'success', last_run_duration_ms = ?, last_error = ? 
                WHERE job_name = ?
            ");
            $stmt->execute([$durationMs, $details, $cronName]);
        } catch (\Throwable $e) {
            error_log("[CronHealth] success failed for $cronName: " . $e->getMessage());
        }
    }

    public static function failure(string $cronName, string $error): void
    {
        try {
            $pdo = \TGA\CRM\Config\Database::getConnection();
            $stmt = $pdo->prepare("
                UPDATE cron_health 
                SET last_run_status = 'failed', last_error = ?, fail_count = fail_count + 1 
                WHERE job_name = ?
            ");
            $stmt->execute([$error, $cronName]);
        } catch (\Throwable $e) {
            error_log("[CronHealth] failure failed for $cronName: " . $e->getMessage());
        }
    }

    public static function checkStuckJobs(int $timeoutMinutes = 15): void
    {
        try {
            $pdo = \TGA\CRM\Config\Database::getConnection();
            $stmt = $pdo->prepare("
                UPDATE cron_health 
                SET last_run_status = 'failed', 
                    last_error = 'Job abruptly terminated or exceeded max execution time', 
                    fail_count = fail_count + 1 
                WHERE last_run_status = 'running' 
                  AND last_run_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)
            ");
            $stmt->execute([$timeoutMinutes]);
        } catch (\Throwable $e) {
            error_log("[CronHealth] checkStuckJobs failed: " . $e->getMessage());
        }
    }
}
