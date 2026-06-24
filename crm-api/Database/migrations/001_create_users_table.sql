-- 001: users
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE COMMENT 'ULID — used in all API responses',
  email BLOB NOT NULL COMMENT 'AES-256-GCM encrypted',
  email_lookup_hash VARCHAR(64) NOT NULL UNIQUE COMMENT 'SHA-256(lowercase(email)) for login lookup',
  phone BLOB NULL COMMENT 'AES-256-GCM encrypted',
  phone_lookup_hash VARCHAR(64) NULL COMMENT 'SHA-256(lowercase(phone)) for search',
  password_hash VARCHAR(255) NOT NULL COMMENT 'Argon2id',
  user_type VARCHAR(20) NOT NULL COMMENT 'student, agent, admin',
  status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active, suspended, pending',
  last_login_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_users_type (user_type),
  INDEX idx_users_status (status),
  INDEX idx_users_email_hash (email_lookup_hash),
  INDEX idx_users_phone_hash (phone_lookup_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
