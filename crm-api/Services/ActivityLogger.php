<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use TGA\CRM\Config\Database;
use TGA\CRM\Services\JWTService;

final class ActivityLogger
{
    public static function log(
        string $action,
        ?string $targetType = null,
        ?int $targetId = null,
        ?int $userId = null,
        array $beforeValue = [],
        array $afterValue = [],
        ?string $actorUserTypeHint = null
    ): void {
        $pdo = Database::getConnection();
        $actorUserType = null;
        $actorDisplayName = null;

        // Attempt to resolve actor from JWT without calling AuthMiddleware::user()
        // (which calls exit when no token present, bypassing any try/catch).
        try {
            $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
            if (empty($header) && function_exists('getallheaders')) {
                $headers = getallheaders();
                $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
            }
            if (preg_match('/Bearer\s+(.+)$/i', (string) $header, $m)) {
                $payload = JWTService::verifyAccessToken(trim($m[1]));
                if (is_array($payload)) {
                    $currentUserId = isset($payload['sub']) ? (int) $payload['sub'] : null;
                    if ($userId === null || $userId === $currentUserId) {
                        $userId = $currentUserId;
                        $actorUserType = (string) ($payload['utype'] ?? $payload['user_type'] ?? 'system');
                        // The JWT itself never carries a name claim — look the real
                        // display name up from the DB so logs don't just say "System".
                        $actorDisplayName = self::resolveDisplayName($pdo, $actorUserType, $userId) ?? 'System';
                    }
                }
            }
        } catch (\Throwable $e) {
            // Best-effort: leave actor fields null for unauthenticated/system calls
        }

        if ($userId !== null && $actorUserType === null && PHP_SAPI === 'cli') {
            $actorUserType = 'system';
            $actorDisplayName = 'System / Cron';
        }

        // Caller-supplied fallback: some actions (e.g. finishing self-registration)
        // fire before the actor's own JWT has been issued, so there's no
        // Authorization header on the request to resolve identity from. The
        // caller already knows who just acted — use that instead of falling
        // back to an anonymous "System" row.
        if ($actorDisplayName === null && $userId !== null && $actorUserTypeHint !== null) {
            $actorUserType = $actorUserTypeHint;
            $actorDisplayName = self::resolveDisplayName($pdo, $actorUserType, $userId) ?? 'System';
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

    private static function resolveDisplayName(\PDO $pdo, string $userType, ?int $userId): ?string
    {
        if ($userId === null) {
            return null;
        }

        $table = match ($userType) {
            'student' => 'students',
            'agent' => 'agents',
            'admin' => 'admins',
            default => null,
        };
        if ($table === null) {
            return null;
        }

        try {
            $stmt = $pdo->prepare("SELECT full_name FROM {$table} WHERE user_id = ? LIMIT 1");
            $stmt->execute([$userId]);
            $name = $stmt->fetchColumn();
            return is_string($name) && trim($name) !== '' ? trim($name) : null;
        } catch (\Throwable $e) {
            return null;
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
