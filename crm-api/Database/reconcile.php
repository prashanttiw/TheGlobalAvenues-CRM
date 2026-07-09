<?php

// ============================================================================
// Safe schema reconciliation — brings an EXISTING database (including
// production, with real data) up to date with the current expected schema,
// without ever dropping, truncating, or touching a row that isn't a
// duplicate explicitly targeted for cleanup.
//
// Unlike setup_database.php (destructive fresh-install tool), this script:
//   - never runs DROP TABLE / TRUNCATE
//   - only applies units (tables / migration files) that are actually missing
//   - halts on the first unexpected error rather than guessing
//   - detects duplicate rows that would block a new UNIQUE constraint and
//     (only with --resolve-duplicates) soft-deletes the extras, logged via
//     ActivityLogger
//
// Usage:
//   php reconcile.php                          Dry run — report only, no writes
//   php reconcile.php --apply                  Apply pending units
//   php reconcile.php --apply --resolve-duplicates   Also auto-resolve duplicate
//                                               data blocking a pending UNIQUE
//                                               constraint (soft-delete only,
//                                               and only on tables with deleted_at)
// ============================================================================

declare(strict_types=1);

namespace TGA\CRM\Database;

use PDO;
use PDOException;

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

require_once __DIR__ . '/../autoload.php';

use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;
use TGA\CRM\Services\ActivityLogger;

Environment::load(__DIR__ . '/../.env');

$options = getopt('', ['apply', 'resolve-duplicates', 'help']);
$apply = isset($options['apply']);
$resolveDuplicates = isset($options['resolve-duplicates']);

if (isset($options['help'])) {
    echo "Usage: php reconcile.php [--apply] [--resolve-duplicates]\n";
    echo "  (no flags)              Dry run — report only, no writes\n";
    echo "  --apply                 Apply pending units\n";
    echo "  --resolve-duplicates    With --apply: soft-delete duplicate rows blocking a pending UNIQUE constraint\n";
    exit(0);
}

// ── Logging: every run writes a timestamped log file, same convention as cron/*.php ──
$logDir = __DIR__ . '/../logs';
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}
$logFile = $logDir . '/reconcile-' . date('Y-m-d-His') . '.log';
$logHandle = fopen($logFile, 'a');

function logLine(string $message): void
{
    global $logHandle;
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $message;
    echo $line . "\n";
    if ($logHandle) {
        fwrite($logHandle, $line . "\n");
    }
}

logLine('=== reconcile.php starting — mode: ' . ($apply ? 'APPLY' : 'DRY RUN') . ($resolveDuplicates ? ' (resolve-duplicates enabled)' : '') . ' ===');

// MySQL/MariaDB error numbers that mean "the thing this statement wanted to
// create/add/drop already matches the target state" — safe to treat as a
// no-op rather than a real failure. Anything else halts the run.
const SAFE_ALREADY_APPLIED_ERROR_CODES = [
    1050, // ER_TABLE_EXISTS_ERROR
    1060, // ER_DUP_FIELDNAME (duplicate column)
    1061, // ER_DUP_KEYNAME (duplicate index/key name)
    1091, // ER_CANT_DROP_FIELD_OR_KEY (dropping a column/key that's already gone)
    1359, // ER_TRG_ALREADY_EXISTS (trigger already exists)
    1826, // ER_DUP_CONSTRAINT_NAME (duplicate FK/check constraint name)
];

// 1062 (ER_DUP_ENTRY) is NOT on the list above — a duplicate-key error on an arbitrary INSERT
// can mean a real data problem, not just "already applied." But some older seed-only migration
// files (e.g. 038_seeds.sql) use a plain INSERT instead of INSERT IGNORE for pure reference/lookup
// data that's also seeded elsewhere idempotently — colliding with an existing row there is always
// benign. Scoped narrowly: 1062 is only treated as safe when EVERY table the failing unit inserts
// into is one of these known config/lookup tables, never for tables holding real user/business data.
const REFERENCE_ONLY_TABLES = [
    'permissions', 'system_settings', 'sla_rules', 'cron_health', 'notification_templates', 'roles', 'role_permissions',
];

