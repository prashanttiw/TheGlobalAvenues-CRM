-- Migration 066: OTP notification templates
INSERT INTO notification_templates (event_key, subject_template, body_template, channels, category, is_active)
VALUES
('student.registration_otp', 'Your TGA Verification Code: {{otp_code}}',
 'Hi,\n\nYour verification code is: {{otp_code}}\n\nThis code is valid for {{expiry_minutes}} minutes.\n\nIf you did not request this, please ignore this email.\n\nThe Global Avenues Team',
 'email', 'system', 1),
('agent.registration_otp', 'Your TGA Agent Verification Code: {{otp_code}}',
 'Hi,\n\nYour verification code is: {{otp_code}}\n\nThis code is valid for {{expiry_minutes}} minutes.\n\nIf you did not request this, please ignore this email.\n\nThe Global Avenues Team',
 'email', 'system', 1),
('login.otp', 'Your TGA Login Code: {{otp_code}}',
 'Hi,\n\nYour one-time login code is: {{otp_code}}\n\nThis code is valid for {{expiry_minutes}} minutes.\n\nIf you did not request this, someone may be trying to access your account.\n\nThe Global Avenues Team',
 'email', 'system', 1),
('admin.2fa_otp', 'Your TGA Admin 2FA Code: {{otp_code}}',
 'Hi,\n\nYour admin 2FA verification code is: {{otp_code}}\n\nThis code is valid for {{expiry_minutes}} minutes.\n\nIf you did not request this, someone may be trying to access your account.\n\nThe Global Avenues Team',
 'email', 'security', 1)
ON DUPLICATE KEY UPDATE 
 subject_template = VALUES(subject_template),
 body_template = VALUES(body_template),
 channels = VALUES(channels),
 category = VALUES(category),
 is_active = VALUES(is_active);
