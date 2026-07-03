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

            // Log only the first rejection of each violation window — logging on every
            // subsequent retry while still blocked drowns the security log in duplicates
            // (a single blocked client retrying for minutes previously produced hundreds
            // of near-identical rows for one incident).
            if ((int) $row['requests'] === $maxRequests + 1) {
                \TGA\CRM\Services\SecurityEventLogger::log(
                    'rate_limit_exceeded',
                    null,
                    self::stripActionPrefix($identifier, $action),
                    self::getIpAddress(),
                    ['action' => $action, 'requests' => (int) $row['requests'], 'window_seconds' => $windowSeconds]
                );
            }

            header('Retry-After: ' . $secondsRemaining);
            Response::error('Too many requests', 'RATE_LIMIT_EXCEEDED', 429);
        }
    }

    /**
     * Rate-limit bucket keys are composite (e.g. "login_email_{$hash}") so distinct actions
     * don't collide in the `rate_limits` table. For the security_events log that composite
     * key is just noise — this strips a leading "{action}_" (or the action's own prefix
     * before its trailing "_ip"/"_email" qualifier) so the log shows the underlying
     * hash/IP instead of an internal implementation detail.
     */
    private static function stripActionPrefix(string $identifier, string $action): string
    {
        foreach ([$action . '_', preg_replace('/_(ip|email)$/', '', $action) . '_ip_', preg_replace('/_(ip|email)$/', '', $action) . '_email_'] as $prefix) {
            if ($prefix !== '_' && str_starts_with($identifier, $prefix)) {
                return substr($identifier, strlen($prefix));
            }
        }
        return $identifier;
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
                \TGA\CRM\Services\SecurityEventLogger::log(
                    'otp_rate_limit_repeated',
                    null,
                    self::stripActionPrefix($identifier, $action),
                    self::getIpAddress(),
                    ['action' => $action, 'requests' => (int) $row['requests'], 'window_seconds' => $windowSeconds]
                );
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
