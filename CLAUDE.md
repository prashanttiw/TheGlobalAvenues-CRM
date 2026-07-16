# TGA CRM — Project Context for Claude Code

This file is auto-loaded on every Claude Code session. It is the condensed always-available brief.
For depth on any topic, read `Implementation_development _docs/PROJECT_HISTORY.md` (full build history)
or `TGA_CRM_MASTER_REFERENCE.md` / `CLIENT_SYSTEM_DOCUMENTATION.md` (current system spec) — see
§Where to Look for Detail at the end of this file.

---

## What This Project Is

The Global Avenues CRM is a production-grade three-portal web application for an ICEF-certified
international education consultancy in New Delhi, India. It manages the full student lifecycle:
lead capture → registration → application → enrollment, plus agent partner management and commission
tracking.

The system serves three distinct user types: students track applications and documents; education agents
manage their student rosters and commission ledgers; admin staff control all operations including leads,
applications, reporting, and system configuration.

Single-server deployment: React SPA build + PHP/MySQL backend both live on the same Bluehost India
shared hosting account (Apache, no Node runtime), served under `apply.theglobalavenues.com` (cPanel
user `lidglcmy`). All 9 build phases are complete. System is production-ready as of 2026-06-26.
(Corrected 2026-07-08 — previously described a Vercel+Bluehost split that does not match the actual
deployment; see `crm-api/.env.example`'s `APP_FRONTEND_URL`/`CORS_ALLOWED_ORIGINS` values.)

---

## User Model (Three Portals)

### Student Portal (`/portal/student/`)
Role: `student`. Can submit applications, upload documents, view notices and payment timeline, post on
application timeline (only when an active document request exists). Cannot unilaterally change
application status.

### Agent Portal (`/portal/agent/`)
Role: `agent`. Tiers: `bronze` / `silver` / `gold`. 3-level hierarchy: `root_agent_id` + `parent_agent_id`
+ `tier`. Subtree membership checked via `root_agent_id` O(1) comparison — no recursive tree walks. Tier 3
hard cap on sub-agent creation. Cannot approve their own student reassignment requests.

### Admin Portal (`/portal/admin/`)
Roles: `admin` and `super_admin`. `super_admin` can permanently erase records (30-day window post
soft-delete, requires logged reason) and trigger global JWT revocation via `jwt_min_iat` system setting.
RBAC: `roles` + `permissions` + `role_permissions` tables; checks in `AuthMiddleware`.

---

## Tech Stack (verified against package.json / composer.json / .env.example)

### Frontend
| Package | Version | Notes |
|---------|---------|-------|
| React | ^18.3.1 | |
| React Router | ^7.15.0 | v7 — already updated |
| Vite | ^6.4.2 (pnpm pins 6.3.5) | No `tailwind.config.ts` |
| Tailwind CSS | 4.1.12 | v4 — tokens in `src/styles/theme.css`, NOT index.css |
| TanStack Query | ^5.100.14 | v5 — `useQuery` has **no** onSuccess/onError |
| Zustand | ^5.0.13 | Auth + sidebar state |
| `motion` | 12.23.24 | Import from `'motion/react'`, NOT `'framer-motion'` |
| `@dnd-kit/core` | ^6.3.1 | **Use this for drag-and-drop** |
| `@dnd-kit/sortable` | ^10.0.0 | Use this, not react-dnd or react-beautiful-dnd |
| TipTap | ^3.27.1 | Notices rich-text editor |
| cmdk | 1.1.1 | Command palette / global search UI |
| Recharts | 2.15.2 | Report charts |
| Radix UI | full suite | Primitives for all UI components |
| `axios` | ^1.16.1 | **Present but not imported anywhere in src/.** Use native `fetch`. |
| `react-dnd` | 16.0.1 | **Present but not imported anywhere in src/.** Do not use. |
| `@mui/material` | 7.3.5 | **Present but not imported anywhere in src/.** Not our design system. |
| `globe.gl`, `three` | — | Marketing site only (3D globe) |

### Backend
| Item | Detail |
|------|--------|
| PHP | ^8.1 required; **production actually runs PHP 8.3** (`ea-php83`, confirmed 2026-07-16 via cPanel MultiPHP Manager — the "8.2.12" this row used to say was the local XAMPP version, never verified against the real hosting account, same class of unverified-assumption gap as the MySQL version row above). Local dev still runs 8.2.12 via XAMPP. The app has run cleanly on production 8.3 with no compatibility issues found so far. |
| Framework | **None** (deliberate — avoids Composer complexity on shared hosting) |
| Composer deps | `openspout/openspout` 4.0 (XLSX streaming), `dompdf/dompdf` ^3.1 (PDF) |
| MySQL target | **Production is actually MySQL 5.7.23** (confirmed 2026-07-16 via `SELECT VERSION()` on the live Bluehost account — the "8.4 LTS" this row used to say was never verified against the real hosting account). Local dev runs MariaDB 10.4 via XAMPP, which is far more permissive and will NOT catch MySQL-8.0-only syntax. **Any new migration must be written for MySQL 5.7 compatibility, not tested-on-local-and-assumed-fine.** Known things 5.7 lacks that already bit this project once: no `DEFAULT` value of any kind (literal or expression) on JSON/TEXT/BLOB columns, no `DROP COLUMN IF EXISTS` / `ADD COLUMN IF NOT EXISTS` (needs 8.0.29+), no CTEs (`WITH`), no window functions, no `CREATE ROLE`, no functional/expression indexes. Generated/virtual columns and the native `JSON` type itself are fine (5.7.6+ / 5.7.8+). When in doubt, use an `INFORMATION_SCHEMA`-driven conditional (stored procedure + dynamic SQL, no `DELIMITER` needed since PHP sends the whole file via `PDO::exec()`'s multi-statement support) rather than a version-gated DDL modifier. |
| Email | PHPMailer (via MailService wrapper) |
| File backup | Google Drive API — service account, resumable chunked uploads |

### Hosting
| Layer | Where |
|-------|-------|
| Frontend | Same Bluehost account as backend — static SPA build served from the `apply.theglobalavenues.com` document root |
| Backend | Bluehost India shared hosting, Apache, PHP 8.2 — `apply.theglobalavenues.com/crm-api`, cPanel user `lidglcmy` |
| File storage | Local disk (`uploads/public/`, `storage/private/`) + async Drive backup |
| Cron | `cron/scheduler.php` — real cPanel Cron Jobs GUI available (Terminal/SSH is NOT available, but that's a separate permission from cPanel's Cron Jobs feature) |

---

## Repository Layout

```
D:\TheGlobalAvenues-CRM\
├── src/                             # React frontend
│   ├── app/                         # Root app shell (providers, App.tsx)
│   ├── components/                  # ★ MARKETING ONLY — do not touch
│   │   ├── home/                    # Marketing home sections
│   │   └── layout/                  # Marketing Header, Footer, WhatsAppButton
│   ├── data/                        # ★ MARKETING ONLY — do not touch (TGA content)
│   ├── pages/
│   │   ├── [public marketing]       # DO NOT TOUCH — see §Off-Limits
│   │   ├── student/                 # Student portal pages
│   │   ├── agent/                   # Agent portal pages
│   │   └── admin/                   # Admin portal pages
│   ├── shared/
│   │   ├── components/
│   │   │   ├── layout/              # AuthGuard, RoleGuard, PortalWrapper, TopBar (IN SCOPE)
│   │   │   └── ui/                  # Shared CRM UI components
│   │   └── hooks/                   # useAuth, useNotifications, useSidebarStore
│   ├── layouts/                     # PublicLayout + portal layout wrappers
│   ├── router/index.tsx             # All routes — public + 3 portals, all lazy-loaded
│   ├── lib/api.ts                   # ALL API calls. Default export: api.get/post/put/delete
│   └── styles/
│       ├── index.css                # Imports fonts.css, tailwind.css, theme.css
│       ├── theme.css                # ★ TAILWIND TOKENS — @theme inline {} + :root CSS vars
│       ├── tailwind.css             # @import "tailwindcss"
│       └── fonts.css                # Plus Jakarta Sans + Inter
│
├── crm-api/                         # PHP 8.2 backend
│   ├── index.php                    # Entry point: env, CORS, rate limit, route dispatch
│   ├── autoload.php                 # PSR-4 autoloader — namespace root TGA\CRM\
│   ├── .env / .env.example          # Backend secrets
│   ├── Config/                      # Database.php (PDO singleton), Environment.php, Cors.php
│   ├── Routes/                      # RouteRegistry.php + feature route files + api.php
│   ├── Controllers/                 # 32 controllers — see §Controllers Map
│   ├── Services/                    # 24 services — see §Services Map
│   ├── Middleware/                  # AuthMiddleware.php, RateLimitMiddleware.php
│   ├── Models/                      # 19 model files + BaseModel.php
│   └── Helpers/Response.php         # Response::success(), Response::error()
│
├── crm-api/Database/
│   ├── migrations/                  # 001–081 SQL files (★ 048–052 MISSING — use combined SQL)
│   ├── all_migrations_combined.sql  # Covers 038–059 only — loaded by setup_database.php, not standalone
│   ├── migrations_070_080.sql       # 070–080 concatenated (not in combined SQL) — loaded by setup_database.php
│   ├── real_catalog_seed.sql        # Real universities/courses/intakes/campuses/logo/custom-fields data-only export
│   ├── schema.sql                   # Schema snapshot (001–037)
│   ├── seeds/                       # Empty (.gitkeep only) — old quiz/programs/universities seed files were dead (2026-07-04, referenced tables/columns that never shipped)
│   ├── run_all_migrations.php       # Patches an existing DB with 060–089 — NOT a fresh-install tool
│   └── setup_database.php           # ★ USE THIS for fresh environment setup — one command: full schema (001–081) + RBAC/config + real super admin + real catalog, zero test/stale data on APP_ENV=production
│
├── cron/                            # 9 cron scripts + master scheduler
│   └── scheduler.php                # cPanel entry: every minute via flock()
│
├── storage/
│   ├── private/                     # Private docs (outside public_html, .htaccess deny)
│   └── cache/settings.json          # SystemSettings dual-layer cache
│
├── uploads/public/                  # Public file uploads
├── scripts/                         # Deployment helper .bat files
└── Implementation_development _docs/
    ├── TGA_CRM_MASTER_REFERENCE.md  # Full spec (single source of truth)
    ├── PHASE_[1-9]_*.md             # Per-phase specs
    └── PHASE_[1-9]_APPEND.md        # Per-phase implementation history + audit findings
```

**CRITICAL DIRECTORY DISTINCTION:**
`src/components/layout/` = marketing (OFF-LIMITS) ≠ `src/shared/components/layout/` = CRM portal shell (IN SCOPE).

---

## Critical Library & Architecture Gotchas

| Topic | Rule |
|-------|------|
| **Tailwind v4 tokens** | Tokens live in `src/styles/theme.css` (`@theme inline {}` + `:root {}`). `src/styles/index.css` is just 183 bytes that imports it. **No `tailwind.config.ts`** — Tailwind v4 doesn't use one. |
| **Motion** | Import from `'motion/react'`, **not** `'framer-motion'`. Package is `motion` v12. |
| **TanStack Query v5** | `useQuery` has **no** `onSuccess`/`onError`/`onSettled` callbacks. Use `useEffect` watching `data`/`isError`. `useMutation` still has them. `useInfiniteQuery` needs `initialPageParam: 1`. |
| **React Router v7** | Already at v7.x — no migration needed. |
| **Drag-and-drop** | Use `@dnd-kit/core` + `@dnd-kit/sortable`. `react-dnd` and `react-beautiful-dnd` both absent from active code. |
| **Encryption** | PHP uses `sodium_crypto_secretbox` XSalsa20-Poly1305 for PII — **NOT AES-GCM** (no AES-NI guaranteed on Bluehost). The comment in `001_create_users_table.sql` saying "AES-256-GCM" is stale. |
| **Passwords** | `PASSWORD_ARGON2ID` — `ARGON2_MEMORY_COST=19456`, `ARGON2_TIME_COST=2` from env. |
| **Public IDs** | All API responses expose `public_id` (ULID, 26-char Crockford Base32). Integer `id` never leaves the backend. |
| **Colors** | `#D96200` (`--color-brand-orange-accessible`) = interactive elements (WCAG AA compliant). `#FD7E14` (`--primary`) = decorative highlights only. |
| **activity_logs** | INSERT-only table — enforced at DB grant level in production. **Never UPDATE or DELETE** rows. Use `ActivityLogger::log()`. |
| **Global search** | Min 3 chars (MySQL FULLTEXT `innodb_ft_min_token_size=3`). Frontend must enforce ≥ 300ms debounce. Backend: UNION ALL single query, not 5 sequential. |
| **File downloads** | 8KB chunked `fread()` — NOT `readfile()` (memory exhaustion). X-Sendfile unavailable on Bluehost. |
| **OTP emails** | Sent synchronously via `MailService::sendNow()` — bypasses the notification queue. 2-min queue delay is unacceptable for auth. |
| **FOR UPDATE SKIP LOCKED** | Used in cron jobs. Rows MUST be updated to `status='processing'` BEFORE the transaction commits — not after. Otherwise duplicate processing occurs. |
| **Two state managers, one dead** | `ApplicationStateManager` (simple, role-guarded, 5 states, no transaction) exists but is **not called from any controller, cron script, or frontend code** — confirmed by full-codebase search 2026-07-14. `ApplicationController` exclusively uses `StateManager` (extended, 20 states, transactional, fires notifications + SLA) for every transition. Treat `ApplicationStateManager` as dead code; `StateManager` is the only one that matters. |
| **Database::getConnection()** | Always use this. NOT `Database::connect()`. |
| **`npm run preview`** | Not in `package.json` scripts (only `dev` and `build`). Use `npx vite preview` if needed. |

---

## Critical Architectural Decisions (and Why)

| Decision | Why |
|----------|-----|
| No PHP framework | Bluehost shared hosting — no Composer autorun, no framework overhead, no dependency issues |
| No localStorage for tokens | Access token in Zustand memory (cleared on tab close), refresh token HttpOnly cookie only |
| ULID public_ids everywhere | Integer IDs expose enumeration and row count. ULIDs are unguessable and sortable. |
| Soft deletes everywhere | `deleted_at DATETIME NULL` on all entities. Super admin erase only exception. |
| INSERT-only activity_logs | DB grant level enforcement — app user has INSERT only on this table |
| XSalsa20-Poly1305 for PII | AES-NI hardware not guaranteed on Bluehost shared hosting |
| Pre-computed report snapshots | Prevents timeout on shared hosting. Dashboards read from `report_snapshots`, never live aggregates |
| Maintenance mode via `.maintenance` file | Works when DB is down — not DB-based |
| `pending_registrations` in DB | Not PHP sessions — shared `/tmp` on Bluehost is cross-tenant risk |
| `dimension_id = '_global'` (not NULL) | MySQL UNIQUE key semantics: NULL != NULL, so NULL breaks the uniqueness constraint |
| Leads public endpoint CORS restricted | Only `theglobalavenues.com` allowed, not `*` — reduces spam/scraping risk |

---

## Database Schema — Authoritative List

**Fresh environment:** use `crm-api/Database/all_migrations_combined.sql` or `schema.sql`.
`run_all_migrations.php` only runs migrations 060–069 — it is NOT a full runner.
Individual files 048–052 do not exist in `migrations/` (content only in combined SQL).

| Migration | Table / Action | Purpose |
|-----------|---------------|---------|
| 001 | `users` | Core user — email/phone XSalsa20 encrypted, `*_lookup_hash` for queries |
| 002 | `user_sessions` | JWT session tracking — `jti_hash` for per-token revocation |
| 003 | `otp_verifications` | OTP storage — hashed, expiry, brute-force counter |
| 004 | `security_events` | Failed login / blocked request audit log |
| 005 | `rate_limits` | Dual-key rate limit counters (IP + email_hash) |
| 006–008 | `roles`, `permissions`, `role_permissions` | RBAC tables |
| 009 | `admins` | Admin profile (extends `users`) |
| 010 | `agents` | Agent profile — `parent_agent_id`, `root_agent_id`, `tier`, referral code |
| 011 | `students` | Student profile — `agent_id`, `agent_lock_status`, `profile_status` |
| 012 | `agent_reassignment_requests` | Student → agent reassignment workflow |
| 013 | `files` | File metadata — `storage_path`, SHA-256, versioning, `erasure_status` |
| 014 | `universities` | University catalog |
| 015 | `courses` | Course catalog (linked to university) |
| 016 | `intakes` | Intake windows per course |
| 017 | `applications` | `reference_number` (TGA-YYYY-NNNNNN), `status`, `withdrawal_reason` |
| 018 | `application_updates` | Timeline items (admin↔student comms, file posts, status changes) |
| 019 | `document_requests` | Document request lifecycle per application |
| 020 | `application_payments` | Payment tracking per application |
| 021 | `leads` | CRM leads — email/phone encrypted |
| 022 | `commissions` | Agent commission ledger — immutable once paid (PHP guard + DB trigger) |
| 023 | `notices` | Portal notices (TipTap HTML, audience-targeted, `expires_at` added in 060) |
| 024 | `internal_notes` | Staff notes — `entity_type`/`entity_id` polymorphic (`is_pinned` added in 060) |
| 025 | `notification_templates` | Template library — `event_key`, channels, subject/body templates |
| 026 | `notifications` | Queue — `status`: queued → processing → sent / failed |
| 027 | `reminders` | Scheduled reminder queue (UNIQUE dedup index added in 069) |
| 028 | `sla_rules` | SLA rule config per entity type |
| 029 | `sla_events` | Active/breached SLA tracking |
| 030 | `user_preferences` | Per-user settings |
| 031 | `activity_logs` | Append-only audit log (INSERT only at DB grant level) |
| 032 | `report_snapshots` | Pre-computed daily metrics (`idx_reports_lookup` composite index added in 062) |
| 033 | `api_request_logs` | API request log |
| 034 | `cron_health` | Cron job run tracking |
| 035 | `system_settings` | Key-value config — includes `jwt_min_iat` for global JWT revocation |
| 036 | `sequences` | Atomic reference number generation |
| 037 | `activity_logs_archive` | Archive destination for `activity_logs` rows > 2 years |
| 038a | `pending_registrations` | Multi-step registration state (DB, not PHP sessions) |
| 039–047 | — | ALTERs: agents fix, 2FA columns, notification seeds, soft delete, `withdrawn`/`cancelled` statuses |
| 048–052 | ★ MISSING | Phase 4 ALTERs — only in `all_migrations_combined.sql` |
| 053 | — | Commissions enhancements (ALTER) |
| 054 | `commission_audit_log` | Immutable commission change log |
| 055 | — | Phase 5 indexes |
| 056 | `agent_stats` | Agent performance stats cache |
| 057 | — | Commission immutability DB trigger |
| 058–059 | — | Phase 5 notification seeds; reassignment `final_agent_id` |
| 060 | — | Phase 7: `notices.expires_at`, `internal_notes.is_pinned`, FULLTEXT indexes, lead/notice notification seeds |
| 061 | — | Global search FULLTEXT indexes (students, agents, universities, applications, leads) |
| 062 | — | Phase 8 performance indexes |
| 063 | `student_academics`, `student_test_scores` | Phase 9 academic profile tables |
| 064 | — | `applications.withdrawal_reason` (ALTER) |
| 065 | — | `files.sync_attempts` (ALTER) — Drive sync exponential backoff |
| 066 | — | OTP notification template seeds |
| 067 | — | `files.erasure_status` (ALTER) |
| 068 | — | `system.erase_remote_delete_failed` notification seed |
| 069 | — | Reminders deduplication virtual column UNIQUE index |

Actual table count: ~41+ (original "40 tables" spec predates Phase 9 additions).

---

## Backend Services Map

`crm-api/Services/` — 24 files:

| Service | Owns |
|---------|------|
| `ActivityLogger` | INSERT to `activity_logs` — columns: `actor_user_id`, `action`, `target_type`, `target_id` |
| `ApplicationStateManager` | **Dead code** — simple 5-state role-guarded machine (final class), fully implemented but never called from anywhere. `ApplicationController` uses `StateManager` exclusively. |
| `AuditService` | Structured audit events wrapping ActivityLogger |
| `BackupRetentionManager` | Prunes Drive backups per `backup_retain_*` settings (NOT `backup_retention_*`) |
| `CommissionService` | Commission CRUD, state transitions, agent-chain validation |
| `CronHealth` | Job health tracking; `checkStuckJobs(15)` resets stuck processing rows |
| `DriveFolderManager` | Drive folder creation + permission management |
| `DriveService` | Resumable chunked uploads to Google Drive (MediaFileUpload) |
| `EncryptionService` | XSalsa20-Poly1305 `encrypt()`/`decrypt()` + SHA-256 `hash()` for lookup columns |
| `FileUploadService` | MIME validation, 50MB free-space check, SHA-256, versioning, storage path |
| `JWTService` | Custom HS256 JWT — no firebase/php-jwt. `jti` claim, access + refresh + reset tokens |
| `MailService` | PHPMailer wrapper — `sendNow()` (OTP, synchronous) + `sendQueued()` (batch); `MAIL_FALLBACK_HOST` |
| `NotificationService` | `fire(eventKey, vars, userIds)` — resolves template, queues notifications; `resolveAgentChain()` |
| `OTPResult` | PHP 8.1 backed enum: `Valid`, `Invalid`, `Expired`, `BruteForced`, `NotFound` |
| `OTPService` | OTP generation (hashed), verification, rate limit check BEFORE any DB write |
| `PasswordValidator` | Password strength enforcement |
| `PendingRegistrationService` | Multi-step registration state in DB; `invalidateByEmail()` cleans orphans on OTP failure |
| `PhpMysqlDump` | Pure-PHP DB export fallback when `exec()` is blocked on shared hosting |
| `ReminderEngine` | Resolves reminder type → due date + recipient. Type key: `application_payment` (not `payment`) |
| `ReminderService` | Processes reminder queue via NotificationService |
| `SecurityEventLogger` | Logs to `security_events` (failed logins, blocked requests) |
| `SLAService` | `startEvent()`, `resolveEvent()` (targets `IN ('active','breached')`), `cancelEvent()` |
| `StateManager` | **Extended** 20-state transactional machine. `FOR UPDATE`. Fires notifications + SLA events. |
| `SystemSettings` | Dual-layer cache: PHP static array (intra-request) + `storage/cache/settings.json` |

---

## Backend Controllers Map

`crm-api/Controllers/` — 32 files:

| Controller | Responsible For |
|------------|----------------|
| `ActivityFeedController` | Activity feed (admin audit view) |
| `ActivityLogController` | Activity log API endpoints |
| `AdminAgentController` | Admin-side agent approve / reject / suspend |
| `AdminController` | General admin operations |
| `AdminDashboardController` | Dashboard stats (reads `report_snapshots`) |
| `AdminReportsController` | Report endpoints (funnel, agents, financial, countries) |
| `AgentController` | Agent portal: dashboard, student list, sub-agents |
| `ApplicationController` | Application CRUD + state transitions (uses StateManager) |
| `AuthController` | Login, logout, refresh, 2FA verify/toggle |
| `CommissionController` | Commission create / confirm / paid |
| `CourseController` | Course catalog CRUD |
| `DocumentController` | Application document list/upload |
| `DocumentRequestController` | Document request lifecycle (request, submit, approve, reject) |
| `ExportController` | Streaming XLSX/CSV/PDF (OpenSpout + DomPDF) |
| `FileController` | Authenticated download — chunked 8KB fread(), SHA-256 integrity |
| `HealthController` | `/health` — DB ping, disk check, `is_writable()` (bypasses rate limit) |
| `IntakeController` | Intake window CRUD |
| `InternalNotesController` | Internal notes CRUD (admin) |
| `LeadsController` | Leads pipeline CRUD — public POST endpoint (rate-limited, CORS restricted) |
| `NoticeController` | Notice create / publish / audience-targeted delivery |
| `NotificationController` | In-app fetch, mark-read, clear |
| `PaymentTrackingController` | Payment request + status per application |
| `ReassignmentController` | Agent reassignment request + approval workflow |
| `RegistrationController` | Student / agent / admin registration flow |
| `RoleController` | RBAC role/permission management |
| `SearchController` | Global search — UNION ALL across 5 entities, min 3 chars |
| `StudentAcademicController` | Student academic profile + test scores |
| `StudentController` | Student profile, list, detail |
| `SubAgentController` | Sub-agent creation and hierarchy management |
| `SystemSettingsController` | System settings read/write (admin only) |
| `TimelineController` | Application timeline items (admin↔student comms) |
| `UniversityController` | University catalog CRUD |

---

## Cron Schedule

**cPanel entry (one line):** `* * * * * /usr/local/bin/php /home/username/public_html/cron/scheduler.php`

`scheduler.php` uses `flock()` + `scheduler_state.json` to enforce per-job frequencies. These are the
actual values from the code — they differ from some phase doc descriptions:

| Script | Frequency | Purpose |
|--------|-----------|---------|
| `send-notifications.php` | Every **1 min** | Email + in-app queue dispatch (PHPMailer, Timeout=10) |
| `check-sla-breaches.php` | Every **15 min** | SLA breach detection |
| `generate-snapshots.php` | Every **24 hr** | Pre-compute all report metrics → `report_snapshots` |
| `monitor-disk.php` | Every **12 hr** | Disk usage alerts at 80%/95% |

`archive-old-logs.php` still exists in `cron/` but is **intentionally not in `scheduler.php`'s job
list** (verified 2026-07-16) — `activity_logs` must never be deleted (product decision 2026-07-08),
and its only other job (pruning `security_events`) wasn't judged worth running alone. It is dead
weight in the directory, not a scheduled job; don't add it back to `$jobs` without a product decision
to revisit log retention.

All scripts: `set_time_limit(110)`, `PHPMailer Timeout=10`. MariaDB < 10.6: SKIP LOCKED stripped.

`process-reminders.php`, `sync-drive.php`, `backup-db.php`, and `verify-backups.php` were removed from
the codebase on 2026-07-10 (Google Drive backup sync and the never-functional payment-reminder engine
were both deleted — 11 files removed, see `PROJECT_HISTORY.md` Phase 6). They no longer exist; don't
reference them in cron config or troubleshooting.

---

## Notification Event Catalog

`NotificationService::fire(eventKey, vars, userIds)` silently no-ops if no active template exists.
All event keys must have a matching row in `notification_templates`.

**Auth / System:**
| Event Key | Channels | When Fired |
|-----------|----------|-----------|
| `student.registration_otp` | email | OTP during student registration (synchronous) |
| `agent.registration_otp` | email | OTP during agent registration (synchronous) |
| `login.otp` | email | 2FA login OTP (synchronous) |
| `admin.2fa_otp` | email | Admin 2FA code (synchronous) |
| `password.reset_otp` | email | Password reset OTP |
| `student.registered` | email, in_app | Welcome on account creation |
| `admin.created` | email | New admin account provisioned |
| `notice.published` | email, in_app | Notice published to audience |
| `system.erase_remote_delete_failed` | email, db | Drive delete failure — manual intervention needed |

**Agent Lifecycle:**
| Event Key | Channels | When |
|-----------|----------|------|
| `agent.onboarding_submitted` | email, in_app | New agent application → admin |
| `agent.approved` | email, in_app | Approval confirmed to agent |
| `agent.rejected` | email, in_app | Rejection to agent |
| `agent.suspended` | email | Suspension notice |
| `subagent.created` | email, in_app | New sub-agent pending under parent |

**Reassignment:**
| Event Key | Channels | Recipient |
|-----------|----------|-----------|
| `agent.reassignment_requested` | email, in_app | Admin (action required) |
| `agent.reassignment_approved` | email, in_app | Student |
| `agent.reassignment_denied` | email, in_app | Student |
| `agent.reassignment_lost` | email, in_app | Losing agent |
| `agent.reassignment_gained` | email, in_app | Gaining agent |

**Commission:**
| Event Key | Channels | When |
|-----------|----------|------|
| `commission.created` | email, in_app | Commission record created |
| `commission.confirmed` | email, in_app | Admin confirms commission |
| `commission.paid` | email, in_app | Commission marked paid |

**Lead Pipeline:**
| Event Key | Channels | When |
|-----------|----------|------|
| `lead.new` | email, in_app | New lead captured |
| `lead.assigned` | email, in_app | Lead assigned to staff |
| `lead.status_changed` | in_app | Lead moves stages |

**Application (KNOWN GAP):**
`StateManager::transition()` fires `NotificationService::fire('application.status_changed', ...)` but
**no template row exists in any migration**. The call silently no-ops. See §Known Open Items.

---

## State Machines

### Application Status (`applications.status`)

**`ApplicationStateManager`** — simple, role-guarded, fully implemented but **dead code, never called
from any controller, cron script, or frontend code** (confirmed by full-codebase search 2026-07-14).
Its rule table for reference only, since nothing runs it:
```
draft         → submitted       [student, agent, admin]
submitted     → under_review    [admin]
              → withdrawn       [student, admin]
under_review  → offer_received  [admin]
              → rejected        [admin]
              → waitlisted      [admin]
              → withdrawn       [student, admin]
offer_received → enrolled       [admin]
               → rejected       [admin]
waitlisted    → submitted       [admin]
              → rejected        [admin]
              → withdrawn       [student, admin]
```
On `enrolled`: sets `students.agent_lock_status = 'locked'`.

**`StateManager`** — extended, transactional (the only state manager actually used, exclusively by `ApplicationController`):
All states above + `inquiry`, `profile_review`, `documents_submitted`, `conditional_offer`,
`unconditional_offer`, `cas_coe_issued`, `visa_applied`, `visa_approved`, `visa_rejected`,
`pre_departure`, `departed`, `deferred`. Runs inside `beginTransaction()` with `FOR UPDATE`. Also fires
`NotificationService::fire('application.status_changed', ...)` and SLA events.

### Agent Status (`agents.status`)
`pending` → `approved` → `suspended` (admin only)

### Document Request Status (`document_requests.status`)
`requested` → `submitted` → `approved`
Rejection: `submitted` → `requested` (loops back)
Cancellation on app withdrawal: `requested` → `cancelled`

### Payment Status (`application_payments.status`)
`pending` → `student_marked_paid` → `confirmed`
`confirmed` → `disputed` → `confirmed` (re-confirm) or → `pending` (re-open)
Cancellation on app withdrawal: `pending` → `cancelled`

### Commission Status (`commissions.status`)
`pending` → `confirmed` → `paid`
Immutable once `paid` — enforced by PHP guard + DB trigger (migration 057).

### Agent Reassignment (`agent_reassignment_requests.status`)
`pending` → `approved` / `denied`

### SLA Events (`sla_events.status`)
`active` → `breached` (by check-sla-breaches.php every 15 min)
`active` or `breached` → resolved (by `SLAService::resolveEvent()`)
`active` → `cancelled` (on application withdrawn/rejected)

---

## Hotfix History (chronological — post-original-build fixes)

Full detail in `Implementation_development _docs/PROJECT_HISTORY.md` (the single consolidated build/fix
log — replaces the old per-phase `PHASE_X_RELEASE_NOTES.md` / `PHASE_X_*.md` spec / `PHASE_X_APPEND.md`
files, which were deleted 2026-07-15 after being folded in). Table below shows the highest-impact fixes:

| Phase | Problem | Fix Applied | Append Ref |
|-------|---------|-------------|-----------|
| P4 | TanStack Query v5 `useInfiniteQuery` missing `initialPageParam` | Added `initialPageParam: 1`; stop = `undefined` | §RF-P4-04 |
| P4 | `ApplicationStateManager::transition()` not updating `students.profile_status` | Added UPDATE to students | §GAP-P4-07 |
| P4 | Optimistic update rollback used wrong pattern | Fixed to `setQueryData(['applications', publicId], ctx.previous)` | P4 APPEND |
| P5 | `createCommission()` sent `agent_id: number`; backend expected `agent_public_id: string` | Fixed payload | FINDING A |
| P5 | Reassignment approval race condition | SELECT inside transaction with `FOR UPDATE` | §RF-P5-04 |
| P6 | `FOR UPDATE SKIP LOCKED` — rows not marked `processing` before commit | Must update BEFORE committing | §RF-P6-01 CRITICAL |
| P6 | `NotificationService` used `Database::connect()` | Fixed to `Database::getConnection()` | §6.1 |
| P6 | `ActivityLogger` wrong column names (`metadata`, `entity_id`) | Fixed to `target_type`, `target_id` | §6.5 |
| P6 | `FileController` download used non-existent column `file_path` | Fixed to `storage_path` | §6.7 |
| P6 | `BackupRetentionManager` wrong setting keys `backup_retention_*` | Fixed to `backup_retain_*` | §6.9 |
| P6 | OTP synchronous dispatch missing | Added `MailService::sendNow()` | §6.14 |
| P6 | Orphaned `pending_registration` on OTP failure | Added `PendingRegistrationService::invalidateByEmail()` | §6.15 CRITICAL |
| P6 | `PaymentTrackingController` wrong reminder type key `'payment'` | Fixed to `'application_payment'` | §6.20 |
| P7 | `AuthMiddleware::requireAuth()` method entirely missing | Added method; fixed 21 route crashes | CRITICAL |
| P7 | `RateLimitMiddleware::enforce()` missing | Added method | CRITICAL |
| P7 | `api.ts` missing default export | Added `api` object + `formatPath()` | CRITICAL |
| P7 | JWT `sub` not duplicated to `id` in decoded payload | Fixed in `AuthMiddleware::user()` | HIGH |
| P7 | `SystemSettings` wrong namespace (`TGA\Models` → `TGA\CRM\Models`) | Fixed | HIGH |
| P7 | `SearchController` using 5 sequential queries; wrong column `s.assigned_agent_id` | Rewrote to UNION ALL; fixed to `s.agent_id` | HIGH |
| P7 | Agent internal notes used exact agent_id match | Fixed to `root_agent_id` subtree check | HIGH |
| P8 | Non-cumulative funnel — enrolled students dropped from offer count | Fixed to `IN ('offer_received','waitlisted','enrolled')` | CRITICAL |
| P8 | Cartesian JOIN in snapshots cron inflated financial metrics | Fixed with CTE isolation | HIGH |
| P8 | `StateManager::transition()` not updating `profile_status` | Fixed — caused 0 enrolled in all reports | CRITICAL |
| P9 | Apache `.htaccess` missing `RewriteEngine On` — all API routes 404 | Added directive | §9.1 CRITICAL |
| P9 | `build-api-archive.bat` excluded `cron/` — never deployed | Fixed deploy script | §9.2 HIGH |
| P9 | DB credentials exposed in chained PDOException stack trace | Clean `RuntimeException` | CRITICAL ISSUE 2 |
| P9 | Drive sync never retried on failure | Added `sync_attempts` + exponential backoff | HIGH ISSUE 3 |
| P9 | No SMTP failover | Added `MAIL_FALLBACK_HOST` env var in `MailService` | HIGH ISSUE 4 |
| P9 | No global JWT revocation | Added `jwt_min_iat` in `system_settings` + `AuthMiddleware` check | HIGH ISSUE 6 |

---

## Off-Limits Files / Directories — NEVER MODIFY

Public marketing website — never touch during CRM work, under any framing. **Verified against
`src/router/index.tsx` and the filesystem on 2026-07-15** — the marketing site was trimmed at some
point to a single home page plus contact/apply/login; a wider Destinations/Universities/Courses/
Partners/About/Services marketing site referenced in older project notes no longer exists on disk.
Treat `src/router/index.tsx` as the source of truth for what's actually live, not this list alone:

```
src/pages/HomePage.tsx
src/pages/ContactPage.tsx
src/components/home/          (entire directory — homepage sections)
src/components/layout/        (entire directory — marketing Header/Footer/WhatsApp)
src/data/                     (entire directory — company.ts, reports.ts, universities.ts static data)
```

`src/pages/ApplyPage.tsx`, `LoginPage.tsx`, and `ForgotPasswordPage.tsx` are public routes but **are
in scope** — they're CRM auth entry points, not marketing content.

---

## Project Conventions

**Naming:**
- PHP classes: `PascalCase`. File name must match class name exactly.
- PHP namespace root: `TGA\CRM\` — any class in `crm-api/Services/Foo.php` = `TGA\CRM\Services\Foo`.
- JS/TS components: `PascalCase`. Hooks: `camelCase` starting with `use`.
- DB tables: `snake_case`, plural. Columns: `snake_case`.
- Route action segments: `kebab-case` (e.g., `verify-2fa`, `mark-read`).

**API routing pattern (not REST):**
`/?route=<resource>&action=<action>[/param1/param2]`
Example: `POST /?route=auth&action=login` | `GET /?route=applications&action=get/01H...`

**Frontend API client (`src/lib/api.ts`):**
Two export styles: named function exports for each endpoint; default export `api` with `.get(path)`,
`.post(path, body)`, `.put(path, body)`, `.delete(path)` helpers using `formatPath()` internally.

**Soft deletes:** `WHERE deleted_at IS NULL` in every query. App code never hard-deletes rows.

**PII encryption pattern:**
```
email_encrypted BLOB    ← EncryptionService::encrypt(email)
email_lookup_hash VARCHAR(64) ← EncryptionService::hash(email)  ← use for WHERE clauses
```

**Design tokens (Tailwind v4):**
- CSS custom properties in `src/styles/theme.css` `:root {}` block
- `@theme inline {}` block in the same file bridges them to Tailwind utility classes
- Dark mode: `.dark {}` overrides in same file

---

## Environment Variables

Frontend (`.env` at repo root — not committed):
```
VITE_API_BASE_URL=http://localhost:8080/crm-api
```

Backend (`crm-api/.env` — not committed; template at `crm-api/.env.example`):
```
APP_ENV, APP_URL, APP_FRONTEND_URL, APP_NAME, APP_VERSION
DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_CHARSET=utf8mb4, DB_PORT=3306
JWT_ACCESS_SECRET         # 64-char random string
JWT_REFRESH_SECRET        # 64-char random string (different from access)
JWT_RESET_SECRET          # 64-char random string
JWT_ACCESS_EXPIRY=900     # 15 min
JWT_REFRESH_EXPIRY=604800 # 7 days
JWT_ALGORITHM=HS256
ENCRYPTION_KEY            # base64 of 32 random bytes
ARGON2_MEMORY_COST=19456
ARGON2_TIME_COST=2
OTP_EXPIRY_MINUTES=10
TRUST_CLOUDFLARE_IP_HEADER=false
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
MAIL_HOST=smtp.gmail.com, MAIL_PORT=587
MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_EMAIL, MAIL_FROM_NAME, MAIL_ENCRYPTION=tls
MAIL_FALLBACK_HOST        # Phase 9 SMTP failover
UPLOAD_MAX_SIZE_MB=10
UPLOAD_PATH=uploads
UPLOAD_ALLOWED_TYPES=application/pdf,image/jpeg,image/png,image/webp
RATE_LIMIT_AUTH_REQUESTS=5, RATE_LIMIT_AUTH_WINDOW=60
RATE_LIMIT_OTP_REQUESTS=3, RATE_LIMIT_OTP_WINDOW=600
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://apply.theglobalavenues.com
LOG_PATH=logs, LOG_LEVEL=debug
MAIL_LOGO_URL             # public HTTPS URL of the logo used in email headers (Gmail/Outlook must reach it — no localhost)
```

Generate `ENCRYPTION_KEY`: `php -r "echo base64_encode(random_bytes(32));"`

---

## Working Mode for Claude Code Sessions

This file is auto-loaded every session — it's the only project-instruction file confirmed to actually
load. (A former companion file, `WORKING_MODE.md`, claimed to auto-load alongside this one but wasn't
actually picked up by the harness; its substance is folded into this section below and the file was
deleted 2026-07-15 as part of a documentation consolidation pass.)

### The change loop
1. **Plan** — state what's changing in one paragraph, list exactly which files will be touched and why,
   confirm no off-limits zone is affected, and if application status is involved, confirm which state
   manager owns it (always `StateManager` — see §State Machines; `ApplicationStateManager` is dead
   code). Discuss first, implement only on explicit approval — discussing an approach is not
   authorization to write code.
2. **Do** — implement only what was approved, one logical change at a time. If discovery mid-work
   contradicts the plan (wrong method name, unexpected column, missing dependency), stop and re-plan
   rather than silently pivoting.
3. **Verify live** — hit the actual API endpoint, open the actual UI, run the actual migration or cron
   script. Re-reading the code you just wrote is not verification.
4. **Record** — append a dated entry to `Implementation_development _docs/PROJECT_HISTORY.md` under the
   relevant phase/area section: what changed, files touched, why, how it was verified.

### Rules
1. Discuss first, implement on approval. Do not generate files unless explicitly asked.
2. One change at a time. Verify via live test, not just code reading.
3. Never touch off-limits zones (§Off-Limits Files) — not under any framing, not even "just a typo,"
   not even if adjacent to CRM work.
4. Server/deployment operations (cPanel steps, migrations, cron config, env vars) — one step at a time,
   wait for human confirmation before the next. The human is running these live and an error at step 3
   can invalidate steps 4–10.
5. No hard deletes in application code. Soft delete only (except the `super_admin` erase flow).
6. `activity_logs` is INSERT-only. Use `ActivityLogger::log()`. Never UPDATE/DELETE.
7. `Database::getConnection()` — always use this, not `Database::connect()`.
8. For depth beyond this brief: read `Implementation_development _docs/PROJECT_HISTORY.md` (full build
   history + fixes, phase by phase) and `TGA_CRM_MASTER_REFERENCE.md` / `CLIENT_SYSTEM_DOCUMENTATION.md`
   (current system spec). The old per-phase spec/release-notes/append files no longer exist — they were
   consolidated into `PROJECT_HISTORY.md` 2026-07-15.
9. Ask rather than assume when: a change touches a state-machine transition, any schema change, anything
   in auth/OTP/JWT/session handling, any deployment-side operation, or which state manager a controller
   uses.
10. Not your job unless explicitly asked: adding unrequested features, "cleaning up" adjacent working
    code, replacing already-chosen libraries, reorganizing directories, speculative performance work,
    rewriting comments/docstrings.

### Audit mode
When reviewing existing code for correctness/security/spec-compliance, use this format: **FINDING /
SEVERITY (Critical = data loss, security breach, or fully blocked flow · High = broken feature, no
workaround · Medium = incorrect behavior with a workaround · Low = cosmetic) / FILE:LINE / PROBLEM /
PROPOSED FIX**. Present in batches of ~5, get explicit per-finding approval, then implement → verify →
record → move to the next finding. Don't batch-implement multiple findings even if they look independent.

### Session hygiene
- **Start:** run `git status` before touching anything, so you know what's already modified vs. clean.
- **End** (any session where files changed): list every file modified, confirm what was recorded in
  `PROJECT_HISTORY.md`, leave an unambiguous handoff note — the next session starts cold.

---

## Local Development Environment

| Tool | Status |
|------|--------|
| PHP 8.2.12 | ✓ Installed |
| Node.js v22.13.1 | ✓ Installed |
| NPM 10.9.2 | ✓ Installed |
| MySQL | Local setup needed — use XAMPP or import `all_migrations_combined.sql` |

```bash
# Frontend (XAMPP Apache+MySQL must be running — see Working Mode section above)
npm run dev              # http://127.0.0.1:3000 (pinned in vite.config.ts — not the 5173 default)
npm run build             # dist/
npx vite preview          # Preview build (no npm run preview script exists)

# Backend (XAMPP's Apache serves crm-api/ day-to-day; this is a fallback only)
php -S localhost:8080 -t crm-api

# Test cron scripts
php cron/send-notifications.php
php cron/check-sla-breaches.php

# Generate DB from scratch
php crm-api/Database/setup_database.php   # preferred — full schema + RBAC + super admin + real catalog
# or: mysql -u root -p tga_crm < crm-api/Database/all_migrations_combined.sql
```

---

## Known Open Items

~~1. `application.status_changed` notification template missing.~~ — **Resolved.** The template is
   seeded by `setup_database.php`'s template list; students/agents do receive status-change emails.

2. **Migrations 048–052 missing as individual files.** Phase 4 ALTERs only exist in
   `all_migrations_combined.sql`. Not a blocker (combined SQL works), but any per-file migration
   tooling will skip them. Extract from combined SQL if per-file consistency is required.

~~3. `run_all_migrations.php` is not a full runner, only matches 060-069.~~ — **Fixed 2026-07-04.**
   Regex now covers `060`–`089`. Still a patch-an-existing-DB tool, not a fresh-install tool — use
   `setup_database.php` for that.

9. **`sla.breached` / `system.disk_warning` / `system.disk_critical` notification templates were
   missing (fixed 2026-07-04, migration 081).** Same class of bug as the resolved item 1 above —
   `check-sla-breaches.php` and `monitor-disk.php` always fired these event keys with no matching
   template, silently no-op'ing. Now seeded.

10. **Payment reminders never actually notify anyone — intentionally deferred, not a bug to fix.**
    `PaymentTrackingController` is the *only* caller of `ReminderService::schedule()` anywhere in the
    codebase, and it hardcodes reminder types `payment_upcoming` / `payment_urgent`. But
    `ReminderEngine::$eventKeys` has no entries for those two strings, so `getEventKey()` always
    returns `null` and the reminder silently no-ops (row still gets marked `sent`). **Decision
    (2026-07-08): the payment feature itself is not active in production yet, so this is deferred —
    do not build the missing event keys/templates until payment tracking actually goes live.**

4. **`react-dnd`, `axios`, `@mui/material` in `package.json` but unused.** None are imported anywhere
   in `src/`. Consider removing to reduce bundle size and clarify intent. Not urgent.

   ~~5. `admin_seed.sql` stale.~~ — **Removed.** `setup_database.php` is the only admin seeder.

5. **Migration 038 duplicate prefix.** Both `038_pending_registrations.sql` and `038_seeds.sql` share
   the `038` prefix. Not a functional issue with combined SQL but may confuse file-based tooling.

~~6. `StateManager` vs `ApplicationStateManager` — no documentation on which controller uses which.~~ —
   **Resolved 2026-07-14.** Full-codebase search confirms `ApplicationStateManager` is never called from
   anywhere (no controller, cron script, or frontend code). `ApplicationController` uses `StateManager`
   exclusively for every transition. `ApplicationStateManager.php` is dead code — safe to delete if a
   future cleanup pass wants to, not urgent.

7. **`npm run preview` not in package.json.** Only `dev` and `build` are defined. Use `npx vite preview`.

8. **`001_create_users_table.sql` column comments say "AES-256-GCM".** These comments are stale. The
   actual implementation uses XSalsa20-Poly1305 via `EncryptionService`. Comments should be updated
   to avoid confusion.

---

## Where to Look for Detail

**2026-07-15 documentation consolidation:** the old per-phase file set (9× `PHASE_X_RELEASE_NOTES.md` at
root, 9× `PHASE_X_*.md` specs, 9× `PHASE_X_APPEND.md`, the audit-1 pair, `CLAUDE_DISCOVERY.md`, and
`WORKING_MODE.md` — 30 files) was read in full and consolidated into a single history file plus this
section of `CLAUDE.md`. Do not look for those files; they no longer exist.

| What | Where |
|------|-------|
| Full system spec | `Implementation_development _docs/TGA_CRM_MASTER_REFERENCE.md` |
| Current system, plain-language + technical (all 3 portals) | `Implementation_development _docs/CLIENT_SYSTEM_DOCUMENTATION.md` |
| Full build history — what shipped + why + every notable bug per phase | `Implementation_development _docs/PROJECT_HISTORY.md` |
| This brief (always loaded) | `CLAUDE.md` (this file) |
| Reusable full-audit kickoff prompt | `Implementation_development _docs/FULL_SYSTEM_AUDIT_PROMPT.md` |
| Manual regression checklist | `Implementation_development _docs/FULL_LIVE_QA_TEST_GUIDE.md` |
| Every automatic email/notification, word-for-word | `Implementation_development _docs/EMAIL_NOTIFICATION_CONTENT_REVIEW.md` |
| Authoritative DB schema | `crm-api/Database/all_migrations_combined.sql` + `migrations/` |
| All API routes | `crm-api/Routes/api.php` → feature route files |