function insertsOnlyIntoReferenceTables(string $sql): bool
{
    if (!preg_match_all('/INSERT\s+(?:IGNORE\s+)?INTO\s+`?(\w+)`?/i', $sql, $matches)) {
        return false; // no INSERT found at all — don't apply this exception
    }
    foreach ($matches[1] as $table) {
        if (!in_array($table, REFERENCE_ONLY_TABLES, true)) {
            return false;
        }
    }
    return true;
}

try {
    $pdo = Database::getConnection();
} catch (\Throwable $e) {
    logLine('FATAL: could not connect to database — ' . $e->getMessage());
    exit(1);
}

// ── Tracking table — the permanent, queryable record of what's been applied ──
// Created even in dry-run (a bare CREATE TABLE IF NOT EXISTS is the one write
// dry-run mode is allowed to make — it's additive, idempotent, and needed so
// the report below can show "already tracked" vs "not yet tracked" honestly).
$pdo->exec("CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_name VARCHAR(255) NOT NULL PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$alreadyTracked = [];
foreach ($pdo->query('SELECT migration_name FROM schema_migrations')->fetchAll(PDO::FETCH_COLUMN) as $name) {
    $alreadyTracked[$name] = true;
}

// ── Build the ordered unit list ──────────────────────────────────────────
// 1. schema.sql, split into one unit per CREATE TABLE (covers migrations 001-037)
// 2. Every file in migrations/*.sql, sorted by filename, one unit per file
//    (covers 038-084; the 048-052 gap is simply absent — no unit generated)
$units = [];

$schemaSql = file_get_contents(__DIR__ . '/schema.sql');
if ($schemaSql === false) {
    logLine('FATAL: could not read schema.sql');
    exit(1);
}
$schemaChunks = preg_split('/(?=^CREATE TABLE )/m', $schemaSql, -1, PREG_SPLIT_NO_EMPTY);
foreach ($schemaChunks as $chunk) {
    $chunk = trim($chunk);
    if ($chunk === '' || !str_starts_with($chunk, 'CREATE TABLE')) {
        continue; // leading header comment before the first CREATE TABLE
    }
    if (preg_match('/^CREATE TABLE\s+`?(\w+)`?/i', $chunk, $m)) {
        $units[] = [
            'name' => 'schema.sql#' . $m[1],
            'sql' => $chunk,
        ];
    }
}

$migrationFiles = glob(__DIR__ . '/migrations/*.sql');
sort($migrationFiles, SORT_STRING);
foreach ($migrationFiles as $path) {
    $sql = file_get_contents($path);
    if ($sql === false || trim($sql) === '') {
        continue;
    }
    $units[] = [
        'name' => 'migrations/' . basename($path),
        'sql' => $sql,
    ];
}

logLine('Built ' . count($units) . ' units (' . count($schemaChunks) . ' from schema.sql, ' . count($migrationFiles) . ' migration files).');

// ── Duplicate-data detection ──────────────────────────────────────────────
// Best-effort text scan (not a full SQL parser) for statements that add a
// UNIQUE constraint, so we can check for pre-existing duplicate values BEFORE
// attempting the ALTER — MySQL would otherwise fail the whole statement with
// an opaque "Duplicate entry" error, or worse, succeed on a table that
// doesn't actually have the duplicates today but could still be handled more
// gracefully than a hard halt.
function findUniqueTargets(string $sql): array
{
    $targets = [];
    foreach (preg_split('/;/', $sql) as $statement) {
        if (!preg_match('/ALTER\s+TABLE\s+`?(\w+)`?/i', $statement, $tableMatch)) {
            continue;
        }
        if (!preg_match('/\bUNIQUE\b/i', $statement)) {
            continue;
        }
        $table = $tableMatch[1];
        if (preg_match('/UNIQUE(?:\s+KEY\s+`?\w+`?)?\s*\(([^)]+)\)/i', $statement, $colMatch)) {
            $columns = array_map(
                fn($c) => trim($c, " `\t\n\r\0\x0B"),
                explode(',', $colMatch[1])
            );
        } elseif (preg_match('/ADD\s+COLUMN\s+`?(\w+)`?[^,;]*\bUNIQUE\b/i', $statement, $colMatch)) {
            $columns = [$colMatch[1]];
        } else {
            continue; // couldn't confidently identify the target column(s) — skip rather than guess
        }
        $targets[] = ['table' => $table, 'columns' => $columns];
    }
    return $targets;
}

function tableExists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare('SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1');
    $stmt->execute([$table]);
    return (bool)$stmt->fetchColumn();
}

