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
-- this migration). Uses IF EXISTS throughout so it is also safe to re-run.

-- 1. Drop the reminders table entirely (only ever written to by the now-deleted ReminderService).
DROP TABLE IF EXISTS reminders;

-- 2. Drop Google Drive sync + retry columns from files (only ever written to by the now-deleted
--    DriveService/DriveFolderManager and cron/sync-drive.php). erasure_status and
--    erasure_local_deleted_at are kept — permanent file erasure is still a real, local-only feature.
ALTER TABLE files
  DROP COLUMN IF EXISTS drive_file_id,
  DROP COLUMN IF EXISTS drive_folder_path,
  DROP COLUMN IF EXISTS drive_sync_status,
  DROP COLUMN IF EXISTS sync_attempts,
  DROP COLUMN IF EXISTS erasure_drive_deleted_at,
  DROP COLUMN IF EXISTS erasure_drive_last_error,
  DROP COLUMN IF EXISTS erasure_retry_count;

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
