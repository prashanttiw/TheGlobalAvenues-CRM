<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\UlidGenerator;

final class NotificationService
{
    /**
     * Dummy hook for Phase 6 dispatch. 
     * Enqueues the notification into the database to be processed later by a cron worker.
     * 
     * @param string $eventKey E.g. 'agent.approved'
     * @param array $payload E.g. ['referral_code' => 'TGA-1234']
     * @param array $userIds Array of user IDs to receive the notification
     */
    public static function fire(string $eventKey, array $payload, array $userIds): void
    {
        try {
            $pdo = Database::getConnection();

            $stmt = $pdo->prepare(
                'INSERT INTO notifications (public_id, event_key, recipient_user_id, channel, body, status, created_at) 
                 VALUES (?, ?, ?, \'email,in_app\', ?, \'queued\', NOW())'
            );

            foreach ($userIds as $userId) {
                $stmt->execute([
                    UlidGenerator::generate(),
                    $eventKey,
                    $userId,
                    json_encode($payload, JSON_UNESCAPED_SLASHES)
                ]);
            }
        } catch (\Exception $e) {
            error_log('[NotificationService Error] Failed to queue notification: ' . $e->getMessage());
        }
    }
}
