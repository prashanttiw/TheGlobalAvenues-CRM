-- Migration: 085_disk_warning_template_text_fix.sql
-- The system.disk_warning notification template (seeded by migration 081) told admins to
-- "consider clearing old backups or logs" — a leftover reference to the Google Drive backup
-- feature removed on 2026-07-10 (see migration 084). Backups no longer exist to clear; corrected
-- to a generic suggestion. Content-only fix, no schema change.

UPDATE notification_templates
SET body_template = REPLACE(
    body_template,
    'Consider clearing old backups or logs before this reaches critical levels.',
    'Consider clearing old files or logs before this reaches critical levels.'
)
WHERE event_key = 'system.disk_warning';
