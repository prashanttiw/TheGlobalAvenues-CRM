-- 037: activity_logs_archive
CREATE TABLE activity_logs_archive LIKE activity_logs;
ALTER TABLE activity_logs_archive COMMENT = 'Archived rows from activity_logs older than 180 days';
