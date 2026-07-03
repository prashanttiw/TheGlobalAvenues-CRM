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
-- Migration 039: agents table schema fixes
-- Fix 1: referral_code changed from NOT NULL UNIQUE (with default '') to NULL UNIQUE.
--         Multiple pending agents with referral_code='' would violate the UNIQUE constraint.
--         Pending agents get NULL; approved agents get a generated code.
-- Fix 2: Add suspension_reason TEXT NULL column.
--         Required by agent.suspended notification template ({{suspension_reason}}).

-- Step 1: Clear any existing '' empty-string referral codes (pending agents)
UPDATE agents SET referral_code = NULL WHERE referral_code = '';

-- Step 2: Drop the old UNIQUE constraint (tied to NOT NULL DEFAULT '')
ALTER TABLE agents
  DROP INDEX referral_code;

-- Step 3: Modify column to allow NULL
ALTER TABLE agents
  MODIFY COLUMN referral_code VARCHAR(20) NULL
    COMMENT 'NULL while pending; TGA-XXX999 format when approved';

-- Step 4: Re-add UNIQUE constraint that allows multiple NULLs (MySQL treats each NULL as distinct)
ALTER TABLE agents
  ADD UNIQUE INDEX uq_agent_referral_code (referral_code);

-- Step 5: Add suspension_reason column
ALTER TABLE agents
  ADD COLUMN suspension_reason TEXT NULL
    COMMENT 'Reason provided by admin when suspending the agent'
    AFTER rejected_reason;
-- Migration 040: users table — add two_factor_enabled column
-- AuthController::login() line 51 already references $user['two_factor_enabled'].
-- Without this column, PHP generates a notice (undefined array key → null → cast to 0).
-- Adding the column properly with DEFAULT 0 makes the existing 2FA stub safe.

ALTER TABLE users
  ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '0 = password only; 1 = password + OTP required on login'
    AFTER password_hash;
-- Migration 041: Seed Phase 2 Notification Templates
-- Seeds 8 required templates for student reg, agent onboarding, and security events.

INSERT INTO notification_templates (event_key, subject_template, body_template, channels, category) VALUES

('student.registered',
 'Welcome to The Global Avenues, {{student_name}}!',
 'Hi {{student_name}},\n\nYour TGA account is ready.\nLog in at: {{portal_url}}\n\nThe TGA Team',
 'email,in_app', 'system'),

('agent.onboarding_submitted',
 'New Partner Application: {{agency_name}}',
 'New agent application submitted.\nAgency: {{agency_name}}\nContact: {{full_name}}\nCountry: {{country}}\nReview: {{admin_url}}',
 'email,in_app', 'approvals'),

('agent.approved',
 'Your TGA Partnership Is Approved!',
 'Hi {{full_name}},\n\nWelcome to the TGA partner network!\n\nYour referral code: {{referral_code}}\nPortal: {{portal_url}}\n\nThe TGA Team',
 'email,in_app', 'system'),

('agent.rejected',
 'Update on Your TGA Partnership Application',
 'Hi {{full_name}},\n\nWe are unable to approve your application.\nReason: {{rejection_reason}}\n\nContact connect@theglobalavenues.com\n\nThe TGA Team',
 'email,in_app', 'system'),

('agent.suspended',
 'Your TGA Partner Account Has Been Suspended',
 'Hi {{full_name}},\n\nYour account has been suspended.\nReason: {{suspension_reason}}\n\nContact connect@theglobalavenues.com',
 'email', 'system'),

('subagent.created',
 'New Sub-Agent Application Under Your Account',
 'Hi {{parent_agent_name}},\n\nNew sub-agent pending TGA approval.\nName: {{subagent_name}}\nAgency: {{subagent_agency}}',
 'email,in_app', 'agent'),

('admin.created',
 'Your TGA Admin Account Is Ready',
 'Hi {{full_name}},\n\nYour TGA admin account has been created.\nPortal: {{portal_url}}\n\nThe TGA Team',
 'email', 'system'),

('password.reset_otp',
 'Reset Your TGA Password',
 'Hi,\n\nYour password reset code: {{otp_code}}\nValid for {{expiry_minutes}} minutes.\n\nIf you did not request this, ignore this email.',
 'email', 'security')

ON DUPLICATE KEY UPDATE 
  subject_template = VALUES(subject_template),
  body_template = VALUES(body_template),
  channels = VALUES(channels),
  category = VALUES(category);
-- Migration 042: Add Argon2id tuning parameters to system_settings
-- REMOVED by migration 079 (2026-07-03) — actual password hashing reads
-- ARGON2_MEMORY_COST/ARGON2_TIME_COST from crm-api/.env directly
-- (TGA\CRM\Config\Environment::get), never from system_settings, so these
-- rows were never consulted by any hashing call site. Not seeded here.
-- Migration 043: Add rate_limits cleanup to cron_health
-- Ensures rate_limits table doesn't grow unbounded on Bluehost.

INSERT INTO cron_health (job_name) VALUES ('cleanup_rate_limits')
ON DUPLICATE KEY UPDATE job_name = VALUES(job_name);
-- 044: seed notification templates
INSERT INTO notification_templates (event_key, subject_template, body_template, channels, category) VALUES

