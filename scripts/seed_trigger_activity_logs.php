<?php
require_once __DIR__ . '/../crm-api/autoload.php';
use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;

Environment::load(__DIR__ . '/../crm-api/.env');
$pdo = Database::getConnection();

$sql = "
DELIMITER //
CREATE TRIGGER prevent_activity_logs_update
BEFORE UPDATE ON activity_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Activity logs are immutable and cannot be updated.';
END;
//
DELIMITER ;
";

// Because PDO doesn't like DELIMITER, we can just run the CREATE TRIGGER
$triggerSql = "
CREATE TRIGGER prevent_activity_logs_update
BEFORE UPDATE ON activity_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Activity logs are immutable and cannot be updated.';
END;
";

try {
    $pdo->exec("DROP TRIGGER IF EXISTS prevent_activity_logs_update");
    $pdo->exec($triggerSql);
    echo "Trigger prevent_activity_logs_update created.\n";
} catch (Exception $e) {
    echo "Error creating trigger: " . $e->getMessage() . "\n";
}
