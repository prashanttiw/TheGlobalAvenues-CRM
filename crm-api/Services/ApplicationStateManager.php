<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use TGA\CRM\Helpers\Response;

final class ApplicationStateManager
{
    private static array $transitions = [
        'draft' => ['submitted' => ['student', 'agent', 'admin']],
        'submitted' => [
            'under_review' => ['admin'],
            'withdrawn' => ['student', 'admin']
        ],
        'under_review' => [
            'offer_received' => ['admin'],
            'rejected' => ['admin'],
            'waitlisted' => ['admin'],
            'withdrawn' => ['student', 'admin']
        ],
        'offer_received' => [
            'enrolled' => ['admin'],
            'rejected' => ['admin'],
        ],
        'waitlisted' => [
            'submitted' => ['admin'],
            'rejected' => ['admin'],
            'withdrawn' => ['student', 'admin']
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

        if ($toStatus === 'enrolled') {
            // Enrolled per intake limit guard
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM applications WHERE student_id = ? AND intake_id = ? AND status = 'enrolled' AND deleted_at IS NULL AND id != ?");
            $stmt->execute([$app['student_id'], $app['intake_id'], $applicationId]);
            if ((int)$stmt->fetchColumn() > 0) {
                Response::error('Student is already enrolled in this intake', 'CONFLICT', 409);
            }
        }

        $pdo->prepare('UPDATE applications SET status = ?, updated_at = NOW() WHERE id = ?')->execute([$toStatus, $applicationId]);

        $statusMap = [
            'submitted' => 'application_submitted',
            'offer_received' => 'offer_received',
            'enrolled' => 'enrolled',
            'under_review' => 'application_in_progress',
            'rejected' => 'application_in_progress',
            'withdrawn' => 'application_in_progress'
        ];

        if (isset($statusMap[$toStatus])) {
            $pdo->prepare('UPDATE students SET profile_status = ? WHERE id = ?')->execute([$statusMap[$toStatus], $app['student_id']]);
        }

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
