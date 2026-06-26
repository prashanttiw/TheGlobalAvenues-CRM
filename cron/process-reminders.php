<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only'); }

require_once __DIR__ . '/../crm-api/autoload.php';

use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;
use TGA\CRM\Services\CronHealth;
use TGA\CRM\Services\ReminderEngine;
use TGA\CRM\Services\NotificationService;

Environment::load(__DIR__ . '/../crm-api/.env');

// Prevent overlap
set_time_limit(110);
CronHealth::start('process_reminders');
$startTime = microtime(true);

try {
    $pdo = Database::getConnection();
    $pdo->beginTransaction();

    // Pull pending reminders that are due
    $stmt = $pdo->query("
        SELECT * FROM reminders
        WHERE status = 'pending' AND remind_at <= NOW()
        LIMIT 100
        FOR UPDATE SKIP LOCKED
    ");
    $due = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($due)) {
        $pdo->commit();
        $duration = (int) ((microtime(true) - $startTime) * 1000);
        CronHealth::success('process_reminders', $duration, '0 reminders processed');
        exit(0);
    }

    $ids = array_column($due, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $updateStmt = $pdo->prepare("UPDATE reminders SET status='processing' WHERE id IN ($placeholders)");
    $updateStmt->execute($ids);
    $pdo->commit();

    $processedCount = 0;

    foreach ($due as $reminder) {
        $recipients = json_decode($reminder['recipient_user_ids'], true);
        if (empty($recipients) || !is_array($recipients)) {
            $pdo->prepare("UPDATE reminders SET status='sent', sent_at=NOW() WHERE id=?")->execute([$reminder['id']]);
            continue;
        }

        $vars = ReminderEngine::buildVars($reminder['entity_type'], (int) $reminder['entity_id']);
        $eventKey = ReminderEngine::getEventKey($reminder['reminder_type']);

        if ($eventKey && !empty($vars)) {
            try {
                NotificationService::fire($eventKey, $vars, $recipients);
                $processedCount++;
            } catch (\Throwable $e) {
                error_log("[Process Reminders] Failed to fire notification for reminder {$reminder['id']}: " . $e->getMessage());
            }
        }

        $pdo->prepare("UPDATE reminders SET status='sent', sent_at=NOW() WHERE id=?")->execute([$reminder['id']]);
    }

    $duration = (int) ((microtime(true) - $startTime) * 1000);
    CronHealth::success('process_reminders', $duration, "{$processedCount} reminders fired");

} catch (\Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    CronHealth::failure('process_reminders', $e->getMessage());
    exit(1);
}
