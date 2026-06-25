-- 054: Commission audit log table
-- Immutable append-only record of all commission state transitions
-- No DELETE or UPDATE routes exist for this table — WRITE-ONLY from application layer

CREATE TABLE commission_audit_log (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id           CHAR(26) NOT NULL UNIQUE
                        COMMENT 'ULID — immutable identifier',
  commission_id       INT UNSIGNED NOT NULL
                        COMMENT 'FK to commissions.id',
  commission_public_id CHAR(26) NOT NULL
                        COMMENT 'Denormalized for fast lookup without JOIN',
  old_status          VARCHAR(20) NOT NULL
                        COMMENT 'Status before transition',
  new_status          VARCHAR(20) NOT NULL
                        COMMENT 'Status after transition',
  old_amount          DECIMAL(12,2) NULL
                        COMMENT 'Amount before edit (NULL if no change)',
  new_amount          DECIMAL(12,2) NULL
                        COMMENT 'Amount after edit (NULL if no change)',
  action              VARCHAR(50) NOT NULL
                        COMMENT 'created, edited, confirmed, paid, deleted',
  changed_by_user_id  INT UNSIGNED NOT NULL
                        COMMENT 'Admin user who performed the action',
  changed_by_name     VARCHAR(200) NOT NULL
                        COMMENT 'Name snapshot at time of action',
  notes               TEXT NULL
                        COMMENT 'Optional notes from the admin action',
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
                        COMMENT 'When this audit entry was written',

  INDEX idx_cal_commission (commission_id),
  INDEX idx_cal_commission_public (commission_public_id),
  INDEX idx_cal_actor (changed_by_user_id),
  INDEX idx_cal_action (action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable audit trail for all commission state changes';
