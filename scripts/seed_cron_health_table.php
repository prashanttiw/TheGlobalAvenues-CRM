<?php
require_once __DIR__ . '/../crm-api/autoload.php';
use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;

Environment::load(__DIR__ . '/../crm-api/.env');

$pdo = Database::getConnection();

$sql = "
CREATE TABLE IF NOT EXISTS cron_health (
    cron_name VARCHAR(64) PRIMARY KEY,
    last_run_at DATETIME,
    status ENUM('running', 'success', 'failed') NOT NULL DEFAULT 'running',
    last_duration_ms INT NOT NULL DEFAULT 0,
    last_error_message TEXT NULL
);
";

try {
    $pdo->exec($sql);
    echo "cron_health table created successfully.\n";
} catch (Exception $e) {
    echo "Error creating table: " . $e->getMessage() . "\n";
}
