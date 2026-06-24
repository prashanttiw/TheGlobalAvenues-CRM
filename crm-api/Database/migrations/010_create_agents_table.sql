-- 010: agents (3-level self-referential tree, hard-capped)
-- root_agent_id enables fast subtree queries without CTEs (MySQL 5.7 safe)
CREATE TABLE agents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  parent_agent_id INT UNSIGNED NULL COMMENT 'NULL = Level 1 agent',
  root_agent_id INT UNSIGNED NULL COMMENT 'Level 1 ancestor; equals own id if Level 1',
  tier TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1=agent, 2=sub_agent, 3=sub_sub_agent',
  full_name VARCHAR(255) NOT NULL,
  agency_name VARCHAR(255) NULL,
  country VARCHAR(100) NULL,
  business_reg_number VARCHAR(100) NULL,
  partnership_scope TEXT NULL,
  referral_code VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    COMMENT 'pending, approved, rejected, suspended',
  terms_accepted_at DATETIME NULL,
  approved_by INT UNSIGNED NULL,
  approved_at DATETIME NULL,
  rejected_reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_agent_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY fk_agent_parent (parent_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  FOREIGN KEY fk_agent_root (root_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  INDEX idx_agent_root (root_agent_id),
  INDEX idx_agent_parent (parent_agent_id),
  INDEX idx_agent_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
