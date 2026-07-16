-- Migration: 084_remove_reminder_drive_backup_features.sql
-- Removes the payment-reminder engine and the Google Drive sync/backup features entirely —
-- neither was ever a real product requirement. The reminder engine additionally never worked
-- end-to-end for any entity type: the only caller (PaymentTrackingController) scheduled reminder
-- types ('payment_upcoming'/'payment_urgent') that ReminderEngine's event-key lookup never
-- recognized, so every reminder row was silently marked 'sent' without ever notifying anyone.
-- See crm-api/Services/ReminderEngine.php, ReminderService.php, DriveService.php,
-- DriveFolderManager.php, BackupRetentionManager.php, PhpMysqlDump.php (all deleted 2026-07-10)
-- and cron/process-reminders.php, sync-drive.php, backup-db.php, verify-backups.php,
-- retry-pending-erasures.php (all deleted 2026-07-10).
--
-- Safe to run on any existing database: every column/table/row touched here has zero remaining
-- application code reading or writing it (confirmed by a full repository grep before writing
-- this migration). DROP TABLE uses IF EXISTS (supported everywhere). The files columns below are
-- dropped via a conditional procedure rather than `DROP COLUMN IF EXISTS` — that per-column
-- modifier needs MySQL 8.0.29+, unavailable on this project's actual production MySQL (5.7.23,
-- confirmed 2026-07-16 while diagnosing a failed production install). Whether each column exists
-- genuinely varies by caller: setup_database.php's fresh-install replay never adds
-- sync_attempts/erasure_drive_deleted_at/erasure_drive_last_error/erasure_retry_count in the first
-- place (see migrations_060_069.sql's header comment — those four are skipped as permanently moot),
-- while reconcile.php patches real databases that took the full historical migration path and do
-- have all 7 — so the existence check below is load-bearing for both callers, not just defensive.

-- 1. Drop the reminders table entirely (only ever written to by the now-deleted ReminderService).
DROP TABLE IF EXISTS reminders;

-- 2. Drop Google Drive sync + retry columns from files (only ever written to by the now-deleted
--    DriveService/DriveFolderManager and cron/sync-drive.php), each only if present. erasure_status
--    and erasure_local_deleted_at are kept — permanent file erasure is still a real, local-only
--    feature. No DELIMITER change needed here — the whole CREATE PROCEDURE...END block is sent to
--    the server as one statement via PDO's multi-statement execution, same as everywhere else in
--    this file; DELIMITER is a mysql-CLI-only convenience, not something the server itself needs.
DROP PROCEDURE IF EXISTS tga_migration_084_drop_col_if_exists;
CREATE PROCEDURE tga_migration_084_drop_col_if_exists(IN p_table VARCHAR(64), IN p_column VARCHAR(64))
BEGIN
  -- BINARY forces a byte-for-byte comparison instead of a collation-aware one. Needed because
  -- INFORMATION_SCHEMA's TABLE_NAME/COLUMN_NAME columns carry MySQL's internal system collation,
  -- which doesn't match this database's utf8mb4_unicode_ci — comparing them directly throws
  -- "Illegal mix of collations" on production MySQL 5.7 (confirmed 2026-07-16; did not reproduce
  -- locally on MariaDB 10.4, which is more lenient about this). Table/column identifiers in this
  -- codebase are always plain ASCII snake_case, so a binary comparison is exact either way.
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = BINARY p_table AND BINARY COLUMN_NAME = BINARY p_column
  ) THEN
    SET @tga_migration_084_sql = CONCAT('ALTER TABLE `', p_table, '` DROP COLUMN `', p_column, '`');
    PREPARE tga_migration_084_stmt FROM @tga_migration_084_sql;
    EXECUTE tga_migration_084_stmt;
    DEALLOCATE PREPARE tga_migration_084_stmt;
  END IF;
END;

CALL tga_migration_084_drop_col_if_exists('files', 'drive_file_id');
CALL tga_migration_084_drop_col_if_exists('files', 'drive_folder_path');
CALL tga_migration_084_drop_col_if_exists('files', 'drive_sync_status');
CALL tga_migration_084_drop_col_if_exists('files', 'sync_attempts');
CALL tga_migration_084_drop_col_if_exists('files', 'erasure_drive_deleted_at');
CALL tga_migration_084_drop_col_if_exists('files', 'erasure_drive_last_error');
CALL tga_migration_084_drop_col_if_exists('files', 'erasure_retry_count');

DROP PROCEDURE IF EXISTS tga_migration_084_drop_col_if_exists;

-- 3. Remove the now-dead backup-retention settings (only ever read by the now-deleted
--    BackupRetentionManager, called only from the now-deleted cron/backup-db.php).
DELETE FROM system_settings WHERE setting_key IN ('backup_retain_daily', 'backup_retain_weekly', 'backup_retain_monthly');

-- 4. Remove the notification template for a Drive-delete-retry failure (only ever fired by the
--    now-deleted cron/retry-pending-erasures.php).
DELETE FROM notification_templates WHERE event_key = 'system.erase_remote_delete_failed';

-- 5. Remove cron_health rows for the deleted jobs. archive_old_logs is untouched — that job was
--    already deliberately unscheduled for an unrelated, pre-existing reason (activity_logs must
--    never be deleted). cleanup_rate_limits is also untouched — it's a separate, pre-existing
--    dead row (seeded by migration 043, no matching script ever existed) unrelated to this cleanup.
DELETE FROM cron_health WHERE job_name IN ('sync_drive', 'backup_db', 'verify_backups', 'process_reminders', 'retry_pending_erasures');
