<?php
declare(strict_types=1);

require_once __DIR__ . '/../autoload.php';

use TGA\CRM\Config\Environment;
use TGA\CRM\Config\Database;

Environment::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Running missing migrations (060 to 069)...\n";

    $migrationsDir = __DIR__ . '/migrations';
    $files = scandir($migrationsDir);

    sort($files);

    foreach ($files as $file) {
        if (preg_match('/^(06[0-9])_.*\.sql$/', $file, $matches)) {
            $num = (int)$matches[1];
            echo "Applying migration: $file\n";
            $sql = file_get_contents($migrationsDir . '/' . $file);
            try {
                $pdo->exec($sql);
                echo "Migration $file applied successfully.\n";
            } catch (\PDOException $e) {
                echo "Warning/Error on $file: " . $e->getMessage() . "\n";
            }
        }
    }
    echo "All migrations processed.\n";
} catch (\Throwable $e) {
    echo "Fatal Error: " . $e->getMessage() . "\n";
}