function tableHasColumn(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare('SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1');
    $stmt->execute([$table, $column]);
    return (bool)$stmt->fetchColumn();
}

function columnIsNullable(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare('SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1');
    $stmt->execute([$table, $column]);
    return $stmt->fetchColumn() === 'YES';
}

// Returns a report of duplicate groups: [['values' => [...], 'ids' => [id, ...]], ...]
// Ordered oldest-first within each group (lowest id = keeper).
function findDuplicates(PDO $pdo, string $table, array $columns, bool $hasDeletedAt): array
{
    $colList = implode(', ', array_map(fn($c) => "`{$c}`", $columns));
    $where = $hasDeletedAt ? 'WHERE deleted_at IS NULL' : '';
    // Exclude NULL-valued groups — MySQL UNIQUE indexes allow multiple NULLs, so NULLs are never a real conflict.
    $nullGuard = implode(' AND ', array_map(fn($c) => "`{$c}` IS NOT NULL", $columns));
    $where = $where === '' ? "WHERE {$nullGuard}" : "{$where} AND {$nullGuard}";

    $sql = "SELECT {$colList}, GROUP_CONCAT(id ORDER BY id ASC) AS ids, COUNT(*) AS cnt
            FROM `{$table}` {$where}
            GROUP BY {$colList}
            HAVING cnt > 1";
    $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    $duplicates = [];
    foreach ($rows as $row) {
        $ids = array_map('intval', explode(',', $row['ids']));
        $values = [];
        foreach ($columns as $c) {
            $values[$c] = $row[$c];
        }
        $duplicates[] = ['values' => $values, 'ids' => $ids];
    }
    return $duplicates;
}

function reportAndMaybeResolveDuplicates(PDO $pdo, string $table, array $columns, bool $apply, bool $resolveDuplicates, string $unitName): bool
{
    $hasDeletedAt = tableHasColumn($pdo, $table, 'deleted_at');
    $duplicates = findDuplicates($pdo, $table, $columns, $hasDeletedAt);

    if (empty($duplicates)) {
        return true; // no conflict — safe to proceed with this unit
    }

    // Soft-deleting alone is not enough: MySQL's UNIQUE index still sees the value on the
    // soft-deleted rows, so the ALTER would still fail. The removed column value must also be
    // cleared — matching this codebase's own established pattern (migration 039: agents.referral_code
    // was made NULLable specifically so non-active rows could avoid UNIQUE collisions via NULL,
    // since MySQL treats multiple NULLs as distinct). Only safe when every target column is nullable.
    $allColumnsNullable = true;
    foreach ($columns as $col) {
        if (!columnIsNullable($pdo, $table, $col)) {
            $allColumnsNullable = false;
            break;
        }
    }

    logLine("  DUPLICATE CONFLICT on {$table}(" . implode(',', $columns) . ") — " . count($duplicates) . " group(s) found, would block UNIQUE constraint in {$unitName}:");
    foreach ($duplicates as $dup) {
        $valuesStr = implode(', ', array_map(fn($k, $v) => "{$k}={$v}", array_keys($dup['values']), $dup['values']));
        $plan = $hasDeletedAt && $allColumnsNullable
            ? 'would keep ' . $dup['ids'][0] . ', soft-delete + null out rest'
            : ($hasDeletedAt ? 'no — target column(s) are NOT NULL, cannot clear value; manual resolution required' : 'no deleted_at column — manual resolution required');
        logLine("    {$valuesStr} -> ids " . implode(', ', $dup['ids']) . " ({$plan})");
    }

    if (!$apply || !$resolveDuplicates) {
        logLine("  Skipping {$unitName} — re-run with --apply --resolve-duplicates to auto-resolve, or resolve manually first.");
        return false;
    }

    if (!$hasDeletedAt || !$allColumnsNullable) {
        logLine("  HALT: cannot safely auto-resolve (needs deleted_at + nullable target column(s), without hard-deleting). Resolve manually, then re-run.");
        return false;
    }

    foreach ($duplicates as $dup) {
        $keepId = $dup['ids'][0];
        $removeIds = array_slice($dup['ids'], 1);
        foreach ($removeIds as $removeId) {
            $nullAssignments = implode(', ', array_map(fn($c) => "`{$c}` = NULL", $columns));
            $pdo->prepare("UPDATE `{$table}` SET deleted_at = NOW(), {$nullAssignments} WHERE id = ?")->execute([$removeId]);
            ActivityLogger::log(
                'migration.duplicate_resolved',
                $table,
                $removeId,
                null,
                ['id' => $removeId, 'duplicate_values' => $dup['values']],
                ['kept_id' => $keepId, 'deleted_at' => 'NOW()', 'nulled_columns' => $columns, 'reason' => "resolved by reconcile.php for {$unitName}"]
            );
            logLine("    Soft-deleted + nulled {$table}.id={$removeId} (kept {$keepId}), logged to activity_logs.");
        }
    }
    return true;
}

