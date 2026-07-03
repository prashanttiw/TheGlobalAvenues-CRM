<?php

declare(strict_types=1);

// One-time backfill for migration 080_user_search_prefix_hashes.sql — populates the
// new email_prefix{4,6,8}_hash / phone_prefix{4,6}_hash columns on `users` for every
// row created before this migration existed. New rows are populated at write time by
// the controllers (RegistrationController, StudentController, setup_database.php);
// this script only needs to run once per environment, after the migration is applied.
// Usage: php crm-api/Database/backfill_search_prefix_hashes.php

require_once __DIR__ . '/../autoload.php';

use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;
use TGA\CRM\Services\EncryptionService;

Environment::load(__DIR__ . '/../.env');
$pdo = Database::getConnection();

$rows = $pdo->query("SELECT id, email, phone FROM users WHERE deleted_at IS NULL AND (email IS NOT NULL OR phone IS NOT NULL)")
    ->fetchAll(PDO::FETCH_ASSOC);

$updateStmt = $pdo->prepare(
    "UPDATE users SET email_prefix4_hash = ?, email_prefix6_hash = ?, email_prefix8_hash = ?,
                       phone_prefix4_hash = ?, phone_prefix6_hash = ?
     WHERE id = ?"
);

$updated = 0;
$skipped = 0;

foreach ($rows as $row) {
    $emailPrefix4 = $emailPrefix6 = $emailPrefix8 = null;
    $phonePrefix4 = $phonePrefix6 = null;

    try {
        if (!empty($row['email'])) {
            $email = EncryptionService::decrypt($row['email']);
            $emailPrefix4 = EncryptionService::hashPrefix($email, 4);
            $emailPrefix6 = EncryptionService::hashPrefix($email, 6);
            $emailPrefix8 = EncryptionService::hashPrefix($email, 8);
        }
        if (!empty($row['phone'])) {
            $phone = EncryptionService::decrypt($row['phone']);
            $phonePrefix4 = EncryptionService::hashPhonePrefix($phone, 4);
            $phonePrefix6 = EncryptionService::hashPhonePrefix($phone, 6);
        }
    } catch (\Throwable $e) {
        // Malformed/legacy ciphertext on this one row — skip it rather than aborting
        // the whole backfill; that row simply won't be prefix-searchable.
        $skipped++;
        fwrite(STDERR, "Skipped user id={$row['id']}: {$e->getMessage()}\n");
        continue;
    }

    $updateStmt->execute([$emailPrefix4, $emailPrefix6, $emailPrefix8, $phonePrefix4, $phonePrefix6, $row['id']]);
    $updated++;
}

echo "Backfill complete: {$updated} users updated, {$skipped} skipped (decrypt failures).\n";
