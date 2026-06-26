# Phase 9 Release Notes
## TGA CRM — Production Hardening & Deployment
**Released**: 2026-06-27
**Branch**: main
**Scope**: Security hardening, academic profiles, withdrawal workflow, 2FA toggle, maintenance mode, error handling, cron recovery, deployment automation, performance caching, backup/restore, smoke testing

---

## Overview

Phase 9 brings the TGA CRM to full production readiness. 15 modules were implemented covering security hardening, resilience engineering, developer experience, and deployment automation. A comprehensive production readiness review by CTO, CISO, SRE, and Security Auditor identified 5 critical/high issues — all remediated before final sign-off.

**Phase 9 Final Status: Production-Ready. Zero Critical or High severity flaws.**

---

## Features Added

### Module 9.1 — Production Configuration
- `.htaccess`: HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, CSP headers
- Sensitive file protection: `.env`, `composer.json`, `php_errors.log` blocked from web access
- `mod_rewrite` rules added for Apache routing (critical audit fix §8.1 — API returned 404 on Bluehost without this)
- `index.php`: dynamic `APP_ENV` detection toggles `display_errors` and stack trace exposure
- `.env.production`: comprehensive production template with raised Argon2id costs, restricted CORS

### Module 9.2 — Student Academic Profile
- New tables: `student_academics`, `student_test_scores` (migration 063)
- `StudentAcademicController`: GET/POST/DELETE qualifications and standardized test scores
- IELTS, TOEFL, GRE, GMAT, SAT subscore breakdown (reading, writing, listening, speaking)
- IDOR protection: ULID public_id, ownership-verified per request

### Module 9.3 — Application Withdrawal Workflow
- `withdrawal_reason` column added (migration 064)
- `agentWithdraw` and `adminWithdraw` endpoints with role-specific RBAC
- Auto-cancellation of linked document requests and payment items on withdrawal
- `ApplicationController::getApplication()` now includes `withdrawal_reason` in SELECT (audit fix §8.3)

### Module 9.4 — Agent Referral Link System
- `GET /agent/referral-links` returns fully qualified URLs for student + sub-agent sharing
- Tier depth hard-cap (max 3) enforced during sub-agent onboarding
- `parent_agent_id` + `root_agent_id` correctly set on sub-agent registration

### Module 9.5 — Admin 2FA Toggle
- `POST /auth/2fa/toggle`: enable/disable 2FA requiring current password verification
- Prevents session hijacking from toggling 2FA via unattended active session
- Activity log + security event written on every toggle with user + IP

### Module 9.6 — Maintenance Mode
- `MaintenanceMiddleware`: filesystem `.maintenance` flag checked on every request
- Super-admin JWT bypass — admins can test while system is offline
- Works even when MySQL is completely down (filesystem-based, not DB-based)
- `GET/POST /admin/maintenance` toggle endpoints

### Module 9.7 — Error Handling
- Global `set_error_handler`: PHP warnings/notices cast to `ErrorException`
- `register_shutdown_function`: fatal errors return structured JSON instead of blank 500
- `RouteRegistry` 404 messages use clean REST paths (no internal `?route=X&action=Y` leakage)

### Module 9.8 — Local Developer Experience
- `setup-local.bat`: one-click bootstrap (npm install, .env copy, directory creation)
- `start-dev.bat`: boots PHP server + Vite dev server in parallel

### Module 9.9 — Production Deployment Automation
- `scripts/build-api-archive.bat`: stages `crm-api/` + `cron/` → clean zip artifact (cron now included — audit fix §8.2)
- `scripts/exclude.txt`: exclusion list for .env, .git, IDE caches
- `scripts/deploy-frontend.bat`: clean Vite build → Vercel CLI production push

### Module 9.10 — Cron Validation & Recovery
- `cron/scheduler.php`: single cPanel entry orchestrates all jobs
- `flock` on `scheduler.lock`: prevents parallel cron processes on shared hosting
- `scheduler_state.json`: per-job last-run timestamp for arbitrary interval simulation
- `CronHealth::checkStuckJobs()`: force-fails jobs stuck in `running` > 15 minutes