// ── Main loop ──────────────────────────────────────────────────────────────
$applied = 0;
$skippedAlreadyTracked = 0;
$halted = false;

foreach ($units as $unit) {
    $name = $unit['name'];

    if (isset($alreadyTracked[$name])) {
        $skippedAlreadyTracked++;
        continue;
    }

    $uniqueTargets = findUniqueTargets($unit['sql']);
    $blockedByDuplicates = false;
    foreach ($uniqueTargets as $target) {
        if (!tableExists($pdo, $target['table'])) {
            continue; // table doesn't exist yet — this unit will create it, nothing to check
        }
        $allColumnsExist = true;
        foreach ($target['columns'] as $col) {
            if (!tableHasColumn($pdo, $target['table'], $col)) {
                $allColumnsExist = false;
                break;
            }
        }
        if (!$allColumnsExist) {
            continue; // column doesn't exist yet either — nothing to check for duplicates against
        }
        if (!reportAndMaybeResolveDuplicates($pdo, $target['table'], $target['columns'], $apply, $resolveDuplicates, $name)) {
            $blockedByDuplicates = true;
        }
    }
    if ($blockedByDuplicates) {
        if ($apply) {
            logLine("HALT at {$name} — duplicate conflict must be resolved first. No further units attempted.");
            $halted = true;
            break;
        }
        // Dry run: report the conflict but keep previewing the rest of the units — a full
        // picture is more useful for planning than stopping at the first thing found.
        logLine("[DRY RUN] {$name} would HALT here on apply (duplicate conflict above) — continuing preview of remaining units.");
        continue;
    }

    if (!$apply) {
        logLine("[DRY RUN] Would attempt: {$name}");
        continue;
    }

    try {
        $pdo->exec($unit['sql']);
        $pdo->prepare('INSERT INTO schema_migrations (migration_name, note) VALUES (?, ?)')
            ->execute([$name, 'applied']);
        logLine("APPLIED: {$name}");
        $applied++;
    } catch (PDOException $e) {
        $errorCode = $e->errorInfo[1] ?? null;
        $isSafe = in_array($errorCode, SAFE_ALREADY_APPLIED_ERROR_CODES, true)
            || ($errorCode === 1062 && insertsOnlyIntoReferenceTables($unit['sql']));
        if ($isSafe) {
            $pdo->prepare('INSERT INTO schema_migrations (migration_name, note) VALUES (?, ?)')
                ->execute([$name, 'detected already-applied: ' . $e->getMessage()]);
            logLine("ALREADY APPLIED (detected via MySQL error {$errorCode}): {$name} — {$e->getMessage()}");
            $applied++;
        } else {
            logLine("HALT at {$name} — unexpected error ({$errorCode}): {$e->getMessage()}");
            logLine('No further units attempted. Review this error before re-running.');
            $halted = true;
            break;
        }
    }
}

logLine('=== Summary ===');
logLine('Total units: ' . count($units));
logLine('Already tracked (skipped): ' . $skippedAlreadyTracked);
logLine(($apply ? 'Applied/verified this run: ' : 'Pending (would attempt): ') . ($apply ? $applied : (count($units) - $skippedAlreadyTracked)));
if ($halted) {
    logLine('Run HALTED before completing — see above for the exact unit and error. Nothing after the halt point was attempted.');
} elseif (!$apply) {
    logLine('Dry run complete — no changes made. Re-run with --apply to execute.');
} else {
    logLine('Run completed successfully — all units applied or already up to date.');
}

if ($logHandle) {
    fclose($logHandle);
}
exit($halted ? 1 : 0);
