-- No schema change required since status is VARCHAR(50).
-- Adding a comment for documentation.
ALTER TABLE applications
MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft' COMMENT 'draft, submitted, under_review, waitlisted, offer_received, enrolled, rejected, withdrawn';
