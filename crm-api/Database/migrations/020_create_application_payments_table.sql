-- 020: application_payments
CREATE TABLE application_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  application_id INT UNSIGNED NOT NULL,
  label VARCHAR(255) NOT NULL COMMENT 'e.g. Application Fee, Tuition Deposit',
  amount DECIMAL(12,2) NULL,
  currency VARCHAR(10) NULL DEFAULT 'EUR',
  payment_link TEXT NULL,
  due_date DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    COMMENT 'pending, student_marked_paid, confirmed, disputed',
  marked_paid_at DATETIME NULL,
  confirmed_by INT UNSIGNED NULL,
  confirmed_at DATETIME NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_pay_app (application_id) REFERENCES applications(id),
  FOREIGN KEY fk_pay_confirmer (confirmed_by) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_pay_due (due_date),
  INDEX idx_pay_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
