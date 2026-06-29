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
            $ip = $ipAddress ?? ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

            $stmt = $pdo->prepare(
                'INSERT INTO security_events (event_type, user_id, identifier, ip_address, details, created_at) 
                 VALUES (?, ?, ?, ?, ?, NOW())'
            );
            $stmt->execute([
                $eventType,
                $userId,
                $identifier,
                $ip,
                $details ? json_encode($details, JSON_UNESCAPED_SLASHES) : null
            ]);
        } catch (\Exception $e) {
            error_log('[SecurityEventLogger Error] ' . $e->getMessage());
        }
    }
}
