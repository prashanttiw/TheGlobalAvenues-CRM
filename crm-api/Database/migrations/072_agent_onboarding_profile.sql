-- 072: Agent self-onboarding profile fields + files.document_type
-- Adds the applicant profile columns needed for the agent onboarding form
-- (first/last name, address, city, state, mobile numbers) and the
-- registered -> draft -> pending lifecycle states ahead of submission.
-- Also adds files.document_type, which AgentController::getOnboardingStatus()
-- already queries but which has never existed in the schema.

ALTER TABLE agents
  ADD COLUMN first_name VARCHAR(100) NULL AFTER full_name,
  ADD COLUMN last_name VARCHAR(100) NULL AFTER first_name,
  ADD COLUMN address_line TEXT NULL AFTER country,
  ADD COLUMN city VARCHAR(100) NULL AFTER address_line,
  ADD COLUMN state VARCHAR(100) NULL AFTER city,
  ADD COLUMN mobile_number VARCHAR(20) NULL AFTER state,
  ADD COLUMN alternate_mobile_number VARCHAR(20) NULL AFTER mobile_number,
  ADD COLUMN application_submitted_at DATETIME NULL AFTER terms_accepted_at,
  ADD COLUMN draft_updated_at DATETIME NULL AFTER application_submitted_at;

-- Existing rows were inserted directly as 'pending' (registration immediately
-- created a submitted-looking application). Re-baseline them to 'registered'
-- since none of them have actually filled out the new profile form yet.
UPDATE agents SET status = 'registered' WHERE status = 'pending';

ALTER TABLE agents
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'registered'
    COMMENT 'registered, draft, pending, approved, rejected, suspended';

ALTER TABLE files
  ADD COLUMN document_type VARCHAR(50) NULL AFTER owner_id,
  ADD INDEX idx_files_owner_doctype (owner_type, owner_id, document_type);
