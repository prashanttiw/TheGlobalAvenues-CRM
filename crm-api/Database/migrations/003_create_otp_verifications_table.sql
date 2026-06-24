-- 003: otp_verifications
CREATE TABLE otp_verifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier_hash VARCHAR(64) NOT NULL COMMENT 'SHA-256 of email/phone for lookup',
  otp_hash VARCHAR(64) NOT NULL COMMENT 'SHA-256 of the 6-digit code',
  purpose VARCHAR(50) NOT NULL COMMENT 'registration, login, password_reset',
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_identifier (identifier_hash, purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
