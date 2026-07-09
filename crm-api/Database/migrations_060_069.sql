-- Migrations 060-069 (Phase 7-9), extracted verbatim from the inline PHP block that used to live
-- only inside setup_database.php, so both setup_database.php and reconcile.php read one shared
-- source instead of the SQL text being duplicated across two places.
--
-- Only 060, 062, 063, 064, 067 have surviving content. 061 was folded into 060 (superset column
-- set, standalone 061 would create duplicate FULLTEXT key names). 065 (files.sync_attempts),
-- 066 (OTP notification templates — folded into setup_database.php's main template seed array),
-- 068 (system.erase_remote_delete_failed template), and 069 (reminders dedup constraint) are all
-- gone: migration 084 (2026-07-10) drops the reminders table entirely and removes the Drive-sync
-- columns 065 added, making all four permanently moot. Kept out of this file entirely rather than
-- included as dead no-ops, matching how setup_database.php's inline block already omitted them.

-- Migration 060: notices.expires_at + internal_notes.is_pinned
ALTER TABLE notices ADD COLUMN expires_at DATETIME NULL COMMENT 'Auto-expires notice from feed';
ALTER TABLE internal_notes ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Pinned notes stay at top of timeline';

-- Migration 060+061: FULLTEXT indexes for global search (060's column set is a superset of 061 —
-- 061 skipped standalone to avoid duplicate key names)
ALTER TABLE students ADD FULLTEXT INDEX ft_students_name (full_name);
ALTER TABLE agents ADD FULLTEXT INDEX ft_agents_name (full_name, agency_name);
ALTER TABLE universities ADD FULLTEXT INDEX ft_universities (name, city, country);
ALTER TABLE applications ADD FULLTEXT INDEX ft_applications_ref (reference_number);
ALTER TABLE leads ADD FULLTEXT INDEX ft_leads_name (full_name);

-- Migration 062: Phase 8 performance indexes
ALTER TABLE report_snapshots ADD INDEX idx_reports_lookup (dimension_type, dimension_id, metric_key, snapshot_date);
ALTER TABLE applications ADD INDEX idx_applications_deleted_submitted (deleted_at, submitted_at);
ALTER TABLE students ADD INDEX idx_students_deleted_created (deleted_at, created_at);

-- Migration 063: Phase 9 academic profile tables
CREATE TABLE student_academics (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(26) NOT NULL UNIQUE,
    student_id INT UNSIGNED NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    degree_level VARCHAR(100) NOT NULL COMMENT 'High School, Diploma, Bachelors, Masters',
    field_of_study VARCHAR(255) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    score_type VARCHAR(50) NULL COMMENT 'CGPA, Percentage, Grade',
    score_value VARCHAR(50) NULL,
    is_highest_qualification BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student_academics_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_test_scores (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(26) NOT NULL UNIQUE,
    student_id INT UNSIGNED NOT NULL,
    test_name VARCHAR(100) NOT NULL COMMENT 'IELTS, TOEFL, PTE, Duolingo, GRE, GMAT',
    overall_score VARCHAR(50) NOT NULL,
    reading_score VARCHAR(50) NULL,
    writing_score VARCHAR(50) NULL,
    listening_score VARCHAR(50) NULL,
    speaking_score VARCHAR(50) NULL,
    test_date DATE NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student_tests_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration 064: applications.withdrawal_reason
ALTER TABLE applications ADD COLUMN withdrawal_reason TEXT NULL COMMENT 'Reason provided when application is withdrawn';

-- Migration 067: files erasure tracking (local-only as of migration 084 — the Drive-retry columns
-- this migration originally added are dropped again by 084, so they are omitted here entirely)
ALTER TABLE files
  ADD COLUMN erasure_status ENUM('not_erased','erase_pending_remote_delete','erased') NOT NULL DEFAULT 'not_erased'
      COMMENT 'not_erased=normal. erased=file permanently deleted.',
  ADD COLUMN erasure_local_deleted_at DATETIME NULL;
