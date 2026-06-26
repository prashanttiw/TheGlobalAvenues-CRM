# Phase 6 Release Notes
## TGA CRM — Infrastructure & Background Processing
**Released**: 2026-06-26
**Branch**: main
**Scope**: Notification engine, email dispatch, scheduled reminders, Google Drive sync, activity log archival, database backup, SLA monitoring, disk health cron

---

## Overview

Phase 6 delivers all background infrastructure. Every cron job, notification delivery pipeline, Drive synchronization, and SLA monitoring system is now operational. The application moves from "data stored" to "data actively maintained, monitored, and communicated."

---

## Features Added

### Notification Engine
- `NotificationService::fire()` dispatches in-app + email notifications queued in `notifications` table
- In-app delivery: marks notifications as `sent` with `sent_at` timestamp
- Category-based grouping (applications, documents, payments, approvals, system, agent)
- `NotificationCenter` frontend component reads queued notifications per user

### Email Dispatch Cron
- `cron/send-notifications.php`: processes `notifications` WHERE `channel='email'` AND `status='queued'`
- PHPMailer integration with SMTP credentials from environment
- Fallback SMTP routing: if primary host fails, automatically retries via `MAIL_FALLBACK_HOST` (§ISSUE 4 audit fix)
- Failed delivery increments `attempts` counter; retries up to 3 times before `status='failed'`
- `failed_emails` secondary retry table for persistent SMTP failures

### Scheduled Reminder Engine
- `cron/process-reminders.php`: reads `reminders` table WHERE `remind_at <= NOW()` AND `status='pending'`
- Fires notification per reminder entity (document deadline, payment due date)
- Marks reminder `status='sent'` atomically on success

### Google Drive Sync
- `cron/sync-drive.php`: uploads `files` WHERE `drive_sync_status='pending'` OR `(status='failed' AND sync_attempts < 3)`
- Exponential backoff with jitter on Drive API 429/503 errors (§ISSUE 3 audit fix)
- `sync_attempts` incremented on each failure (migration 065)
- Daily database backup upload to separate Drive folder via `DriveFolderManager::uploadBackup()`

### Activity Log Archival
- `cron/archive-activity-logs.php`: moves records older than 90 days from `activity_logs` to `activity_logs_archive`
- Prevents unbounded table growth that would degrade query performance over time

### Database Backup Cron
- Daily `mysqldump` → gzip → Drive upload with healthcheck.io ping on success
- Backup stored in dedicated Drive folder separate from document storage

### SLA Monitoring
- `cron/check-sla-breaches.php`: marks `sla_events` as `breached` when `target_at < NOW()` AND `resolved_at IS NULL`
- SLA breach count surfaced in admin dashboard action-required queue

### Disk Health
- `HealthController` returns real-time disk free percentage
- Alert threshold configurable via `system_settings.disk_alert_threshold_pct`

---

## Architecture Decisions

- **DB-backed notification queue** over synchronous dispatch: prevents PHP timeout on bulk notifications
- **Single master scheduler** (`cron/scheduler.php`) replaces 9+ individual cPanel entries — one entry, all jobs
- **File lock (`flock`)** on scheduler prevents parallel cron processes from exhausting shared hosting memory
- **`scheduler_state.json`** tracks per-job last execution — simulates complex intervals without multiple cPanel entries

---

## Security Improvements

- SMTP credentials never logged — only masked host/port in error logs
- Drive OAuth token stored outside web root in `.env`
- Backup archives gzipped and named with timestamp — no guessable filenames

---

## Performance Improvements

- Activity log archival prevents `activity_logs` growing unbounded (INSERT-only table)
- `rate_limits` cleanup cron deletes rows older than 2 hours — prevents disk quota exhaustion
- Notification dispatch batches 50 rows per cron cycle — prevents memory pressure

---

## Known Limitations

- Google Drive sync is one-way (upload only) — restore flow is manual
- Email fallback requires `MAIL_FALLBACK_HOST` to be configured in `.env`
- healthchecks.io ping URL must be manually configured per deployment
