-- Migration 038: pending_registrations
-- Replaces PHP sessions for storing unverified registration data.
-- Safer on Bluehost shared hosting (no shared /tmp directory risk).
-- Data is XSalsa20-Poly1305 encrypted via EncryptionService.
-- Records expire after 15 minutes and are consumed (deleted) on OTP verify.

CREATE TABLE pending_registrations (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  token_hash    VARCHAR(64)  NOT NULL UNIQUE
                  COMMENT 'SHA-256 of the opaque session token returned to the client',
  email_hash    VARCHAR(64)  NOT NULL
                  COMMENT 'SHA-256(lowercase(email)) — for duplicate-email check on verify',
  reg_type      VARCHAR(20)  NOT NULL
                  COMMENT 'student | agent',
  encrypted_data BLOB        NOT NULL
                  COMMENT 'EncryptionService::encrypt(json_encode($pendingData)) — never stored plain',
  expires_at    DATETIME     NOT NULL
                  COMMENT 'Set to NOW() + 15 minutes on creation',
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pr_token   (token_hash),
  INDEX idx_pr_expires (expires_at),
  INDEX idx_pr_email   (email_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Temporary store for unverified registrations awaiting OTP confirmation';
