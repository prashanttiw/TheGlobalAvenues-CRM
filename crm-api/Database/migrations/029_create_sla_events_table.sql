-- 029: sla_events (track SLA per entity instance)
CREATE TABLE sla_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sla_rule_id INT UNSIGNED NOT NULL,
  entity_type VARCHAR(30) NOT NULL,
  entity_id INT UNSIGNED NOT NULL,
  started_at DATETIME NOT NULL,
  target_at DATETIME NOT NULL COMMENT 'started_at + rule target_hours',
  resolved_at DATETIME NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    COMMENT 'active, met, breached',
  breach_notified TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_sla_rule (sla_rule_id) REFERENCES sla_rules(id),
  INDEX idx_sla_status (status, target_at, breach_notified),
  INDEX idx_sla_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
