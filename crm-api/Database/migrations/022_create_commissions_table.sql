-- 022: commissions
CREATE TABLE commissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  application_id INT UNSIGNED NOT NULL,
  agent_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NULL,
  percentage DECIMAL(5,2) NULL,
  currency VARCHAR(10) NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    COMMENT 'pending, confirmed, paid',
  notes TEXT NULL,
  decided_by INT UNSIGNED NULL,
  decided_at DATETIME NULL,
  paid_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_comm_app (application_id) REFERENCES applications(id),
  FOREIGN KEY fk_comm_agent (agent_id) REFERENCES agents(id),
  FOREIGN KEY fk_comm_decider (decided_by) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_comm_agent (agent_id),
  INDEX idx_comm_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
