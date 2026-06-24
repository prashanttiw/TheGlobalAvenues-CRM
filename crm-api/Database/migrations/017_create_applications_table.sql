-- 017: applications
-- reference_number: TGA-YYYY-NNNNNN (PHP-generated on insert, human-readable)
CREATE TABLE applications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  reference_number VARCHAR(20) NOT NULL UNIQUE
    COMMENT 'Format: TGA-2026-000001. PHP generates this on insert.',
  student_id INT UNSIGNED NOT NULL,
  intake_id INT UNSIGNED NOT NULL,
  agent_id_at_submission INT UNSIGNED NULL
    COMMENT 'Snapshot of agent at submission time — never mutated after submit',
  status VARCHAR(30) NOT NULL DEFAULT 'draft'
    COMMENT 'State machine enforced in PHP — see StateManager.
             Valid states: draft, submitted, under_review,
             offer_received, rejected, waitlisted, enrolled',
  submitted_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_app_student (student_id) REFERENCES students(id),
  FOREIGN KEY fk_app_intake (intake_id) REFERENCES intakes(id),
  FOREIGN KEY fk_app_agent (agent_id_at_submission) REFERENCES agents(id)
    ON DELETE SET NULL,
  INDEX idx_app_student (student_id),
  INDEX idx_app_status (status),
  INDEX idx_app_student_status (student_id, status, created_at),
  INDEX idx_app_ref (reference_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
