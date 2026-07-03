-- Adds the permission that gates the system-wide "Super Activity Log" page.
-- Super admins already bypass all permission checks; this is only relevant
-- when a super admin grants a regular admin explicit access to it via the
-- page-access UI (AdminPageAccessService).
INSERT IGNORE INTO permissions (module, action, description) VALUES
  ('activity_logs', 'view_all', 'View system-wide activity logs across all admins, agents, and students (Super Activity Log)');
