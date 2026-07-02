-- 075: Application cap + creation provenance + preference ranking
-- Supports: (1) an admin-editable cap on how many non-withdrawn/non-rejected
-- applications a student may hold open at once, (2) recording who actually
-- initiated an application (student self-service vs agent-on-behalf-of),
-- independent of agent_id_at_submission (which only reflects the student's
-- assigned agent at submit time, not the acting user), and (3) an optional
-- student-editable preference rank across their own active applications.

ALTER TABLE applications
  ADD COLUMN created_by_type ENUM('student','agent','admin') NOT NULL DEFAULT 'student' AFTER agent_id_at_submission,
  ADD COLUMN created_by_id INT UNSIGNED NULL COMMENT 'users.id of the actor who created this application' AFTER created_by_type,
  ADD COLUMN preference_rank SMALLINT UNSIGNED NULL COMMENT 'Student-editable 1..N rank across their own active applications; no DB uniqueness, recalculated wholesale on every reorder' AFTER status;

-- Best-effort backfill for existing rows: no way to recover the true actor,
-- so infer from whether an agent was attached at submission time.
UPDATE applications SET created_by_type = 'agent' WHERE agent_id_at_submission IS NOT NULL;

INSERT INTO system_settings (setting_key, setting_value, value_type, label, description, group_name, is_editable)
VALUES ('max_active_applications_per_student', '3', 'integer',
        'Max Active Applications per Student',
        'Maximum number of non-withdrawn, non-rejected applications a student may hold open at once.',
        'applications', 1);
