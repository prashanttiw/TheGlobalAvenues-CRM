<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only'); }

require_once __DIR__ . '/../crm-api/autoload.php';

use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;
use TGA\CRM\Services\CronHealth;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\NotificationService;

Environment::load(__DIR__ . '/../crm-api/.env');

set_time_limit(120);
CronHealth::start('check_sla_breaches');
$startTime = microtime(true);

try {
    $pdo = Database::getConnection();
    $pdo->beginTransaction();
    $sql = "
        SELECT se.*, sr.rule_name, sr.entity_type
        FROM sla_events se
        JOIN sla_rules sr ON sr.id = se.sla_rule_id
        WHERE se.status = 'active'
          AND se.target_at < NOW()
          AND se.breach_notified = 0
        FOR UPDATE SKIP LOCKED
    ";
    if (!Database::supportsSkipLocked($pdo)) {
        $sql = str_replace('SKIP LOCKED', '', $sql);
    }
    $stmt = $pdo->query($sql);
    $breached = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $processedCount = 0;
    if (empty($breached)) {
        $pdo->commit();
    } else {
        $ids = array_column($breached, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $pdo->prepare("UPDATE sla_events SET status='breached', breach_notified=1 WHERE id IN ($placeholders)")->execute($ids);
        $pdo->commit();
        $processedCount = count($breached);
    }

    foreach ($breached as $event) {
        // breach_notified was already set to 1 for the WHOLE batch above (so a retry never
        // reprocesses an event whose status update already committed). That means if fire()
        // or the activity log throws for one event, isolating it per-event here is the only
        // thing standing between that failure and every LATER event in this same batch
        // silently never getting notified at all (the loop would die, but their
        // breach_notified flag is already 1 — no future run would ever retry them).
        try {
            $overdue = (int)round((time() - strtotime($event['target_at'])) / 3600);

            NotificationService::fire('sla.breached', [
                'rule_name'     => $event['rule_name'],
                'entity_type'   => $event['entity_type'],
                'entity_id'     => $event['entity_id'],
                'target_at'     => $event['target_at'],
                'overdue_hours' => $overdue,
                'admin_url'     => (Environment::get('APP_FRONTEND_URL', '') . '/portal/admin'),
            ], NotificationService::getSuperAdminUserIds());

            ActivityLogger::log('sla.breached', $event['entity_type'], (int)$event['entity_id']);
        } catch (\Throwable $e) {
            error_log('[check-sla-breaches] Notification/log failed for sla_events.id=' . $event['id'] . ': ' . $e->getMessage());
        }
    }

    $duration = (int) ((microtime(true) - $startTime) * 1000);
    CronHealth::success('check_sla_breaches', $duration, "{$processedCount} breaches processed");

} catch (\Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    CronHealth::failure('check_sla_breaches', $e->getMessage());
}
