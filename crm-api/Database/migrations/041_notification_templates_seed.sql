-- Migration 041: Seed Phase 2 Notification Templates
-- Seeds 8 required templates for student reg, agent onboarding, and security events.

INSERT INTO notification_templates (event_key, subject_template, body_template, channels, category) VALUES

('student.registered',
 'Welcome to The Global Avenues, {{student_name}}!',
 'Hi {{student_name}},\n\nYour TGA account is ready.\nLog in at: {{portal_url}}\n\nThe TGA Team',
 'email,in_app', 'system'),

('agent.onboarding_submitted',
 'New Partner Application: {{agency_name}}',
 'New agent application submitted.\nAgency: {{agency_name}}\nContact: {{full_name}}\nCountry: {{country}}\nReview: {{admin_url}}',
 'email,in_app', 'approvals'),

('agent.approved',
 'Your TGA Partnership Is Approved!',
 'Hi {{full_name}},\n\nWelcome to the TGA partner network!\n\nYour referral code: {{referral_code}}\nPortal: {{portal_url}}\n\nThe TGA Team',
 'email,in_app', 'system'),

('agent.rejected',
 'Update on Your TGA Partnership Application',
 'Hi {{full_name}},\n\nWe are unable to approve your application.\nReason: {{rejection_reason}}\n\nContact connect@theglobalavenues.com\n\nThe TGA Team',
 'email,in_app', 'system'),

('agent.suspended',
 'Your TGA Partner Account Has Been Suspended',
 'Hi {{full_name}},\n\nYour account has been suspended.\nReason: {{suspension_reason}}\n\nContact connect@theglobalavenues.com',
 'email', 'system'),

('subagent.created',
 'New Sub-Agent Application Under Your Account',
 'Hi {{parent_agent_name}},\n\nNew sub-agent pending TGA approval.\nName: {{subagent_name}}\nAgency: {{subagent_agency}}',
 'email,in_app', 'agent'),

('admin.created',
 'Your TGA Admin Account Is Ready',
 'Hi {{full_name}},\n\nYour TGA admin account has been created.\nPortal: {{portal_url}}\n\nThe TGA Team',
 'email', 'system'),

('password.reset_otp',
 'Reset Your TGA Password',
 'Hi,\n\nYour password reset code: {{otp_code}}\nValid for {{expiry_minutes}} minutes.\n\nIf you did not request this, ignore this email.',
 'email', 'security')

ON DUPLICATE KEY UPDATE 
  subject_template = VALUES(subject_template),
  body_template = VALUES(body_template),
  channels = VALUES(channels),
  category = VALUES(category);
