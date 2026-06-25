<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use Exception;

final class ReminderService
{
    /**
     * Schedules a set of reminders based on a deadline and an array of offsets.
     */
    public static function schedule(PDO $pdo, string $entityType, int $entityId, string $deadline, array $offsets, array $recipientUserIds): void
    {
        // First cancel any pending reminders for this entity to prevent duplicates
        self::cancelForEntity($pdo, $entityType, $entityId);

        if (empty($recipientUserIds)) {
            return;
        }

        $recipientsJson = json_encode(array_values(array_unique($recipientUserIds)));
        $deadlineTime = strtotime($deadline);

        $stmt = $pdo->prepare("
            INSERT INTO reminders (entity_type, entity_id, reminder_type, remind_at, recipient_user_ids, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        ");

        foreach ($offsets as $offsetDays => $reminderType) {
            $remindAt = date('Y-m-d H:i:s', strtotime("-{$offsetDays} days", $deadlineTime));
            
            // If the remind time is already in the past, skip scheduling it
            if (strtotime($remindAt) < time()) {
                continue;
            }

            $stmt->execute([
                $entityType,
                $entityId,
                $reminderType,
                $remindAt,
                $recipientsJson
            ]);
        }
    }

    /**
     * Cancels pending reminders for an entity.
     */
    public static function cancelForEntity(PDO $pdo, string $entityType, int $entityId): void
    {
        $stmt = $pdo->prepare("
            UPDATE reminders 
            SET status = 'cancelled' 
            WHERE entity_type = ? AND entity_id = ? AND status = 'pending'
        ");
        $stmt->execute([$entityType, $entityId]);
    }
}
