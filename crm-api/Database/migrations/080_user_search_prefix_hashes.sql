-- 080: Prefix-hash columns for partial "starts with" search on encrypted email/phone,
-- without decrypting rows at query time. See PHASE_4_APPEND.md 2026-07-04 entry for
-- the full design rationale (fixed-length hash equality, not arbitrary substring).
ALTER TABLE users
  ADD COLUMN email_prefix4_hash VARCHAR(64) NULL,
  ADD COLUMN email_prefix6_hash VARCHAR(64) NULL,
  ADD COLUMN email_prefix8_hash VARCHAR(64) NULL,
  ADD COLUMN phone_prefix4_hash VARCHAR(64) NULL,
  ADD COLUMN phone_prefix6_hash VARCHAR(64) NULL,
  ADD INDEX idx_users_email_prefix4 (email_prefix4_hash),
  ADD INDEX idx_users_email_prefix6 (email_prefix6_hash),
  ADD INDEX idx_users_email_prefix8 (email_prefix8_hash),
  ADD INDEX idx_users_phone_prefix4 (phone_prefix4_hash),
  ADD INDEX idx_users_phone_prefix6 (phone_prefix6_hash);
