-- 002: user_sessions (active JWT session tracking)
CREATE TABLE user_sessions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  jti_hash VARCHAR(64) NULL UNIQUE COMMENT 'SHA-256(jti) of access token for revocation checks',
  device_label VARCHAR(255) NULL COMMENT 'e.g. Chrome on Windows, Safari on iPhone',
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  last_active_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_sess_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sess_user (user_id),
  INDEX idx_sess_token (refresh_token_hash),
  INDEX idx_sess_jti (jti_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
