-- 014: universities
CREATE TABLE universities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  name VARCHAR(500) NOT NULL,
  country VARCHAR(100) NOT NULL,
  city VARCHAR(255) NULL,
  description TEXT NULL,
  ranking_info VARCHAR(255) NULL,
  logo_file_id INT UNSIGNED NULL,
  website_url VARCHAR(500) NULL,
  partnership_type VARCHAR(30) NULL DEFAULT 'non_exclusive'
    COMMENT 'exclusive, non_exclusive',
  status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active, inactive',
  created_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_uni_logo (logo_file_id) REFERENCES files(id) ON DELETE SET NULL,
  INDEX idx_uni_country (country),
  INDEX idx_uni_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
