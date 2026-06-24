-- 024: internal_notes (per-note audience targeting)
CREATE TABLE internal_notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  entity_type VARCHAR(30) NOT NULL COMMENT 'student, application',
  entity_id INT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  author_type VARCHAR(20) NOT NULL COMMENT 'admin, agent',
  author_id INT UNSIGNED NOT NULL,
  visible_to_student TINYINT(1) NOT NULL DEFAULT 0,
  visible_to_agent TINYINT(1) NOT NULL DEFAULT 0,
  visible_to_admin TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_notes_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
