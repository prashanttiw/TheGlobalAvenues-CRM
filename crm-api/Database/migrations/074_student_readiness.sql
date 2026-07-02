-- 074: Student profile readiness (personal fields + categorized document intake)
-- Supports the one-time "complete your profile" step a student finishes before
-- they're allowed to apply to any program/intake (gated via students.profile_status
-- reaching 'documents_submitted', enum already defined in migration 011).

ALTER TABLE students
  ADD COLUMN gender VARCHAR(20) NULL AFTER date_of_birth,
  ADD COLUMN alternate_mobile BLOB NULL COMMENT 'XSalsa20-Poly1305 encrypted, same pattern as phone_in_profile' AFTER phone_in_profile,
  ADD COLUMN how_heard_about_us VARCHAR(50) NULL COMMENT 'agent, university_staff, social_media, website, referral, other' AFTER lead_source,
  ADD COLUMN planning_phd TINYINT(1) NOT NULL DEFAULT 0 AFTER how_heard_about_us;

CREATE TABLE student_documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  student_id INT UNSIGNED NOT NULL,
  category VARCHAR(40) NOT NULL
    COMMENT 'photo, passport_front, passport_back, academic_marksheet, transcript, cv, sop, lor, noi, proficiency, phd_thesis, phd_lor_professional, other',
  file_id INT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_studentdoc_student (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY fk_studentdoc_file (file_id) REFERENCES files(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_student_category (student_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Closes CLAUDE.md Known Open Item #1: StateManager::transition() fires
-- 'application.status_changed' but no template exists, so notifications
-- silently no-op. Vars available at fire-time: {{new_status}} only
-- (see StateManager.php:153) — application_id is an internal int, not
-- rendered to end users.
INSERT IGNORE INTO notification_templates
  (event_key, subject_template, body_template, channels, category, is_active)
VALUES
  ('application.status_changed',
   'Your application status has been updated',
   'Hello,\n\nYour application status has changed to: {{new_status}}.\n\nLog in to your TGA portal to view the full details.\n\n— The Global Avenues',
   'email,in_app',
   'applications',
   1);
