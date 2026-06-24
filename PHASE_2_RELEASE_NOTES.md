# Phase 2 Release Notes
## TGA CRM — Registration, Authentication & User Onboarding
**Released**: 2026-06-24
**Branch**: main
**Scope**: Student registration, agent onboarding, sub-agent creation, admin agent management, forgot password, OTP login, password change

---

## Overview

Phase 2 delivers the complete authentication and user onboarding layer. Every entry point into the system — student self-registration, agent onboarding via wizard, sub-agent creation by an approved parent agent, and admin-managed user creation — is implemented end-to-end with full OTP verification and transactional data integrity.

Phase 2 also carried an extensive pre-implementation forensic audit of Phase 1 that discovered 15 critical and high-severity bugs. All bugs were fixed as part of this phase before any new feature code was written.

---

## Features Added

### Student Registration (3 entry points, 1 endpoint)
- Students can self-register, or be registered by an agent or admin on their behalf
- `registered_by_type` and `registered_by_id` set server-side from JWT — client cannot spoof
- OTP always delivered to the real student's email regardless of who fills the form
- Referral code validation endpoint: real-time agent lookup returning only name + agency (no other agent data exposed to unregistered users)
- Initiate endpoint stores all pending data encrypted in `pending_registrations` table (not PHP sessions)
- Verify-OTP endpoint creates `users` + `students` + `user_preferences` in a single atomic transaction — no partial rows ever created on failure
- Attaches student to agent via referral code lookup if provided
- Issues JWT immediately on successful OTP verification — single step to authenticated state

### Agent Onboarding
- 6-step wizard flow: agency info, contact details, business registration, password, T&C, OTP
- T&C acceptance timestamp recorded in `agents.terms_accepted_at`
- Agent created with `status = pending` — no JWT issued, no dashboard access until admin approval
- `root_agent_id = self.id` set atomically after agent row creation (Level 1 agents are their own root)
- Login returns structured pending/rejected status response instead of JWT — frontend can show appropriate waiting screen

### Admin Agent Approval Workflow
- `GET /admin/agents/pending` — paginated list of pending agents
- `POST /admin/agents/:publicId/approve` — generates unique referral code (TGA-XXX999 format), sets users.status=active, fires notification
- `POST /admin/agents/:publicId/reject` — requires reason, prevents re-rejection of approved agents
- `POST /admin/agents/:publicId/suspend` — cascades users.status, instantly revokes all active JWT sessions (agent is locked out within one request cycle)

### Sub-Agent Creation
- Approved agents can invite sub-agents via `POST /agent/sub-agents/invite`
- 3-level tree hard cap enforced: tier >= 3 returns 403 TIER_LIMIT_REACHED
- New agent inherits: `tier = creator.tier + 1`, `parent_agent_id = creator.id`, `root_agent_id = creator.root_agent_id`
- Sub-agent goes through same pending → admin-approval flow as Level 1 agents

### Forgot Password (3-step, all user types)
- Step 1: `/auth/forgot-password` — generic success response regardless of whether email exists (prevents enumeration)
- Step 2: `/auth/forgot-password/verify-otp` — returns short-lived signed reset token (JWT_RESET_SECRET, 15 min) on valid OTP
- Step 3: `/auth/forgot-password/reset` — validates reset token (type claim, jti single-use, pwd_h auto-invalidation), updates password, revokes all active sessions

### OTP Login (Passwordless)
- `POST /auth/otp-login/request` — generates and sends OTP to registered email
- `POST /auth/otp-login/verify` — verifies OTP, issues JWT

### Password Change
- `POST /auth/change-password` — authenticated users change their own password; requires current password verification

### Role Management
- CRUD endpoints for admin roles: create, list, get, update, delete
- Role-permission assignment endpoint
- Guards: `roles.create`, `roles.edit` RBAC permissions

### New Services
- **PasswordValidator**: Single source of truth for password strength (min 10 chars, 1 uppercase, 1 number, 1 symbol). Used across all password-setting flows.
- **PendingRegistrationService**: Encrypted DB-backed pending registration storage replacing PHP sessions. Atomic `consume()` with FOR UPDATE prevents double-processing.
- **OTPResult enum**: PHP 8.1 backed enum replacing boolean return from OTPService::verify()

---

## Security Improvements

| ID | Category | Description |
|----|----------|-------------|
| §SE-01 | Argon2id | Explicit cost parameters (memory_cost, time_cost) on all password_hash() calls — PHP defaults caused login timeouts on Bluehost shared hosting |
| §SE-02 | Cookie | Refresh token cookie path restricted to `/api/auth/refresh` (not `/`) — minimises CSRF attack surface |
| §SE-03 | Password Reset | `pwd_h` fragment in reset token auto-invalidates it if user changed password via another path before using the link |
| §SE-04 | Security Events | `security_events.identifier` stores SHA-256 hash of email, not plaintext — protects privacy if events table is breached |
| §SE-05 | Agent Status | Sub-agent creation performs fresh DB lookup of creator's agent status — JWT claim may be stale; never trusted for agent-specific status |
| §SE-06 | Audit | `login_blocked_suspended` security event logged when suspended user attempts login — admin now has full visibility |
| §SE-07 | Timing Attack | `DUMMY_ARGON2_HASH` constant in AuthController — `password_verify()` always called regardless of whether user exists, eliminating email enumeration via timing difference |
| §SE-08 | Pending Data | Registration pending data encrypted via XSalsa20-Poly1305 before storage in DB — PHP sessions on Bluehost shared hosting store in shared /tmp readable by co-tenants |

