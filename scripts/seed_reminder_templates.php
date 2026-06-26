<?php
require_once __DIR__ . '/../crm-api/autoload.php';

use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;

Environment::load(__DIR__ . '/../crm-api/.env');

$pdo = Database::getConnection();

$sql = "
INSERT INTO notification_templates (event_key, subject_template, body_template, channels, category) VALUES
('reminder.deadline_3days',
 'Action Required: {{item_label}} Due in 3 Days',
 'Hi {{recipient_name}},\n\nReminder: {{item_label}} is due on {{deadline}} — 3 days away.\n\nPlease act before the deadline.\n\nThe Global Avenues',
 'email,in_app', 'documents'),
('reminder.deadline_1day',
 'Urgent: {{item_label}} Due Tomorrow',
 'Hi {{recipient_name}},\n\n{{item_label}} is due TOMORROW ({{deadline}}).\n\nPlease act today.\n\nThe Global Avenues',
 'email,in_app', 'documents'),
('reminder.overdue',
 'Overdue: {{item_label}}',
 'Hi {{recipient_name}},\n\n{{item_label}} was due on {{deadline}} and is now overdue.\n\nPlease resolve this urgently.\n\nThe Global Avenues',
 'email,in_app', 'documents'),
('reminder.commission_pending',
 'Commission Pending: {{days_pending}} Days — Action Required',
 'Admin notice: Commission for student {{student_name}} (Agent: {{agent_name}}) has been pending for {{days_pending}} days.\n\nAmount: {{amount}}\n\nReview: {{admin_url}}',
 'email,in_app', 'approvals')
ON DUPLICATE KEY UPDATE 
    subject_template = VALUES(subject_template), 
    body_template = VALUES(body_template);
";

try {
    $pdo->exec($sql);
    echo "Templates inserted successfully.\n";
} catch (Exception $e) {
    echo "Error inserting templates: " . $e->getMessage() . "\n";
}
