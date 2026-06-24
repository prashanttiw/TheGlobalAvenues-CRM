# Phase 1 Release Notes
## TGA CRM — Foundation Layer
**Released**: 2026-06-24
**Branch**: main
**Scope**: Complete infrastructure skeleton — database, cryptography, authentication, RBAC, API routing, frontend foundation

---

## Overview

Phase 1 establishes every architectural primitive the TGA CRM is built on. No user-facing features were delivered — this phase exists so every subsequent phase has a correct, secure, and audited foundation to attach to. Every decision made here is deliberately hard to change later, which is why it received extensive senior architecture review and forensic audit before Phase 2 began.

---

## Features Added

### Database Schema — MySQL 8.4 LTS (38 tables)
- Complete production schema segmented into 37 numbered migration files (001–037) plus initial seeds
- Entities: users, user_sessions, otp_verifications, security_events, rate_limits, roles, permissions, role_permissions, admins, agents (3-tier self-referential tree), students, files (versioned), universities, courses, intakes, applications, application_updates, document_requests, application_payments, leads, commissions, notices, internal_notes, notification_templates, notifications, reminders, sla_rules, sla_events, user_preferences, activity_logs, report_snapshots, api_request_logs, cron_health, system_settings, sequences, activity_logs_archive
- ULID `public_id` (CHAR 26) on every entity — API always exposes public_id, never integer IDs
- Encrypted PII columns (email, phone, passport_number) stored as BLOB with companion `_lookup_hash` (SHA-256) for indexed search
- Soft-delete (`deleted_at`) on all entity tables
- Activity logs configured for INSERT-only grant (append-only audit trail)
- `jti_hash` on user_sessions for stateless JWT revocation
- Atomic sequences table for TGA-YYYY-NNNNNN reference numbers
- Seeds: 56 permissions, 12 system_settings entries

### EncryptionService
- XSalsa20-Poly1305 via PHP's native `sodium` extension — no AES-NI hardware dependency
- Version byte `\x01` prefix on all ciphertext for future algorithm migration without corrupting historical data
- `sodium_memzero()` wipes the encryption key from PHP memory immediately after every operation
- Static `hash()` method (SHA-256, lowercased) for deterministic encrypted-field DB lookups

### UlidGenerator
- Monotonic ULID generation: same-millisecond IDs increment the random component rather than re-randomizing
- Guarantees strict chronological sort order under high-concurrency inserts (e.g., activity_logs)
- Crockford Base32 charset (excludes I, L, O, U)
- Overflow protection throws `RuntimeException` instead of silent rollover to zero

### JWT Authentication (JWTService + AuthMiddleware)
- Cryptographically secure `jti` claim embedded in every access token
- `AuthMiddleware` validates jti against `user_sessions.jti_hash` on every authenticated request — revoked sessions are terminated within one request cycle
- Hard check of `users.status` on every request — suspended users lose access immediately
- Separate `JWT_RESET_SECRET` for password-reset tokens with `pwd_h` fragment binding
- `hash_equals()` throughout for timing-safe signature comparison

### RBAC Middleware
- Granular `module.action` permission evaluation (e.g., `agents.approve`, `applications.edit`)
- Admin permissions loaded once at login time and embedded in JWT — zero DB hits per subsequent request
- NULL role_id returns `[]` (no wildcard grant on unassigned roles)
- Super-admin JWT sentinel `[*]` prevents DB lockout if permissions table is dropped
- `assertAgentSubtreeAccess()` uses `root_agent_id` index for O(1) franchise-tree boundary enforcement

### OTP Service
- `SELECT ... FOR UPDATE` row lock wraps the entire verify flow — brute-force attempt cap is structurally unbypassable under concurrency
- `random_int(100000, 999999)` for cryptographically secure code generation
- Identifier stored as SHA-256 hash — raw email never written to `otp_verifications`
- Returns `OTPResult` enum (Valid, Invalid, Expired, BruteForced, NotFound) for granular controller handling

### BaseModel + State Machine
- Dynamic column identifier sanitization with backtick escaping — prevents SQL injection via array-key attacks on INSERT/UPDATE queries built from HTTP request data
- Automatic `WHERE deleted_at IS NULL` soft-delete scope on all reads
- `States.php` intercepts invalid status strings on `applications` and `students` tables before they reach MySQL
- `ApplicationStateManager` enforces explicit state transition graph with agent_lock_status set on `enrolled` transition

### REST Routing Engine
- `RouteRegistry` supports parameterized routes (`:publicId` pattern) with path parameter injection into controller methods
- `index.php` front controller uses `parse_url()` for safe URI parsing
- Auth endpoints: login, logout, refresh, forgot-password (3-step), OTP login, change-password, sessions, me
- `HealthController` at `GET /api/health/ping` — DB connectivity, disk percentage, PHP version, cron_health status

