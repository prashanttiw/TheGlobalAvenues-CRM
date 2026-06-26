# PHASE 9 — PRODUCTION HARDENING & DEPLOYMENT RESEARCH

## 1. EXECUTIVE SUMMARY & ARCHITECTURAL RISK ASSESSMENT
This document evaluates the production readiness of The Global Avenues CRM. The current architecture employs a decoupled model: a React-based frontend deployed on Vercel, paired with a PHP 8.2 backend and MySQL 8.4 database hosted on Bluehost (Shared Hosting environment), integrating with external services like Google Drive for document storage and SMTP for emails.

### 1.1 Core Resiliency Questions
* **If production crashes tomorrow... Can we recover?**
  * *Current State:* Highly dependent on Bluehost's automated backups and Vercel's availability.
  * *Required Action:* We need independent, off-site database and configuration backups. Recovery time objective (RTO) must be documented.
* **If database corrupts... Can we recover?**
  * *Current State:* Corruptions on shared hosting can be catastrophic if the provider's backups are also corrupted.
  * *Required Action:* Implement automated point-in-time SQL dumps exported to an external bucket (e.g., AWS S3 or a secondary Google Drive).
* **If SMTP fails... What happens?**
  * *Current State:* Password resets, 2FA, and critical agent notifications fail silently or block the UI.
  * *Required Action:* Implement an asynchronous email queue (via DB table) and a fallback mechanism.
* **If Drive fails... What happens?**
  * *Current State:* Document uploads fail, potentially blocking student applications.
  * *Required Action:* Implement graceful degradation, alerting, and temporary local queuing if Drive API rate limits are hit.
* **If cron fails... What happens?**
  * *Current State:* Commission calculations, scheduled reports, and cleanups stall.
  * *Required Action:* Implement a "dead-man's switch" monitor (e.g., Healthchecks.io) to alert admins if cron jobs do not ping back within the expected window.
* **If one server dies... What happens?**
  * *Current State:* Frontend (Vercel) is highly available (CDN). Backend (Bluehost Shared) is a single point of failure (SPOF).
  * *Required Action:* Document disaster recovery procedures to migrate the PHP backend to a new host (cPanel migration or manual deployment script) within 2 hours.

## 2. PLATFORM & INFRASTRUCTURE RESEARCH

### 2.1 Bluehost Shared Hosting Limitations
* **Resource Limits:** CPU throttling and memory limits (often 256MB-512MB per process) will kill heavy exports or PDF generation.
* **Connection Limits:** `max_connections` in MySQL is strictly enforced. High traffic spikes from the frontend will result in "Too many connections" errors.
* **Cron Granularity:** Shared hosting often restricts cron jobs to every 5 or 15 minutes minimum.
* **Filesystem Isolation:** Shared environments run the risk of directory traversal attacks if `open_basedir` is not configured correctly.

### 2.2 Windows Shared Hosting Limitations (If Applicable)
* **Path Lengths:** Windows enforces strict 260-character path limits which can break complex cache paths.
* **Permissions:** IIS/Windows permissions differ vastly from Linux (chmod). We must ensure `IUSR` or the AppPool identity has write access *only* where necessary (e.g., `/logs`, `/uploads`).

### 2.3 PHP 8.2 & MySQL 8.4 Production Hardening
* **PHP:** Disable dangerous functions in `php.ini` (`exec`, `passthru`, `shell_exec`, `system`). Set `expose_php = Off`, `display_errors = Off`, `log_errors = On`.
* **MySQL:** Ensure strictly parameterized queries (PDO) are used everywhere. Audit database user privileges (the application user must NOT have `DROP`, `GRANT`, or `ALTER` permissions in production).

## 3. SECURITY & COMPLIANCE

### 3.1 Apache Hardening
* Hide server signatures: `ServerSignature Off`, `ServerTokens Prod`.
* Disable directory browsing: `Options -Indexes`.
* Protect configuration files: Block access to `.htaccess`, `.env`, `composer.json`.

### 3.2 Secure File Uploads
* Validate MIME type via server-side inspection (finfo), NOT just the `$_FILES['type']` which is spoofable.
* Reject executable extensions (`.php`, `.exe`, `.sh`).
* Store temporary uploads outside the public web root (`public_html`) before streaming to Google Drive.
* Ensure uploaded files are renamed to a secure hash (e.g., UUIDv4) upon upload.

### 3.3 Production Secrets Management
* Do not store raw API keys in source control.
* Use strict `.env` files outside the document root.
* Rotate salts, Google Drive OAuth tokens, and SMTP credentials prior to final production cutover.

### 3.4 Rate Limiting & Security Headers
* Implement API rate limiting by IP/User ID to prevent brute force (especially on `/api/login` and `/api/2fa`).
* Required Headers:
  * `Strict-Transport-Security` (HSTS)
  * `Content-Security-Policy` (CSP)
  * `X-Frame-Options: DENY`
  * `X-Content-Type-Options: nosniff`

## 4. OBSERVABILITY & MONITORING

### 4.1 Production Logging
* Use a centralized logging mechanism writing to a secure, rotated file.
* Do NOT log sensitive data (passwords, raw auth tokens, PII).
* Implement unique Request IDs to trace an action from the Vercel frontend through the PHP backend.

