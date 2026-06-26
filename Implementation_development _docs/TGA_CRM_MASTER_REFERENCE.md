# TGA CRM — Master Reference Document
## The Complete Project Overview

---

## WHAT WAS BUILT

The Global Avenues CRM is a three-portal, production-grade system for an
international education consultancy. One codebase, one database, three worlds:
students track their university applications, agents manage their student
network and commissions, admins run TGA's full operations.

**Tech stack:**
- Frontend: React 18 + TypeScript + Vite + Tailwind v4.1.12 → Vercel
- Backend: PHP 8.2.12 + MySQL 8.4 LTS → Bluehost India shared hosting
- Auth: JWT (custom JWTService, no firebase/php-jwt), Argon2id passwords
- Encryption: XSalsa20-Poly1305 via sodium_crypto_secretbox (PII fields)
- Files: local disk (primary) + Google Workspace Drive (backup, every file)

---

## THE 9 PHASES

| # | Phase | What it covers |
|---|---|---|
| 1 | Foundation | 40 tables, PHP skeleton, JWT auth, Argon2id, encryption, ULID public IDs, frontend setup |
| 2 | Registration | Student/agent/admin registration, OTP, forgot password, OTP login, agent approval |
| 3 | Frontend Shell | Design system, all 3 portal layouts, 40+ shared UI components, permission-driven UI |
| 4 | Academic Core | Universities, courses, intakes, applications (state machine), timeline, documents, payments |
| 5 | Agents | 3-level hierarchy queries (MySQL 8.4 CTEs), reassignment, commission ledger |
| 6 | Infrastructure | Notification engine, all cron jobs (9 jobs), file versioning, Drive sync, activity log |
| 7 | Admin Features | Leads pipeline, notices, internal notes, system settings, global search, activity feed |
| 8 | Reporting | Snapshot cron, funnel analytics, agent KPIs, university intelligence, Excel/CSV/PDF exports |
| 9 | Production | Missing features added, local setup guide, 20 manual tests, security hardening, deployment |

---

## TABLES IN THE DATABASE (40 total)

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
student_academic_profiles      — IELTS, GPA, prior education (Phase 9 addition)
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
notification_templates         — 25+ event key templates with channel and category
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

## ALL CRON JOBS (9 jobs, all registered in cPanel)

| Job | Schedule | What it does |
|---|---|---|
| send-notifications | every 2 min | Dispatches queued email + in-app notifications |
| sync-drive | every 5 min | Uploads pending files to Google Workspace Drive |
| process-reminders | every 5 min | Fires deadline alerts for documents, payments, commissions |
| check-sla-breaches | every 30 min | Detects and flags missed SLA targets |
| generate-snapshots | midnight daily | Pre-computes all report metrics into report_snapshots |
| backup-db | 2am daily | mysqldump → gzip → Drive (daily/weekly/monthly retention) |
| monitor-disk | 6am daily | Alerts at 80% and 95% disk usage thresholds |
| archive-old-logs | 1am daily | Moves activity_logs >2yr to archive table |
| verify-backups | 3am Sunday | Verifies backup integrity weekly |

---

## ALL NOTIFICATION EVENT KEYS (25+ templates seeded)

```
student.registered              agent.onboarding_submitted
agent.approved                  agent.rejected
agent.suspended                 subagent.created
admin.created                   admin.2fa_otp
password.reset_otp              lead.new
lead.assigned                   lead.status_changed
agent.reassignment_requested    agent.reassignment_approved
agent.reassignment_lost         agent.reassignment_gained
application.withdrawn           application.status_changed
application.update.received     application.payment_created
application.payment_confirmed   document_request.created
document_request.submitted      document_request.approved
document_request.rejected       commission.created
commission.confirmed            commission.paid
notice.published                reminder.deadline_3days
reminder.deadline_1day          reminder.overdue
reminder.commission_pending     sla.breached
system.disk_warning             system.disk_critical
```

---

## CRITICAL STACK DETAILS FOR BUILDERS

```
Tailwind:       v4.1.12 — tokens in src/index.css @theme block, NO tailwind.config.ts
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
src/components/home/    (all marketing home sections)
src/components/layout/  (marketing header, footer, WhatsApp button)
src/data/               (all TGA data files)
```

---

## WHAT TO DO WHEN STARTING A NEW BUILD SESSION IN ANTIGRAVITY

1. Read PHASE_X_*.md for the current phase
2. Read the BUILDER RESEARCH NOTES table at the top — fill it in as you research
3. Read the CONTEXT section — understand what previous phases delivered
4. Build what the phase specifies
5. Fill in BUILDER RESEARCH NOTES with what you found and changed
6. Run through the AUDIT CHECKLIST at the bottom — everything must pass
7. Return the updated .md file with BUILDER RESEARCH NOTES filled in
8. Move to the next phase only when audit passes

**When in doubt:** check this master reference.
**When something seems wrong with the spec:** document it in BUILDER RESEARCH NOTES and flag for human review before changing architecture.
**When tempted to touch the marketing website:** don't.
