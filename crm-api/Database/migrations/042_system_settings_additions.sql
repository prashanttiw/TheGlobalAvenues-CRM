-- Migration 042: Add Argon2id tuning parameters to system_settings
-- Shared hosting requires lower memory limits to avoid timeouts.
-- These settings allow admin tuning without code deploys.

INSERT INTO system_settings (setting_key, setting_value, field_type, group_name, description, is_public) VALUES
('argon2_memory_cost', '19456', 'number', 'security', 'Argon2id memory cost in KiB. Default: 19456 (19MB) for shared hosting.', 0),
('argon2_time_cost', '2', 'number', 'security', 'Argon2id time cost (iterations). Default: 2 for shared hosting.', 0)

ON DUPLICATE KEY UPDATE 
  setting_value = VALUES(setting_value),
  field_type = VALUES(field_type),
  group_name = VALUES(group_name),
  description = VALUES(description);
