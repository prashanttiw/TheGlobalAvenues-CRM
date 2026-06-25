<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use Exception;

final class SLAService
{
    /**
     * Starts an SLA clock if a matching active rule exists.
     */
    public static function startEvent(PDO $pdo, string $entityType, string $triggerStatus, int $entityId): void
    {
        $stmt = $pdo->prepare("SELECT id, target_hours FROM sla_rules WHERE entity_type = ? AND trigger_status = ? AND is_active = 1");
        $stmt->execute([$entityType, $triggerStatus]);
        $rule = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$rule) {
            return; // No active SLA rule for this trigger
        }

        // Cancel any existing active SLA for this entity (to reset or override)
        self::cancelEvent($pdo, $entityType, $entityId);

        $targetAt = date('Y-m-d H:i:s', strtotime("+{$rule['target_hours']} hours"));

        $stmt = $pdo->prepare("
            INSERT INTO sla_events (sla_rule_id, entity_type, entity_id, started_at, target_at, status)
            VALUES (?, ?, ?, NOW(), ?, 'active')
        ");
        $stmt->execute([$rule['id'], $entityType, $entityId, $targetAt]);
    }

    /**
     * Resolves the current active SLA for the entity.
     */
    public static function resolveEvent(PDO $pdo, string $entityType, int $entityId): void
    {
        $stmt = $pdo->prepare("
            UPDATE sla_events 
            SET status = CASE 
                WHEN NOW() <= target_at THEN 'met' 
                ELSE 'breached' 
            END,
            resolved_at = NOW()
            WHERE entity_type = ? AND entity_id = ? AND status = 'active'
        ");
        $stmt->execute([$entityType, $entityId]);
    }

    /**
     * Cancels an active SLA (e.g. if request is withdrawn or cancelled).
     */
    public static function cancelEvent(PDO $pdo, string $entityType, int $entityId): void
    {
        $stmt = $pdo->prepare("
            UPDATE sla_events 
            SET status = 'met', resolved_at = NOW() 
            WHERE entity_type = ? AND entity_id = ? AND status = 'active'
        ");
        $stmt->execute([$entityType, $entityId]);
    }
}
