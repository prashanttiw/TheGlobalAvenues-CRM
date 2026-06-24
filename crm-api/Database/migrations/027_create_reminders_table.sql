-- 027: reminders (universal deadline engine)
CREATE TABLE reminders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(30) NOT NULL
    COMMENT 'document_request, application_payment, intake, commission',
  entity_id INT UNSIGNED NOT NULL,
  reminder_type VARCHAR(50) NOT NULL
    COMMENT 'deadline_3days, deadline_1day, overdue, payment_overdue,
             commission_pending, intake_deadline',
  remind_at DATETIME NOT NULL,
  recipient_user_ids JSON NOT NULL COMMENT 'JSON array of user ids to notify',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, sent, cancelled',
  sent_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reminder_pending (status, remind_at),
  INDEX idx_reminder_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
