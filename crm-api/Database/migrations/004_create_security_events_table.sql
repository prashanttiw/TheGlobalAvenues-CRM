-- 004: security_events (security audit — separate from operational activity_logs)
CREATE TABLE security_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL
    COMMENT 'login_failed, otp_brute_force, suspicious_file_access, password_reset,
             session_revoked, account_suspended, permission_denied',
  user_id INT UNSIGNED NULL COMMENT 'NULL if pre-auth (e.g. login attempt with unknown email)',
  identifier VARCHAR(255) NULL COMMENT 'Email or IP involved',
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  details JSON NULL COMMENT 'Extra context (attempt count, accessed resource, etc.)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sec_type (event_type, created_at),
  INDEX idx_sec_user (user_id),
  INDEX idx_sec_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
