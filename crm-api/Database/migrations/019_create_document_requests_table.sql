-- 019: document_requests
CREATE TABLE document_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  student_id INT UNSIGNED NOT NULL,
  application_id INT UNSIGNED NULL,
  doc_label VARCHAR(255) NOT NULL COMMENT 'Admin-defined name',
  description TEXT NULL,
  deadline DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'requested'
    COMMENT 'requested, submitted, approved, rejected',
  requested_by INT UNSIGNED NOT NULL,
  submitted_file_id INT UNSIGNED NULL,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_dr_student (student_id) REFERENCES students(id),
  FOREIGN KEY fk_dr_app (application_id) REFERENCES applications(id) ON DELETE SET NULL,
  FOREIGN KEY fk_dr_requester (requested_by) REFERENCES admins(id),
  FOREIGN KEY fk_dr_file (submitted_file_id) REFERENCES files(id) ON DELETE SET NULL,
  INDEX idx_dr_student (student_id),
  INDEX idx_dr_deadline (deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
