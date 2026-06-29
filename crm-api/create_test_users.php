<?php
require_once __DIR__ . '/vendor/autoload.php';

use TGA\CRM\Services\EncryptionService;

// Load env
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        putenv("$name=$value");
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}

$dbHost = $_ENV['DB_HOST'] ?? 'localhost';
$dbName = $_ENV['DB_NAME'] ?? 'tga_crm';
$dbUser = $_ENV['DB_USER'] ?? 'root';
$dbPass = $_ENV['DB_PASS'] ?? '';

$pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass);

$email2fa = 'admin2fa@theglobalavenues.com';
$emailNo2fa = 'admin@theglobalavenues.com';
$password = 'Password123!';

$enc2fa = EncryptionService::encrypt($email2fa);
$encNo2fa = EncryptionService::encrypt($emailNo2fa);
$hash = password_hash($password, PASSWORD_ARGON2ID, [
    'memory_cost' => $_ENV['ARGON2_MEMORY_COST'] ?? 19456,
    'time_cost' => $_ENV['ARGON2_TIME_COST'] ?? 2,
    'threads' => 2
]);

$hash2fa = \TGA\CRM\Services\EncryptionService::hash(strtolower($email2fa));
$hashNo2fa = \TGA\CRM\Services\EncryptionService::hash(strtolower($emailNo2fa));

$stmt = $pdo->prepare("UPDATE users SET email = ?, email_lookup_hash = ?, password_hash = ?, two_factor_enabled = 1 WHERE id = 1");
$stmt->execute([$enc2fa, $hash2fa, $hash]);

$stmt2 = $pdo->prepare("UPDATE users SET email = ?, email_lookup_hash = ?, password_hash = ?, two_factor_enabled = 0 WHERE id = 2");
$stmt2->execute([$encNo2fa, $hashNo2fa, $hash]);

echo "Updated user 1 (2FA) and user 2 (No 2FA)\n";
