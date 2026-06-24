-- Migration 040: users table — add two_factor_enabled column
-- AuthController::login() line 51 already references $user['two_factor_enabled'].
-- Without this column, PHP generates a notice (undefined array key → null → cast to 0).
-- Adding the column properly with DEFAULT 0 makes the existing 2FA stub safe.

ALTER TABLE users
  ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '0 = password only; 1 = password + OTP required on login'
    AFTER password_hash;
