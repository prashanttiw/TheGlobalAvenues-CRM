-- 053: Commission table enhancements for Phase 5
-- Adds audit fields, soft delete, and performance indexes

-- Add created_by tracking (which admin created each commission)
ALTER TABLE commissions
  ADD COLUMN created_by_user_id INT UNSIGNED NULL
    COMMENT 'Admin user ID who created this record'
    AFTER agent_id,
  ADD COLUMN created_by_name VARCHAR(200) NULL
    COMMENT 'Admin name snapshot at creation time'
    AFTER created_by_user_id,
  ADD COLUMN paid_by_user_id INT UNSIGNED NULL
    COMMENT 'Admin user ID who marked this as paid'
    AFTER paid_at,
  ADD COLUMN paid_by_name VARCHAR(200) NULL
    COMMENT 'Admin name snapshot when marked paid'
    AFTER paid_by_user_id,
  ADD COLUMN deleted_at DATETIME NULL
    COMMENT 'Soft delete timestamp — NULL = active'
    AFTER paid_by_name,
  ADD COLUMN tds_rate DECIMAL(5,2) NULL
    COMMENT 'TDS rate % — reserved for Phase 7 tax compliance'
    AFTER deleted_at,
  ADD COLUMN tds_amount DECIMAL(12,2) NULL
    COMMENT 'TDS amount — reserved for Phase 7 tax compliance'
    AFTER tds_rate;

-- Update status comment to reflect all valid values
ALTER TABLE commissions
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'
    COMMENT 'pending (editable), confirmed (locked), paid (immutable)';

-- Add composite index for agent + status queries (dashboard summaries)
ALTER TABLE commissions
  ADD INDEX idx_commissions_agent_status (agent_id, status),
  ADD INDEX idx_commissions_application (application_id),
  ADD INDEX idx_commissions_deleted (deleted_at),
  ADD INDEX idx_commissions_status_created (status, created_at);
