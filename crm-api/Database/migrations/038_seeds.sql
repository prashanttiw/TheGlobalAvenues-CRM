-- ============================================================
-- SEEDS
-- ============================================================

-- Permissions (56 rows)
INSERT INTO permissions (module, action) VALUES
  ('universities','view'),('universities','create'),('universities','edit'),
  ('universities','delete'),
  ('courses','view'),('courses','create'),('courses','edit'),('courses','delete'),
  ('intakes','view'),('intakes','create'),('intakes','edit'),('intakes','delete'),
  ('applications','view'),('applications','create'),('applications','edit'),
  ('applications','approve'),
  ('students','view'),('students','create'),('students','edit'),
  ('students','delete'),('students','approve'),
  ('agents','view'),('agents','create'),('agents','edit'),
  ('agents','delete'),('agents','approve'),
  ('leads','view'),('leads','create'),('leads','edit'),('leads','delete'),
  ('documents','view'),('documents','create'),('documents','approve'),
  ('commissions','view'),('commissions','create'),('commissions','edit'),
  ('commissions','approve'),
  ('notices','view'),('notices','create'),('notices','edit'),('notices','delete'),
  ('activity_logs','view'),
  ('security_events','view'),
  ('user_management','view'),('user_management','create'),
  ('user_management','edit'),('user_management','delete'),
  ('reports','view'),
  ('system_settings','view'),('system_settings','edit'),
  ('internal_notes','view'),('internal_notes','create'),
  ('sla','view'),('sla','edit');

-- System settings defaults
INSERT INTO system_settings
  (setting_key, setting_value, value_type, label, description, group_name)
VALUES
  ('otp_expiry_minutes','10','integer','OTP Expiry (minutes)',
   'How long an OTP remains valid','otp'),
  ('otp_max_attempts','3','integer','OTP Max Attempts',
   'Failed attempts before OTP is blocked','otp'),
  ('upload_max_size_mb','10','integer','Max Upload Size (MB)',
   'Maximum file size per document upload','upload'),
  ('reminder_days_before_deadline','[3,1]','json','Reminder Days Before Deadline',
   'Days before deadline to send reminder notifications','reminders'),
  ('commission_pending_alert_days','30','integer','Commission Pending Alert (days)',
   'Alert admin when a commission has been pending this many days','commissions'),
  ('disk_warn_threshold_pct','80','integer','Disk Warning Threshold (%)',
   'Alert when disk usage exceeds this percentage','security'),
  ('disk_critical_threshold_pct','95','integer','Disk Critical Threshold (%)',
   'Critical alert threshold for disk usage','security'),
  ('session_max_per_user','5','integer','Max Active Sessions Per User',
   'Oldest session revoked when limit is exceeded','security'),
  ('api_log_slow_threshold_ms','500','integer','Slow API Threshold (ms)',
   'Log warning when API response exceeds this time','security'),
  ('backup_retain_daily','7','integer','Daily Backup Retention',
   'Number of daily backups to keep','backup'),
  ('backup_retain_weekly','4','integer','Weekly Backup Retention',
   'Number of weekly backups to keep','backup'),
  ('backup_retain_monthly','6','integer','Monthly Backup Retention',
   'Number of monthly backups to keep','backup');

-- SLA rules defaults
INSERT INTO sla_rules (rule_name, entity_type, trigger_status, target_hours, description)
VALUES
  ('document_review','document_request','submitted',48,
   'Document must be reviewed within 48 hours of submission'),
  ('application_review','application','submitted',72,
   'Application status must be updated within 72 hours of submission'),
  ('lead_first_contact','lead','new',24,
   'New lead must be contacted within 24 hours');

-- Cron health seeds
INSERT INTO cron_health (job_name) VALUES
  ('send_notifications'),('sync_drive'),('backup_db'),
  ('generate_snapshots'),('process_reminders'),('monitor_disk'),
  ('check_sla_breaches'),('verify_backups'),('archive_old_logs');
