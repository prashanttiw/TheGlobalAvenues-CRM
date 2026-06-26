-- Migration 042: Add Argon2id tuning parameters to system_settings
-- Shared hosting requires lower memory limits to avoid timeouts.
-- These settings allow admin tuning without code deploys.

INSERT INTO system_settings (setting_key, setting_value, value_type, label, description, group_name) VALUES
('argon2_memory_cost', '19456', 'integer', 'Argon2 Memory Cost', 'Argon2id memory cost in KiB. Default: 19456 (19MB) for shared hosting.', 'security'),
('argon2_time_cost', '2', 'integer', 'Argon2 Time Cost', 'Argon2id time cost (iterations). Default: 2 for shared hosting.', 'security')

ON DUPLICATE KEY UPDATE 
  setting_value = VALUES(setting_value),
  value_type = VALUES(value_type),
  label = VALUES(label),
  description = VALUES(description),
  group_name = VALUES(group_name);
