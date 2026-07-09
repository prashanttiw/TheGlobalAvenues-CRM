<?php

// SUPERSEDED by reconcile.php (2026-07-10) — this script blindly re-runs every 060-089 file with
// no idempotency check, so it errors out on any migration already applied. reconcile.php replays
// the full history (001 onward), classifies "already applied" MySQL errors safely, detects
// duplicate-data conflicts before adding UNIQUE constraints, and is dry-run by default. Kept here
// unmodified for reference; prefer reconcile.php for bringing an existing database up to date.

declare(strict_types=1);

require_once __DIR__ . '/../autoload.php';

use TGA\CRM\Config\Environment;
use TGA\CRM\Config\Database;

Environment::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Running missing migrations (060 to 089)...\n";

    $migrationsDir = __DIR__ . '/migrations';
    $files = scandir($migrationsDir);

    sort($files);

    foreach ($files as $file) {
        // Was '^(06[0-9]|070)_.*\.sql$' — silently skipped 071-080 (11 migration files:
        // custom fields, university_campuses/campus_group_id, application cap, agent
        // onboarding/mobile encryption, HTML email templates, users email-unique-per-usertype,
        // search prefix hashes). Widened to cover 060-089 so newly added migrations in that
        // range keep working without another silent gap.
        if (preg_match('/^(06[0-9]|07[0-9]|08[0-9])_.*\.sql$/', $file, $matches)) {
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
