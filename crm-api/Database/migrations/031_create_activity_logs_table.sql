-- 031: activity_logs
-- APPEND-ONLY: app DB user has INSERT-only grant on this table.
-- No updated_at, no deleted_at. Rows are never modified or removed.
CREATE TABLE activity_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT UNSIGNED NULL,
  actor_user_type VARCHAR(20) NULL COMMENT 'student, agent, admin, system',
  actor_display_name VARCHAR(255) NULL COMMENT 'Name snapshot at time of action',
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NULL,
  target_id INT UNSIGNED NULL,
  target_public_id CHAR(26) NULL,
  target_display VARCHAR(255) NULL COMMENT 'Human-readable snapshot of target',
  before_value JSON NULL,
  after_value JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_al_actor (actor_user_id, created_at),
  INDEX idx_al_target (target_type, target_id),
  INDEX idx_al_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
