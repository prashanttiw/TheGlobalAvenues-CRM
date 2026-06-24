-- 028: sla_rules (define service level expectations)
CREATE TABLE sla_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL UNIQUE,
  entity_type VARCHAR(30) NOT NULL COMMENT 'document_request, application, lead',
  trigger_status VARCHAR(30) NOT NULL COMMENT 'Status that starts the SLA clock',
  target_hours INT UNSIGNED NOT NULL COMMENT 'Hours to resolve before SLA breach',
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