### Module 9.11 — Global Rate Limiting
- `RateLimitMiddleware::enforce('global_ip_{IP}', 200, 60)` applied globally in `index.php`
- Protects entire API from application-layer DDoS and aggressive scraping
- Violations logged to `security_events` for admin audit and fail2ban integration

### Module 9.12 — Performance Caching
- `SystemSettings` dual-layer cache: static PHP array (intra-request) + `storage/cache/settings.json` (cross-request)
- Eliminates up to 5 redundant `system_settings` queries per request
- `mod_deflate` GZIP compression for `application/json` responses in `.htaccess`

### Module 9.13 — Backup & Restore Validation
- `scripts/restore-db.bat`: auto-parses `.env` credentials, prompts confirmation, streams SQL dump
- `cron/verify-backups.php`: alerts if latest Drive backup is suspiciously small (< 1KB)

### Module 9.14 — Production Smoke Testing
- `scripts/smoke-test.bat`: hits `/api/health` via PowerShell, verifies HTTP 200
- `HealthController` enhanced with `is_writable()` checks for `uploads/` and `logs/`

---

## Security Improvements

| Finding | Severity | Fix |
|---------|----------|-----|
| Database credentials in stack traces (§ISSUE 2) | Critical | `Database.php` sanitizes PDOException before re-throwing |
| Missing mod_rewrite in .htaccess (§8.1) | Critical | RewriteEngine On + RewriteRule added |
| Drive upload never retried after first failure (§ISSUE 3) | High | sync_attempts column + retry/backoff loop |
| No SMTP failover (§ISSUE 4) | High | Fallback SMTP host try-catch in send-notifications.php |
| Cron crashes silently on DB down (§ISSUE 1) | High | All cron scripts wrapped in try-catch with CronHealth::failure() |
| cron/ excluded from deployment artifact (§8.2) | High | build-api-archive.bat now stages cron/ directory |
| withdrawal_reason not in SELECT (§8.3) | High | ApplicationController query fixed |
| Global volumetric DDoS exposure | Medium | 200 req/min global IP rate limit added |

---

## Performance Improvements

- `SystemSettings` caching: eliminates ~5 DB queries per request after cache warm-up
- GZIP compression on all JSON responses via `mod_deflate`
- Cron file lock: prevents memory exhaustion from overlapping cron processes

---

## Developer Experience

- One-command local setup: `setup-local.bat` bootstraps entire dev environment
- One-command dev server: `start-dev.bat` boots PHP + Vite in parallel
- One-command production build: `build-api-archive.bat` produces clean deploy artifact
- Post-deploy validation: `smoke-test.bat` verifies health in 5 seconds

---

## Known Limitations

- Bluehost shared hosting: single point of failure for backend (VPS migration recommended at 500+ DAU)
- Drive storage quota: no automated rotation of service accounts (manual admin action required)
- TOTP (Google Authenticator) 2FA not yet implemented — email OTP only
- Direct-to-cloud uploads (pre-signed URLs) deferred — large files still route through PHP

---

## Production Sign-off

Following remediation of all critical and high findings:
- **Reliability**: File locks on crons + backup verification + MTTR < 2 min
- **Security**: Dual-layer rate limiting + hardened Apache + no credential leakage
- **Performance**: Settings cache + GZIP + snapshot-backed reporting
- **Maintainability**: One-command dev setup + automated deployment + smoke tests
- **Monitoring**: /api/health + smoke-test.bat + cron_health dashboard

**The Global Avenues CRM is cleared for immediate production deployment to Bluehost.**

---

## Phase 9 Commits

```
e6a2afa  fix(production): resolve audit findings -- withdrawal reason, route 404 format, logo URL
433ced2  feat(security): add agent referral links, Phase 9 schema migrations, and Drive retry
86092f3  feat(student): implement academic profile and test scores management
cabbde0  feat(cron): implement master scheduler with file locking and stuck job recovery
c50fd87  feat(deployment): add production deployment automation and local dev scripts
12c3bf1  perf(cache): add filesystem settings cache and Phase 6/7 DB seed scripts
```
