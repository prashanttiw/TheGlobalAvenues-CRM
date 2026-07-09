-- Migration 082: Notification coverage fixes (2026-07-08 audit)
--
-- Found while auditing the notification system end-to-end:
--   1. Agent registration (RegistrationController::completeAgentReg) never sent a welcome
--      email — only student registration did. Sub-agent creation (SubAgentController::invite)
--      only notified the PARENT agent, never the new sub-agent account itself. Both now fire
--      'agent.registered'.
--   2. No notification of any kind existed for a successful login, for any of the 3 roles.
--      Added 'auth.login_success' (in_app only — no email, to avoid SMTP volume on accounts
--      that log in many times a day; product decision 2026-07-08).
--   3. document.requested / document.submitted / document.reviewed / document.cancelled have
--      been fired by DocumentRequestController since it was built, but no template row ever
--      existed for any of the four — NotificationService::fire() silently no-ops when no
--      active template exists, so document-request lifecycle notifications have never gone
--      out to students/agents/admins.
--
-- Payment-related notifications are intentionally NOT included here — the payment feature is
-- not active in production yet (see CLAUDE.md Known Open Item #10).

INSERT INTO notification_templates (event_key, subject_template, body_template, channels, category) VALUES
('agent.registered',
 'Welcome to The Global Avenues, {{full_name}}!',
 "Hi {{full_name}},\n\nYour TGA agent account is ready.\nLog in to complete your partner application: {{portal_url}}\n\nThe TGA Team",
 'email,in_app', 'system'),

('auth.login_success',
 'New Login to Your TGA Account',
 "Hi {{user_name}},\n\nYou just logged in to the {{portal_name}} at {{login_time}}.\n\nIf this wasn't you, please contact connect@theglobalavenues.com immediately.\n\nThe TGA Team",
 'in_app', 'security'),

('document.requested',
 'New Document Requested: {{doc_label}}',
 "A new document has been requested for your application.\n\nDocument: {{doc_label}}\n\nPlease log in to your portal to upload it.\n\nThe TGA Team",
 'email,in_app', 'system'),

('document.submitted',
 'Document Submitted for Review: {{doc_label}}',
 "A document has been submitted for review.\n\nDocument: {{doc_label}}\n\nPlease log in to the admin panel to review it.\n\nThe TGA Team",
 'email,in_app', 'system'),

('document.reviewed',
 'Document {{status}}: {{doc_label}}',
 "Your submitted document has been reviewed.\n\nDocument: {{doc_label}}\nStatus: {{status}}\n\nPlease log in to your portal for details.\n\nThe TGA Team",
 'email,in_app', 'system'),

('document.cancelled',
 'Document Request Cancelled: {{doc_label}}',
 "A document request has been cancelled.\n\nDocument: {{doc_label}}\n\nNo further action is needed.\n\nThe TGA Team",
 'email,in_app', 'system')

ON DUPLICATE KEY UPDATE
  subject_template = VALUES(subject_template),
  body_template = VALUES(body_template);
