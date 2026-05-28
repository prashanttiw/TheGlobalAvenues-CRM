<?php

declare(strict_types=1);

namespace TGA\CRM\Middleware;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;

final class RateLimitMiddleware
{
    public static function assertAllowed(string $identifier, string $action, int $maxRequests, int $windowSeconds): void
    {
        $pdo = Database::getConnection();
        $now = time();
        $windowStart = gmdate('Y-m-d H:i:s', $now - $windowSeconds);

        $select = $pdo->prepare(
            'SELECT id, requests, window_start
             FROM rate_limits
             WHERE identifier = :identifier AND action = :action
             LIMIT 1'
        );
        $select->execute([
            'identifier' => $identifier,
            'action' => $action,
        ]);

        $existing = $select->fetch(PDO::FETCH_ASSOC);

        if ($existing === false) {
            $insert = $pdo->prepare(
                'INSERT INTO rate_limits (identifier, action, requests, window_start)
                 VALUES (:identifier, :action, 1, :window_start)'
            );
            $insert->execute([
                'identifier' => $identifier,
                'action' => $action,
                'window_start' => gmdate('Y-m-d H:i:s', $now),
            ]);

            return;
        }

        if (($existing['window_start'] ?? '') < $windowStart) {
            $reset = $pdo->prepare(
                'UPDATE rate_limits
                 SET requests = 1, window_start = :window_start
                 WHERE id = :id'
            );
            $reset->execute([
                'window_start' => gmdate('Y-m-d H:i:s', $now),
                'id' => (int) $existing['id'],
            ]);

            return;
        }

        $currentRequests = (int) ($existing['requests'] ?? 0);

        if ($currentRequests >= $maxRequests) {
            Response::error('Too many requests', 'RATE_LIMIT_EXCEEDED', 429);
        }

        $update = $pdo->prepare('UPDATE rate_limits SET requests = requests + 1 WHERE id = :id');
        $update->execute(['id' => (int) $existing['id']]);
    }
}
