<?php
require_once __DIR__ . '/../crm-api/autoload.php';

use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;

Environment::load(__DIR__ . '/../crm-api/.env');

$pdo = Database::getConnection();

$sql = "
INSERT INTO notification_templates (event_key, subject_template, body_template, channels, category) VALUES
('sla.breached',
 'SLA Breach: {{rule_name}} — Immediate Action Required',
 'An SLA target has been missed.\n\nRule: {{rule_name}}\nEntity: {{entity_type}} #{{entity_id}}\nTarget was: {{target_at}}\nNow overdue by: {{overdue_hours}} hours\n\nReview: {{admin_url}}',
 'email,in_app', 'system'),
('system.disk_warning',
 'Disk Space Warning: {{used_pct}}% Used',
 'Server disk is {{used_pct}}% full ({{free_gb}} GB free).\n\nTake action before hitting critical threshold.',
 'email,in_app', 'system'),
('system.disk_critical',
 'CRITICAL: Disk Space {{used_pct}}% Used',
 'URGENT: Server disk is {{used_pct}}% full ({{free_gb}} GB free).\n\nImmediate action required or uploads will fail.',
 'email,in_app', 'system')
ON DUPLICATE KEY UPDATE 
    subject_template = VALUES(subject_template), 
    body_template = VALUES(body_template);
";

try {
    $pdo->exec($sql);
    echo "SLA and Disk templates inserted successfully.\n";
} catch (Exception $e) {
    echo "Error inserting templates: " . $e->getMessage() . "\n";
}
