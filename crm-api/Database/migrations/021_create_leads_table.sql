-- 021: leads (TGA-internal only — agents never have access to this table)
CREATE TABLE leads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  full_name VARCHAR(255) NULL,
  email BLOB NULL COMMENT 'AES-256-GCM encrypted',
  email_lookup_hash VARCHAR(64) NULL,
  phone BLOB NULL COMMENT 'AES-256-GCM encrypted',
  source VARCHAR(100) NULL
    COMMENT 'website_form, landing_page, campaign_ad, event, manual_entry, imported',
  source_detail VARCHAR(255) NULL,
  interested_country VARCHAR(100) NULL,
  interested_course VARCHAR(255) NULL,
  notes TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    COMMENT 'new, contacted, qualified, converted, dropped',
  assigned_to INT UNSIGNED NULL COMMENT 'Points to admins.id — never an agent',
  converted_student_id INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_lead_staff (assigned_to) REFERENCES admins(id) ON DELETE SET NULL,
  FOREIGN KEY fk_lead_student (converted_student_id) REFERENCES students(id)
    ON DELETE SET NULL,
  INDEX idx_lead_status (status),
  INDEX idx_lead_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