('student.registered',
 'Welcome to The Global Avenues, {{student_name}}!',
 'Hi {{student_name}},\n\nYour TGA account is ready.\nLog in at: {{portal_url}}\n\nThe TGA Team',
 'email,in_app', 'system'),

('agent.onboarding_submitted',
 'New Partner Application: {{agency_name}}',
 'New agent application submitted.\nAgency: {{agency_name}}\nContact: {{full_name}}\nCountry: {{country}}\nReview: {{admin_url}}',
 'email,in_app', 'approvals'),

('agent.approved',
 'Your TGA Partnership Is Approved!',
 'Hi {{full_name}},\n\nWelcome to the TGA partner network!\n\nYour referral code: {{referral_code}}\nPortal: {{portal_url}}\n\nThe TGA Team',
 'email,in_app', 'system'),

('agent.rejected',
 'Update on Your TGA Partnership Application',
 'Hi {{full_name}},\n\nWe are unable to approve your application.\nReason: {{rejection_reason}}\n\nContact connect@theglobalavenues.com\n\nThe TGA Team',
 'email,in_app', 'system'),

('agent.suspended',
 'Your TGA Partner Account Has Been Suspended',
 'Hi {{full_name}},\n\nYour account has been suspended.\nReason: {{suspension_reason}}\n\nContact connect@theglobalavenues.com',
 'email', 'system'),

('subagent.created',
 'New Sub-Agent Application Under Your Account',
 'Hi {{parent_agent_name}},\n\nNew sub-agent pending TGA approval.\nName: {{subagent_name}}\nAgency: {{subagent_agency}}',
 'email,in_app', 'agent'),

('admin.created',
 'Your TGA Admin Account Is Ready',
 'Hi {{full_name}},\n\nYour TGA admin account has been created.\nPortal: {{portal_url}}\n\nThe TGA Team',
 'email', 'system'),

('password.reset_otp',
 'Reset Your TGA Password',
 'Hi,\n\nYour password reset code: {{otp_code}}\nValid for {{expiry_minutes}} minutes.\n\nIf you did not request this, ignore this email.',
 'email', 'security')

ON DUPLICATE KEY UPDATE 
    subject_template = VALUES(subject_template),
    body_template = VALUES(body_template),
    channels = VALUES(channels),
    category = VALUES(category);
ALTER TABLE application_updates 
ADD COLUMN deleted_at DATETIME NULL;
-- No schema change required since status is VARCHAR(50).
-- Adding a comment for documentation.
ALTER TABLE applications
MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft' COMMENT 'draft, submitted, under_review, waitlisted, offer_received, enrolled, rejected, withdrawn';
-- No schema change required since status is VARCHAR(50).
-- Adding a comment for documentation.
ALTER TABLE document_requests
MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'requested' COMMENT 'requested, submitted, approved, rejected, cancelled';
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
-- 055: Phase 5 performance indexes
-- All indexes required for agent hierarchy, student roster, and commission queries

-- ── Students table ────────────────────────────────────────────────────────────
-- Composite for agent dashboard: COUNT by profile_status within agent subtree
ALTER TABLE students
  ADD INDEX idx_students_agent_status (agent_id, profile_status),
  ADD INDEX idx_students_root_status (agent_id, deleted_at);

-- ── Agents table ──────────────────────────────────────────────────────────────
-- Fast subtree queries: root_agent_id is the primary fast path
-- Already indexed if root_agent_id has a standalone index — add composite for tier queries
ALTER TABLE agents
  ADD INDEX idx_agents_root_tier (root_agent_id, tier, deleted_at),
  ADD INDEX idx_agents_parent_deleted (parent_agent_id, deleted_at),
  ADD INDEX idx_agents_status_tier (status, tier);

-- ── Agent reassignment requests ───────────────────────────────────────────────
ALTER TABLE agent_reassignment_requests
  ADD INDEX idx_arr_student_status (student_id, status),
  ADD INDEX idx_arr_status_created (status, created_at),
  ADD INDEX idx_arr_current_agent (current_agent_id),
  ADD INDEX idx_arr_new_agent (requested_agent_id);
-- 056: Agent stats materialized table
-- Denormalized statistics per agent for fast admin dashboard aggregation
-- Populated by:
--   (a) ApplicationStateManager on enrollment events (real-time updates)
--   (b) Phase 6 cron job (nightly full recalculation)

