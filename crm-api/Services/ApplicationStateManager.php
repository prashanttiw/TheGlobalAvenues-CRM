<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use TGA\CRM\Helpers\Response;

final class ApplicationStateManager
{
    private static array $transitions = [
        'draft' => ['submitted' => ['student', 'agent', 'admin']],
        'submitted' => ['under_review' => ['admin']],
        'under_review' => [
            'offer_received' => ['admin'],
            'rejected' => ['admin'],
            'waitlisted' => ['admin'],
        ],
        'offer_received' => [
            'enrolled' => ['admin'],
            'rejected' => ['admin'],
        ],
        'waitlisted' => [
            'submitted' => ['admin'],
            'rejected' => ['admin'],
        ],
    ];

    public static function canTransition(string $fromStatus, string $toStatus, string $userType): bool
    {
        $allowed = self::$transitions[$fromStatus][$toStatus] ?? [];
        return in_array($userType, $allowed, true);
    }

    public static function transition(
        PDO $pdo,
        int $applicationId,
        string $toStatus,
        array $user,
        int $actorId
    ): array {
        $userType = (string) ($user['utype'] ?? $user['user_type'] ?? '');

        $stmt = $pdo->prepare('SELECT id, status, student_id, public_id FROM applications WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$applicationId]);
        $app = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$app) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $fromStatus = $app['status'];
        if ($fromStatus === $toStatus) {
            return $app;
        }

        if (!self::canTransition($fromStatus, $toStatus, $userType) && empty($user['is_super'])) {
            Response::error("Cannot transition from '$fromStatus' to '$toStatus' as '$userType'", 'FORBIDDEN', 403);
        }

        $pdo->prepare('UPDATE applications SET status = ?, updated_at = NOW() WHERE id = ?')->execute([$toStatus, $applicationId]);

        if ($toStatus === 'enrolled') {
            $pdo->prepare("UPDATE students SET agent_lock_status = 'locked' WHERE id = ?")->execute([$app['student_id']]);
        }

        $pdo->prepare(
            'INSERT INTO activity_logs (actor_user_id, actor_user_type, actor_display_name, action, target_type, target_id, target_public_id, target_display, before_value, after_value, ip_address, user_agent, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        )->execute([
            $actorId,
            $userType,
            $user['name'] ?? null,
            'application.status_changed',
            'application',
            $applicationId,
            $app['public_id'] ?? null,
            null,
            json_encode(['status' => $fromStatus], JSON_UNESCAPED_SLASHES),
            json_encode(['status' => $toStatus], JSON_UNESCAPED_SLASHES),
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
            substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500),
        ]);

        $app['status'] = $toStatus;
        return $app;
    }
}
