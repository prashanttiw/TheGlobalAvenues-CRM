-- 023: notices
CREATE TABLE notices (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  content TEXT NULL,
  notice_type VARCHAR(20) NOT NULL DEFAULT 'notice' COMMENT 'notice, event',
  event_date DATETIME NULL,
  event_location VARCHAR(255) NULL,
  attachment_file_id INT UNSIGNED NULL,
  visible_to_students TINYINT(1) NOT NULL DEFAULT 0,
  visible_to_agents TINYINT(1) NOT NULL DEFAULT 0,
  visible_to_admins TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, published, expired',
  published_at DATETIME NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_notice_file (attachment_file_id) REFERENCES files(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