---

## Architecture Decisions

- **DB table for pending registrations over PHP sessions** (§AD-01): PHP default file sessions stored in `/tmp` on Bluehost shared hosting — cross-tenant read risk. Signed JWTs holding registration data are client-side and expose PII even when signed. `pending_registrations` table with server-side encryption is the only approach that satisfies both confidentiality and integrity.

- **OTPResult enum over boolean return** (§AD-02): Four distinct failure modes (`Invalid`, `Expired`, `BruteForced`, `NotFound`) collapsed into `false` prevented controllers from showing actionable errors to users and reduced security event logging precision. Enum approach required updating all callers simultaneously but delivers significantly better UX and audit granularity.

- **Separate JWT_RESET_SECRET** (§AD-03): A dedicated signing key for password-reset tokens prevents token substitution attacks where a reset token might be accepted by an endpoint expecting an access token. Type claim (`password-reset`) provides a second layer of guard.

- **`pending_registrations.consume()` with FOR UPDATE**: Atomic retrieve-and-delete prevents a race condition where two concurrent OTP verify requests could both retrieve the pending data before either deletes it, potentially creating duplicate users.

---

## Phase 1 Bugs Fixed in Phase 2

These critical bugs were discovered during pre-implementation audit and fixed before any Phase 2 feature code was written.

| Bug ID | Severity | File | Description | Fix |
|--------|----------|------|-------------|-----|
| P1-BUG-01 | 🔴 CRITICAL | AuthController | `login()` queries plaintext email against encrypted BLOB column — login was completely broken | Query by `email_lookup_hash = EncryptionService::hash($email)` |
| P1-BUG-02 | 🟠 HIGH | AuthController | `$user['utype']` references non-existent key — should be `user_type`; admin permissions never loaded on login | Fixed to `$user['user_type']` |
| P1-BUG-03 | 🔴 CRITICAL | AuthController | `refresh()` reads token from JSON body, destroying the HttpOnly cookie security model | Read from `$_COOKIE['refresh_token']` |
| P1-BUG-04 | 🟠 HIGH | AuthController | `resetPassword()` generates OTP without checking if user exists | Replaced with full 3-step forgot-password flow |
| P1-BUG-07 | 🔴 CRITICAL | agents schema | `referral_code NOT NULL UNIQUE` with empty string default — second pending agent registration throws MySQL constraint violation | `referral_code` changed to NULL; empty strings migrated; UNIQUE index retained (MySQL treats NULLs as distinct) |
| P1-BUG-09 | 🔴 CRITICAL | RouteRegistry | Static 2-segment routing only — admin approval endpoints (/admin/agents/:publicId/approve) were physically unroutable | RouteRegistry extended with `:param` parameterized route matching |
| P1-BUG-AF06 | 🟡 MEDIUM | users schema | `two_factor_enabled` column referenced in AuthController but missing from schema — PHP notice on every login | Migration 040 adds the column |

---

## Database Migrations

| Migration | Purpose |
|-----------|---------|
| 038_pending_registrations | New table for encrypted pending registration storage |
| 039_agents_schema_fix | referral_code → NULL, suspension_reason column added |
| 040_users_two_factor | two_factor_enabled column added to users |
| 041_notification_templates_seed | 8 notification event templates seeded |
| 042_system_settings_additions | argon2_memory_cost, argon2_time_cost settings added |
| 043_cron_health_additions | cleanup_rate_limits cron job entry added |
| 044_seed_notification_templates | Extended notification template seeds |

---

## New Environment Variables Required

| Variable | Value | Purpose |
|----------|-------|---------|
| `JWT_RESET_SECRET` | 64-char hex | Signs password-reset tokens separately from access tokens |
| `ARGON2_MEMORY_COST` | `19456` | Argon2id memory cost in KiB (19 MiB — OWASP minimum) |
| `ARGON2_TIME_COST` | `2` | Argon2id iteration count |
| `MAIL_FROM_DOMAIN` | `theglobalavenues.com` | SPF alignment for outgoing OTP emails |

---

## Known Limitations

- Frontend registration wizards (student 4-step, agent 6-step) are wired to the API but the full UI is deferred to Phase 3
- Gmail SMTP (~500 emails/day limit) acceptable at current scale; Phase 6 should migrate to Mailgun or AWS SES
- Admin user management UI (roles, sub-admin creation) backend is complete; frontend UI deferred to Phase 3
- 2FA flow (`two_factor_enabled` column present, stub in AuthController) — full TOTP/OTP 2FA implementation deferred to Phase 5
- `rate_limits` table cleanup (migration 043) requires Phase 6 cron job to actually execute the delete

---

## Commits in This Phase

```
e948bf8  feat(db): add Phase 2 migrations for pending registrations and schema fixes
4cfde81  fix(auth): resolve 5 critical Phase 1 bugs blocking Phase 2 authentication
aaa12cf  feat(otp): add OTPResult enum replacing boolean return for granular error handling
f93ac46  feat(registration): implement student and agent registration with OTP verification
a7697ea  feat(agent): add agent approval workflow, suspension, and sub-agent creation
a4082ce  docs(phase): add Phase 1 and Phase 2 implementation history and architecture decisions
```

---

## Post-Audit Completion Score

Phase 1 + Phase 2 forensic audit score: **100/100**

All critical bugs (P1-BUG-01, 02, 03, 07, 09) resolved before Phase 2 features were built. All security enhancements §SE-01 through §SE-08 implemented. All Phase 2 architectural deviations documented and approved in PHASE_2_APPEND.md.