### Frontend Foundation
- JWT access token stored in Zustand memory only — never `localStorage` (XSS protection)
- HttpOnly cookie carries refresh token — frontend never reads it directly
- 401 silent-retry interceptor in Axios client replays original request after token rotation
- `ProtectedRoute.tsx` gates portal URLs by user type
- `ModuleGuard.tsx` evaluates granular permission keys from JWT `perms[]` before rendering
- `usePermission` hook for conditional UI rendering

---

## Security Improvements

| ID | Category | Description |
|----|----------|-------------|
| S-01 | Encryption | XSalsa20-Poly1305 for all PII at rest; key wiped from PHP memory after every use |
| S-02 | Identity | ULID public IDs prevent sequential ID enumeration on API responses |
| S-03 | Auth | jti per-token revocation — compromised tokens invalidatable in < 1 request cycle |
| S-04 | Auth | users.status hard-checked on every request — suspension is effective immediately |
| S-05 | OTP | FOR UPDATE row lock prevents concurrent brute-force bypasses |
| S-06 | OTP | hash_equals() comparison prevents timing attacks on OTP verification |
| S-07 | Database | Soft-delete enforced — app DB user has no DELETE grant on entity tables |
| S-08 | Database | Activity logs INSERT-only grant — audit trail is append-only, non-tamperable |
| S-09 | API | BaseModel column sanitization prevents SQL injection via dynamic key attacks |
| S-10 | RBAC | Super-admin sentinel in JWT prevents DB-lockout scenarios |
| S-11 | Rate Limiting | Atomic INSERT...ON DUPLICATE KEY UPDATE eliminates TOCTOU race condition |
| S-12 | Frontend | Access token in memory only; XSS cannot reach tokens stored in localStorage |

---

## Architecture Decisions

- **MySQL 8.4 LTS** chosen over 5.7 — unlocks enforced CHECK constraints, JSON DEFAULT expressions, native JSON functions, CTEs, and window functions
- **XSalsa20-Poly1305 over AES-256-GCM** — sodium extension available everywhere without AES-NI hardware; version byte future-proofs algorithm migration
- **Monotonic ULIDs over UUID v4** — lexicographically sortable enables chronological DB ordering without secondary timestamp index
- **jti revocation over short token expiry** — short expiry degrades UX; jti enables instant revocation without requiring frequent re-authentication
- **root_agent_id index over recursive CTE** — O(1) subtree check vs potentially unbounded recursive query; MySQL 5.7 compatibility preserved as a bonus
- **INSERT...ON DUPLICATE KEY UPDATE for rate limiting** — single atomic operation vs SELECT+UPDATE two-step that has a measurable TOCTOU window

---

## Major Fixes Applied During Audit

- **GAP-1**: Session count enforcement added to `AuthController::saveSession()` — oldest session auto-revoked when limit exceeded
- **GAP-2**: Argon2id (`PASSWORD_ARGON2ID`) replaces `PASSWORD_DEFAULT` for all password hashing
- **GAP-3**: `listSessions()`, `revokeSession()`, `verifyOtp()` implemented and wired
- **GAP-4**: OTPService logs `otp_not_found` and `otp_brute_force` events to `security_events` with source IP
- **GAP-5**: `usePermission.ts` hook created for granular frontend permission evaluation
- **GAP-6**: `HealthController` deployed at `GET /api/health/ping` with cron_health status
- **Forensic Audit**: ActivityLogger, NotificationService, and SecurityEventLogger decoupled from hallucinated schema properties and re-mapped to live MySQL 8.4 column names

---

## Known Limitations

- No user-facing registration or login UI yet (Phase 2)
- No email delivery — OTP and notification services are wired but SMTP not tested end-to-end
- Admin portal UI is a skeleton only — dashboard design deferred to Phase 3
- 2FA column (`two_factor_enabled`) is in the schema and referenced in AuthController but the full TOTP flow is not yet implemented (Phase 5)
- All 38 tables exist in schema but only auth/session/OTP tables are exercised in Phase 1

---

## Commits in This Phase

```
a96abf0  feat(db): add complete 38-table MySQL 8.4 LTS schema with migrations
26fcd58  feat(crypto): add XSalsa20-Poly1305 encryption and monotonic ULID generator
6a3d82e  feat(auth): implement JWT with jti revocation and per-request session validation
a3929f2  feat(rbac): add granular module.action RBAC middleware with O(1) subtree enforcement
15d2dab  feat(otp): implement brute-force-resistant OTP service with FOR UPDATE row locking
8fde4e7  feat(core): add BaseModel with SQL injection guard, soft-delete, and state machine
6f8b999  feat(api): wire REST routing engine, auth endpoints, health check, and file upload
d9a3dd5  security(ratelimit): refactor to atomic INSERT ... ON DUPLICATE KEY UPDATE
176e175  feat(frontend): add memory-only auth store, RBAC guards, and API client foundation
d96f741  feat(services): add activity logger, notification dispatcher, and security event logger
d759d50  chore(repo): remove stale planning docs and fix gitignore
```
