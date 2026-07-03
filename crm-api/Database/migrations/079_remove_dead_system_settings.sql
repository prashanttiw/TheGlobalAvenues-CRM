-- Migration 079: Remove system_settings rows that no backend code ever reads.
-- Each of these had an editable field on the admin Settings page and saved
-- successfully, but changing the value had zero effect on app behavior:
--   otp_max_attempts              -- OTPService::verify() hardcodes maxAttempts=3;
--                                     every call site omits the 4th argument.
--   commission_pending_alert_days -- no cron/service ever checks commission age
--                                     against this to fire a reminder.
--   reminder_days_before_deadline -- ReminderService::schedule() takes offsets
--                                     as a parameter; the only caller
--                                     (PaymentTrackingController) hardcodes
--                                     [7 => 'payment_upcoming', 1 => 'payment_urgent'].
--   api_log_slow_threshold_ms     -- the api_request_logs table it would gate
--                                     is never written to anywhere.
--   argon2_memory_cost            -- password_hash() calls read
--   argon2_time_cost                 ARGON2_MEMORY_COST/ARGON2_TIME_COST from
--                                     crm-api/.env via Environment::get(),
--                                     never from system_settings.
DELETE FROM system_settings WHERE setting_key IN (
  'otp_max_attempts',
  'commission_pending_alert_days',
  'reminder_days_before_deadline',
  'api_log_slow_threshold_ms',
  'argon2_memory_cost',
  'argon2_time_cost'
);
