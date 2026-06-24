-- 032: report_snapshots (daily pre-computed metrics for fast dashboard queries)
-- Populated by generate_snapshots cron job daily at midnight
CREATE TABLE report_snapshots (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  metric_key VARCHAR(100) NOT NULL
    COMMENT 'total_students, new_students, total_applications, total_offers,
             total_enrollments, total_leads, commissions_pending_inr,
             commissions_paid_inr, conversion_rate_pct',
  metric_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  dimension_type VARCHAR(50) NULL
    COMMENT 'global, agent, university, country, lead_source',
  dimension_id VARCHAR(255) NOT NULL DEFAULT '_global'
    COMMENT 'agent public_id, university public_id, country name, or source key',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_snapshot (snapshot_date, metric_key, dimension_type, dimension_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
