# TGA CRM — Master Reference Document
## The Complete Project Overview

---

## WHAT WAS BUILT

The Global Avenues CRM is a three-portal, production-grade system for an
international education consultancy. One codebase, one database, three worlds:
students track their university applications, agents manage their student
network and commissions, admins run TGA's full operations.

**Tech stack:**
- Frontend + Backend: React 18 + TypeScript + Vite + Tailwind v4.1.12, PHP — **one single Bluehost
  India shared-hosting account serves both**, same document root, no separate frontend host and no
  Node runtime in production (corrected 2026-07-08 — this used to describe a Vercel+Bluehost split
  that never matched the real deployment)
- PHP: `^8.1` required. **Production runs PHP 8.3** (`ea-php83`, confirmed 2026-07-16 via cPanel
  MultiPHP Manager). Local dev runs 8.2.12 via XAMPP.
- Database: **production runs MySQL 5.7.23** (confirmed 2026-07-16 via `SELECT VERSION()` on the
  live account — this used to say "MySQL 8.4 LTS," never verified against the real hosting
  account). Local dev uses MariaDB 10.4 via XAMPP, which is far more permissive and won't catch
  MySQL-8-only syntax — every migration must be written for 5.7 compatibility, not
  tested-on-local-and-assumed-fine.
- Auth: JWT (custom JWTService, no firebase/php-jwt), Argon2id passwords
- Encryption: XSalsa20-Poly1305 via sodium_crypto_secretbox (PII fields) — **not** AES-GCM (a stale
  column comment in `001_create_users_table.sql` still says AES-256-GCM; the code is the source of
  truth)
- Files: local disk only. Google Workspace Drive backup sync was deliberately removed from the
  codebase 2026-07-10 (never load-bearing in production) — don't look for it.

---

## THE 9 PHASES

| # | Phase | What it covers |
|---|---|---|
| 1 | Foundation | 40 tables, PHP skeleton, JWT auth, Argon2id, encryption, ULID public IDs, frontend setup |
| 2 | Registration | Student/agent/admin registration, OTP, forgot password, OTP login, agent approval |
| 3 | Frontend Shell | Design system, all 3 portal layouts, 40+ shared UI components, permission-driven UI |
| 4 | Academic Core | Universities, courses, intakes, applications (state machine), timeline, documents, payments |
| 5 | Agents | 3-level hierarchy queries, reassignment, commission ledger — originally built with recursive CTEs during a brief mid-project MySQL 8.4 assumption, since corrected: production is MySQL 5.7 (no CTE support), so the real, current hierarchy query is a bounded 3-level `UNION ALL` instead (see `AdminAgentController::getTree()`) |
| 6 | Infrastructure | Notification engine, all cron jobs (9 jobs), file versioning, Drive sync, activity log |
| 7 | Admin Features | Leads pipeline, notices, internal notes, system settings, global search, activity feed |
| 8 | Reporting | Snapshot cron, funnel analytics, agent KPIs, university intelligence, Excel/CSV/PDF exports |
| 9 | Production | Missing features added, local setup guide, 20 manual tests, security hardening, deployment |

---

## TABLES IN THE DATABASE (~41+, original "40 tables" spec predates Phase 9 additions)

