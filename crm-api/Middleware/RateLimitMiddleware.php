<?php

declare(strict_types=1);

namespace TGA\CRM\Middleware;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;
use TGA\CRM\Helpers\Response;

final class RateLimitMiddleware
{
    public static function getIpAddress(): string
    {
        $trustCloudflare = filter_var(Environment::get('TRUST_CLOUDFLARE_IP_HEADER', 'false'), FILTER_VALIDATE_BOOL);
        if ($trustCloudflare && isset($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            $ip = trim((string) $_SERVER['HTTP_CF_CONNECTING_IP']);
            if ($ip !== '') {
                return $ip;
            }
        }

        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }

    public static function assertAllowed(string $identifier, string $action, int $maxRequests, int $windowSeconds): void
    {
        $pdo = Database::getConnection();
        $now = time();
        $windowStart = gmdate('Y-m-d H:i:s', $now - $windowSeconds);

        $nowString = gmdate('Y-m-d H:i:s', $now);
        $upsert = $pdo->prepare(
            'INSERT INTO rate_limits (identifier, action, requests, window_start)
             VALUES (?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE
               requests = IF(window_start < ?, 1, requests + 1),
               window_start = IF(window_start < ?, ?, window_start)'
        );
        $upsert->execute([
            $identifier,
            $action,
            $nowString,
            $windowStart,
            $windowStart,
            $nowString,
        ]);

        $select = $pdo->prepare(
            'SELECT requests, window_start FROM rate_limits WHERE identifier = :identifier AND action = :action'
        );
        $select->execute(['identifier' => $identifier, 'action' => $action]);
        $row = $select->fetch(PDO::FETCH_ASSOC);

        if ($row && (int) $row['requests'] > $maxRequests) {
            $secondsRemaining = $windowSeconds - ($now - strtotime($row['window_start']));
            if ($secondsRemaining < 0) {
                $secondsRemaining = 0;
            }

            // Log rate limit violation to security_events
            try {
                $logStmt = $pdo->prepare(
                    "INSERT INTO security_events (event_type, identifier, ip_address, details, created_at)
                     VALUES ('rate_limit_exceeded', ?, ?, JSON_OBJECT('action', ?, 'requests', ?, 'window_seconds', ?), NOW())"
                );
                $logStmt->execute([
                    $identifier,
                    $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
                    $action,
                    (int) $row['requests'],
                    $windowSeconds
                ]);
            } catch (\Throwable $e) {
                error_log('[RateLimitMiddleware] Failed to log security event: ' . $e->getMessage());
            }

            header('Retry-After: ' . $secondsRemaining);
            Response::error('Too many requests', 'RATE_LIMIT_EXCEEDED', 429);
        }
    }

    /**
     * Checks if a request is allowed under the rate limit.
     * Returns 0 if allowed, or the number of seconds remaining if blocked.
     * Logs to security_events on the 2nd consecutive rejection.
     */
    public static function checkLimit(string $identifier, string $action, int $maxRequests, int $windowSeconds): int
    {
        $pdo = Database::getConnection();
        $now = time();
        $windowStart = gmdate('Y-m-d H:i:s', $now - $windowSeconds);
        $nowString = gmdate('Y-m-d H:i:s', $now);

        $upsert = $pdo->prepare(
            'INSERT INTO rate_limits (identifier, action, requests, window_start)
             VALUES (?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE
               requests = IF(window_start < ?, 1, requests + 1),
               window_start = IF(window_start < ?, ?, window_start)'
        );
        $upsert->execute([
            $identifier,
            $action,
            $nowString,
            $windowStart,
            $windowStart,
            $nowString,
        ]);

        $select = $pdo->prepare(
            'SELECT requests, window_start FROM rate_limits WHERE identifier = :identifier AND action = :action'
        );
        $select->execute(['identifier' => $identifier, 'action' => $action]);
        $row = $select->fetch(PDO::FETCH_ASSOC);

        if ($row && (int) $row['requests'] > $maxRequests) {
            $secondsRemaining = $windowSeconds - ($now - strtotime($row['window_start']));
            if ($secondsRemaining < 0) {
                $secondsRemaining = 0;
            }

            // Log security event ONLY on repeated hits (e.g. maxRequests + 2 which means 2nd rejection)
            if ((int) $row['requests'] === $maxRequests + 2) {
                try {
                    $logStmt = $pdo->prepare(
                        "INSERT INTO security_events (event_type, identifier, ip_address, details, created_at)
                         VALUES ('otp_rate_limit_repeated', ?, ?, JSON_OBJECT('action', ?, 'requests', ?, 'window_seconds', ?), NOW())"
                    );
                    $logStmt->execute([
                        $identifier,
                        self::getIpAddress(),
                        $action,
                        (int) $row['requests'],
                        $windowSeconds
                    ]);
                } catch (\Throwable $e) {
                    error_log('[RateLimitMiddleware] Failed to log security event: ' . $e->getMessage());
                }
            }

            return $secondsRemaining > 0 ? $secondsRemaining : 1;
        }

        return 0;
    }

    public static function enforce(string $key, int $maxRequests, int $windowSeconds): void
    {
        self::assertAllowed($key, 'enforced_action', $maxRequests, $windowSeconds);
    }
}
