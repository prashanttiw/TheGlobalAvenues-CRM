-- 065: Alter files table to add sync_attempts and seed jwt_min_iat
ALTER TABLE files ADD COLUMN sync_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER drive_sync_status;

INSERT IGNORE INTO system_settings (setting_key, setting_value, value_type, label, description, group_name) VALUES
('jwt_min_iat', '0', 'integer', 'JWT Minimum Issued-At Timestamp', 'Invalidates all tokens issued before this timestamp (Unix epoch)', 'security');
