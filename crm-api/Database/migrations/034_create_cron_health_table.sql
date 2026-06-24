-- 034: cron_health (heartbeat monitoring — every cron writes here on each run)
CREATE TABLE cron_health (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL UNIQUE,
  last_run_at DATETIME NULL,
  last_run_status VARCHAR(20) NOT NULL DEFAULT 'never_run'
    COMMENT 'success, failed, running, never_run',
  last_run_duration_ms INT UNSIGNED NULL,
  last_error TEXT NULL,
  run_count INT UNSIGNED NOT NULL DEFAULT 0,
  fail_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
