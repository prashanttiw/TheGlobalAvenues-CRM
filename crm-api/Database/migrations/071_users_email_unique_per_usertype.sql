-- 071: Allow same email across different user types (student, agent, admin)
-- Replaces the global UNIQUE on email_lookup_hash with a composite unique
-- so the same email can register once per portal but not twice within the same portal.

ALTER TABLE users DROP INDEX email_lookup_hash;
ALTER TABLE users DROP INDEX idx_users_email_hash;
ALTER TABLE users ADD UNIQUE KEY uk_users_email_usertype (email_lookup_hash, user_type);
