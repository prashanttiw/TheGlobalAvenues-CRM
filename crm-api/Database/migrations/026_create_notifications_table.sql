-- 026: notifications (queue + delivery log + categorised notification center)
CREATE TABLE notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  event_key VARCHAR(100) NOT NULL,
  recipient_user_id INT UNSIGNED NOT NULL,
  channel VARCHAR(20) NOT NULL COMMENT 'email, in_app',
  category VARCHAR(50) NULL
    COMMENT 'documents, applications, payments, approvals, system, agent',
  subject TEXT NULL,
  body TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    COMMENT 'queued, sent, failed, read',
  related_entity_type VARCHAR(50) NULL,
  related_entity_id INT UNSIGNED NULL,
  related_entity_public_id CHAR(26) NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_attempt_at DATETIME NULL,
  sent_at DATETIME NULL,
  read_at DATETIME NULL,
  error_message TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_notif_user (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_recipient (recipient_user_id, status),
  INDEX idx_notif_category (recipient_user_id, category, status),
  INDEX idx_notif_queued (status, attempts, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
