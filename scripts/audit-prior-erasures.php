<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

require_once __DIR__ . '/../crm-api/autoload.php';

use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;

Environment::load(__DIR__ . '/../crm-api/.env');

echo "=== TGA CRM File Erasure Audit Script ===\n";
echo "Scanning for potentially orphaned Google Drive copies from past deletions...\n\n";

try {
    $pdo = Database::getConnection();

    // 1. Scan files table for soft-deleted records that were synced but lack remote erasure confirmation
    $stmt = $pdo->query("
        SELECT id, public_id, display_filename, drive_file_id, drive_sync_status, deleted_at, deletion_reason
        FROM files
        WHERE deleted_at IS NOT NULL
          AND drive_sync_status = 'synced'
          AND drive_file_id IS NOT NULL
          AND erasure_drive_deleted_at IS NULL
    ");
    $softDeletedOrphans = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Scan activity_logs for permanent erase/delete entries that may refer to hard-deleted or untracked files
    $stmt = $pdo->query("
        SELECT id, action, target_id, user_id, after_value, created_at
        FROM activity_logs
        WHERE (action LIKE '%erase%' OR action LIKE '%delete%')
          AND target_type = 'file'
        ORDER BY created_at DESC
    ");
    $activityLogEntries = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $flaggedFiles = [];

    // Process soft-deleted orphans
    foreach ($softDeletedOrphans as $file) {
        $flaggedFiles[$file['id']] = [
            'id' => $file['id'],
            'public_id' => $file['public_id'],
            'filename' => $file['display_filename'],
            'drive_file_id' => $file['drive_file_id'],
            'deleted_at' => $file['deleted_at'],
            'reason' => $file['deletion_reason'] ?? 'N/A',
            'status' => 'Soft-deleted in files table, synced to Drive, no erasure confirmation.'
        ];
    }

    // Process activity logs and cross-reference with files table
    foreach ($activityLogEntries as $entry) {
        $fileId = (int)$entry['target_id'];
        
        // Check if file still exists in database
        $checkStmt = $pdo->prepare("SELECT id, erasure_drive_deleted_at FROM files WHERE id = ?");
        $checkStmt->execute([$fileId]);
        $fileRow = $checkStmt->fetch(PDO::FETCH_ASSOC);

        $details = json_decode($entry['after_value'] ?? '{}', true);
        $filename = $details['display_filename'] ?? $details['filename'] ?? 'Unknown';
        $driveFileId = $details['drive_file_id'] ?? 'Unknown';

        if (!$fileRow) {
            // Hard-deleted from DB entirely, check if it was synced
            $flaggedFiles['hard_deleted_' . $fileId] = [
                'id' => $fileId,
                'public_id' => $details['public_id'] ?? 'Unknown',
                'filename' => $filename,
                'drive_file_id' => $driveFileId,
                'deleted_at' => $entry['created_at'],
                'reason' => $details['reason'] ?? 'Hard-deleted (logged in activity logs)',
                'status' => 'Permanently deleted/erased in activity logs, but DB record is missing entirely.'
            ];
        } else {
            // Row exists, check if it has erasure confirmation
            if ($fileRow['erasure_drive_deleted_at'] === null && !isset($flaggedFiles[$fileId])) {
                $flaggedFiles[$fileId] = [
                    'id' => $fileId,
                    'public_id' => $details['public_id'] ?? 'Unknown',
                    'filename' => $filename,
                    'drive_file_id' => $driveFileId,
                    'deleted_at' => $entry['created_at'],
                    'reason' => $details['reason'] ?? 'Logged in activity logs',
                    'status' => 'Row exists but lacks erasure confirmation.'
                ];
            }
        }
    }

    // Output Report
    if (empty($flaggedFiles)) {
        echo "SUCCESS: No potentially orphaned Drive files found. All past deletions are clean.\n";
    } else {
        echo "WARNING: Found " . count($flaggedFiles) . " potentially orphaned files on Google Drive:\n";
        echo str_repeat("-", 80) . "\n";
        
        foreach ($flaggedFiles as $key => $report) {
            echo "File ID:      " . $report['id'] . "\n";
            echo "Public ID:    " . $report['public_id'] . "\n";
            echo "Filename:     " . $report['filename'] . "\n";
            echo "Drive File ID:" . $report['drive_file_id'] . "\n";
            echo "Deleted On:   " . $report['deleted_at'] . "\n";
            echo "Reason:       " . $report['reason'] . "\n";
            echo "Status:       " . $report['status'] . "\n";
            echo str_repeat("-", 80) . "\n";
        }
        
        echo "\nACTION REQUIRED: Please verify these files in the Google Drive console using their Drive File IDs.\n";
        echo "Do NOT delete them automatically without confirming they should be deleted.\n";
    }

} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