```
users                          — auth for all 3 user types
user_sessions                  — active JWT tracking, device info, instant revocation
otp_verifications              — OTP codes (hashed), expiry, attempt counting
pending_registrations          — temporary storage during OTP-gated registration
security_events                — failed logins, brute force, rate limit hits (security audit)
rate_limits                    — atomic rate limit counters
roles                          — admin RBAC named roles
permissions                    — (module, action) pairs, 56 rows seeded
role_permissions               — role → permission mapping
admins                         — admin profile, is_super_admin flag
agents                         — 3-level tree: parent_agent_id, root_agent_id, tier
students                       — profile, agent attachment, status, lock status
student_academics               — prior education history (Phase 9 addition)
student_test_scores            — IELTS/TOEFL/GRE/etc. scores (Phase 9 addition)
agent_reassignment_requests    — student-initiated agent changes with admin review
files                          — central file registry: UUID storage, display name, checksum,
                                  version chain, Drive sync status
universities                   — name, country, logo, partnership type
courses                        — under universities, eligibility criteria
intakes                        — per-course, per-year: fee, deadline, clone-able
applications                   — state machine: draft→submitted→under_review→offer→enrolled
application_updates            — unified timeline: files, links, notes, payment requests
document_requests              — admin-initiated doc requests: requested→submitted→approved
application_payments           — payment link + mark-paid + confirm pipeline
leads                          — TGA-internal, never agent-visible, kanban pipeline
commissions                    — manual, case-by-case, multi-row per application
notices                        — TGA broadcasts: audience flags, draft→publish
internal_notes                 — per-note visibility: admin/agent/student flags
notification_templates         — 36 event key templates with channel and category
notifications                  — queue + delivery log for email + in-app
reminders                      — universal deadline engine: all entity types
sla_rules                      — time targets: document review 48h, application review 72h
sla_events                     — per-instance SLA tracking, breach detection
user_preferences               — per-user UI settings: page size, dashboard widgets
activity_logs                  — APPEND-ONLY, INSERT-only DB grant, immutable audit trail
activity_logs_archive          — logs >2 years moved here nightly
security_events                — security audit (separate from operational activity_logs)
report_snapshots               — daily pre-computed metrics (all dimensions)
api_request_logs               — slow/error requests logged for performance monitoring
cron_health                    — heartbeat per cron job: last run, status, duration, errors
system_settings                — 14 admin-configurable operational values
sequences                      — atomic sequential number generation (application refs)
```

---

## ALL CRON JOBS (4 scheduled + 1 dormant, one cPanel entry driving all of them)

**Superseded 2026-07-10 / 2026-07-14 — this table originally listed 9 jobs from the initial build
plan.** `sync-drive`, `process-reminders`, `backup-db`, and `verify-backups` were deleted from the
codebase entirely (Google Drive backup sync and the never-functional payment-reminder engine were
never load-bearing in production). The real, current job list, driven by one `* * * * *` cPanel
entry (`ea-php83 cron/scheduler.php`) that internally dispatches everything else via `flock()` +
`scheduler_state.json`:

| Job | Schedule | What it does |
|---|---|---|
| send-notifications | every 1 min | Dispatches queued email + in-app notifications |
| check-sla-breaches | every 15 min | Detects and flags missed SLA targets |
| generate-snapshots | every 24 hr | Pre-computes all report metrics into report_snapshots |
| monitor-disk | every 12 hr | Alerts at 80% and 95% disk usage thresholds |
| archive-old-logs | **not scheduled** | Exists in `cron/` but deliberately excluded from `scheduler.php`'s job list — `activity_logs` must never be deleted (product decision 2026-07-08). Dead weight in the directory, not a live job. |

---

## ALL NOTIFICATION EVENT KEYS (36 templates seeded, verified 2026-07-26 directly against the live `notification_templates` table — not from planning notes)

**Superseded 2026-07-26 — this list previously named several event keys that were never actually
built** (`application.withdrawn`, `application.update.received`, `application.payment_created`,
`application.payment_confirmed`, `document_request.created/submitted/approved/rejected`, all four
`reminder.*` keys) — either an early plan that changed shape during implementation, or the
reminder engine they belonged to, which was deleted 2026-07-10. The list below is the real,
current set, one row per event key exactly as stored in the database today:

```
admin.2fa_otp                   admin.created
agent.approved                  agent.created_by_admin
agent.onboarding_submitted      agent.reassignment_approved
agent.reassignment_denied       agent.reassignment_gained
agent.reassignment_lost         agent.reassignment_requested
agent.registered                agent.registration_otp
agent.rejected                  agent.suspended
application.status_changed      auth.login_success
commission.confirmed            commission.created
commission.paid                 document.cancelled
document.requested              document.reviewed
document.submitted              lead.assigned
lead.new                        lead.status_changed
login.otp                       notice.published
password.reset_otp              sla.breached
student.created_by_agent        student.registered
student.registration_otp        subagent.created
system.disk_critical            system.disk_warning
```

Full word-for-word content of every one of these:
`Implementation_development _docs/EMAIL_NOTIFICATION_CONTENT_REVIEW.md`.