CREATE TABLE agent_stats (
  agent_id                    INT UNSIGNED NOT NULL,
  total_students              INT UNSIGNED NOT NULL DEFAULT 0
                                COMMENT 'Total non-deleted students in this agent tree node',
  enrolled_count              INT UNSIGNED NOT NULL DEFAULT 0
                                COMMENT 'Students with profile_status = enrolled',
  in_progress_count           INT UNSIGNED NOT NULL DEFAULT 0
                                COMMENT 'Students actively in application pipeline',
  new_count                   INT UNSIGNED NOT NULL DEFAULT 0
                                COMMENT 'Students with profile_status = registered',
  pending_commissions_inr     DECIMAL(12,2) NOT NULL DEFAULT 0.00
                                COMMENT 'Sum of pending commission amounts in INR',
  confirmed_commissions_inr   DECIMAL(12,2) NOT NULL DEFAULT 0.00
                                COMMENT 'Sum of confirmed commission amounts in INR',
  paid_commissions_inr        DECIMAL(12,2) NOT NULL DEFAULT 0.00
                                COMMENT 'Sum of paid commission amounts in INR (YTD)',
  last_updated_at             DATETIME NOT NULL
                                COMMENT 'When this row was last computed',

  PRIMARY KEY (agent_id),
  CONSTRAINT fk_astats_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Materialized agent statistics — populated by cron and real-time triggers';
-- 057: Commission immutability trigger (defense-in-depth layer)
-- Prevents any UPDATE to paid commissions' financial fields
-- even if PHP application layer is bypassed (direct DB access, bug, etc.)

CREATE TRIGGER trg_commission_immutability
BEFORE UPDATE ON commissions
FOR EACH ROW
BEGIN
  -- Prevent reverting paid commissions to any other status
  IF OLD.status = 'paid' AND NEW.status != 'paid' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'COMMISSION_IMMUTABLE: Paid commissions cannot change status';
  END IF;

  -- Prevent editing financial fields on paid commissions
  IF OLD.status = 'paid' AND (
    NEW.amount     != OLD.amount OR
    NEW.percentage != OLD.percentage OR
    NEW.currency   != OLD.currency
  ) THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'COMMISSION_IMMUTABLE: Financial fields on paid commissions are locked';
  END IF;

  -- Prevent reverting confirmed commissions back to pending
  IF OLD.status = 'confirmed' AND NEW.status = 'pending' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'COMMISSION_IMMUTABLE: Confirmed commissions cannot revert to pending';
  END IF;

  -- Prevent editing financial fields on confirmed commissions
  IF OLD.status = 'confirmed' AND (
    NEW.amount     != OLD.amount OR
    NEW.percentage != OLD.percentage OR
    NEW.currency   != OLD.currency
  ) THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'COMMISSION_IMMUTABLE: Financial fields on confirmed commissions are locked';
  END IF;
END;
-- 058: Phase 5 notification templates
-- All agent reassignment and commission event templates

INSERT INTO notification_templates (event_key, subject_template, body_template, channels, category) VALUES
('agent.reassignment_requested',
 'Agent Reassignment Request — Action Required',
 'Student {{student_name}} has requested an agent reassignment. Current agent: {{current_agent_name}}. Reason: {{reason}}. Review in admin panel.',
 'email,in_app', 'approvals'),

('agent.reassignment_approved',
 'Your Agent Reassignment Has Been Approved',
 'Hi {{student_name}}, your request to change agents has been approved. New agent: {{new_agent_name}}. The TGA Team.',
 'email,in_app', 'system'),

('agent.reassignment_denied',
 'Your Agent Reassignment Request Was Not Approved',
 'Hi {{student_name}}, after review your request to change agents could not be approved at this time. Reason: {{review_notes}}. Contact support if you have questions.',
 'email,in_app', 'system'),

('agent.reassignment_lost',
 'Student Reassigned to Another Agent',
 'Hi {{agent_name}}, student {{student_name}} has been reassigned to another agent. Your historical records for this student remain in your activity log.',
 'email,in_app', 'agent'),

('agent.reassignment_gained',
 'New Student Assigned to You',
 'Hi {{agent_name}}, student {{student_name}} has been assigned to your portfolio.',
 'email,in_app', 'agent'),

('commission.created',
 'Commission Record Created',
 'Hi {{agent_name}}, a commission of {{amount}} {{currency}} has been recorded for student {{student_name}}. Status: Pending.',
 'email,in_app', 'approvals'),

('commission.confirmed',
 'Commission Confirmed',
 'Hi {{agent_name}}, your commission of {{amount}} {{currency}} for student {{student_name}} has been confirmed by admin.',
 'email,in_app', 'approvals'),

('commission.paid',
 'Commission Paid',
 'Hi {{agent_name}}, your commission of {{amount}} {{currency}} for student {{student_name}} has been marked as paid.',
 'email,in_app', 'approvals');
-- 059: Add final_agent_id to agent_reassignment_requests
-- Tracks which agent was ACTUALLY assigned (may differ from requested_agent_id if admin overrides)
-- Also adds index for the new foreign key column final_agent_id

ALTER TABLE agent_reassignment_requests
  ADD COLUMN final_agent_id INT UNSIGNED NULL
    COMMENT 'The agent actually assigned — may differ from requested_agent_id if admin overrides'
    AFTER requested_agent_id,
  ADD CONSTRAINT fk_arr_final FOREIGN KEY (final_agent_id) REFERENCES agents(id) ON DELETE SET NULL;

-- Note: idx_arr_student_status and idx_arr_status_created are already created in 055_phase5_indexes.sql.
-- Adding them here would cause duplicate key name errors.
