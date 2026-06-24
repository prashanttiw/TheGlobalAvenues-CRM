-- 012: agent_reassignment_requests
CREATE TABLE agent_reassignment_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  student_id INT UNSIGNED NOT NULL,
  current_agent_id INT UNSIGNED NULL,
  requested_agent_id INT UNSIGNED NULL,
  reason TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, approved, denied',
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  review_notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_arr_student (student_id) REFERENCES students(id),
  FOREIGN KEY fk_arr_curr (current_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  FOREIGN KEY fk_arr_new (requested_agent_id) REFERENCES agents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