---

## CRITICAL STACK DETAILS FOR BUILDERS

```
Tailwind:       v4.1.12 — tokens in src/styles/theme.css (@theme inline {} + :root {} blocks),
                src/styles/index.css just imports it. NO tailwind.config.ts
Motion:         motion/react v12 — import from 'motion/react', NOT 'framer-motion'
TanStack Query: v5 — useQuery has NO onSuccess/onError/onSettled callbacks
                     useMutation still has onSuccess/onError/onSettled (fine)
                     Side effects: useEffect watching data/isError
React Router:   v7.15.0
Radix UI:       Dialog, AlertDialog, DropdownMenu for all overlays
dnd-kit:        Drag-and-drop (NOT react-beautiful-dnd)
Accessible orange: #D96200 for interactive (buttons, active nav)
Display orange:    #FD7E14 for decorative-only highlights
Encryption:     sodium_crypto_secretbox (XSalsa20-Poly1305) — NOT AES-GCM
Passwords:      PASSWORD_ARGON2ID with env-configured memory/time cost
Rate limiting:  Dual-key (IP + email_hash), atomic INSERT ON DUPLICATE KEY UPDATE
JWT:            Custom JWTService with jti claim, validated via user_sessions table
Login state:    Access token in Zustand memory only, refresh token in HttpOnly cookie
Registration:   pending_registrations table (not PHP sessions)
Public IDs:     ULID (26 chars), all API responses use public_id not integer id
```

---

## FILES THAT MUST NEVER BE TOUCHED

**Verified against `src/router/index.tsx` and the filesystem 2026-07-26** — the marketing site was
trimmed at some point to a single home page plus contact/apply/login. A wider
Destinations/Universities/Courses/Partners/About/Services marketing site referenced in this
section previously no longer exists on disk; the pages below are what's actually live today.
Treat `src/router/index.tsx` as the source of truth if this list and the router ever disagree
again.

```
src/pages/HomePage.tsx
src/pages/ContactPage.tsx
src/components/home/    (all marketing home sections)
src/components/layout/  (marketing header, footer, WhatsApp button)
src/data/               (all TGA data files)
```

`src/pages/ApplyPage.tsx`, `LoginPage.tsx`, and `ForgotPasswordPage.tsx` are public routes but
**are in scope** — they're CRM auth entry points, not marketing content.

---

## WHAT TO DO WHEN STARTING A NEW BUILD SESSION

**Superseded 2026-07-15** — this used to describe a per-phase workflow built around
`PHASE_X_*.md` spec files and a "BUILDER RESEARCH NOTES" table in each one. That entire file set
(9× phase specs, 9× release notes, 9× append files, plus `CLAUDE_DISCOVERY.md` and
`WORKING_MODE.md` — 30 files total) was read in full and consolidated into
`Implementation_development _docs/PROJECT_HISTORY.md` plus the root `CLAUDE.md`. Those files no
longer exist — don't look for them. All 9 build phases are complete; there is no "current phase"
to read into anymore.

**The actual current process, every session:**
1. `CLAUDE.md` (repo root) auto-loads every session — read it for architecture, gotchas, and the
   Working Mode rules (discuss first, one change at a time, verify live, never touch the marketing
   off-limits zone above).
2. For depth on any specific area, read `PROJECT_HISTORY.md` (what shipped, why, and every notable
   bug, phase by phase) or this file / `CLIENT_SYSTEM_DOCUMENTATION.md` for current system spec.
3. Build what was actually asked for — this is a live production system now, not a phase plan being
   executed against a checklist.
4. After any change: verify it live (not just by reading the code back), then append a dated entry
   to `PROJECT_HISTORY.md` under the relevant section — what changed, files touched, why, how it
   was verified. That's the audit trail now, replacing the old per-phase AUDIT CHECKLIST.

**When in doubt:** check this master reference and `CLAUDE.md`.
**When something in either seems wrong:** verify against the actual current code/database before
trusting it — both files describe the system as it *was* at various points, and drift is normal;
fix the doc once you've confirmed which one is right.
**When tempted to touch the marketing website:** don't.
