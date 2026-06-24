-- 035: system_settings (super admin configurable — replaces .env for operational values)
CREATE TABLE system_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  value_type VARCHAR(20) NOT NULL DEFAULT 'string'
    COMMENT 'string, integer, boolean, json',
  label VARCHAR(255) NOT NULL,
  description TEXT NULL,
  group_name VARCHAR(50) NULL
    COMMENT 'otp, upload, reminders, commissions, security, sla, backup',
  is_editable TINYINT(1) NOT NULL DEFAULT 1,
  updated_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
