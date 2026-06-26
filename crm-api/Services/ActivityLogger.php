<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use TGA\CRM\Config\Database;
use TGA\CRM\Middleware\AuthMiddleware;

final class ActivityLogger
{
    public static function log(
        string $action,
        ?string $targetType = null,
        ?int $targetId = null,
        ?int $userId = null,
        array $beforeValue = [],
        array $afterValue = []
    ): void {
        $pdo = Database::getConnection();
        $actorUserType = null;
        $actorDisplayName = null;

        if ($userId === null) {
            try {
                $payload = AuthMiddleware::user();
                $userId = isset($payload['id']) ? (int) $payload['id'] : (isset($payload['sub']) ? (int) $payload['sub'] : null);
                $actorUserType = (string) ($payload['user_type'] ?? $payload['utype'] ?? 'system');
                $actorDisplayName = isset($payload['display_name']) ? (string) $payload['display_name'] : (isset($payload['name']) ? (string) $payload['name'] : 'System');
            } catch (\Throwable $e) {
                // Unauthenticated activity remains loggable; leave actor fields null.
            }
        }

        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $userAgent = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500);

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO activity_logs
                 (actor_user_id, actor_user_type, actor_display_name, action, target_type, target_id, target_public_id, target_display, before_value, after_value, ip_address, user_agent, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
            );

            $stmt->execute([
                $userId,
                $actorUserType,
                $actorDisplayName,
                $action,
                $targetType,
                $targetId,
                $afterValue['public_id'] ?? null,
                $afterValue['display'] ?? $afterValue['name'] ?? $afterValue['full_name'] ?? null,
                self::sanitizeSnapshot($beforeValue),
                self::sanitizeSnapshot($afterValue),
                $ip,
                $userAgent,
            ]);
        } catch (\Throwable $e) {
            error_log('[ActivityLogger Error] ' . $e->getMessage());
        }
    }

    private static function sanitizeSnapshot(array $record): ?string
    {
        if ($record === []) {
            return null;
        }

        foreach (['password_hash', 'email', 'phone', 'passport_number', 'refresh_token_hash', 'jti_hash'] as $sensitiveKey) {
            unset($record[$sensitiveKey]);
        }

        foreach ($record as $key => $value) {
            if (is_string($value) && strlen($value) > 500) {
                $record[$key] = substr($value, 0, 500) . '...[truncated]';
            }
        }

        return json_encode($record, JSON_UNESCAPED_SLASHES);
    }
}
