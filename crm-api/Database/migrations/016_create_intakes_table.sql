-- 016: intakes
CREATE TABLE intakes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  course_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL COMMENT 'e.g. Fall 2026, Spring 2027',
  intake_month TINYINT UNSIGNED NULL,
  intake_year SMALLINT UNSIGNED NULL,
  application_open_date DATE NULL,
  application_deadline DATE NULL,
  course_start_date DATE NULL,
  tuition_fee_amount DECIMAL(12,2) NULL,
  tuition_fee_currency VARCHAR(10) NULL DEFAULT 'EUR',
  requirements_notes TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming' COMMENT 'upcoming, open, closed',
  cloned_from_intake_id INT UNSIGNED NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_intake_course (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY fk_intake_clone (cloned_from_intake_id) REFERENCES intakes(id)
    ON DELETE SET NULL,
  INDEX idx_intake_deadline (application_deadline),
  INDEX idx_intake_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
