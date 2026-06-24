-- 018: application_updates (unified timeline — documents, links, notes, payment requests)
CREATE TABLE application_updates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  application_id INT UNSIGNED NOT NULL,
  direction VARCHAR(30) NOT NULL COMMENT 'admin_to_student, student_to_admin',
  item_type VARCHAR(20) NOT NULL COMMENT 'file, link, note, payment_request',
  content TEXT NULL COMMENT 'Link URL or note text',
  file_id INT UNSIGNED NULL,
  posted_by_type VARCHAR(20) NULL COMMENT 'admin, student, agent',
  posted_by_id INT UNSIGNED NULL,
  is_visible_to_agent TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_au_app (application_id) REFERENCES applications(id),
  FOREIGN KEY fk_au_file (file_id) REFERENCES files(id) ON DELETE SET NULL,
  INDEX idx_au_app (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
