<?php

declare(strict_types=1);

namespace TGA\CRM\Database;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;
use TGA\CRM\Helpers\CampusCityValidator;
use TGA\CRM\Helpers\UlidGenerator;

require_once __DIR__ . '/../autoload.php';
Environment::load(__DIR__ . '/../.env');

$overrides = require __DIR__ . '/campus_city_country_overrides.php';

echo "==========================================\n";
echo "  Promote university_campuses to campuses\n";
echo "==========================================\n\n";

$pdo = Database::getConnection();

function inferCountry(string $city, ?string $annotationCountry, string $parentCountry, array $overrides): string
{
    if ($annotationCountry) {
        return $annotationCountry;
    }
    $override = $overrides[mb_strtolower($city)] ?? null;
    return $override ?? $parentCountry;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->query("
        SELECT u.id, u.public_id, u.name, u.country, u.city, u.partnership_type, u.description, u.campus_group_id
        FROM universities u
        WHERE u.id IN (SELECT university_id FROM university_campuses GROUP BY university_id HAVING COUNT(*) > 1)
        ORDER BY u.name
    ");
    $universities = $stmt->fetchAll();

    $insertUni = $pdo->prepare("
        INSERT INTO universities (public_id, name, country, city, partnership_type, campus_group_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())
    ");
    $updateGroupId = $pdo->prepare("UPDATE universities SET campus_group_id = ? WHERE id = ?");
    $updateDescription = $pdo->prepare("UPDATE universities SET description = ? WHERE id = ?");
    $citiesStmt = $pdo->prepare("SELECT city FROM university_campuses WHERE university_id = ?");

    $universitiesAffected = 0;
    $campusesPromoted = 0;
    $universitiesWithNotes = 0;
    $universitiesSkippedIdempotent = 0;
    $report = [];

    foreach ($universities as $uni) {
        if ($uni['campus_group_id'] !== null) {
            $universitiesSkippedIdempotent++;
            continue;
        }

        $citiesStmt->execute([$uni['id']]);
        $rawCities = array_column($citiesStmt->fetchAll(), 'city');

        $promotable = [];
        $rejected = [];
        foreach ($rawCities as $rawCity) {
            if (CampusCityValidator::isPromotable($rawCity)) {
                [$city, $annotationCountry] = CampusCityValidator::splitCountryAnnotation($rawCity);
                $country = inferCountry($city, $annotationCountry, $uni['country'], $overrides);
                // skip candidates that just restate the parent's own already-set city (the
                // "primary campus" row in university_campuses duplicates it) -- not a new campus
                if ($uni['city'] !== null && mb_strtolower($city) === mb_strtolower($uni['city'])) {
                    continue;
                }
                $promotable[] = ['city' => $city, 'country' => $country, 'raw' => $rawCity];
            } else {
                $rejected[] = $rawCity;
            }
        }

        if (empty($promotable) && empty($rejected)) {
            continue;
        }

        $entry = [
            'name' => $uni['name'], 'country' => $uni['country'],
            'promoted' => [], 'rejected' => $rejected,
        ];

        if (!empty($promotable)) {
            $groupId = UlidGenerator::generate();
            $updateGroupId->execute([$groupId, $uni['id']]);

            foreach ($promotable as $p) {
                $newPid = UlidGenerator::generate();
                $insertUni->execute([
                    $newPid, $uni['name'], $p['country'], $p['city'], $uni['partnership_type'], $groupId,
                ]);
                $entry['promoted'][] = "{$p['city']} ({$p['country']})";
                $campusesPromoted++;
            }
            $universitiesAffected++;
        }

        if (!empty($rejected)) {
            $note = "\n\nOther locations mentioned in source data (unverified): " . implode(', ', $rejected);
            $updateDescription->execute([($uni['description'] ?? '') . $note, $uni['id']]);
            $universitiesWithNotes++;
        }

        $report[] = $entry;
    }

    $pdo->commit();

    foreach ($report as $entry) {
        echo "=== {$entry['name']} ({$entry['country']}) ===\n";
        if ($entry['promoted']) {
            echo "  Promoted: " . implode(' | ', $entry['promoted']) . "\n";
        }
        if ($entry['rejected']) {
            echo "  Kept as note: " . implode(' | ', $entry['rejected']) . "\n";
        }
    }

    echo "\n==========================================\n";
    echo "Universities with new campus siblings: {$universitiesAffected}\n";
    echo "Campuses promoted to full university rows: {$campusesPromoted}\n";
    echo "Universities with a rejected-text note appended: {$universitiesWithNotes}\n";
    echo "Universities skipped (already had a campus_group_id): {$universitiesSkippedIdempotent}\n";
} catch (\Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "MIGRATION FAILED: " . $e->getMessage() . "\n");
    fwrite(STDERR, $e->getTraceAsString() . "\n");
    exit(1);
}
