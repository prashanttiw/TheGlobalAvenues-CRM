-- No schema change required since status is VARCHAR(50).
-- Adding a comment for documentation.
ALTER TABLE document_requests
MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'requested' COMMENT 'requested, submitted, approved, rejected, cancelled';
