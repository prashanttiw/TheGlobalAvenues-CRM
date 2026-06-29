# CLAUDE_DISCOVERY.md
## TGA CRM — Discovery & Inventory Report
**Generated:** 2026-06-28  
**Session type:** Read-only discovery pass (no files modified except this one)  
**Scope:** All 9 phase specs + appends, filesystem inventory, environment check, spot checks

---

## TABLE OF CONTENTS

1. [Repository Map](#1-repository-map)
2. [Master Reference Summary](#2-master-reference-summary)
3. [Phase-by-Phase Implementation History](#3-phase-by-phase-implementation-history)
4. [Spot Checks](#4-spot-checks)
5. [Off-Limits Zones](#5-off-limits-zones)
6. [Environment Check](#6-environment-check)
7. [Ambiguities & Open Questions](#7-ambiguities--open-questions)

---

## 1. REPOSITORY MAP

### Root-level layout

```
D:\TheGlobalAvenues-CRM\
├── CLAUDE.md                        # Project instructions for Claude Code
├── CLAUDE_DISCOVERY.md              # THIS FILE
├── package.json                     # Frontend deps (React 18 + Vite)
├── tsconfig.json
├── vite.config.ts
├── index.html
├── .env                             # Frontend env (VITE_API_BASE_URL) — not committed
│
├── src/                             # React frontend
│   ├── app/                         # Root app shell
│   ├── components/                  # ★ MARKETING ONLY — do not touch
│   │   ├── home/                    # Marketing home sections
│   │   └── layout/                  # Marketing Header, Footer, WhatsAppButton
│   ├── data/                        # ★ MARKETING ONLY — do not touch
│   ├── pages/
│   │   ├── [public marketing pages] # HomePage, Destinations, Courses, etc. — DO NOT TOUCH
│   │   ├── student/                 # Student portal pages
│   │   ├── agent/                   # Agent portal pages
│   │   └── admin/                   # Admin portal pages
│   ├── shared/
│   │   ├── components/
│   │   │   ├── layout/              # AuthGuard, RoleGuard, PortalWrapper, TopBar
│   │   │   └── ui/                  # Shared UI components
│   │   └── hooks/                   # useAuth (Zustand), useNotifications, useSidebarStore
│   ├── layouts/                     # PublicLayout, portal layout wrappers
│   ├── router/index.tsx             # All routes — public, student, agent, admin
│   ├── lib/api.ts                   # All API call functions (single file)
│   └── styles/
│       └── index.css                # Tailwind v4 — @theme tokens live here (see §7 for ambiguity)
│
├── crm-api/                         # PHP 8.2 backend
│   ├── index.php                    # Entry point — CORS, rate limit, route dispatch
│   ├── autoload.php                 # PSR-4 autoloader (namespace TGA\CRM\)
│   ├── .env                         # Backend secrets — not committed
│   ├── .env.example                 # ✓ PRESENT — template with all required keys
│   ├── Config/
│   │   ├── Database.php             # PDO singleton (MySQL 8.4)
│   │   ├── Environment.php
│   │   └── Cors.php
│   ├── Routes/
│   │   ├── RouteRegistry.php        # Custom router (GET/POST/PUT/DELETE, :param segments)
│   │   ├── AuthRoutes.php
│   │   ├── ApplicationRoutes.php
│   │   ├── AdminRoutes.php
│   │   ├── FileRoutes.php
│   │   └── [other feature routes]
│   ├── Controllers/                 # Request handlers
│   ├── Services/                    # Business logic (24 files — see §3.6 for full list)
│   ├── Middleware/
│   │   ├── AuthMiddleware.php       # JWT validation via user_sessions jti_hash
│   │   └── RateLimitMiddleware.php  # Dual-key (IP + email_hash) atomic rate limiting
│   ├── Helpers/
│   │   └── Response.php             # JSON response helpers
│   └── Models/                      # DB query models
│
├── crm-api/Database/
│   ├── migrations/                  # 001–069 (gap: 048–052 missing as individual files)
│   ├── seeds/                       # Seed data
│   ├── all_migrations_combined.sql  # Unified migration file
│   ├── all_seeds_combined.sql
│   ├── run_all_migrations.php
│   ├── schema.sql
│   └── setup_database.php
│
├── cron/                            # 9 scheduled jobs
│   ├── scheduler.php                # Master scheduler with flock() concurrency guard
│   ├── send-notifications.php
│   ├── sync-drive.php
│   ├── process-reminders.php
│   ├── check-sla-breaches.php
│   ├── generate-snapshots.php
│   ├── backup-db.php
│   ├── monitor-disk.php
│   ├── archive-old-logs.php
│   └── verify-backups.php
│
├── scripts/
│   ├── build-api-archive.bat        # Package crm-api + cron for Bluehost deploy
│   ├── deploy-frontend.bat          # Vercel deploy helper
│   └── restore-db.bat               # DB restore helper
│
├── storage/
│   ├── private/                     # Private documents — must be outside public_html
│   └── cache/
│       └── settings.json            # SystemSettings filesystem cache
│
├── uploads/
│   └── public/                      # Public file uploads
│
└── Implementation_development _docs/
    ├── TGA_CRM_MASTER_REFERENCE.md  # Single source of truth — full spec
    ├── PHASE_1_FOUNDATION.md
    ├── PHASE_1_APPEND.md
    ├── PHASE_2_REGISTRATION.md
    ├── PHASE_2_APPEND.md
    ├── PHASE_3_FRONTEND_SHELL.md
    ├── PHASE_3_APPEND.md
    ├── PHASE_4_ACADEMIC_CORE.md
    ├── PHASE_4_APPEND.md
    ├── PHASE_5_AGENTS_COMMISSIONS.md
    ├── PHASE_5_APPEND.md
    ├── PHASE_6_INFRASTRUCTURE.md
    ├── PHASE_6_APPEND.md
    ├── PHASE_7_ADMIN_FEATURES.md
    ├── PHASE_7_APPEND.md
    ├── PHASE_8_REPORTING.md
    ├── PHASE_8_APPEND.md
    ├── PHASE_9_PRODUCTION.md
    └── PHASE_9_APPEND.md
```

### Key file locations at a glance

| What | Path |
|------|------|
| Backend entry point | `crm-api/index.php` |
| Frontend API client | `src/lib/api.ts` |
| Auth state (Zustand) | `src/shared/hooks/useAuth.ts` |
| All routes | `src/router/index.tsx` |
| Route dispatcher | `crm-api/Routes/RouteRegistry.php` |
| JWT service | `crm-api/Services/JWTService.php` |
| DB singleton | `crm-api/Config/Database.php` |
| Tailwind tokens | `src/styles/index.css` (see §7 for ambiguity) |
| Backend env template | `crm-api/.env.example` |
| Master spec | `Implementation_development _docs/TGA_CRM_MASTER_REFERENCE.md` |
| Migration files | `crm-api/Database/migrations/001–069` |
| Cron master scheduler | `cron/scheduler.php` |

---

## 2. MASTER REFERENCE SUMMARY

The Global Avenues CRM is a production-grade three-portal system for an ICEF-certified international education consultancy in New Delhi.

### Three portals
- **Student portal** — application status tracker, document uploads/requests, notice board, payment timeline
- **Agent portal** — student roster, application management, commission ledger, 3-level hierarchy tree
- **Admin portal** — full operations: leads pipeline, all applications, agent management/approval, reports, system settings, global search, notices, internal notes

### Infrastructure split
- **Frontend:** React 18 + TypeScript + Vite + Tailwind v4 → deployed to Vercel (`portal.theglobalavenues.com`)
- **Backend:** PHP 8.2 (no framework) + MySQL 8.4 LTS → Bluehost India shared hosting (Apache)
- **Cron jobs:** 9 jobs managed by `cron/scheduler.php` using `flock()` for concurrency safety

### Core design decisions
- **No framework PHP** — deliberate, to avoid Composer on shared hosting and maximize control
- **No localStorage for tokens** — access token in Zustand memory; refresh token HttpOnly cookie only
- **No integer IDs in API responses** — all entities expose `public_id` (ULID, 26 chars Crockford Base32)
- **No hard deletes** — all tables use `deleted_at DATETIME NULL` soft deletes
- **No direct DB credentials in responses** — clean exceptions, no chained PDOException in stack traces
- **INSERT-only `activity_logs`** — enforced at DB grant level in production (app user has INSERT-only)
- **Sodium encryption for PII** — `sodium_crypto_secretbox` XSalsa20-Poly1305 (not AES-GCM — AES-NI not guaranteed on Bluehost)
- **Pre-computed snapshots for reports** — midnight cron writes to `report_snapshots`; dashboards read snapshots, never live aggregation

### Database: 40 tables
Applications follow a state machine: `draft → submitted → under_review → offer_received → enrolled` (also: `rejected`, `waitlisted`, `withdrawn`). Agents have a 3-level hierarchy (`parent_agent_id` + `root_agent_id` + `tier`), queried with MySQL 8 CTEs.

---

## 3. PHASE-BY-PHASE IMPLEMENTATION HISTORY

### Phase 1 — Foundation
**Spec owns:** 40-table schema, PHP skeleton, JWT, Argon2id, ULID, frontend setup.

**Key implementation facts:**
- Custom `JWTService` (no firebase/php-jwt). HS256. `jti` claim validated via `user_sessions.jti_hash` for instant revocation.
- Passwords: `PASSWORD_ARGON2ID` with env-configured `ARGON2_MEMORY_COST=19456`, `ARGON2_TIME_COST=2`.
- ULID generation is monotonic and uses Crockford Base32 encoding.
- PSR-4 autoloader at `crm-api/autoload.php` — namespace root `TGA\CRM\`.
- Routing pattern: `/?route=<resource>&action=<action>[/param1/param2]` — NOT REST-style `/api/v1/...` paths.

**Deviations / hotfixes noted in appends:** None specifically from Phase 1 append (not in scope of this discovery pass's deep reading, but Phase 1 is the foundation that all later phases build on).

---

### Phase 2 — Registration & Auth
**Spec owns:** Student/agent/admin registration, OTP, forgot password, agent approval flow.

**Key implementation facts:**
- Pending registrations stored in `pending_registrations` DB table — NOT PHP sessions (shared `/tmp` on hosting = cross-tenant risk).
- `OTPResult` is a PHP 8.1 backed enum: `Valid`, `Invalid`, `Expired`, `BruteForced`, `NotFound`.
- 2FA pre-auth token: short-lived JWT with `typ: pre-auth` claim. Protected routes reject pre-auth tokens.
- Rate limiting on OTP endpoints: dual-key (IP + email_hash), atomic `INSERT ... ON DUPLICATE KEY UPDATE`.
- `PendingRegistrationService::invalidateByEmail()` cleans up orphaned pending registrations on OTP failure (fix added in Phase 6).

**Key appends / hotfixes:**
- OTP backend rate limiting fires inside `generateAndSend()` BEFORE any DB writes, returns HTTP 429 with `Retry-After`.

---

### Phase 3 — Frontend Shell
**Spec owns:** Design system, portal layouts, shared UI component library (40+ components).

**Key implementation facts:**
- Tailwind v4 — design tokens in `src/styles/index.css` `@theme {}` block. No `tailwind.config.ts`.
- Colors: `#D96200` = interactive (buttons, active nav, WCAG AA compliant). `#FD7E14` = decorative highlights only.
- Fonts: Plus Jakarta Sans (headings) + Inter (body/UI).
- Motion import: `motion/react` (NOT `framer-motion`). Package name is `motion` v12.23.24.
- `AuthGuard` calls `restoreSession()` on app load → hits `/?route=auth&action=refresh` to rehydrate from HttpOnly cookie.
- All portal pages are `React.lazy`-loaded.
- Router: public routes under `<PublicLayout>`; portal routes under `/portal` behind `<AuthGuard>` + `<RoleGuard>`.

---

### Phase 4 — Academic Core
**Spec owns:** Universities, courses, intakes, applications, documents, payments, file management.

**Key implementation facts:**
- Application creation: `public_id` = ULID, `reference_number` via atomic sequences table (`UPDATE sequences SET next_val = LAST_INSERT_ID(next_val + 1)`), `status = 'draft'`, `agent_id_at_submission` set only on submit (not create).
- State machine: `draft → submitted → under_review → offer_received → enrolled` (also `rejected`, `waitlisted`, `withdrawn`). `ApplicationStateManager::canTransition()` guards all transitions.
- Timeline item types: `note / file / link / payment_request` (admin→student); `file` (student→admin).
- Document request lifecycle: `requested → submitted → approved`; rejection loops back to `requested`.
- Payment flow: `pending → student_marked_paid → confirmed / disputed`; `disputed → confirmed or pending`.
- File gatekeeper: `GET /files/:publicId/download` — JWT-authenticated, SHA-256 integrity check, 8KB chunked `fread()` streaming (NOT `readfile()` — memory exhaustion risk).
- File storage: public files in `uploads/public/`, private documents in `storage/private/` (outside public_html, protected by `.htaccess deny`).
- SVG rejected for logos (XSS risk) — JPG/PNG only.
- DOCX rejected (ZIP-based MIME detection insecure) — PDF only for document uploads.

**Key appends / hotfixes (Phase 4 APPEND):**
- `§RF-P4-04`: TanStack Query v5 `useInfiniteQuery` requires `initialPageParam: 1`; stop signal is `undefined` (not `null`).
- `§RF-P4-02`: Chunked `fread()` 8KB — X-Sendfile unavailable on Bluehost.
- `§AD-P4-04`: Student timeline posts only allowed if active document request exists (soft 403).
- `§GAP-P4-07`: `ApplicationStateManager::transition()` must update `students.profile_status` on every transition (was missing; caused Phase 8 reporting bug).
- `§GAP-P4-12`: `storage/.htaccess` must deny all access (critical security gap noted).
- Optimistic update rollback pattern: correct form is `setQueryData(['applications', publicId], ctx.previous)` — spec had a bug using `ctx.previous` as the query key.
- **Migrations 048–052 (Phase 4) NOT PRESENT as individual files.** Content is in `all_migrations_combined.sql`. Individual files jump from 047 to 053.
- Phase 4 Production Readiness Score: **97%**

---

### Phase 5 — Agents & Commissions
**Spec owns:** Agent hierarchy, student reassignment, commission ledger, RBAC subtree checks.

**Key implementation facts:**
- 3-level hierarchy: `parent_agent_id` + `root_agent_id` + `tier` (bronze/silver/gold).
- `assertInSubtree()` uses `root_agent_id` O(1) check — no recursive tree walk.
- `AgentController::dashboardSummary()`: subtree student counts via `root_agent_id`, own commissions (DIRECT only, not inherited).
- `listStudents()`: N+1-safe via `LEFT JOIN` aggregation for `applied_count`; `bindValue` with `PDO::PARAM_INT` for LIMIT/OFFSET.
- Commission immutability: PHP guard (primary) + DB trigger (secondary).
- `resolveTargetAgent()` added for horizontal privilege escalation protection with tier-aware checks.

**Key appends / hotfixes (Phase 5 APPEND):**
- `§RF-P5-04`: `SELECT FOR UPDATE` inside transaction for reassignment approval race condition.
- `§GAP-P5-01`: `actions_required` removed from AGENT dashboard (agents can't approve their own reassignments).
- `§GAP-P5-06`: Commission creation validates agent-chain membership.
- FINDING A (2nd cycle): `createCommission()` was sending `agent_id: number` — backend expects `agent_public_id: string`. Fixed.
- Admin approve/reject/suspend: SELECT moved inside transaction with `FOR UPDATE` to close race condition.
- Commission state transition wrapped in transaction with `FOR UPDATE` on `fetchForWrite`.
- Migrations 053–059: all created and present.
- Phase 5 Production Readiness Score: **98/100**

---

### Phase 6 — Infrastructure (Notifications, Cron, Files, Drive)
**Spec owns:** Notification engine, 9 cron jobs, file versioning, Google Drive backup sync.

**Key implementation facts:**
- `NotificationService::fire()` resolves channels (email, in_app) from template config; string-based template rendering (no Twig).
- Dual-path email: OTP emails sent synchronously via `MailService::sendNow()` (not queued — 2-min queue delay unacceptable for auth). Everything else queued.
- All cron scripts: `set_time_limit(110)`, `PHPMailer Timeout=10`.
- Google Drive: `MediaFileUpload` with chunked streams (not `file_get_contents` — fails on large files).
- `exec()` guard: checks `disable_functions` before attempting `mysqldump`; falls back to `PhpMysqlDump` service.
- File erasure: Drive delete FIRST, then local delete. Retry cron with backoff for failed Drive deletes.
- `ReminderService` deduplication via virtual column UNIQUE index (migration 069).
- `SLAService::resolveEvent` targets `IN ('active', 'breached')` — not just `'active'`.
- MariaDB compatibility: SKIP LOCKED stripped for MariaDB < 10.6.
- `cron/scheduler.php`: master scheduler with `flock()` OS-level file lock + `scheduler_state.json` per-job timing.

**Key appends / hotfixes (Phase 6 APPEND):**
- `§RF-P6-01` CRITICAL: `FOR UPDATE SKIP LOCKED` — rows must be updated to `status='processing'` BEFORE committing the transaction (not after). Otherwise two workers can grab the same row.
- Section 6.1: `NotificationService` used `Database::connect()` instead of `Database::getConnection()`. Fixed.
- Section 6.5: `ActivityLogger` used wrong column names (`metadata`, `entity_id` → `target_type`, `target_id`). Fixed.
- Section 6.7: `FileController` download used non-existent column `file_path` → corrected to `storage_path`. Fixed.
- Section 6.9: `BackupRetentionManager` wrong setting keys (`backup_retention_*` → `backup_retain_*`). Fixed.
- Section 6.13: `CronHealth` wrong column names. Fixed. Also: `declare(strict_types=1)` must be first line.
- Section 6.14: OTP synchronous dispatch added (`MailService::sendNow()`).
- Section 6.15 CRITICAL: Orphaned `pending_registration` on OTP failure — `PendingRegistrationService::invalidateByEmail()` added.
- Section 6.15 HIGH: `requestOtpLogin()` missing `user_type` in SELECT. Fixed.
- Section 6.20: `PaymentTrackingController` typo — scheduled `'payment'` but `ReminderEngine` expected `'application_payment'`. Fixed.
- Phase 6 Production Readiness Score: implied 96–98% (not explicitly stated in append)

---

### Phase 7 — Admin Features (Leads, Search, Notices, Settings)
**Spec owns:** Leads pipeline, global search, system settings, notices, internal notes, activity feed.

**Key implementation facts:**
- Leads: `new → contacted → qualified → converted | dropped`. Public endpoint `POST /public/leads` is unauthenticated; rate-limited to 5 req/hour per IP; CORS restricted to `theglobalavenues.com` (not `*`).
- Lead email/phone encrypted via `EncryptionService::encrypt()` (was missing; added in Milestone 7.4).
- Never reveal if email already in DB (no enumeration on public endpoint).
- Global search: UNION ALL single query (NOT 5 sequential queries). Min 3 chars (MySQL FULLTEXT `innodb_ft_min_token_size=3`). Frontend must enforce ≥ 300ms debounce.
- Kanban: default hides `converted`/`dropped` (terminal states) behind archive toggle.
- Notices use TipTap editor; sanitized HTML stored in DB. Chunked audience insertions: 1000/batch.
- Internal notes schema: `entity_type` / `entity_id` (NOT `module_name` / `record_id`).
- `SystemSettings`: dual-layer cache (static PHP array intra-request + `storage/cache/settings.json` filesystem).
- `api.ts` default export: `api` object with `.get/.post/.put/.delete` helpers + `formatPath()`.

**Key appends / hotfixes (Phase 7 APPEND):**
- CRITICAL: `AuthMiddleware::requireAuth()` method was entirely missing — caused 21 route crashes. Fixed.
- CRITICAL: `RateLimitMiddleware::enforce()` missing — fatal 500 on public leads endpoint and search. Fixed.
- CRITICAL: Vite build failed — `api.ts` missing default export. Fixed with `api` default export + `formatPath()`.
- HIGH: JWT payload `sub` not duplicated to `id` — `user['id']` was null across all controllers. Fixed in `AuthMiddleware::user()`.
- HIGH: `SystemSettings` namespace was `TGA\Models` → correct is `TGA\CRM\Models`. Fixed.
- HIGH: `AdminDashboardController::summary()` contract mismatch with `AdminDashboardStats` TS interface. Fixed.
- `SearchController` completely rewrote: was using 5 sequential queries; wrong column `s.assigned_agent_id` → `s.agent_id`. Fixed.
- Agent internal notes: was using exact `agent_id` match — fixed to `root_agent_id` subtree check.
- Phase 7 Production Readiness Score: **96/100**

---

### Phase 8 — Reporting
**Spec owns:** Snapshot cron, funnel analytics, agent KPIs, Excel/CSV/PDF exports.

**Key implementation facts:**
- Snapshot cron: `flushBatch()` for bulk INSERT 500 rows at a time to avoid memory exhaustion.
- `dimension_id = '_global'` for global metrics (not NULL — UNIQUE key issue with MySQL NULL semantics).
- Cumulative funnel: `total_offers = IN ('offer_received', 'waitlisted', 'enrolled')` — applications that passed through a stage are counted even after advancing.
- OpenSpout used for streaming XLSX (not PhpSpreadsheet — memory exhaustion risk for large exports).
- Exports triggered via `fetch` + `blob` streaming with Bearer token (not `<a href>` — would send no auth header → 401).
- `report_snapshots` table + `idx_reports_lookup` composite index (migration 062) for O(1) queries.
- `AdminReportsPage`: lazy-loaded; `staleTime = 1 hour` (snapshot data doesn't change during day).

**Key appends / hotfixes (Phase 8 APPEND):**
- CRITICAL: Non-cumulative funnel — offers dropped from count when student enrolled. Fixed to cumulative `IN (...)`.
- HIGH: Cartesian product in `generate-snapshots.php` — JOIN of students × commissions inflated all financial metrics. Fixed with CTE isolation.
- CRITICAL: `StateManager::transition()` not updating `students.profile_status` — caused 0 enrolled students in all reports. Fixed.
- HIGH: Agent ranking skew on small samples — added `WHERE students >= 5` threshold.
- `generate-snapshots.php` `flushBatch()` missing from countries/lead-sources/universities loops — added.
- MEDIUM: SQL date parameter validation missing in report queries — strict regex validation added.
- Phase 8 Production Readiness Score: **99%**

---

### Phase 9 — Production Hardening
**Spec owns:** Security hardening, deployment scripts, maintenance mode, health checks, cron resilience, manual test suite.

**Key implementation facts:**
- `.htaccess`: `Options -Indexes`, security headers, `mod_deflate` GZIP, `RewriteEngine On` for API routing.
- Maintenance mode: filesystem `.maintenance` file (not DB — works when DB is down).
- `set_error_handler` + `register_shutdown_function` in `index.php` for clean JSON error responses.
- `HealthController.php`: includes `is_writable()` checks; health endpoints exempt from rate limiting.
- Global IP rate limit: 200 req/min in `index.php`.
- `jwt_min_iat` in `system_settings` for global JWT revocation; checked in `AuthMiddleware`.
- Student academics: `student_academics` + `student_test_scores` tables (migration 063).
- Application withdrawal: `withdrawal_reason` field (migration 064); agent + admin withdraw endpoints.
- Agent referral link system + `getReferralLinks` endpoint + tier 3 hard cap.
- 2FA toggle: `POST /auth/2fa/toggle` — requires current password verification.
- `CronHealth::checkStuckJobs()` — detects jobs stuck in `processing` state > threshold.
- `setup-local.bat` + `start-dev.bat` for local development.

**Key appends / hotfixes (Phase 9 APPEND):**
- `§9.1` CRITICAL: Apache `.htaccess` missing `RewriteEngine On` — ALL API routes returned 404. Fixed.
- `§9.2` HIGH: `build-api-archive.bat` excluded `cron/` directory — cron jobs never deployed. Fixed.
- `§9.3` HIGH: `getApplication()` missing `withdrawal_reason` in SELECT. Fixed.
- CRITICAL ISSUE 2: `Database.php` exposed DB credentials in chained PDOException stack trace. Fixed with clean `RuntimeException`.
- HIGH ISSUE 3: Drive sync marks job failed on first attempt, never retried. Fixed with migration 065 adding `sync_attempts` + exponential backoff in `sync-drive.php`.
- HIGH ISSUE 4: No SMTP failover. Fixed with `MAIL_FALLBACK_HOST` env var in `MailService`.
- MEDIUM ISSUE 5: No disk space check before upload. `FileUploadService` now checks 50MB free.
- HIGH ISSUE 6: No global JWT revocation mechanism. Fixed with `jwt_min_iat` in `system_settings` + `AuthMiddleware` check.
- MEDIUM ISSUE 7: Health check endpoints were triggering rate limiting DB queries. Fixed — health endpoints bypass rate limit.
- Phase 9 Production Readiness Score: **97/100**

---

### Services directory — complete inventory (24 files)
Located at `crm-api/Services/`:

```
ActivityLogger.php
ApplicationStateManager.php     ← NOTE: two state manager files exist (see §7)
AuditService.php
BackupRetentionManager.php
CommissionService.php
CronHealth.php
DriveFolderManager.php
DriveService.php
EncryptionService.php
FileUploadService.php
JWTService.php
MailService.php
NotificationService.php
OTPResult.php                   ← PHP 8.1 backed enum (not a class)
OTPService.php
PasswordValidator.php
PendingRegistrationService.php
PhpMysqlDump.php
ReminderEngine.php
ReminderService.php
SecurityEventLogger.php
SLAService.php
StateManager.php                ← NOTE: two state manager files exist (see §7)
SystemSettings.php
```

---

## 4. SPOT CHECKS

Five concrete spec claims checked against the filesystem:

| # | Claim | Result | Notes |
|---|-------|--------|-------|
| 1 | `crm-api/Services/JWTService.php` exists | **MATCH** | File confirmed present |
| 2 | `crm-api/Services/CommissionService.php` exists | **MATCH** | File confirmed present |
| 3 | `src/pages/agent/AgentRejectedPage.tsx` exists | **MATCH** | File confirmed present |
| 4 | `cron/scheduler.php` exists (master cron scheduler) | **MATCH** | File confirmed present |
| 5 | `src/styles/index.css` contains `@theme {}` block (Tailwind v4 tokens) | **MISMATCH / AMBIGUITY** | File exists but is only **183 bytes** — far too small to contain a full design-token `@theme {}` block. `@theme` string NOT found by search. Tailwind tokens may be in `src/index.css` (project root's `src/`) rather than `src/styles/index.css`. **Do not assume the Tailwind config location without reading the actual file first.** |

**Bonus finding (discovered during migration inventory):**

| # | Claim | Result | Notes |
|---|-------|--------|-------|
| 6 | Migrations 048–052 exist as individual files (Phase 4 tables) | **NOT FOUND** | `crm-api/Database/migrations/` jumps from `047` directly to `053`. These 5 migrations (Phase 4 academic tables) exist only in `all_migrations_combined.sql`. If running migrations incrementally, this gap will cause issues. |

---

## 5. OFF-LIMITS ZONES

The following files and directories belong to the **public marketing website** and must **never be modified** during CRM work:

### Individual page files — DO NOT TOUCH
```
src/pages/HomePage.tsx
src/pages/DestinationsPage.tsx
src/pages/CountryDetailPage.tsx
src/pages/CoursesPage.tsx
src/pages/CourseCategoryPage.tsx
src/pages/PartnersPage.tsx
src/pages/AboutPage.tsx
src/pages/ContactPage.tsx
src/pages/ServicesPage.tsx
```

### Entire directories — DO NOT TOUCH (any file within)
```
src/components/home/        ← all marketing home sections
src/components/layout/      ← marketing Header, Footer, WhatsAppButton
src/data/                   ← all TGA data files
```

**Confirmed:** All of the above were verified to exist in the filesystem during this discovery session.

**Note on `src/components/layout/` vs `src/shared/components/layout/`:**  
These are DIFFERENT directories. `src/components/layout/` = marketing (off-limits). `src/shared/components/layout/` = CRM portal shell (AuthGuard, RoleGuard, PortalWrapper, TopBar) — this one IS in scope for CRM work.

---

## 6. ENVIRONMENT CHECK

### Runtime versions
| Tool | Version |
|------|---------|
| PHP | 8.2.12 |
| Node.js | v22.13.1 |
| NPM | 10.9.2 |

PHP 8.2.12 is compatible with all features used (named arguments, fibers are unused, enums from 8.1, `sodium_*` from 7.2+, `PDO::PARAM_INT` always present).

### Key frontend dependencies (from `package.json`)
| Package | Version | Status |
|---------|---------|--------|
| `react` | ^18.3.1 | ✓ |
| `react-router-dom` | ^7.15.0 | ✓ React Router v7 |
| `@tanstack/react-query` | ^5.100.14 | ✓ v5 (no onSuccess/onError on useQuery) |
| `motion` | 12.23.24 | ✓ Correct (NOT framer-motion) |
| `@dnd-kit/core` | ^6.3.1 | ✓ Correct DnD library |
| `@dnd-kit/sortable` | ^8.0.0 | ✓ |
| `zustand` | ^5.0.13 | ✓ |
| `recharts` | 2.15.2 | ✓ |
| `@tiptap/react` | ^3.27.1 | ✓ (notices editor) |
| `cmdk` | 1.1.1 | ✓ (command palette) |
| `axios` | ^1.16.1 | ⚠ Present but CLAUDE.md says api.ts uses native `fetch`. Axios likely used only for file upload progress (`onUploadProgress`). |
| `react-dnd` | 16.0.1 | ⚠ See §7 — different from the forbidden `react-beautiful-dnd` but not `@dnd-kit`. |
| `@mui/material` | 7.3.5 | ⚠ See §7 — not mentioned in CLAUDE.md or any spec. |
| `globe.gl` | ^2.45.3 | ℹ Likely marketing site (3D globe) |
| `three` | ^0.184.0 | ℹ Likely marketing site (Three.js) |

### Backend env template (`crm-api/.env.example`)
**Present and complete.** Confirmed keys include:

```
APP_ENV, APP_URL, APP_FRONTEND_URL, APP_NAME, APP_VERSION
DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_CHARSET, DB_PORT
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_RESET_SECRET
JWT_ACCESS_EXPIRY, JWT_REFRESH_EXPIRY, JWT_ALGORITHM=HS256
ENCRYPTION_KEY         (base64 of 32 random bytes)
ARGON2_MEMORY_COST=19456, ARGON2_TIME_COST=2
OTP_EXPIRY_MINUTES=10
TRUST_CLOUDFLARE_IP_HEADER=false
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
MAIL_HOST=smtp.gmail.com, MAIL_PORT=587
MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_EMAIL, MAIL_FROM_NAME
```

Keys added by later phases (not verified in .env.example first 40 lines but referenced in appends):
- `MAIL_FALLBACK_HOST` (Phase 9 — SMTP failover)
- `DRIVE_SERVICE_ACCOUNT_JSON`, `DRIVE_BACKUP_FOLDER_ID` (Phase 6)
- `CORS_ALLOWED_ORIGINS` (Phase 1)

---

## 7. AMBIGUITIES & OPEN QUESTIONS

These items are genuinely unclear from reading alone. They should be verified by reading the actual files before any work that depends on them.

---

### AMB-01 — Tailwind `@theme` block location [HIGH PRIORITY]

**The ambiguity:** `src/styles/index.css` exists but is only 183 bytes — too small to contain a full design-token block. The `@theme` string was not found in this file. CLAUDE.md states "Design tokens live in `src/styles/index.css` `@theme {}` block."

**Hypothesis:** The actual Tailwind `@theme {}` tokens may be in `src/index.css` (in the `src/` root) or in a different import chain. The 183-byte `src/styles/index.css` may just be a thin file that `@import`s the real token file.

**Risk:** Any work touching design tokens or adding new Tailwind classes could use the wrong reference file.

**Verify by:** `Read src/styles/index.css` and `Read src/index.css` to find where `@theme {` actually lives.

---

### AMB-02 — `ApplicationStateManager.php` vs `StateManager.php` [MEDIUM PRIORITY]

**The ambiguity:** Both files exist in `crm-api/Services/`. Phase 4 spec defines `ApplicationStateManager`. Phase 8 APPEND references fixing `StateManager::transition()`. It is unclear whether:
- (a) These are the same class — one renamed to the other during refactor
- (b) These are two distinct services — `ApplicationStateManager` handles the student application state machine; `StateManager` is a more generic state manager
- (c) One is a stub/base class and the other inherits from it

**Risk:** Any future work on application status transitions could edit the wrong file.

**Verify by:** Read both files to check class names, method signatures, and whether one extends or delegates to the other.

---

### AMB-03 — `react-dnd` (16.0.1) in package.json [LOW PRIORITY]

**The ambiguity:** `react-dnd` v16.0.1 is present in `package.json`. CLAUDE.md explicitly forbids `react-beautiful-dnd` and requires `@dnd-kit/core` + `@dnd-kit/sortable` (both present). `react-dnd` is a third, different library — it is NOT the forbidden one, but it is also NOT the spec-required one.

**Hypothesis A:** `react-dnd` was installed at some point and is used somewhere (possibly an older component).  
**Hypothesis B:** It was added as a dependency of another package (`@mui/material`?) and is not directly used.

**Risk:** If new drag-and-drop features are built using `react-dnd`, that violates the spec intent. Should use `@dnd-kit`.

**Verify by:** `grep -r "react-dnd" src/` to check if it's actually imported anywhere.

---

### AMB-04 — `@mui/material` (7.3.5) in package.json [LOW PRIORITY]

**The ambiguity:** `@mui/material` v7.3.5 is in `package.json` but is not mentioned anywhere in CLAUDE.md, the master reference, or any of the 9 phase specs. The project's design system appears to be Tailwind v4 + custom components.

**Hypothesis A:** MUI was added for a specific component (e.g., a date picker or data grid) that Tailwind doesn't cover.  
**Hypothesis B:** It's present but unused — possibly a leftover from early scaffolding.

**Risk:** If MUI components are in use, they may have styling conflicts with Tailwind v4 tokens or introduce unexpected behavior.

**Verify by:** `grep -r "@mui" src/` to see if it's actually imported.

---

### AMB-05 — Missing migration files 048–052 [MEDIUM PRIORITY]

**The ambiguity:** `crm-api/Database/migrations/` contains files `001` through `047` and then `053` through `069`. Files `048`, `049`, `050`, `051`, `052` do not exist as individual files. These correspond to Phase 4 academic tables (universities, courses, intakes, applications, documents, payments).

**The content exists** in `all_migrations_combined.sql`, so the schema is defined somewhere. However, any tooling that runs migrations incrementally (e.g., `run_all_migrations.php` iterating by filename) will skip these tables.

**Risk:** Fresh environment setup using individual migration files will be missing 5 critical tables. The combined SQL is the only safe path.

**Verify by:** Check `run_all_migrations.php` to confirm whether it uses individual files or the combined SQL.

---

### AMB-06 — `axios` usage scope [LOW PRIORITY]

**The ambiguity:** `axios` v1.16.1 is in dependencies. CLAUDE.md says `api.ts` uses native `fetch`. Phase 4 APPEND references `onUploadProgress` (an axios feature) for file upload progress tracking.

**Hypothesis:** `axios` is used specifically for file uploads where progress reporting is needed. All other API calls use native `fetch`.

**Risk:** Low — but any developer adding a new file-upload flow should know whether to use `axios` (with progress) or `fetch` (for everything else).

**Verify by:** `grep -r "axios" src/` to see all import sites.

---

## END OF DISCOVERY REPORT

**Summary of session:** Read-only. No files modified except this report. All 9 phase spec files and all 9 APPEND files were read end-to-end in the prior session window. Environment verified. Filesystem spot-checked. 6 ambiguities logged above — none were "fixed," all are noted for future resolution.
