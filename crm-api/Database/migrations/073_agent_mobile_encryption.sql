-- 073: Encrypt agents.mobile_number / alternate_mobile_number
-- These were added in 072 as plain VARCHAR, which is inconsistent with this
-- codebase's established PII pattern (students.phone_in_profile is XSalsa20
-- encrypted via EncryptionService — see migration 011). No lookup hash is
-- needed since these columns are never used in WHERE clauses, matching the
-- phone_in_profile precedent exactly.

-- Existing values (test data only, pre-encryption) cannot be migrated in
-- place since plaintext VARCHAR bytes are not valid ciphertext — clear them.
UPDATE agents SET mobile_number = NULL, alternate_mobile_number = NULL;

ALTER TABLE agents
  MODIFY COLUMN mobile_number BLOB NULL COMMENT 'XSalsa20-Poly1305 encrypted',
  MODIFY COLUMN alternate_mobile_number BLOB NULL COMMENT 'XSalsa20-Poly1305 encrypted';
