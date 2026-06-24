-- 015: courses
CREATE TABLE courses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  university_id INT UNSIGNED NOT NULL,
  name VARCHAR(500) NOT NULL,
  degree_level VARCHAR(50) NULL COMMENT 'bachelors, masters, phd, diploma, certificate',
  duration_months INT UNSIGNED NULL,
  language VARCHAR(50) NULL DEFAULT 'English',
  description TEXT NULL,
  eligibility_criteria TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_course_uni (university_id) REFERENCES universities(id) ON DELETE CASCADE,
  INDEX idx_course_uni (university_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
