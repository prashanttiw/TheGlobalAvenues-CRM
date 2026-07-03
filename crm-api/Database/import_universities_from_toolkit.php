<?php

declare(strict_types=1);

namespace TGA\CRM\Database;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;
use TGA\CRM\Helpers\UlidGenerator;

require_once __DIR__ . '/../autoload.php';
Environment::load(__DIR__ . '/../.env');

$jsonPath = $argv[1] ?? null;
if (!$jsonPath || !is_file($jsonPath)) {
    fwrite(STDERR, "Usage: php import_universities_from_toolkit.php <path-to-universities_import.json>\n");
    exit(1);
}

$data = json_decode(file_get_contents($jsonPath), true);
if (!is_array($data)) {
    fwrite(STDERR, "Failed to parse JSON at {$jsonPath}\n");
    exit(1);
}

echo "==========================================\n";
echo "  TGA CRM — University Catalog Import\n";
echo "==========================================\n\n";
echo "Loaded " . count($data) . " universities from JSON.\n\n";

$pdo = Database::getConnection();

try {
    // NOTE: TRUNCATE is DDL and causes an implicit commit in MySQL/MariaDB, so the wipe
    // step below cannot be part of the same explicit transaction as the inserts. It runs
    // autocommitted; the insert phase gets its own transaction further down.
    echo "Clearing test application data (commissions, payments, updates, document requests, applications)...\n";
    $pdo->exec("DELETE FROM commissions");
    $pdo->exec("DELETE FROM application_payments");
    $pdo->exec("DELETE FROM application_updates");
    $pdo->exec("DELETE FROM document_requests");
    $pdo->exec("DELETE FROM sla_events WHERE entity_type IN ('application', 'document_request')");
    $pdo->exec("DELETE FROM applications");

    echo "Truncating universities / courses / intakes / university_campuses...\n";
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    $pdo->exec("TRUNCATE TABLE intakes");
    $pdo->exec("TRUNCATE TABLE courses");
    $pdo->exec("TRUNCATE TABLE university_campuses");
    $pdo->exec("TRUNCATE TABLE universities");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

    $pdo->beginTransaction();

    // ---- 2. Insert universities -> campuses -> courses -> intakes ----
    $uniStmt = $pdo->prepare("
        INSERT INTO universities
            (public_id, name, country, city, description, website_url, partnership_type, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())
    ");
    $campusStmt = $pdo->prepare("
        INSERT INTO university_campuses (public_id, university_id, city, is_primary, created_at)
        VALUES (?, ?, ?, ?, NOW())
    ");
    $courseStmt = $pdo->prepare("
        INSERT INTO courses
            (public_id, university_id, name, degree_level, duration_months, language, description, eligibility_criteria, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
    ");
    $intakeStmt = $pdo->prepare("
        INSERT INTO intakes
            (public_id, course_id, name, intake_month, tuition_fee_amount, tuition_fee_currency, requirements_notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'upcoming', NOW())
    ");

    $uniCount = 0;
    $courseCount = 0;
    $intakeCount = 0;
    $campusCount = 0;

    foreach ($data as $uni) {
        $uniPid = UlidGenerator::generate();
        $primaryCity = null;
        foreach ($uni['campuses'] as $c) {
            if (!empty($c['is_primary'])) {
                $primaryCity = $c['city'];
                break;
            }
        }
        if ($primaryCity === null && !empty($uni['campuses'])) {
            $primaryCity = $uni['campuses'][0]['city'];
        }

        $uniStmt->execute([
            $uniPid,
            mb_substr($uni['name'], 0, 500),
            mb_substr($uni['country'], 0, 100),
            $primaryCity !== null ? mb_substr($primaryCity, 0, 255) : null,
            $uni['description'] ?? null,
            $uni['website_url'] ?? null,
            $uni['partnership_type'],
        ]);
        $uniId = (int) $pdo->lastInsertId();
        $uniCount++;

        foreach ($uni['campuses'] as $c) {
            $campusStmt->execute([
                UlidGenerator::generate(),
                $uniId,
                mb_substr($c['city'], 0, 255),
                !empty($c['is_primary']) ? 1 : 0,
            ]);
            $campusCount++;
        }

        foreach ($uni['courses'] as $course) {
            $courseStmt->execute([
                UlidGenerator::generate(),
                $uniId,
                mb_substr($course['name'], 0, 500),
                $course['degree_level'],
                $course['duration_months'],
                $course['language'] ?? 'English',
                $course['description'] ?? null,
                $course['eligibility_criteria'] ?? null,
            ]);
            $courseId = (int) $pdo->lastInsertId();
            $courseCount++;

            foreach ($course['intakes'] as $intake) {
                $intakeStmt->execute([
                    UlidGenerator::generate(),
                    $courseId,
                    mb_substr($intake['name'], 0, 100),
                    $intake['intake_month'],
                    $intake['tuition_fee_amount'],
                    $intake['tuition_fee_currency'],
                    $intake['requirements_notes'] ?? null,
                ]);
                $intakeCount++;
            }
        }

        if ($uniCount % 25 === 0) {
            echo "  ...{$uniCount} universities imported\n";
        }
    }

    $pdo->commit();

    echo "\nImport committed successfully.\n";
    echo "Universities: {$uniCount}\n";
    echo "Campuses: {$campusCount}\n";
    echo "Courses: {$courseCount}\n";
    echo "Intakes: {$intakeCount}\n";
} catch (\Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "IMPORT FAILED: " . $e->getMessage() . "\n");
    fwrite(STDERR, $e->getTraceAsString() . "\n");
    exit(1);
}
