-- Seed the notification template for system.erase_remote_delete_failed
INSERT INTO notification_templates (event_key, category, subject_template, body_template, channels, is_active)
VALUES (
  'system.erase_remote_delete_failed',
  'system_alert',
  'CRITICAL: Permanent File Erase Remote Delete Failed',
  'The permanent erasure for file {file_name} (ID: {public_id}) could not delete its Google Drive copy after {attempts} attempts. Error: {error}. Manual intervention in the Drive console is required.',
  'email,db',
  1
)
ON DUPLICATE KEY UPDATE
  subject_template = VALUES(subject_template),
  body_template = VALUES(body_template),
  channels = VALUES(channels),
  is_active = VALUES(is_active);