### 4.2 Health Checks
* Create a dedicated `/api/health` endpoint that checks:
  1. Database connection.
  2. Google Drive API reachability.
  3. SMTP connection.
  4. Disk space availability.

## 5. FEATURE-BY-FEATURE PRODUCTION REVIEW

| Feature | Production Risk | Mitigation Strategy |
| :--- | :--- | :--- |
| **Authentication & 2FA** | Brute force attacks, Session hijacking. | Strict rate limiting, Secure HttpOnly cookies, CSRF tokens, short-lived JWTs. |
| **Student / Agent Management** | Inadvertent data exposure via IDOR. | Ensure strict authorization checks on every endpoint fetching user-specific data. |
| **Documents (Google Drive)** | API Quota limits, Slow uploads blocking PHP workers. | Implement chunked uploads or asynchronous queueing. Cache Drive folder IDs. |
| **Reports & Exports** | Memory exhaustion on large datasets. | Stream CSV generation directly to output (php `php://output`) instead of building in memory. |
| **Commissions & Cron** | Race conditions during calculation. | Use database transactions and pessimistic locking (`SELECT ... FOR UPDATE`) during payout calculation. |
| **RBAC** | Privilege escalation. | Unit test all permission boundaries. Hardcode superadmin overrides safely. |
| **Maintenance Mode** | Application continues processing webhooks or cron. | Ensure Maintenance mode checks apply to CLI/Cron execution paths if database schemas are changing. |

---

## 6. IMPLEMENTATION ROADMAP (MODULES)

### MODULE 9.1: SECURITY & VULNERABILITY HARDENING
* **Objective:** Secure the perimeter and application layer against OWASP Top 10 vulnerabilities.
* **Risk:** Data breach, unauthorized access, server compromise.
* **Implementation Scope:** Apache `.htaccess` hardening, API rate limiting, CSP headers, strict input validation, file upload sandboxing.
* **Security Scope:** Fix any remaining IDORs, enforce strong CSRF and XSS protections.
* **Testing Scope:** Automated security scanning (e.g., OWASP ZAP), manual penetration testing of auth endpoints.
* **Deployment Scope:** Backend server configuration update.
* **Rollback Plan:** Revert `.htaccess` and `SecurityMiddleware.php` changes.
* **Definition of Done:** All APIs rate-limited, headers achieve 'A' grade on security scanners, `.env` secured.

### MODULE 9.2: DATA RESILIENCE & DISASTER RECOVERY
* **Objective:** Ensure zero data loss and rapid recovery capabilities.
* **Risk:** Hardware failure, accidental DROP TABLE, malicious data wiping.
* **Implementation Scope:** Automated daily off-site SQL backups, transaction log archiving.
* **Security Scope:** Encrypt backups at rest.
* **Testing Scope:** Perform a dry-run database restore to a staging server.
* **Deployment Scope:** Setup cron jobs for backup generation and transmission.
* **Rollback Plan:** N/A (additive feature).
* **Definition of Done:** Backups are successfully generated, encrypted, and restored in a staging environment under 15 minutes.

### MODULE 9.3: OBSERVABILITY & HEALTH MONITORING
* **Objective:** Detect failures before users report them.
* **Risk:** Silent failures leading to corrupted data or lost business.
* **Implementation Scope:** Healthcheck endpoints, error alerting, UptimeRobot integration.
* **Security Scope:** Ensure logs do not contain PII.
* **Testing Scope:** Simulate database/drive failures and verify alerts are triggered.
* **Deployment Scope:** Backend code update and external monitor configuration.
* **Rollback Plan:** Revert logging configuration.
* **Definition of Done:** `/api/health` accurately reflects system state; critical errors generate immediate notifications.

### MODULE 9.4: FRONTEND PRODUCTION OPTIMIZATION
* **Objective:** Maximize Vercel deployment performance and SEO.
* **Risk:** Slow load times in low-bandwidth regions, poor caching.
* **Implementation Scope:** React code splitting, lazy loading, image optimization, tree-shaking, strict caching headers for static assets.
* **Security Scope:** Ensure source maps are disabled in production to protect IP.
* **Testing Scope:** Lighthouse performance audit (Target > 90 on Performance, Accessibility, Best Practices).
* **Deployment Scope:** Vercel build settings update.
* **Rollback Plan:** Redeploy previous Vercel commit.
* **Definition of Done:** Lighthouse scores > 90, bundle size reduced, source maps disabled.

### MODULE 9.5: QUEUES & ASYNCHRONOUS PROCESSING
* **Objective:** Prevent external API latency (SMTP, Drive) from impacting user experience.
* **Risk:** PHP timeouts causing broken states during document upload or mass emailing.
* **Implementation Scope:** DB-backed job queue for emails and heavy document syncing, processed via cron.
* **Security Scope:** Secure job payloads.
* **Testing Scope:** Queue 1000 emails, verify system remains responsive.
* **Deployment Scope:** Database schema update (jobs table), new cron worker script.
* **Rollback Plan:** Revert to synchronous processing, drop jobs table.
* **Definition of Done:** Emails and heavy uploads are processed asynchronously without blocking the UI.
