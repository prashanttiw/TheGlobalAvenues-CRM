<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use TGA\CRM\Config\Database;

final class SecurityEventLogger
{
    public static function log(
        string $eventType,
        ?int $userId = null,
        ?string $identifier = null,
        ?string $ipAddress = null,
        ?array $details = null
    ): void {
        try {
            $pdo = Database::getConnection();
            $ip = $ipAddress ?? \TGA\CRM\Middleware\RateLimitMiddleware::getIpAddress();
            $userAgent = isset($_SERVER['HTTP_USER_AGENT']) ? substr((string) $_SERVER['HTTP_USER_AGENT'], 0, 500) : null;

            $stmt = $pdo->prepare(
                'INSERT INTO security_events (event_type, user_id, identifier, ip_address, user_agent, details, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())'
            );
            $stmt->execute([
                $eventType,
                $userId,
                $identifier,
                $ip,
                $userAgent,
                $details ? json_encode($details, JSON_UNESCAPED_SLASHES) : null
            ]);
        } catch (\Exception $e) {
            error_log('[SecurityEventLogger Error] ' . $e->getMessage());
        }
    }
}
