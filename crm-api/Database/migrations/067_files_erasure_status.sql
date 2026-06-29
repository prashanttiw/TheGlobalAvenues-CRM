-- Migration: 067_files_erasure_status.sql
ALTER TABLE files
  ADD COLUMN erasure_status ENUM('not_erased','erase_pending_remote_delete','erased') NOT NULL DEFAULT 'not_erased'
    COMMENT 'not_erased=normal/soft-deleted. erase_pending_remote_delete=local file still kept, Drive delete failed or not yet confirmed. erased=both local and Drive copies confirmed deleted.',
  ADD COLUMN erasure_local_deleted_at DATETIME NULL,
  ADD COLUMN erasure_drive_deleted_at DATETIME NULL,
  ADD COLUMN erasure_drive_last_error TEXT NULL,
  ADD COLUMN erasure_retry_count INT UNSIGNED NOT NULL DEFAULT 0;
