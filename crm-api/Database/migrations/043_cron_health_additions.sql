-- Migration 043: Add rate_limits cleanup to cron_health
-- Ensures rate_limits table doesn't grow unbounded on Bluehost.

INSERT INTO cron_health (job_name) VALUES ('cleanup_rate_limits')
ON DUPLICATE KEY UPDATE job_name = VALUES(job_name);
