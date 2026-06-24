-- Migration 043: Add rate_limits cleanup to cron_health
-- Ensures rate_limits table doesn't grow unbounded on Bluehost.

INSERT INTO cron_health (job_name, status, last_run, next_run, error_message, schedule_expression) VALUES
('cleanup_rate_limits', 'pending', NULL, NULL, NULL, '0 * * * *')

ON DUPLICATE KEY UPDATE
  schedule_expression = VALUES(schedule_expression);
