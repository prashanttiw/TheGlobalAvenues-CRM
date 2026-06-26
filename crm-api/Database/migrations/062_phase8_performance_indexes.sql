-- 062: Phase 8 Performance Indexes
-- Optimize the report_snapshots table for fast ORDER BY snapshot_date DESC LIMIT 1 point queries
-- and dimension-based lookups that bypass full table scans on shared hosting.

ALTER TABLE report_snapshots
ADD INDEX idx_reports_lookup (dimension_type, dimension_id, metric_key, snapshot_date);

-- Optimize applications table for export queries
ALTER TABLE applications
ADD INDEX idx_applications_deleted_submitted (deleted_at, submitted_at);

-- Optimize students table for export queries
ALTER TABLE students
ADD INDEX idx_students_deleted_created (deleted_at, created_at);
