# TGA CRM — Project History & Build Log

**Consolidated 2026-07-15.** This file replaces 30 separate historical documents — 9 root
`PHASE_X_RELEASE_NOTES.md` files, 9 `Implementation_development _docs/PHASE_X_*.md` spec files, 9
`PHASE_X_APPEND.md` implementation-history files (plus the lowercase `phase_1_append.md`), the
`PHASE_AUDIT_1_*` pair, and `CLAUDE_DISCOVERY.md` — which together ran to roughly 28,000 lines. Every
one of those files was read in full and summarized here; nothing judged genuinely useful was dropped,
but routine step-by-step verification narration, redundant restatements, and content already covered by
`CLAUDE.md`'s condensed Hotfix History table were cut.

**How to use this file:**
- For **what the system does today**, read `TGA_CRM_MASTER_REFERENCE.md` or
  `CLIENT_SYSTEM_DOCUMENTATION.md` instead — this file is a historical record of how the system got
  there, not a current-state spec. Sections below sometimes explicitly flag where the historical record
  now disagrees with reality (features later removed, decisions later reversed, specs that were never
  actually followed) — those notes are marked **"Anything that contradicts or supersedes current
  docs."** Trust the code and the current-state docs over anything in this file.
- Each phase section has: **What shipped**, **Key architectural decisions & why**, **Notable bugs found
  & fixed**, and (where relevant) a contradicts/supersedes note.
- `CLAUDE.md`'s Hotfix History table already lists the single highest-impact fix per phase — this file
  is the full record underneath it, including fixes that didn't make that shortlist. Some overlap
  between the two is intentional (this file is the complete record; that table is the "greatest hits").
- Development ran June–July 2026 across 9 planned "phases," but in practice every phase kept
  accumulating fixes and audit findings well past its initial release date — many entries below are
  dated weeks after the phase's nominal release. Treat phase numbers as **feature areas**, not as
  strictly time-boxed periods.

---

## Phase 1 — Foundation

**Released:** 2026-06-24 · **Scope:** database schema, cryptography, JWT auth, RBAC, API routing skeleton, frontend auth foundation. No user-facing features — every later phase attaches to what this phase built, which is why it got an unusually heavy senior-architect audit pass before Phase 2 started.

### What shipped

- **Database schema** — MySQL 8.4 LTS, migrations 001–037 (+036 `activity_logs_archive` added during audit), landing at 38 tables. Covers users/sessions/OTP/security/rate-limits, RBAC (`roles`/`permissions`/`role_permissions`), `admins`, 3-tier self-referential `agents`, `students`, `agent_reassignment_requests`, versioned `files`, catalog (`universities`/`courses`/`intakes`), `applications` + `application_updates` + `document_requests` + `application_payments`, `leads`, `commissions`, `notices`, `internal_notes`, notification plumbing (`notification_templates`/`notifications`/`reminders`), `sla_rules`/`sla_events`, `user_preferences`, `activity_logs` (+archive), `report_snapshots`, `api_request_logs`, `cron_health`, `system_settings`, `sequences`.
- **Design primitives baked in from day one:** ULID `public_id` (CHAR 26) on every entity, encrypted BLOB + `_lookup_hash` (SHA-256) pattern for PII, soft-delete (`deleted_at`) everywhere, INSERT-only grant on `activity_logs`.
- **Seeds:** 56 permissions, 12 `system_settings`, 3 `sla_rules`, 9 `cron_health` rows (all `never_run`).
- **`EncryptionService`** — XSalsa20-Poly1305 via `sodium_crypto_secretbox`, version-byte (`\x01`) prefix on ciphertext, `sodium_memzero()` wipe after every op, deterministic SHA-256 `hash()` for lookup columns.
- **`UlidGenerator`** — monotonic (same-millisecond IDs increment the random component instead of re-randomizing), Crockford Base32, overflow throws instead of silently wrapping to zero.
- **JWT auth (`JWTService` + `AuthMiddleware`)** — `jti` claim per access token, validated against `user_sessions.jti_hash` on every request; hard `users.status` check every request; separate `JWT_RESET_SECRET`; `hash_equals()` for signature comparison.
- **RBAC middleware** — granular `module.action` permission model, permissions loaded once at login and embedded in JWT (zero DB hits per request thereafter), `NULL role_id` → `[]` (no wildcard grant), super-admin `[*]` sentinel to prevent DB-lockout, `root_agent_id`-based O(1) subtree check for agent hierarchy boundaries.
- **OTP service** — `SELECT ... FOR UPDATE` row lock around the whole verify flow (brute-force cap structurally unbypassable under concurrency), `random_int()` code generation, SHA-256-hashed identifier (raw email never stored), `OTPResult` enum return type.
- **`BaseModel` + state machine** — dynamic column-identifier sanitization (backtick-escaping) to block SQL injection via array-key attacks on dynamically built INSERT/UPDATE; automatic `WHERE deleted_at IS NULL` scope; `States.php` intercepts invalid status strings before they reach MySQL; `ApplicationStateManager` (role-guarded transition graph — later superseded as dead code, see CLAUDE.md).
- **REST routing** — `RouteRegistry` with parameterized routes, `index.php` front controller using `parse_url()`; auth endpoints (login/logout/refresh/forgot-password/OTP-login/change-password/sessions/me); `HealthController` at `/api/health/ping` (DB connectivity, disk %, PHP version, cron_health).
- **Frontend foundation** — access token in Zustand memory only (never `localStorage`); refresh token in HttpOnly cookie; 401 silent-retry interceptor; `ProtectedRoute`/`RoleGuard`/`ModuleGuard` route guards; `usePermission` hook.

### Key architectural decisions & why

| Decision | Why (as reasoned in Phase 1 docs) |
|---|---|
| XSalsa20-Poly1305 (`sodium_crypto_secretbox`), not AES-256-GCM | AES-256-GCM via `sodium_crypto_aead_aes256gcm_*` requires AES-NI CPU instructions, not guaranteed on Bluehost's virtualized shared hosting — would throw `SodiumException` at runtime on every login/registration if absent. XSalsa20-Poly1305 has no hardware dependency. Version-byte prefix added so a future algorithm migration doesn't corrupt historical ciphertext. This is the origin of the rule now in CLAUDE.md's gotchas table. |
| Monotonic ULIDs over UUID v4 | Lexicographically sortable → chronological DB ordering without a secondary timestamp index; matters most for high-concurrency append-only tables like `activity_logs`. |
| `jti` per-token revocation added to JWT | The original spec (before audit) had **no `jti` claim at all** — an admin-suspended user's 24-hour access token would keep working until natural expiry. Audit finding F-08 forced adding `jti` + `user_sessions.jti_hash`, checked on every authenticated request, cutting effective revocation time to under one request cycle. |
| `root_agent_id` index over recursive CTE for agent-subtree checks | O(1) lookup vs. a potentially unbounded recursive query; also kept the (then-relevant) MySQL 5.7 compatibility door open. |
| `INSERT ... ON DUPLICATE KEY UPDATE` for rate limiting | The original design did SELECT→check→UPDATE/INSERT as three separate queries — concurrent requests could both pass the SELECT before either UPDATE landed, bypassing the limit by N concurrent threads (TOCTOU race). Atomic upsert on a UNIQUE `(identifier, action)` key closes it structurally. |
| `report_snapshots.dimension_id` uses sentinel `'_global'`, never `NULL` | MySQL UNIQUE indexes allow multiple NULL values in a nullable column, so two "global" snapshot rows for the same date/metric could silently coexist — the cron would insert duplicate global metrics with no error. This is the confirmed Phase 1 origin of the `dimension_id = '_global'` rule already listed in CLAUDE.md's architecture-decisions table. |
| Module+action RBAC replacing the old flat role-string check | The pre-existing `RoleMiddleware` only did portal-gating (`role in ['admin','agent']`) — not the granular `permissions.module + permissions.action` model the schema actually implements. `RBACMiddleware::enforce()` was written from scratch in the audit pass (super-admin bypass, then module.action lookup against JWT `perms[]`). |
| PII stored as BLOB + separate `_lookup_hash` column | Encrypted columns can't be searched with `WHERE`; SHA-256 of the lowercased plaintext gives an indexed, deterministic lookup path without ever decrypting for a query. |

### Notable bugs found & fixed

The foundation spec shipped with an embedded "Senior Architect Review" (dated 2026-06-23) that forensically audited the as-written spec before build and found a long list of gaps. The genuinely load-bearing ones:

| ID | Severity | Problem | Fix |
|---|---|---|---|
| A-01 | Critical | `EncryptionService` used `sodium_crypto_aead_aes256gcm_*`, which needs AES-NI hardware not guaranteed on Bluehost — would break every login/registration at runtime if absent. | Switched to `sodium_crypto_secretbox` (XSalsa20-Poly1305); added boot-time `assertSodiumAvailable()` check so a missing extension fails fast at startup, not mid-request. |
| A-02 | Critical | JWT payload only carried `sub` (raw integer `user_id`) and a flat `role` string. Any controller doing an ownership check against `$user['sub']` risked comparing an internal integer ID against a `public_id` from a URL — a horizontal-privilege-escalation shaped bug waiting to happen. | JWT extended to carry `pid` (public_id), `utype`, and `perms[]` explicitly; `sub` documented as server-internal-only, never for API-facing comparisons. |
| A-03 | Critical | Rate limiter did SELECT→check→UPDATE/INSERT as 3 queries — a TOCTOU race let concurrent requests burst past the limit. | Atomic `INSERT ... ON DUPLICATE KEY UPDATE` against a UNIQUE `(identifier, action)` key. |
| A-04 | High | `security_events.identifier` stored raw plaintext email/phone — PII sitting unencrypted in an audit-log table, exportable in backups. | Store `EncryptionService::hash()` (SHA-256) instead of plaintext. |
| A-05 | High | OTP brute-force counter was scoped to `identifier_hash + purpose` only — an attacker rotating IPs could create fresh OTP rows per attempt, each starting `attempts = 0`, defeating the cap. | Added `otp_verifications.ip_address` + a global IP-level lockout (max 10 OTP attempts/IP/60min) independent of the identifier-based counter. |
| A-06 | High | `is_public` on `files` was DB-only — no structural separation between public/private storage, so a routing bug could serve a private file publicly (or vice versa). | Enforced path-level separation: public → `uploads/public/`, private → `storage/private/` (protected by `.htaccess Deny from all`, itself missing from the original scaffold — see F-03). |
| A-07 | High | `AuthMiddleware` accepted tokens from both the `Authorization` header and a cookie; the cookie path had no CSRF protection, and the existing `CsrfMiddleware.php` was a 280-byte stub never wired into routing. | Standardized on Bearer-header auth (CSRF-safe by construction) with the CSRF middleware rewritten as a fallback for the cookie path. |
| B-01 / C-01 | Critical (moot post-pivot) | `user_preferences.preferences JSON NOT NULL DEFAULT ('{}')` uses a functional `DEFAULT(...)` expression — MySQL 8.0+ only, would hard-fail migration on 5.7. | Spec'd to drop the DB default and set it in PHP on insert. Rendered moot once the project pivoted to MySQL 8.4 LTS (see contradiction note below) but is a good example of the audit's rigor. |
| B-02 | High | `report_snapshots` UNIQUE key included nullable `dimension_id`; MySQL allows multiple NULLs in a UNIQUE index, so "global" snapshot rows weren't actually deduplicated — the daily cron could silently insert duplicates. | `dimension_id` changed to `NOT NULL DEFAULT '_global'`. (Now a permanent documented convention — see architectural-decisions table above.) |
| D-01 | Critical | RBAC enforcement didn't exist as designed — only a flat portal-gate role check. Anyone past login could hit any admin action regardless of assigned permissions. | Full `RBACMiddleware::enforce($user, $module, $action)` implementation written: super-admin bypass, then `module.action` lookup against JWT `perms[]`. |
| D-02 | High | Spec mentioned an "agent tree check" for RBAC but never specified it — without it, a tier-2/3 sub-agent could enumerate any student ID and access records outside their franchise tree. | Added `assertAgentSubtreeAccess()`: compares `root_agent_id` of requester vs. target agent, O(1), no recursive CTE. |
| D-03 | High | An admin with `role_id = NULL` and not super-admin could log in successfully but would then get a silent 403 on every single action — confusing, looked like a bug rather than "no role assigned." | Login now returns an explicit `NO_ROLE_ASSIGNED` error instead of letting the admin in blind. |
| E-01 | High | Naive `reference_number` generation (`MAX(id)+1`-style) races under concurrent application creation — two admins submitting simultaneously could generate duplicate `TGA-YYYY-NNNNNN` numbers, caught only by the UNIQUE constraint (as a user-facing 500). | Dedicated `sequences` table with atomic `LAST_INSERT_ID(next_val + 1)` increment. |
| E-02 | High | `api_request_logs` was designed to write one row per API request — projected to 36M+ rows/year, a shared-hosting performance bottleneck with no partitioning available. | Only DB-log requests that are slow (over `api_log_slow_threshold_ms`) or errors (`status_code >= 400`); everything else goes to a flat JSONL log file instead. |
| F-01 | Critical | `archive-old-logs.php` cron was speced to move rows into `activity_logs_archive`, but that table didn't exist in any of the 35 original migrations — the cron would fail on first run. | Added migration 036 (`CREATE TABLE activity_logs_archive LIKE activity_logs`). |
| F-02 | Critical | `FileUploadService::upload()` wrote the file to disk but never inserted into the `files` table — if the calling controller failed before its own `files` INSERT, the result was an orphaned file on disk with zero DB record and no reconciliation path. | Moved the `files` INSERT (with SHA-256 checksum computed at write time) into `FileUploadService` itself. |
| GAP-1–6 (release notes) | Mixed | Session-limit enforcement missing; `PASSWORD_DEFAULT` used instead of Argon2id; `listSessions()`/`revokeSession()`/`verifyOtp()` unimplemented stubs; OTP failures not logged to `security_events`; no frontend `usePermission` hook; no health endpoint. | All six closed in the same audit pass: oldest-session auto-revoke on limit, `PASSWORD_ARGON2ID` everywhere, endpoints wired, OTP failures logged with source IP, `usePermission.ts` created, `HealthController` deployed. |
| Forensic audit (Jun 24, append doc §15) | High | `ActivityLogger`, `NotificationService`, and `SecurityEventLogger` were built against **hallucinated column names** (`metadata`, `entity_id`) that don't exist in the real schema, rather than the actual `target_type`/`target_id`/`before_value`/`after_value` columns. Would have silently failed or fatally errored on first real use. | Re-mapped all three services to the live MySQL 8.4 schema. Note for future sessions: this exact bug class (wrong `ActivityLogger` column names) recurs and gets fixed *again* in Phase 6 per CLAUDE.md's Hotfix History table — it evidently regressed between phases rather than staying fixed. |

### Anything that contradicts or supersedes current docs

- **`PHASE_1_FOUNDATION.md`'s context header states the frontend is "deployed on Vercel"** and that the backend has "SSH available." Both are wrong for the system as it actually shipped: CLAUDE.md (corrected 2026-07-08) confirms frontend and backend are both served from the same Bluehost account under `apply.theglobalavenues.com`, and SSH/Terminal is explicitly *not* available on the hosting (only cPanel's Cron Jobs GUI). This doc is the likely origin of the Vercel-split misconception that a later session had to correct — useful to know when reading Phase 1 docs literally.
- **Extensive MySQL 5.7-compatibility engineering throughout `PHASE_1_FOUNDATION.md` is largely moot.** The spec and its audit were written against MySQL 5.7 (banning `JSON_TABLE()`, generated columns, functional `DEFAULT(...)` expressions, worrying about the old single-auto-timestamp-column limit, etc.), but a **mid-Phase-1 pivot** upgraded the project stack from MySQL 5.7 to MySQL 8.4 LTS. Post-pivot, several 5.7 workarounds were explicitly reversed. Current CLAUDE.md correctly documents MySQL 8.4 LTS with CTEs/window functions/`JSON_TABLE()` all available — anyone reading raw Phase 1 rationale for schema decisions should discount its 5.7-specific caveats as historical, not current constraints.
- Confirms (doesn't contradict) a known open item: the schema's inline SQL comments literally say `COMMENT 'AES-256-GCM encrypted'` on every PII column, even though the actual implementation was corrected to XSalsa20-Poly1305 during the same phase's audit (A-01). This is the direct origin of CLAUDE.md's open item about stale AES-256-GCM comments in `001_create_users_table.sql`.

---

## Phase 2 — Registration & Auth

**Released**: 2026-06-24 (initial). This area also accumulated cross-cutting auth/registration fixes through 2026-07-14 — Phase 2 became the permanent home for all registration/login/OTP history even when the actual work landed during later phases.

### What shipped

**Student registration** — 3 entry points (self / agent / admin), 1 endpoint. `registered_by_type`/`registered_by_id` set server-side from JWT (client can't spoof). OTP always goes to the real student's email regardless of who fills the form. Referral-code validation endpoint exposes only `full_name` + `agency_name` to unregistered users. Two-step flow: `initiate` (stores encrypted pending data, sends OTP) → `verify-otp` (creates `users` + `students` + `user_preferences` in one atomic transaction, issues JWT immediately).

**Agent onboarding** — 6-step wizard (agency info → contact → business registration → password → T&C → OTP). `agents.terms_accepted_at` recorded. Agent created `status = pending`, no JWT until admin approval. Level-1 agents self-reference `root_agent_id`. Login for non-approved agents returns a structured status payload instead of a JWT.

**Admin agent-approval workflow** — pending list, approve (generates `TGA-XXX999` referral code, activates user, notifies), reject (requires reason), suspend (cascades `users.status`, instantly revokes all active JWT sessions via `user_sessions.revoked_at`).

**Sub-agent creation** — approved agents invite sub-agents; hard 3-level tier cap (`tier >= 3` → 403); inherits `tier+1`, `parent_agent_id`, and the creator's `root_agent_id`; same pending→approval flow as Level 1.

**Forgot password** (all 3 user types, OTP-based, no magic links) — request (generic response regardless of whether the email exists) → verify-otp (returns a 15-min signed reset token) → reset (validates token, updates password, revokes all sessions, no auto-login).

**OTP login** (passwordless, all user types) — request/verify pair, same post-login status checks as password login.

**Password change** (authenticated) — requires current password, revokes all *other* sessions, keeps the current one alive.

**Admin user management** — super-admin-only CRUD for sub-admins and roles; hard guards prevent self-modification and modification of other super admins; `is_super_admin` stripped from any input.

**New services**: `PasswordValidator` (single source of truth for password strength), `PendingRegistrationService` (encrypted DB-backed pending-registration store with atomic `consume()`), `OTPResult` (PHP 8.1 backed enum replacing boolean `OTPService::verify()`).

**8 notification templates seeded**: `student.registered`, `agent.onboarding_submitted`, `agent.approved`, `agent.rejected`, `agent.suspended`, `subagent.created`, `admin.created`, `password.reset_otp`.

**Migrations 038–044**: `pending_registrations` table, agents schema fix (`referral_code` nullable, `suspension_reason` added), `users.two_factor_enabled`, notification template seeds, Argon2id system_settings, `cleanup_rate_limits` cron_health entry.

**Deferred at release** (per release notes' "Known Limitations"): full wizard UI (shipped Phase 3), Gmail SMTP kept at startup scale, admin user-management UI, full TOTP/OTP 2FA (in practice, OTP-based 2FA login-gating shipped 3 days later — see below), `rate_limits` cleanup cron execution (Phase 6).

### Key architectural decisions & why

| Decision | Why |
|---|---|
| **`pending_registrations` DB table, not PHP sessions or signed JWTs** | PHP's default file sessions land in Bluehost's shared `/tmp` — readable cross-tenant on shared hosting. A signed JWT is still client-visible; signing ≠ encryption, and fields like passport number/phone would sit in the payload. The table stores `EncryptionService`-encrypted JSON, keyed by an opaque client-held token (server stores only its SHA-256), with a 15-min TTL and an indexed `expires_at`. Client never sees the raw email hash or decryption key. |
| **`pending_registrations.consume()` is atomic (retrieve+delete under lock)** | Prevents two concurrent OTP-verify requests from both reading the pending row before either deletes it — closes a duplicate-user-creation race. |
| **`OTPService::verify()` returns a PHP 8.1 backed enum, not bool** | Collapsing `Invalid`/`Expired`/`BruteForced`/`NotFound` into one `false` meant controllers (and therefore the frontend) couldn't distinguish "wrong code" from "you're locked out" from "code expired." The enum also sharpened security-event logging precision. Required updating every existing caller in the same pass. |
| **Separate `JWT_RESET_SECRET`, distinct from access/refresh secrets** | Stops a reset token from being accepted by an endpoint expecting an access token if a key were ever reused. Reinforced by a `'typ' => 'password-reset'` claim as a second guard layer. |
| **Reset token carries a `pwd_h` fragment (12 chars of the current password hash)** | Auto-invalidates the token if the user changes their password via a different path before redeeming the reset link. Token single-use enforced by storing its `jti` in `otp_verifications` (`purpose = 'reset_jti'`) and marking `used_at` atomically inside the same transaction as the password update. |
| **Argon2id explicit cost params, never PHP defaults** | PHP's defaults (64 MiB / 4 iterations) are too heavy for Bluehost's shared CPU — measured 2–5s login delays. Settled on OWASP-minimum `memory_cost=19456` (19 MiB), `time_cost=2`, `threads=1`, targeting 100–300ms/hash, tunable at runtime via `system_settings` (no redeploy needed). |
| **Constant-time login via `DUMMY_ARGON2_HASH`** | `password_verify()` was being skipped entirely when the user wasn't found, creating a measurable timing gap (email enumeration vector). Fix: always call `password_verify()`, against a precomputed dummy hash when no user exists, so response time is identical either way. |
| **Dual-key rate limiting (IP + email-hash) on login/forgot-password** | Single-IP limiting is defeated by IP rotation/proxy botnets; single-email limiting alone unfairly locks out shared-NAT legitimate users. Enforcing both closes the gap. IP resolution trusts `CF-Connecting-IP` only when actually behind Cloudflare — never raw `X-Forwarded-For`. |
| **Admin 2FA: stateless pre-auth token instead of resubmitting the password** | The original 2FA design required the frontend to hold the plaintext password in memory between the login step and the OTP step, then resubmit it — a real credential-exposure window. Replaced with a short-lived `pre_auth_token` (distinct `typ` claim, expiry tied to `otp_expiry_minutes`) that proves password verification succeeded without granting any operational access — `AuthMiddleware` explicitly rejects pre-auth tokens on protected routes, and they never write to `user_sessions`. |
| **Single `useForm` + `FormProvider` for multi-step wizards** | Per-step `useForm` instances unregister fields on unmount, silently losing prior-step data — a known RHF footgun. Step validation uses `form.trigger([...fields])` on Next, never full-schema validation. |
| **`registered_by_type`/`registered_by_id` set server-side only** | Prevents a client from spoofing who registered a student (relevant for agent commission attribution) — always derived from the calling JWT, never trusted from the request body. |

### Notable bugs found & fixed

**Phase 1 bugs found during Phase 2's pre-implementation audit** (fixed before any Phase 2 code was written):

| Bug | Severity | Problem | Fix |
|---|---|---|---|
| `login()` queried plaintext `email` against encrypted BLOB column | CRITICAL | Login was completely broken — could never match a row | Query `email_lookup_hash = EncryptionService::hash($email)` |
| `login()` checked `$user['utype']` | HIGH | DB column is `user_type`; admin permissions never loaded | Fixed key name |
| `refresh()` read token from JSON body | CRITICAL | Destroyed the HttpOnly-cookie security model | Read `$_COOKIE['refresh_token']` |
| `resetPassword()` didn't check user existence | HIGH | Wasted OTP slots, no security logging | Replaced by full 3-step forgot-password flow |
| `agents.referral_code NOT NULL UNIQUE` with `''` default | CRITICAL | Second pending-agent registration threw a MySQL unique-constraint violation — broke all agent onboarding after the first agent | Column made nullable; existing `''` rows migrated to `NULL`; UNIQUE retained (MySQL treats NULLs as distinct) |
| `RouteRegistry` only matched static 2-segment paths | CRITICAL | `/admin/agents/:publicId/approve`-style routes were physically unroutable | Extended to support `:param` segments |
| `users.two_factor_enabled` missing from schema | MEDIUM | PHP notice on every login | Migration 040 added the column |

**Post-implementation independent forensic audit (2026-06-24)** — found after the Phase 2 build was "complete," before Phase 3 sign-off:

- **`JWT_RESET_SECRET` and `ENCRYPTION_KEY` both missing from `.env`** (CRITICAL x2). `ENCRYPTION_KEY` missing meant *every* request touching email/phone/passport would fatally crash — the system was literally un-runnable. Both keys generated and added.
- **`fetchCurrentUser()` called `action=get_me`** but the route was registered as `action=me` — every session-restore call 404'd. Fixed.
- **Role-management routes entirely missing from `AdminRoutes.php`** — built `RoleController` + routes from scratch, with a referential-integrity guard (can't delete a role with admins assigned).
- **Student registration wrongly required `phone`** — spec says optional. Fixed the required-fields guard and made hash/encrypt conditional.
- **`ActivityLogger`/`NotificationService` hooks missing from student/agent registration and password-reset-confirm** — added.
- **Rate-limit violations weren't logged to `security_events`** — 429s returned silently with zero audit trail. Added logging.
- **`ActivityLogger`, `NotificationService`, `SecurityEventLogger` built against hallucinated column names** — rewritten to match the actual `activity_logs` table.

**2026-06-28 — the entire frontend auth layer was non-functional at runtime, despite passing `npm run build`** (8 bugs, "Antigravity" audit). This is the single most important finding in this file: TypeScript's structural typing plus esbuild stripping type annotations meant a completely broken auth module compiled cleanly.
- `applyAuthSession()` — called by 4 exported functions (student/agent OTP verify, session refresh, 2FA verify) — **was never defined anywhere**. Every call site threw `ReferenceError` at runtime.
- `loginWithPassword()` returned `Promise<void>` — the module-level access token was set as a side effect but never returned. `LoginPage.tsx` read `result.requires2fa`/`result.accountStatus`/`result.user` off `undefined`. 2FA never triggered, agent pending/rejected redirect never fired, normal successful logins never completed the session.
- `verifyOtpLogin()` returned an object missing `accessToken` — every OTP login left the in-memory token `undefined`, so the very next authenticated request 401'd.
- Two exported types (`AuthSessionResult`, `AuthLoginResult`) were referenced and imported across files but never defined/exported.
- Net effect before the fix: **password login, OTP login, 2FA, and session-restore-on-reload were all broken simultaneously** in the built app, while `npm run build` reported success throughout. Fixed and build-reverified.

**2026-06-29 — new agents were permanently locked out of login, and had no path to submit onboarding documents** (2 backend bugs + 1 frontend bug, found together):
- `RegistrationController` inserted new agents with `users.status = 'pending'`; `AuthController::login()` hard-blocks any non-`'active'` `users.status` with a 403. Every newly-registered agent was permanently unable to log in at all. **Root architectural clarification recorded here**: `users.status` is the account-lock flag; `agents.status` is the separate approval flag — the two must never be conflated. Fixed by always inserting `users.status = 'active'` for new agents.
- Three separate login methods each independently short-circuited with no JWT when `agents.status === 'pending'`. Removed the early-return; pending agents now get a normal JWT with `account_status: 'pending'` surfaced in the user object.
- `loginWithPassword()` in `api.ts` assumed every response had a nested `data` key — every *normal* (non-pending) login crashed. Fixed with a shape-tolerant fallback (`raw.data ?? raw`).

**2026-07-01 — password login ignored `user_type`, returning the wrong account for multi-portal emails.** The schema deliberately allows one email across multiple `users` rows (unique key is `email_hash + user_type`). OTP login already scoped by `user_type`; password login's `SELECT ... WHERE email_lookup_hash = ? LIMIT 1` did not — verified live: a student login attempt actually authenticated the same person's *agent* account. Fixed by adding an optional `role` param, filtering by `user_type` when present.

**2026-07-01 — registration originally captured only email, deferring name/phone to "post-login profile flow."** Product requirement changed this: full name and mobile now required at Step 1, captured into the encrypted pending-registration payload. First/last name and mobile become locked/read-only in the pre-approval agent onboarding form afterward.

**2026-07-08 — admin creation 500'd on every attempt.** `RegistrationController::registerAdmin()`'s `INSERT INTO users` included `registered_by_type`/`registered_by_id`, columns that only exist on `students` — copy-paste error. Removed (redundant with `admins.created_by` anyway).

**2026-07-13 — no automatic token refresh; all 3 portals went blank ~15 minutes after login.** Zero 401 handling in `request()`; `refreshAuthSession()` only invoked once at page load; `setUnauthorizedHandler()` was a no-op stub. `JWT_ACCESS_EXPIRY=900` (15 min) matched the symptom exactly. Fixed with proactive refresh at ~75% of token lifetime, reactive refresh-and-retry-once on session-specific 401s, and a real forced-logout + toast on unrecoverable failure.

**2026-07-14 — full deployment-readiness audit, all registration/login flows live-tested end to end** across all 3 portals. One real bug found: the "Create Account" link on the login page was hardcoded to the student flow regardless of which portal tab was selected; fixed by threading a `role` URL param through to `ApplyPage`.

### Anything that contradicts or supersedes current docs

- **Password minimum length drifted from the original spec.** The original Zod schema specified 10 characters minimum; a later fix raised what was found to be a 6-character minimum in one place to 8 characters "industry standard," with no reconciliation against the original 10-char spec. Verify the actual current minimum directly in `PasswordValidator.php` before relying on any historical number.
- **A passing build and a self-reported "100/100" audit score did not mean the auth flows actually worked end to end** — the 2026-06-28 audit found the entire frontend auth layer broken at runtime four days after a 96/100 self-audit. Only live runtime testing caught it — a standing lesson for this codebase, not a doc to fix.
- **2FA shipped earlier than "deferred to Phase 5."** The pre-auth-token 2FA design actually shipped 2026-06-27, three days after the Phase 2 release note listed it as deferred.

---

## Phase 3 — Frontend Shell & Portal Structure

**Released**: 2026-06-25 (initial shell) · remediation entries through 2026-07-14
**Scope**: Design system, shared component library, dashboard shell, all three portal skeletons, permission-driven UI, accessibility hardening. No new API endpoints — Phase 3 built the structure Phase 4+ would wire data into.

### What shipped

- **Design system**: Brand tokens (`navy #1E2A4A`, `orange #FD7E14`, accessible orange `#D96200`, amber, warm surface/card/border, card shadow/radius) registered via Tailwind v4's `@theme inline {}` block in `theme.css` — not `tailwind.config.js`. Typography: Plus Jakarta Sans (headings) + Inter (body).
- **21-component shared UI library** (`src/shared/components/ui/`): Button, Card, Badge/StatusBadge, Avatar (deterministic name-hash color), SearchInput (300ms debounce), StatCard, StatusTimeline, Toast (sonner wrapper), SkeletonLoader, DataTable (desktop table ↔ mobile stacked-card transform), EmptyState, InlineActions (Radix DropdownMenu, permission-hidden actions), PreviewDrawer (480px), SlideOverPanel (560px), Modal (confirmations only), FileUpload, ForbiddenPage/NotFoundPage/ErrorBoundaryFallback, DashboardSkeleton, CommandPalette (cmdk, Ctrl+K/Cmd+K), NotificationCenter (Radix Popover, tabbed).
- **Dashboard layout shell**: `DashboardLayout` (sidebar + topbar + scrollable main wrapped in ErrorBoundary + Suspense), `Sidebar` (permission-filtered nav, mobile drawer via `useSidebarStore`), `TopBar` (command palette trigger, notification bell, user menu), `AuthGuard`/`RoleGuard`/`PortalWrapper` layered access control.
- **29 portal pages** built as skeletons (real data deferred to Phase 4/5/8): Student (6), Agent (7), Admin (16).
- **Routing**: React Router v7 nested routes, `React.lazy` per portal, marketing routes left untouched (git-diff-verified zero cross-contamination).
- **Accessibility (WCAG 2.1 AA)**: `#D96200` accessible-orange hits 4.88:1 contrast (replacing `#FD7E14`'s 3.1:1, which fails); skip-link; `aria-label="Main navigation"`; command-palette result-count announcer; Radix-provided focus trap + Esc on all overlays; DataTable → stacked cards on mobile.
- Initial build passed a full internal audit at 100/100 across all major checks — but this was a self-audit against the spec, not a live-backend integration test (see remediation bugs below).

### Key architectural decisions & why

| Decision | Why |
|---|---|
| Tailwind v4 tokens via `@theme inline {}` in `theme.css`, no `tailwind.config.js` | v4's native Vite-plugin approach — v3-style config files aren't used by v4 |
| Radix UI for every overlay | Avoids hand-rolling focus traps, body-scroll-lock, and ARIA bindings |
| Zustand `useSidebarStore` for mobile drawer state | Lets any component toggle the drawer without prop drilling |
| Custom class-component `ErrorBoundary`, no third-party lib | React error boundaries can't be hooks-based; a small custom implementation was sufficient |
| Mobile sidebar: fully hidden drawer below 1024px, not a 64px icon rail | Icon-only rail wastes mobile real estate; substituted during build as a UX improvement over the original spec |
| `PreviewDrawer` (480px, row-click summary) kept separate from `SlideOverPanel` (560px, forms) | Different intents — quick peek vs. full form |
| Permission-hidden (not disabled) buttons/nav via `usePermission()` | Avoids leaking "you can't do X" hints without the permission |
| DataTable transforms into stacked cards on narrow viewports | Standard HTML tables break down on mobile |

### Notable bugs found & fixed

The initial shell scored 100/100 against its own spec-only audit, but once real backend wiring started, a 2026-06-28 remediation pass found the shell was still running on prototype/mock foundations in several places:

**Auth was not actually backend-gated (critical).** `useAuth` defaulted every session to a super-admin user with a `dummy_token`, persisted auth state in `localStorage`, and exposed a production role-switcher dropdown in `TopBar`. It was also a separate store from the login page's legacy `useStore` auth path. **Fix**: `useAuth` rebuilt to start in a `loading` state, restore sessions only via the backend refresh-cookie endpoint, accept only backend-issued users/tokens; login writes into the same store the guards read; role switcher deleted from production `TopBar`; access tokens stayed memory-only, refresh stayed an HttpOnly cookie. This is the load-bearing fix underneath all of Phase 3's guard components.

**Notification center was a polished fake.** The authenticated shell mounted an older `NotificationCenter` with hard-coded mock data, even though a real API-backed hook layer already existed but was never wired into `TopBar`. Two backend mismatches found along the way: frontend requested `limit` but the paginator only read `per_page`; bulk mark-read updated *all* notification rows for a user, not just in-app ones. Both fixed.

**Admin sidebar permission keys didn't match the backend contract.** Nav gating used stale keys (`users.view`, `roles.view`, `settings.view`, `logs.view`, `security.view`). Fixed to `user_management.view`, `system_settings.view`, `activity_logs.view`, `security_events.view`.

**Shared API client silently broke two integration paths.** `src/lib/api.ts` treated flat legacy `{ data, meta }` response payloads as failures (no `success: true`), blocking several already-built endpoints. `api.post()`/`api.put()` always `JSON.stringify`'d the body, corrupting every `FormData` (file upload) request. Fixed: flat `{ data, meta }` normalized as success; `FormData` passed through unchanged.

**Session establishment had two divergent code paths.** `LoginPage` independently hydrated a legacy Zustand cache after `useAuth` accepted a session; `ApplyPage` wrote directly into the legacy auth store; the cache bridge assumed field names the backend didn't return. Fixed by consolidating all session establishment through a single `useAuth.establishSession()`.

**Pending agents got trapped or 403'd.** Added `agentStatus` to the `User` type, a guard to skip the agent-profile fetch for pending agents, and a `RoleGuard` redirect sending pending agents to `/portal/agent/onboarding`. Public unauthenticated pending/rejected agent status pages also added.

**`FileUpload.tsx` double-fired uploads in dev (2026-07-10, full live-QA audit).** `simulateUpload()` fired `onFileSelect?.(selectedFile)` from *inside* the `setUploadProgress` functional updater — React 18 StrictMode double-invokes updater functions, so every upload fired its network call twice in development. Fixed by keeping the updater pure and moving side effects into a `useEffect` reacting to committed state. Verified live: exactly one POST fired per upload after the fix, with a negative-control re-test confirming the bug was real and the fix genuine.

**Post-approval document resubmission had no guard (2026-07-14, full deployment-readiness audit — technically a backend controller bug, logged here since it's the document-vault area).** Neither `studentSubmit()` nor `agentSubmit()` checked `document_requests.status` before accepting a new file, so a student/agent could silently swap the file behind an *already-approved* document request with nothing prompting re-review. Fixed: both endpoints now reject with `409 ALREADY_APPROVED` if status is `approved`; resubmission while merely `submitted` (pending review) remains allowed.

### Anything that contradicts or supersedes current docs

- CLAUDE.md's Document Request Status state machine describes rejection as `submitted → requested` (looping back), but the actual implementation loops back to a distinct `rejected` status instead — functionally equivalent, just a different state name than documented.
- The original spec called for a 64px icon-only mobile sidebar; the shipped implementation uses a fully hidden drawer + hamburger instead — a documented in-flight UX improvement, not a bug.

---

## Phase 4 — Academic Core (Universities, Courses, Applications, Documents)

**Original build**: 2026-06-24 to 2026-06-25. This functional area (Universities → Courses → Intakes → Applications → Timeline → Documents → Payments → File Gatekeeper) kept evolving under the same history through 2026-07-14 — one continuous engineering record for one feature area.

### What shipped

**Catalog (Universities/Courses/Intakes)**:
- Admin CRUD for all three, RBAC-guarded
- University logo upload: JPG/PNG only (SVG/DOCX both rejected — see Security below), GD-generated 400px thumbnail
- Public unauthenticated browse endpoints with open-intake counts; course tuition shown as a min/max range computed from open intakes
- Intake lifecycle: forward-only `upcoming → open → closed`, clone-to-next-year
- Soft-delete cascade: deleting a university deactivates its courses and closes its intakes atomically

**Applications**:
- Atomic reference numbers (`TGA-2026-000001`) via the `sequences` table's `LAST_INSERT_ID(next_val+1)` trick — race-free without a separate SELECT
- Draft → submit lifecycle, 1-draft-per-student-per-intake guard, agent-assisted apply
- `agent_id_at_submission` snapshotted at submit time (commission attribution anchor)
- Student withdrawal endpoint; admin status transitions gated by the state machine

**Unified timeline**: single bidirectional thread (documents, links, notes, payment requests) via one CTE-joined query; agent visibility filtered by `is_visible_to_agent`; students can only post when an active document request exists.

**Document requests**: full `requested → submitted → approved` pipeline with a `rejected` loop-back and a `cancelled` terminal state; atomic file versioning on resubmission.

**Payments (status-only, no gateway)**: admin creates → student self-reports paid → admin confirms/disputes → dispute resolution endpoint. Not a payment processor — external links only.

**File gatekeeper**: JWT + ownership-matrix authenticated download, 8KB chunked `fread()`, SHA-256 integrity check on every download, full access audit trail.

**New services**: `SLAService` and `ReminderService`, introduced to decouple SLA/reminder plumbing out of the application/document controllers.

### Key architectural decisions & why

| Decision | Why |
|---|---|
| GD (not Imagick) for logo thumbnails | GD is enabled by default on Bluehost; Imagick needs manual cPanel activation |
| SVG rejected for university logos | SVG is XML and can embed `<script>`/event-handler XSS |
| DOCX rejected for all documents | `finfo` reports DOCX as ambiguous `application/zip`; PDF-only avoids ZIP-structure inspection as a security surface |
| Chunked 8KB `fread()` over `readfile()`/`X-Sendfile` | Bluehost has no `X-Sendfile`; `readfile()` risks `memory_limit` exhaustion on large PDFs |
| File gatekeeper (JWT + ownership check) over signed download tokens | Ownership check is <5ms; token complexity rejected as unjustified at this scale |
| `storage/private/` outside `public_html`, `.htaccess Require all denied` at every level | Direct-URL file exposure was a real gap in the original spec — closed before first deploy |
| `sequences` table single counter, year embedded only in the format string | Simpler than per-year counters; avoids cron-driven counter resets |
| Student can have multiple `submitted`+ applications to the same intake, but only 1 `draft` and never 2 `enrolled` | Real reapplication scenario vs. genuine duplicate prevention |
| Closing an intake does not cancel existing applications, only blocks new ones | In-flight students shouldn't be penalized by an intake closing under them |
| Payment dispute resolution and document `cancelled` status both added post-spec | Original spec had no way out of a dispute, or to retract an erroneous document request |

### Notable bugs found & fixed

**A systemic pattern bug that recurred across the whole academic-core surface: `deleted_at IS NULL` clauses against tables that were never given that column.** Worth recording as one item since it kept resurfacing independently, each time silently 500ing a whole feature until someone exercised it live:

| Table | Where it broke | When found/fixed |
|---|---|---|
| `admins` (no `deleted_at`) | 9 call sites across `AuthController`, `DocumentRequestController`, `FileController`, `LeadsController`, `PaymentTrackingController`, `RoleController` | 2026-07-01, live-testing pass |
| `intakes` (no `deleted_at`, hard-delete-only by design) | Public course search and every student "Apply" click (500) | 2026-07-01 |
| `document_requests` (no `deleted_at`) | Every single admin document approve/reject call 500'd | 2026-07-10, live QA audit |
| `intakes` again — `delete()` method itself missing | `IntakeController::delete()` called a `delete()` method that neither `IntakeModel` nor `BaseModel` had. **Every intake deletion has thrown a fatal 500 since whenever this shipped** | 2026-07-14, full deployment-readiness audit |

**Phase 4's own end-of-sprint audit (2026-06-25) scored the release 96–98% "production ready" — but the very next week's live testing found the admin catalog screens still rendering hard "Not implemented" errors, and Agent/Student application pages 403/404ing.** Found via live browser + curl testing, not code reading:
- `AgentController::listApplications()`/`getApplication()` called an admin-only RBAC method that unconditionally 403'd any non-admin — permanently broke the real Agent Applications page. `listStudents()` had the identical bug and was explicitly left unfixed as a flagged follow-up at the time.
- `ApplicationController::studentCreate()` always inserted `agent_id_at_submission` as `null` — silently breaking commission attribution for every application.
- `StudentController::getApplication()` selected a non-existent column (`f.file_size` instead of `files.file_size_bytes`).
- `fetchUniversities()` did `response.data.universities` against a response the generic client had already unwrapped to `response.data` — always `undefined`, silently rendering zero results everywhere. **This exact "double-unwrap" shape mismatch recurred independently at least three more times later** (Leads Kanban, System Settings page, global-search command palette) — a standing hazard in this codebase, not a one-off.

**Security fix found in passing**: `ApplicationController::createDraft()` (the admin/agent "apply on behalf of a student" endpoint) had **no ownership check at all** — any approved agent could create a draft application for any student system-wide, not just their own subtree. Closed via a new `AgentAccessService::assertCanAccessStudent()`.

**Student self-apply was 400ing on every intake, system-wide** (2026-07-10). The frontend matched intakes by `course_id + intake_month + intake_year`, but the 2026-07-03 real-catalog import left `intake_year`/`course_start_date` NULL on all 4,420 imported rows. Fixed by abandoning month/year matching entirely and looking the intake up by its own `public_id` instead. The upstream NULL data itself was left unbackfilled.

**Dashboard action-queue 403s for restricted admins** (2026-07-10). Document/payment/agent action-queue endpoints required page-specific permissions, but `CLIENT_SYSTEM_DOCUMENTATION.md` promises every admin can always see these queues (buttons disabled, not hidden). Because the dashboard fetches all three via `Promise.all`, one 403 failed all three panels for any restricted admin. Fixed by moving all three onto a plain "is an admin" check instead of per-page RBAC.

**Recorded SQL gotcha specific to this codebase's PDO config**: `Database::getConnection()` runs native (non-emulated) prepares, which reject a *repeated* named placeholder in one query. Two admin list endpoints built multi-column search reusing the same `:search` placeholder three times — invisible until 2026-07-04 because nothing had ever sent a live search term to either endpoint before then. Fixed by binding a distinct named placeholder per occurrence; swept the rest of `Controllers/` for the same anti-pattern (none found).

**University → campus data model was redesigned twice.** First pass added a `university_campuses` child table — wrong model, since campuses need independent management (own courses/fees/intakes/students). Superseded by `campus_group_id` (migration 078): each physical campus is its own full `universities` row, tagged with a shared ULID group id when it has siblings; `university_campuses` left in place only as a dormant audit trail.

**Real-catalog import (2026-07-03)** replaced all test data with ~200 universities / 2,606 courses / 4,419 intakes across 20 countries. Surfaced a genuine performance bug: admin catalog pages had been fanning out one HTTP request per university (and a third layer per course for Intakes) to compute counts — fine against ~16 test universities, but tripped rate limiting against the real catalog. Fixed by computing counts via subquery in the list query and adding real server-side pagination/filtering.

**Exclusive-catalog cleanup against the client's "Exclusive TGA Toolkit" source spreadsheet (2026-07-16).** Cross-referenced all 14 real `partnership_type='exclusive'` universities against the client's own Excel toolkit and found the import had left 6 junk duplicate rows behind: `IFH - Institut Français de l'Hôtellerie` (city NULL, country "Unknown", 0 courses), `CEFAM` (Lyon, 0 courses, sharing `campus_group_id` with the real row), `ICN Business School` (Nancy, 0 courses, sharing `campus_group_id` with the real row), `Neapolis University` ("Paphos" — an alt-spelling dup of the real "Pafos" row, 0 courses), and `EUAS` (a duplicate of "Estonia Entrepreneurship University of Applied Science" under its acronym, 0 courses). One duplicate wasn't an empty shell — `MJM Design - Creative Short Courses` (London) actually had 4 real courses + 12 intakes matching the toolkit exactly — flagged to the client explicitly before deleting since it looked legitimate; client confirmed deletion anyway. All 6 removed via the real `DELETE /?route=admin&action=universities/:pid` endpoint (not raw SQL), exercising the existing RBAC check, `UniversityModel::softDeleteWithCascade()`, and `ActivityLogger` exactly as the admin UI would. Verified live: DB shows `deleted_at` set on all 6 university rows, their courses cascaded to `status='inactive'` + `deleted_at` set, their intakes cascaded to `status='closed'`, zero applications existed against any of them, and the admin `GET /?route=admin&action=universities` read endpoint no longer returns any of the 6. Cross-checked every real course in the toolkit against the remaining 14 exclusive universities — all already present in the DB, nothing needed adding. Separately noticed (out of scope, not touched): a catalog-wide pattern of 127 exact-duplicate-course-name groups (136 extra rows) across ~25 *non-exclusive* universities, each an `active`/`inactive` pair — not currently user-visible since the public/agent/student browse endpoints already filter to `status='active'` (`CourseController.php:310`); left for a future dedicated pass per client decision.

**Same-day collision: the deletion above got silently reverted, then redone.** While independently verifying an unrelated filter-persistence change later the same session, a fresh DB check found all 6 rows back at `deleted_at IS NULL` (cascaded courses/intakes restored too), timestamped `2026-07-16 02:19:10` — after the original delete, and not caused by this session (no restore endpoint was called here). `tga_crm_reconciled` on port 3307 and the port-3000 dev server were confirmed shared with another concurrent Claude Code session during this window (real UI contention observed: stale element refs, hung screenshots), which is the most likely source of a reseed/restore touching the same table. Flagged to the client rather than silently redone; client confirmed re-deleting. Re-ran the identical `DELETE /?route=admin&action=universities/:pid` calls at `02:49:45`–`02:49:46` and re-verified `deleted_at` is set on all 6. **If these 6 reappear again, check what else is running against `tga_crm_reconciled` before assuming the delete failed** — the delete logic itself is confirmed correct twice now.

### Anything that contradicts or supersedes current docs

- **CLAUDE.md's migration table stops at 069**, but academic-core work in this area added at least migrations 070 (student custom fields), 074 (student readiness), 075–076 (application cap + notifications), 077–078 (campus tables), 079 (dead settings removal), and 080 (search prefix hashes) — none reflected in that table. `all_migrations_combined.sql` is confirmed stale past 059 for the same reason.
- **Phase 4's own 2026-06-25 sign-off audit is not a reliable completion signal on its own** — it scored the release 96–98% against what later turned out (same week) to be non-functional admin catalog screens and 403/404ing application pages. This pattern (self-reported "verified" without an actual live/curl test) recurred more than once across this feature area's history — treat any historical "verified" claim as unconfirmed until independently re-checked.
- `university_campuses` (the table) is dormant/superseded by the `campus_group_id` sibling-row model — not mentioned anywhere in current CLAUDE.md's schema table.

---

## Phase 5 — Agents, Hierarchy & Commissions

**Released**: 2026-06-25 (initial). Substantially extended in later sessions through 2026-07-14 (agent onboarding rebuild, admin reassignment UI, tier-scoping fixes) — this section covers both the original release and the load-bearing follow-on work.

### What shipped

**Agent hierarchy (backend)**
- 3-level agent tree (`root_agent_id` + `parent_agent_id` + `tier`), hard-capped at L3 (`SubAgentController::invite()` returns 403 `TIER_LIMIT_REACHED` at tier ≥ 3)
- `GET /agent/dashboard/summary` — student counts, conversion rate, own commission totals, sub-agent counts, tier-scoped
- `GET /agent/students` (+ `:pid` detail) — subtree-scoped roster with `applied_count` via single LEFT JOIN (no N+1)
- `GET /agent/team` (direct sub-agents) and `GET /agent/team/:pid/sub-agents` (fills L1→L3 visibility gap)
- `GET /admin/agents/:pid/tree` — recursive CTE tree with O(n) hash-map `buildTree()`

**Agent hierarchy (frontend)**
- Custom recursive `AgentTreeNode` component (0KB — no library), lazy L3 expansion via TanStack `enabled: isExpanded`
- `is_student_reassigned` badge on commission rows

**Commission ledger**
- Full CRUD: create, list (filtered), edit (pending-only), confirm, mark-paid, soft-delete
- Agent-chain validation on create; `created_by_user_id`/`paid_by_user_id` audit trail
- `commission_audit_log` (append-only) + PHP guard + MySQL trigger (migration 057) — dual-layer immutability once `paid`

**Reassignment pipeline**
- Student request with guards (lock status, duplicate pending, same-agent); admin queue, `SELECT ... FOR UPDATE` approval, admin override, `final_agent_id` audit column, denial notification, per-student history endpoint

**Admin dashboard** — separated from agent dashboard; action queue (pending agents, pending reassignments, docs awaiting review); reads `agent_stats` materialized table.

**Later additions**: full agent self-onboarding (draft-save/submit/3-document-upload), 5-tab admin Agents page (Registered/Drafts/Submitted/All/Hierarchy) with a document-review modal, full-parity `AgentStudentDetailPage`, admin reassignment-queue UI (backend had existed since June 25 with zero UI until 2026-07-04), and a shared `AgentCombobox` search-and-select component used in 4 places.

### Key architectural decisions & why

| Decision | Why |
|---|---|
| `root_agent_id` O(1) fast path for **all** auth checks and bulk queries; recursive CTE reserved **only** for the admin tree-rendering endpoint | O(1) index scan vs. recursion; tree depth is hard-capped at 3, so recursion depth is a non-issue |
| Tier-aware subtree scoping (`resolveTargetAgent()`) — L3 sees only own students, L2 sees own + direct children, L1 sees full root tree | Added after a production-readiness review found L3 agents could fetch sibling/parent data via `root_agent_id`-only checks (horizontal privilege escalation) |
| Commission immutability: PHP guard (primary) + MySQL `BEFORE UPDATE` trigger (secondary) | Defense in depth for financial data — live-verified even a raw SQL `UPDATE` as the root DB user against a paid commission is rejected |
| `CommissionModel::validateAgentChain` implemented as a recursive CTE, not the simpler root/direct-only check in the original spec | The spec's simpler check silently failed to validate L2 (intermediate) agents in an L1→L2→L3 chain — a real financial-correctness bug caught before ship |
| Simple status-ledger commissions (not double-entry) | Acceptable at startup scale; `commission_audit_log` provides the audit trail |
| `agent_stats` materialized table | Admin dashboard aggregate over 100,000+ students would be 500ms+ without denormalization |
| Custom recursive `AgentTreeNode`, no library | Tree is max 3 levels / ≤100 nodes typical; 0KB vs 12–180KB for a tree library |
| Commission visibility is strictly per-agent, never per-tree | Sub-agent commission breakdown always rendered separately from "my totals" |

### Notable bugs found & fixed

**Initial build — Production Readiness Review (2026-06-25/26), all fixed same session**

| Bug | Severity | Fix |
|---|---|---|
| Commission agent-chain validation ignored L2 intermediate agents entirely | High | Recursive CTE (see decisions table) |
| Admin agent approval had no row lock — two admins approving simultaneously could generate duplicate referral codes/emails | High | `SELECT ... FOR UPDATE` inside the transaction |
| Student double-clicking "submit reassignment" could create duplicate pending requests | Medium | `SELECT ... FOR UPDATE` on the student row |
| Commission confirm/paid/delete ran audit-log INSERT and status UPDATE as two unwrapped statements | Critical | Wrapped in transactions, added `FOR UPDATE` |
| Several agent-scoped list endpoints scoped by `root_agent_id` only — an L3 agent could fetch sibling/parent sub-agents' data | High | `resolveTargetAgent()` with tier-conditional SQL |

**Implementation-time bugs (caught before ship)**: PDO native prepares rejecting array-bound `LIMIT`/`OFFSET` (fixed with `PDO::PARAM_INT` named placeholders); self-registered students with no referral code 404ing on reassignment (`JOIN` → `LEFT JOIN`).

**Post-launch scoping/data-leak bugs (2026-06-28)**: `dashboardSummary()` scoped counts by `root_agent_id` for every tier — Tier 2/3 agents saw stats for the entire root tree, not their own subtree. Rewrote to tier-conditional scoping. `resolveAgent()` never checked `agents.status === 'approved'` — pending/suspended/rejected agents with a valid session could still pull dashboard data. Fixed.

**Feature-never-wired bugs (2026-06-29)**: `AgentProfilePage.tsx` was entirely hardcoded fake data despite working real endpoints existing — full rewrite. Sub-agent invite form sent the wrong field names and omitted required fields — every submission 400'd; **the feature had never worked**. Fixed.

**Agent onboarding rebuild (2026-07-01)** — the onboarding flow shipped 2026-06-29 was non-functional end-to-end. Representative bugs: upload never returned an expected field, causing every onboarding document upload to 500; the same method's INSERT never wrote `document_type`; `SubAgentController::invite()` inserted into columns that only exist on `students` — **sub-agent invite had never worked at all, at any point**; login special-cased rejected agents to skip issuing a session entirely, blocking the "edit & resubmit" flow; `AdminAgentController::reject()` set a status that silently blocks all future logins for that agent. All fixed.

**Profile endpoint mismatch (2026-07-01)**: frontend called an unregistered route — every profile load 404'd, silently swallowed by a try/catch, so agent agency data was never cached. Fixed.

**Agent Students permanently 403 (2026-07-01)**: three agent-facing endpoints called an admin-only RBAC method by mistake — every agent request to these three endpoints 403'd. Removed the erroneous RBAC calls (the subtree-ownership checks already inside each method are sufficient authorization on their own).

**Tier 2 agents got 500s on 5 endpoints (2026-07-10)**: a duplicate named PDO placeholder in the Tier 2 subtree-scoping condition. Fixed across all 5 call sites; independently re-verified live across all 3 tiers.

**Admin reassignment UI didn't exist (2026-07-04)**: the backend had been complete and correct since June 25 release, but no admin page anywhere called any of it — the only related UI was a fake success toast. Built the real page from scratch; on first use it surfaced a real pending request that had been sitting invisible in the queue since June 25.

**`user.tier` silently always `undefined` (2026-07-04)**: login/2FA/refresh responses never selected `tier`/`referral_code` from `agents` — the sidebar tier badge and referral-code block had never rendered for any agent. Fixed at the root.

**Agent-search matched the wrong field (2026-07-04)**: search matched an agent's internal ULID instead of `referral_code` (e.g. `TGA-DEL001`) — the field students are actually told to type. Fixed.

### Anything that contradicts or supersedes current docs

- **The original "agent PII boundary" design (agents must never see passport/DOB/phone) was explicitly and deliberately reversed on 2026-07-01** at the project owner's request — `AgentController::getStudent()` now returns full decrypted PII at admin-parity, and the frontend displays it. This is a confirmed product decision, not a regression, but current CLAUDE.md doesn't reflect it.
- The `CommissionModel::validateAgentChain` code embedded in the original Phase 5 spec (the simple root/direct-only check) does not match what actually shipped (recursive CTE) — the deviation is intentional and confirmed correct.
- Substantial agent-facing surface area (self-onboarding, the 5-tab admin Agents page, admin reassignment queue UI, full student-detail parity) was built weeks after the original release notes — anyone reading only those release notes would think Phase 5's agent portal was more complete on day one than it was.

---

## Phase 6 — Infrastructure (Notifications, Cron, Security)

**Released**: 2026-06-26. Most heavily re-audited phase in the project — 24 dated append sections spanning three weeks, including a full deployment-readiness pass as late as 2026-07-14.

Phase 6 built every background/infrastructure system: notification queue + email dispatch, activity logging, reminder engine, file upload hardening, Drive sync, DB backup, SLA monitoring, disk health, and log archival.

### What shipped

- **Notification engine** — `NotificationService::fire(eventKey, vars, userIds)`; DB-backed queue (`notifications` table), category-grouped; in-app + email channels
- **Email dispatch cron** (`cron/send-notifications.php`) — batched, PHPMailer/SMTP, retry-to-3-then-fail
- **In-app notification API + `NotificationCenter` frontend** — unread count, mark-read, mark-all-read, category tabs
- **ActivityLogger** — completed from Phase 2 scaffold; append-only writes to `activity_logs`
- **Reminder engine** (later removed 2026-07-10, see note) — `cron/process-reminders.php` + `ReminderEngine` mapping doc/payment/intake/commission entities to notification vars
- **FileUploadService hardening** — SHA-256 checksums, slugified filenames, version tracking on resubmission
- **Google Drive sync** (later removed 2026-07-10, see note) — resumable chunked uploads, folder-path mirroring
- **Database backup cron** (later removed 2026-07-10, see note) — daily mysqldump/PDO-fallback → gzip → Drive
- **Two-location permanent erase** (Drive-specific step later moot post-Drive-removal) — the `erasure_status` column and its retry/audit machinery are still live
- **SLA checker cron** (`check-sla-breaches.php`) — still live
- **Disk monitor cron** (`monitor-disk.php`) — still live
- **Log archive cron** (`archive-old-logs.php`) — file still exists but is intentionally unscheduled (see decisions)
- **Single master scheduler** (`cron/scheduler.php`) — one cPanel entry (every minute) replaces N individual entries, via `flock()` + `scheduler_state.json`
- **Dual-path email**: synchronous (`sendNow()`) for OTP/2FA/password-reset, queued for everything else

**Removed 2026-07-10**: Google Drive sync/backup and the reminder engine were deleted wholesale — `sync-drive.php`, `backup-db.php`, `verify-backups.php`, `process-reminders.php`, `DriveService`, `DriveFolderManager`, `BackupRetentionManager`, `ReminderEngine`/`ReminderService` and related files are gone. Live `cron/` now contains only `send-notifications.php`, `check-sla-breaches.php`, `generate-snapshots.php` (Phase 8), `monitor-disk.php`, and an unscheduled `archive-old-logs.php`. Notifications, activity logging, and SLA remained fully live throughout.

### Key architectural decisions & why

| Decision | Why |
|---|---|
| DB-backed notification queue over synchronous dispatch | Prevents PHP timeout on bulk notification bursts |
| Single master `scheduler.php` + `scheduler_state.json` | Simulates N different cron intervals from **one** cPanel entry — Bluehost's cron GUI is otherwise painful for many entries |
| Dual-path email (sync for OTP, queued for everything else) | The 1–2 min queue delay is unacceptable for time-critical verification codes |
| One `MailService` connection reused across a send loop (`SMTPKeepAlive`) | One connection per cron batch instead of one per email — the load-bearing reason `send-notifications.php` no longer times out under realistic backlogs |
| `archive-old-logs.php` deliberately unscheduled | `activity_logs` must never be deleted (product decision) — its only other job wasn't judged worth keeping a cron alive for alone |
| Dual-key rate limit (IP + email hash) inside `OTPService::generateAndSend()` itself, not just the route layer | Synchronous SMTP calls block a PHP-FPM worker for up to 10s; a burst of concurrent OTP requests could exhaust the worker pool. Checking first means a rejection produces zero DB side-effects |
| Reminder/SLA dedup via MySQL virtual generated column + UNIQUE index rather than app-level locking | Guarantees no duplicate pending reminder even under concurrent requests, enforced at the DB level |
| MariaDB-version-aware `SKIP LOCKED` stripping | Local dev often runs MariaDB < 10.6 (no `SKIP LOCKED` support); production MySQL 8.4 does |

### Notable bugs found & fixed

*(Skipping the 8 highest-impact items already in CLAUDE.md's Hotfix History table — `FOR UPDATE SKIP LOCKED` ordering, `Database::connect()`→`getConnection()`, `ActivityLogger` column names, `FileController` `storage_path`, `BackupRetentionManager` setting keys, OTP sync dispatch, orphaned `pending_registrations`, `PaymentTrackingController` reminder-type-key typo.)*

**`scheduler.php` never loaded its own `.env` (2026-07-08)** — `CronHealth::checkStuckJobs(15)` runs in-process inside `scheduler.php`, needing DB env vars loaded in that same process, but `scheduler.php` never loaded them. The stuck-job recovery safety net had silently done nothing since the day it was written. Found by running the scheduler locally end-to-end, not by code reading. Fixed by adding `Environment::load()` at the top.

**Notification coverage audit (2026-07-08)** — mapped every `fire()` call site against every seeded template and found real gaps, all fixed via a migration: agent registration sent no welcome email at all (only student did); no login notification existed for any role; new sub-agents were never notified of their own account creation; all 4 document-request lifecycle events had been firing since the feature shipped with **zero matching templates** — permanent silent no-op, same failure class as the known `application.status_changed` gap. Two live bugs were emailing literal unrendered `{{placeholder}}` text — both fixed.

**`send-notifications.php` SMTP timeout — two-stage bug**:
- *2026-07-10*: an uncatchable `set_time_limit(110)` fatal mid-batch left rows stuck in `processing` forever (the SELECT only looks at `queued`). Reproduced live (22 real rows stuck). Fixed with a stale-`processing` sweep at the top of the script.
- *2026-07-14*: root cause found — a brand-new SMTP connection was opened per notification inside the loop (~2.15s each against live Gmail). At 50/batch, worst case ≈107s, right at the 110s ceiling. Reproduced live against an 87-row real backlog (genuine fatal). Fixed by creating one `PHPMailer` with `SMTPKeepAlive=true` before the loop, plus an explicit 90s wall-clock budget check. Verified live: fixed script cleared the 87-row backlog in ~92s, zero fatals.

**`check-sla-breaches.php` partial-batch notification loss (2026-07-14)** — the script marked the *entire* batch `breach_notified=1` in one UPDATE before looping notifications per event; a mid-loop exception left later events permanently unnotified with no error pointing at the specific entity. Fixed with per-event try/catch isolation.

**Reminder duplicate race + SLA resolution lifecycle bug (2026-06-27)** — concurrent requests could create duplicate pending reminders; `SLAService::resolveEvent()`/`cancelEvent()` only matched `status='active'`, so breached-but-unresolved events could never get `resolved_at` populated. Fixed via a dedup UNIQUE index migration and widening the status match to `IN ('active','breached')`.

**Notification list endpoint silently returned health-check data (2026-06-29)** — a URL-formatting quirk made an empty-action request fall through to `HealthController::ping()` instead of the real notifications endpoint — the notification drawer appeared to load but silently showed the wrong payload. Fixed.

**`agentSubmit()` — two bugs meaning agents could never submit documents (2026-06-29)**: used an admin-only RBAC check that always 403'd non-admins; expected a JSON reference to an already-uploaded file with no agent-facing upload endpoint to produce one. Rewritten to match the working student pattern. Frontend UI for this flow still didn't exist as of the audit — backend-only fix at the time.

**Login OTP silently not delivering (2026-07-08)** — malformed mail-from address caused every send to throw, caught and swallowed; separately, dev-mode deliberately tolerates SMTP failure so OTP previews stay usable, meaning the row still wrote and the API still returned success — the exact "DB row created, no email, UI says sent" symptom. Fixed by correcting the mailbox credentials to a real dedicated account with an App Password.

**Smaller fixes worth a line**: a non-existent PHP constant reference threw a `TypeError` under `strict_types=1` on every "other" document-type upload; several `api.ts` exports missing broke the production Vite build entirely; a `useNotifications.ts` double-unwrap bug (bell badge/panel resolving `undefined` on every poll) fixed 2026-07-13 — the same root-cause pattern independently recurred elsewhere (see Phase 7).

### Anything that contradicts or supersedes current docs

- **CLAUDE.md's Cron Schedule table is the accurate one; the original Phase 6 spec/release-notes are stale.** They describe email dispatch every 2 min, Drive sync + reminders every 5 min, SLA checks every 30 min, and a 9-job cPanel list including scripts that no longer exist. The live scheduler now runs only 4 scheduled jobs, exactly matching CLAUDE.md's current table.

---

## Phase 7 — Admin Features (Global Search, Notices, RBAC)

**Shipped**: 2026-06-26 initial build. Hardened across five follow-up audit passes through 2026-07-14 (compliance audit, hierarchical activity-log redesign, page-level RBAC read/write levels, activity-log coverage audit, full deployment-readiness sweep).

### What shipped

**Leads pipeline** (agents never see leads — `leads.assigned_to` points at `admins.id`, not `agents.id`):
- Full CRUD + kanban (`new → contacted → qualified → converted | dropped`) via `@dnd-kit/core`
- Unauthenticated public lead-capture endpoint for marketing-site forms — CORS locked to the marketing domain, 5 req/hr/IP rate limit, UTM params parsed into a JSON `source_detail`
- Lead → student conversion — single DB transaction, no OTP step (admin already verified the person)
- PII encrypted same as `users` (was originally missing entirely on lead capture, added during hardening)
- UX guards added post-launch: terminal states hidden behind a "View Archive" toggle; staleness indicator for idle leads; duplicate-email/phone flagging

**Notices & Events**: draft → published → expired lifecycle, audience targeting, TipTap rich text (sanitized HTML), `expires_at` added specifically to stop stale notices accumulating forever; publish flow chunks notification inserts 1000-at-a-time to avoid memory exhaustion.

**Internal Notes** (students + applications): per-note visibility flags, author-scoped soft delete; `is_pinned` added post-launch; agent visibility is subtree-scoped (`root_agent_id`), not exact match (see Hotfix History table for the original bug this fix refers to).

**System Settings**: super-admin-only CRUD with hard-bounds server-side type validation, specifically to stop a fat-fingered value (e.g. `otp_expiry_minutes=0`) from breaking auth in production.

**Global Search**: single endpoint, MySQL FULLTEXT `MATCH...AGAINST` BOOLEAN MODE with prefix matching, 3-char minimum, 20 req/min rate limit. Role-scoped: agents get only their subtree; students cannot search other students at all.

**Activity Feed / Dashboard**: role-scoped recent-activity widget with human-readable labels; admin overview with action-queue counts (pending agents, docs awaiting review, reassignment requests, SLA breaches, pending payments).

**Maintenance mode**: filesystem `.maintenance` flag (deliberately not DB-based — works even when MySQL itself is down); super-admin JWT bypasses it.

**Post-launch RBAC architecture** (this is most of what "RBAC" in this section's title refers to):
- **Page-level read/write access** (2026-07-02): restructured from a flat permission-string list to `{view: [...], write: [...]}` buckets — super admins can now grant read-only visibility without full CRUD. No new schema — derived from existing `role_permissions` rows.
- **Hierarchical activity log split** (2026-07-02): regular admins auto-see only their own actions; a new permission gates a separate "Super Activity Log" page for system-wide visibility; agents get a tier-aware subtree via a new reusable helper that replaced two previously-diverged copies of the same logic.
- **`ActivityLabelFormatter`** (2026-07-03): converts raw log rows into plain-English sentences with inline before/after diffs, covering ~55 action keys — used by both the widget and the full log pages so wording never drifts between them.

### Key architectural decisions & why

| Decision | Why |
|---|---|
| FULLTEXT `UNION ALL` over `LIKE '%q%'` | 10–100x faster at scale; single DB round-trip instead of one per entity type |
| Filesystem `.maintenance` flag, not DB | The point of maintenance mode is often to take the DB itself offline |
| Leads structurally admin-only (`assigned_to → admins.id`) | Leads are TGA's internal sales asset; agents must never see them, enforced at the schema/FK level |
| Notices get `expires_at`; notes get `is_pinned` | Both added after adversarial "can this feature get cluttered/stale?" failure-mode analysis |
| Page-level RBAC derives access from existing `role_permissions` rows | The backend already had per-action guards reading the same table — no new schema needed |
| Activity log auto-scopes to "own actions" by default for regular admins | Previously any admin with the single view permission saw the entire system's logs |

### Notable bugs found & fixed

*(Bugs already covered by CLAUDE.md's Hotfix History table — `requireAuth()` missing, `RateLimitMiddleware::enforce()` missing, `api.ts` default export, JWT `sub`→`id`, `SystemSettings` namespace, `SearchController` N+1→UNION ALL fix, internal-notes subtree fix — not repeated here.)*

**Schema-mismatch class (recurring across the whole phase — `users` has no name columns, only `students`/`agents`/`admins.full_name`)**:

| Where | Impact | Fix |
|---|---|---|
| Admin dashboard user directory + overview | Selected non-existent name/agency columns — crashed the admin user directory and overview page entirely | Rewrote joins to pull `full_name` from the correct profile table |
| `InternalNoteModel::findVisibleNotes()` (2026-07-13) | Same mistake again — masked for a long time by an unrelated frontend double-unwrap bug swallowing the resulting 500 into an empty note list | `LEFT JOIN` + `COALESCE()` across profile tables |
| `LeadsController::convertToStudent()` (2026-07-14) | Wrapped in try/catch → silently 500'd every time. **Every single lead-to-student conversion had failed, unconditionally, since the endpoint shipped** — 100% failure rate on a core CRM feature | Rewrote both INSERTs to match the working registration pattern; verified by actually logging into the resulting account |

**RBAC/permission gaps (found in the 2026-07-14 full deployment-readiness sweep — traced all 79 admin routes into their controllers)**:

| Severity | Gap | Fix |
|---|---|---|
| CRITICAL | Admin user-roster endpoint had zero RBAC — any authenticated admin, including one with no page grants, could pull the full student or agent roster with decrypted email/phone by hitting the URL directly | Added the missing permission check |
| HIGH | User-detail endpoint had no RBAC at all — returned decrypted passport number, DOB, nationality for any student | Added module-specific `view` check |
| HIGH | `SearchController` had zero RBAC for admins — any admin could pull cross-module results the UI would never surface to them | New non-throwing permission helper — each branch silently omits itself if ungranted rather than 403ing the whole request |
| MEDIUM | Internal notes let any admin edit/delete *other admins'* notes regardless of ownership | Editing/deleting someone else's note now requires the `edit` permission |
| LOW-MEDIUM | Export endpoint let anyone with `reports.view` bulk-export raw row-level data regardless of per-module view permission | Added per-type permission check |
| LOW-MEDIUM | A legacy field let any user-management-edit admin mint new super admins | Added an explicit caller-is-super-admin check |

**Other significant bugs**: integer `id` leaked across the admin roster/detail/update/agent-approval surface — rewrote the full round-trip to `public_id`. Admin approve/reject buttons on pending agent cards called a route that doesn't exist — silently failed on every click, rewritten. Dashboard summary response shape didn't match the frontend's expected type — crashed the admin overview page on load. Agent onboarding blocked every pending agent from logging in at all (three stacked bugs — status conflation, no-JWT early returns, a nested-response assumption mismatch) — same class of bug independently found and fixed in Phase 5's agent-onboarding rebuild. Notice-published and lead-lifecycle notification templates were never seeded — silent no-op, same class as the known `application.status_changed` gap. The activity log's own `action` filter parameter collided with the `?route=X&action=Y` routing convention itself — renamed to `log_action`. Actor names showed "System" on ~80% of logged actions because the JWT never actually carried the display-name claim being looked up — fixed with a profile-table lookup (existing rows not retroactively fixed, since `activity_logs` is insert-only). Admin account creation had zero audit trail. Two admin catalog pages used `Promise.all` for sub-fetches requiring a permission the page's own gate didn't guarantee, so one rejected sub-request wiped the whole page — switched to `Promise.allSettled`.

### Anything that contradicts or supersedes current docs

- Two fixes from this phase are comparable in severity to items already in CLAUDE.md's Hotfix History table but aren't listed there: the lead-conversion 100%-failure bug (a core CRM feature completely non-functional from launch until 2026-07-14) and the critical admin-roster RBAC bypass (unrestricted decrypted PII access). Worth considering for that table if it's ever refreshed.

---

## Phase 8 — Reporting & Analytics

**Released**: 2026-06-26 · **Scope**: daily snapshot engine, reports API, executive dashboard, agent/university/lead-source analytics, streaming multi-format export.

### What shipped

- **Daily snapshot cron** materializes `report_snapshots` from live tables: global metrics plus per-agent, per-country, per-lead-source, and per-university dimension rows. Idempotent via `INSERT ... ON DUPLICATE KEY UPDATE`; bulk-inserts in batches of 500.
- **Reports API** — 7 endpoints, all read-only against `report_snapshots`, never live aggregation: overview, funnel, agents, universities, lead-sources, trends, export. Gated by `reports.view`.
- **Executive dashboard** — 5 KPI stat cards with period-over-period % change, top-5 agent/university leaderboards, Recharts.
- **Agent performance report** — `RANK()`-ordered leaderboard, cohort comparison, sub-agent contribution breakdown.
- **University intelligence report** — application → offer → enrollment funnel per university.
- **Lead source analytics** — per-channel counts and conversion rate.
- **Trends tab** — metric picker + date-range chart; discovered mid-build to be entirely absent from frontend nav despite the backend already existing — built from scratch.
- **Export engine** — shipped in two stages: CSV-only first, then upgraded to CSV/XLSX/PDF (XLSX via `openspout/openspout`, PDF via DOMPDF for summary reports capped at 100 rows). Every export logged to `activity_logs`.
- **Filters** persisted in the URL via `useSearchParams` for deep-linking.
- **Performance work**: composite index on `report_snapshots` for the lookup pattern; `React.lazy()` for the reports page; query `staleTime` raised to 1 hour (data can't change until the next midnight cron run).

### Key architectural decisions & why

| Decision | Why |
|---|---|
| Snapshot-backed reporting, never live aggregation | The dashboard was an O(table-scan) query on every load; at scale that times out on shared hosting. 24h staleness is treated as acceptable standard practice, not a bug |
| MySQL 8.4 window functions (`RANK()`) done in-DB | Avoids fetching all rows and ranking in PHP |
| Minimum sample-size floor before ranking agents | Raw ranking let a 1-student/1-enrollment agent outrank a 500-student/490-enrollment agent — statistically meaningless but visually "top ranked" |
| OpenSpout over PhpSpreadsheet for XLSX | PhpSpreadsheet loads the entire dataset into memory before writing — risks the shared-hosting memory limit; OpenSpout streams |
| Bulk batched INSERT (500 rows/query) | Thousands of sequential single-row inserts against agents/universities risked exceeding execution-time limits under shared-hosting network latency |
| `dimension_id = '_global'` sentinel instead of `NULL` | Same MySQL UNIQUE-index-allows-multiple-NULLs issue documented in Phase 1 — this is where it originated |
| PDF export scoped to summary reports only, 100-row cap | DOMPDF's HTML→PDF rendering is CPU/DOM-heavy; row-level exports go through XLSX/CSV instead |

### Notable bugs found & fixed

*(Skipping the funnel-cumulative, Cartesian-join, and `profile_status` sync fixes — already in CLAUDE.md's Hotfix History table.)*

- **Batching omitted from 3 of 4 snapshot loops** — only the per-agent loop had the flush check; per-country/lead-source/university loops could have accumulated tens of thousands of unflushed params in memory at scale. Fixed by adding the flush check to every loop.
- **`reports.view` permission not actually enforced** — the initial controller scaffold had the check commented out; any authenticated user could read revenue and pipeline data. Same gap existed in the export controller. Both fixed.
- **Export requests 401'd in production** — the original frontend used a bare anchor-click download, which cannot attach an auth header. Fixed by switching to `fetch()` + `Blob` + `URL.createObjectURL()`.
- **Unvalidated date params on the trends endpoint** — no format/range validation; fixed with a strict date regex plus a 365-day max-range check.
- **Cron bootstrap skipped env loading / used the non-pooled DB connector** — same defect class CLAUDE.md's gotchas table warns about generally; Phase 8's cron is where it was first caught.

### Anything that contradicts or supersedes current docs

- The original Phase 8 release notes describe PDF export as "deferred," but it was actually built and shipped within the same phase (scoped to summary reports, 100-row cap) — `dompdf/dompdf` is a live dependency today, confirming the release-notes line was simply stale, not an accurate deferral.
- A "period-over-period trend via `LAG()`" feature mentioned in the release notes' architecture section has no confirmed corresponding query in the actual reporting spec or append doc's audit — treat as unconfirmed/likely-unshipped rather than a verified feature.

---

## Phase 9 — Production Hardening & Security

**Released:** 2026-06-27 (initial "production-ready" sign-off) — but this is the most active append file in the whole project, with substantial post-release work continuing through 2026-07-14 (a full deployment-readiness security audit). Treat the release date as "hardening pass complete," not "file closed."

### What shipped

15 modules across security, resilience, DX, and deployment automation. Condensed here — full detail on the 6 highest-impact items already lives in CLAUDE.md's Hotfix History table:

**Security/config hardening**
- `.htaccess`: HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, CSP headers; blocked web access to `.env`, `composer.json`, `php_errors.log`.
- Dynamic `APP_ENV` detection toggles stack-trace exposure.
- Global per-IP rate limiting across the whole API, violations logged to `security_events`; health-check routes exempted.
- Admin 2FA on/off toggle requires current-password re-verification; every toggle logged with user+IP.

**Resilience/observability**
- `MaintenanceMiddleware` — filesystem flag, super-admin bypass, works even with MySQL fully down.
- Global error/shutdown handlers — PHP warnings/fatals always return structured JSON, never raw HTML/blank 500.
- `cron/scheduler.php` — single cPanel entry orchestrates all jobs; `CronHealth::checkStuckJobs()` force-fails anything stuck >15 min.
- `/api/health` — DB ping, disk check, writability checks.

**Performance**
- `SystemSettings` dual-layer cache — eliminates redundant `system_settings` queries per request.
- GZIP for JSON responses.

**Feature modules bundled into the same phase**
- Student academic profile (test scores, migration 063).
- Application withdrawal workflow (migration 064) with role-specific endpoints that auto-cancel linked document requests + payments.
- Agent referral link system.

**Deployment/DX**: one-command local bootstrap scripts, deploy/smoke-test/restore helper scripts.

**Now-superseded items shipped in this phase (do not treat as current-state facts):** Drive-based backup verification and the Drive upload retry/backoff fix are moot — Google Drive integration was deleted entirely on 2026-07-10. A Vercel-CLI frontend deploy script and `vercel.json` config were also part of this phase's deployment tooling — see contradiction note below.

### Key architectural decisions & why

| Decision | Why |
|---|---|
| Maintenance mode via filesystem flag, not a DB row | Must work even when MySQL is completely unreachable |
| Single master `cron/scheduler.php` instead of separate cPanel cron entries | Shared-hosting cron granularity/quota limits; one `flock()`-guarded entry prevents overlapping processes from exhausting shared CPU/memory |
| `jwt_min_iat` global revocation checkpoint | No existing mechanism for fast global session invalidation short of a full DB sweep of every session row. Confirmed as intended behavior that a checkpoint also invalidates the admin's own pre-checkpoint token |
| Page-based RBAC via auto-generated per-admin role + frontend `PageGuard` | Named/shared roles didn't give granular enough control; each non-super-admin gets a unique, exact-fit permission set with a single source of truth so page grants and API checks can't drift apart |
| `HtmlSanitizer` walks a real parsed DOM instead of `strip_tags()` | `strip_tags()` only filters tag *names*, not attributes on allowlisted tags — exactly the class of bug that produced the stored-XSS finding below |
| Strip *all* links/buttons from every transactional email, rather than keep fixing them | After finding several templates had broken/wrong-domain links, the decision was to eliminate the risk category entirely rather than rely on every future route change staying in sync with hardcoded email URLs |
| File download ownership check keyed to `owner_type`/`owner_id`, not `uploaded_by_id` | `uploaded_by_id` is the *uploader's* id, while `owner_id` is the actual owning profile — necessary distinction because agents can upload on behalf of a sub-agent |

### Notable bugs found & fixed

Security/data-integrity relevant, excluding what's already in CLAUDE.md's Hotfix History table.

**Security/RBAC/data-leak class**

| Date | Finding | Severity | Fix |
|---|---|---|---|
| 2026-06-30 | Super admin could delete/demote their own account via a layered gap (frontend type missing a field, backend self-check comparing only the wrong ID type) | Critical | Backend guard now checks both ID types; frontend adds an explicit equality guard as well |
| 2026-06-30 | No guard against changing a super admin's own role, or any super admin's flag — one such change silently self-downgraded a real super admin | High | Added self-guard + super-admin-protected guard; login now cross-checks the DB flag rather than trusting stale JWT claims |
| 2026-07-03 | A rejected-request rate-limit event was being logged on *every* rejected request while over-limit (93% of all security-event rows), degrading audit-trail usefulness | Medium | Centralized all raw-SQL insert call sites through one logger; log only first rejection per violation window |
| 2026-07-03 | **Real PII/RBAC-boundary leak**: a newly added actor-name resolution on the Security Events page JOINed to users/admins/agents/students unconditionally — an admin scoped to *only* that page could see full names via the JOIN, bypassing the page-level visibility boundary the whole RBAC system exists to enforce | High | Names now null out per-row unless the requesting admin also holds the matching view permission (or is super admin) |
| 2026-07-10 | Global search scoped agent results by `root_agent_id` alone, ignoring the searcher's own tier — Tier 2/3 agents could search *up* and see students belonging to siblings or their parent agent | High | Applied the same tier-aware scoping already used elsewhere; live-verified both leak directions closed |
| 2026-07-13 | File download's ownership fast-path compared the wrong ID field, so owners were getting 403'd on their own files in some upload paths | Medium (broken authz, not over-permissive) | Switched to the canonical `owner_type`/`owner_id` check, kept the old check as an additional OR for agents specifically |
| 2026-07-14 | Global JWT revocation used strict `<` on a 1-second-resolution timestamp — a token minted in the exact same second as a new revocation checkpoint survived the revocation | High | Changed to `<=`, plus an explicit guard so the disabled default can't accidentally match a real timestamp |
| 2026-07-14 | **Stored XSS in notices** — HTML sanitization was tag-name-only, so `<a href="javascript:...">` with an `onclick` payload passed through untouched, rendered raw across all three portals. A notice's audience can include students/agents/admins simultaneously — real stored-XSS with credible privilege escalation | Critical | New DOM-walking `HtmlSanitizer` service; a bug in the fix itself (a regex delimiter collision stripping legitimate `href`s too) was caught and fixed via a 16-case unit battery before shipping. Verified live in an actual browser session |
| 2026-07-14 | (found while cleaning up the XSS test) Admin notice deletion 500'd unconditionally — called a cascade-delete method that was never implemented, copy-pasted from a different model that actually has child rows | — | Switched to the plain soft-delete method that already existed |
| 2026-07-14 | Public upload directory had no script-execution denial at all — not exploited (the upload path already enforces MIME/magic-byte/extension checks), but zero defense-in-depth | Low | Added a directory-level `.htaccess` denying executable extensions regardless of origin |

**2026-07-14 full deployment-readiness security sweep** — systematic pass across JWT, CORS, PII encryption, rate limiting, SQL injection, file upload safety: all came back clean on live testing (crafted invalid JWTs correctly rejected; cross-origin preflight from an unlisted origin gets no CORS header; PII columns confirmed genuine ciphertext, not plaintext; rate limiting confirmed enforced via real 429s during the audit's own volume; a dedicated grep sweep of all 75 controller/model/service files found zero raw-SQL-interpolation injection paths). The public-upload-directory gap above was the only finding from this sweep.

**Email content/notification-delivery class** (most recent work, 2026-07-14, product-driven, not just a bugfix chain):

| Finding | Fix |
|---|---|
| An earlier migration converted ~22 templates to HTML fragments meant to slot into a shared layout wrapper, but the queued-mail cron path was never updated to call the wrapper — every queued email (all 28 non-OTP notification types) went out either unbranded or, for 6 still-plain-text templates, as one run-on paragraph with literal `\n` characters. Never caught earlier because SMTP quota issues meant nobody had inspected a queued email's actual rendered HTML end-to-end | The wrap function now always runs; a new helper distinguishes HTML-fragment bodies (pass through) from plain-text bodies (escape + convert line breaks) |
| The 6 plain-text templates were visually thinner than the rest once delivery was fixed; also, a raw DB status value (`offer_received`) was being emailed unformatted while every portal page title-cases the same value for display | Rebranded all 6 to match the established visual language; mirrored the same title-case transform server-side |
| Systematic cross-check of every template's placeholders against what its firing call site actually passes found **9 distinct notification types (10 call sites)** with broken links across 3 root causes: some templates never passed the portal URL at all; some call sites read an environment variable that has never existed, silently falling back to the *marketing* site's domain; one template's link was missing a URL path prefix entirely, producing a live 404 on every SLA breach alert | Fixed all 3 root causes at every affected call site; verified via a one-shot audit script rendering all 35 templates through the real pipeline: 0 issues (was 9) |
| Client decision immediately following the above: rather than keep relying on links staying correct as routes evolve, remove the risk category entirely | Every remaining CTA button was stripped from every template that had one; verified 0 of 35 templates contain a link |

**Migration/deployment-tooling class**: discovered migrations 070–080 (11 files, including entire new tables) were applied by *no* existing tool — a fresh production install using only documented tooling would have shipped a schema 11 migrations behind app code. Fixed by adding the missing combined-SQL file and correcting a regex that was silently dropping several migration numbers. Same day, found two more notification event keys with the exact same silent-no-op template gap as the known `application.status_changed` issue — closed via a seed migration. Later, a non-destructive, idempotent, dry-run-by-default migration runner (`reconcile.php`) was built specifically to bring an *existing* (possibly production) database up to date without the destructive `DROP`/`TRUNCATE` behavior of the fresh-install script — not yet run against production as of this write-up.

### Anything that contradicts or supersedes current docs

- **The original Phase 9 spec's entire architectural premise is stale.** It's written against a decoupled "React frontend on Vercel + PHP/MySQL backend on Bluehost" split — Vercel CLI deploy scripts, CSP headers referencing a separate API subdomain, cross-origin frontend URL config. Per CLAUDE.md (corrected 2026-07-08), actual production is a **single Bluehost server** serving both the static SPA build and the PHP backend under `apply.theglobalavenues.com`. Don't carry the Vercel-specific deployment content forward as current-state fact, though the general hardening intent (CSP, cache headers, source maps off) still applies to the real single-server setup.
- **A migration-file naming discrepancy was caught mid-consolidation (2026-07-15):** the append-doc record names one migration `085_brand_remaining_plaintext_templates.sql`, but the actual repository has `085_disk_warning_template_text_fix.sql` at that number, alongside `086_remove_all_email_links_and_buttons.sql`. Either the migration was renumbered after the append entry was written, or there's a second, separately-motivated 085 change. Worth reconciling file contents directly before treating either historical reference as authoritative — check `crm-api/Database/migrations/` directly.
- Drive-dependent items described in this phase (backup/restore validation, Drive retry/backoff) describe infrastructure that no longer exists — Google Drive integration was fully removed 2026-07-10, after this phase's original work.

---

## Audit Pass 1 — Flow Consistency (2026-06-29)

**Auditor:** Claude Code, read-only session, zero code changes made during the audit itself (fixes landed in a separate implementation pass the next day).

### What was audited & found

**Scope:** Full read of auth/session/JWT, email/notification, file handling, agent lifecycle, frontend auth state, and global error handling. **Not checked:** application controller, dashboard/reports controllers, registration (partial), student/agent controllers, commission controller, settings-cache invalidation, route-level permission bypasses, rate-limit internals — flagged as residual risk surface for a future pass.

14 findings total, spanning inconsistent mechanisms for the same job, stale assumptions left over from earlier hotfixes, data integrity gaps in file handling, plus standalone change-velocity and token/session-security clusters.

| # | Severity | Finding |
|---|----------|---------|
| F3 | **Critical** | Integer row IDs leaked in the auth response, agent list, and agent tree endpoints, and typed as `number` on the frontend — violated the ULID-only policy, enabling enumeration/row-count inference. |
| F1 | High | Email HTML body was encoded in the queued cron path but sent raw in the synchronous OTP path — an XSS vector if template content is ever user-controlled. |
| F2 | High | Cron's SMTP fallback path built its own inline mailer config instead of calling the shared one — any SMTP setting change had to be made in two places, and the fallback (exercised exactly during an outage) was the one most likely to drift. |
| F7 | High | RBAC permission revocations don't take effect until the JWT expires (up to 15 min) — permissions are baked into the token at issuance and never re-checked per-request; only account status is live-checked. |
| F8 | High | Two document-review methods existed — one full (status change + activity log + SLA resolve + notification), one partial (status change only). The frontend was wired to the broken one. |
| F4 | High | The refresh-token cookie path was scoped to the entire backend instead of the refresh endpoint alone — the long-lived (7-day) refresh token was sent on every API call, materially widening CSRF/XSS exposure. |
| F9 | Medium | Agent-submitted document resubmissions had no versioning/audit trail — a swapped document was untraceable. |
| F5 | Medium | Auth middleware had an undocumented cookie-based fallback that broke the "bearer-only" CSRF assumption, even though the frontend never actually used it. |
| F6 | Medium | Session audit IPs recorded the raw connecting address instead of the Cloudflare-aware resolution already implemented elsewhere — all session IPs were Cloudflare edge IPs, not real client IPs. |
| F10 | Medium | Failed file-upload cleanup silently suppressed errors — an orphaned file (potentially PII) could sit on disk with zero record and zero log. |
| F11 | Medium | Drive sync marked files "synced" purely on the API returning an ID, with no content-integrity check against the local checksum. |
| F14 | Medium | No real-time push for admin queues — concurrent admins could operate on stale lists, producing confusing "already approved" errors. |
| F12 | Low | A document-queue endpoint leaked the raw filesystem storage path to the admin frontend instead of routing downloads through the public ID. |
| F13 | Low | A legacy unused store still contained hardcoded OTP bypass stubs, reachable via a shorter import path than the real OTP flow. |

**Confirmed correct (no action needed):** agent suspension live-revokes sessions; access token never touches `localStorage`; refresh token transport is credentialed + HttpOnly only; global JWT revocation works; 2FA pre-auth tokens are route-restricted and never persisted; OTP rate-limiting runs before any DB write; production error handler suppresses stack traces; file download re-verifies checksum and aborts on mismatch.

### Fixes applied

All 14 findings were fixed in a same-project-window implementation pass:

- **Integer ID leakage (F3)**: removed the leaked field from the auth response entirely; the agent list switched to self-joined public IDs; the agent tree endpoint kept internal integer IDs for its own CTE construction but added a recursive sanitizer that strips them before the response is sent.
- **Document review duplication (F8)**: merged the two methods into one that accepts either payload shape all existing callers used; the broken partial method was deleted outright and the route repointed.
- **Storage path leak (F12)**: removed the raw path from the document-queue response and the matching frontend type.
- **Orphaned file cleanup (F10)**: removed the error suppressor; a failed cleanup now logs a critical line with the stranded file's absolute path.
- **Cookie auth fallback (F5)**: deleted the cookie-based auth branch entirely — Bearer header is now the only accepted transport.
- **Cloudflare IP resolution (F6)**: session logging now uses the same IP-resolution helper already used elsewhere.
- **Email/SMTP consistency (F1, F2)**: added one canonical HTML-encoding helper used by both the sync and queued paths; added one canonical fallback-mailer builder used by both the cron and the primary path.
- **Frontend mock/legacy cleanup (F13, plus related dead-import findings surfaced during the fix pass)**: removed hardcoded OTP placeholder text and dead legacy-store imports/mock defaults from the login page, apply page, and admin dashboard.

**Not addressed in this pass (left for later, out of scope or lower priority):** F4 (refresh-token cookie path breadth — architecturally constrained by the single-entry-point router; mitigation deferred to CORS origin validation), F7 (RBAC permission staleness on revocation — no live-revocation-of-permissions implementation confirmed), F9 (agent-submission file versioning — later addressed, see Phase 3's document-resubmission fix), F11 (Drive sync content-integrity check — moot, Drive removed 2026-07-10), F14 (real-time admin queue push).

**Verification:** All fixed items were live-tested — auth responses confirmed public-ID-only; agent tree/list responses confirmed integer-free; document review confirmed to write activity log + resolve SLA + notify on both approve and reject; document queue response confirmed to expose only the public file reference; cookie-only auth requests confirmed to return 401; session IPs confirmed to resolve via the Cloudflare header; sync/queued email HTML confirmed identical; SMTP failover confirmed to route through the new fallback mailer; production build confirmed green after the type changes.

---

## Pre-History: Initial Discovery Pass (2026-06-28)

A one-time, read-only onboarding/inventory snapshot (repo map, phase-by-phase spec recap, environment check, 5 spot-checks, 6 logged ambiguities) predating `CLIENT_SYSTEM_DOCUMENTATION.md` and most of the hotfix history now captured in `CLAUDE.md`. Every substantive item it raised has since been resolved and superseded:

| Discovery-doc item | Resolution |
|---|---|
| Tailwind `@theme` block location unclear | Resolved — tokens live in `src/styles/theme.css`; `index.css` is a thin import shim (expected, not a mismatch). |
| `ApplicationStateManager` vs `StateManager` relationship unclear | Resolved 2026-07-14 — `ApplicationStateManager` is confirmed dead code; `StateManager` is the only one in use. |
| `react-dnd` and `@mui/material` present but unexplained | Resolved — both confirmed unused in `src/`, tracked as a safe-to-remove cleanup item. |
| Migrations 048–052 missing as individual files | Resolved as a non-blocker — same finding independently carried forward into CLAUDE.md's Known Open Items. |
| `axios` usage scope (hypothesized for upload-progress) | Resolved differently than hypothesized — axios is imported nowhere in `src/`. |
| "40 tables" spot-check | Superseded — current count is ~41+, already reconciled in CLAUDE.md. |

No open question or spot-check finding from this file remains unresolved or undocumented elsewhere.

---

## Dashboard Overview Cleanup — Admin/Agent/Student (2026-07-16)

**Trigger:** Client feedback that all three portals' Overview (home) pages showed too much low-value clutter — specifically named Admin's "Pending agent approvals," "Pending payment verification," and "Pipeline weight" panels — and asked for a cleaner UI plus end-to-end verification that every displayed number is live and correct.

### What was found (pre-change audit)

Every number on all three Overview pages was already backed by a live, correctly-scoped SQL query — no fake/mocked data anywhere. The real problems were clutter, duplication, and one broken filter:

- **Admin Overview** (`src/pages/admin/AdminDashboardPage.tsx`) fired 11+ live SQL queries per load, re-run every 30s on a timer. It had 8 panels including the 3 flagged ones, a duplicate stat ("Applications" hero chip and "Pipeline Cases" metric card were the identical field, shown twice), and a completely broken document-status filter: the frontend `fetchAdminDocumentQueue()` never sent its `status`/`perPage` params (leading-underscore-prefixed, deliberately unused), and the backend `DocumentRequestController::getDocumentQueue()` hardcoded `WHERE status='submitted'` — so the Documents section's status dropdown changed nothing regardless of selection.
- **Agent Overview** (`src/pages/agent/AgentDashboard.tsx`) had a "Student Pipeline Overview" card duplicating numbers already shown in the stat-card row above it, and a "My Agency Network" card that's structurally always 0/0 for tier-3 (leaf) agents — the backend never even runs a query for that tier.
- **Student Overview** (`src/pages/student/StudentOverviewPage.tsx`) had 6 stat cards + 6 more cards (12 panels total). The "Unread Notices" stat card duplicated the notification bell already in the shared top bar (`PortalWrapper.tsx`).

### What changed

**Admin** (`src/pages/admin/AdminDashboardPage.tsx`):
- Removed the "Pending agent approvals," "Pending payment verification," and "Pipeline weight" panels entirely, and stopped calling `fetchAdminAgentQueue()`/`fetchAdminPaymentQueue()` from the Overview load (confirmed via grep these were called nowhere else in `src/` — agent approval already exists on the full Agents page; payment confirm/dispute already exists on the per-application detail page, `AdminApplicationDetailPage.tsx`). This also cuts 2 of the 5 network round trips that previously fired every 30 seconds.
- Removed the duplicate "Pipeline Cases" metric card (same field as the "Applications" hero chip).
- Re-laid remaining panels into a cleaner 3-card metric row + two 2-column panel rows (Recent stage movement / System Activity Feed, then Pending document review / Recent Notices & Events).
- Fixed the document-status filter end-to-end: `DocumentRequestController::getDocumentQueue()` (`crm-api/Controllers/DocumentRequestController.php`) now reads `$_GET['status']` (whitelisted against the real `document_requests.status` values: requested/submitted/approved/rejected/cancelled, default `submitted`) and `$_GET['per_page']` (clamped 1–100) instead of a hardcoded query; `fetchAdminDocumentQueue()` (`src/lib/api.ts`) now actually sends those params; the Documents section's dropdown options were corrected from the non-existent `pending`/`verified` values to the real `submitted`/`approved`/`rejected`.
- Noted but did not fix (out of scope, pre-existing, unrelated to this change): `/portal/admin/documents` has no route or sidebar link — the `section === 'documents'` branch in `AdminDashboardPage.tsx` is unreachable dead code. Worth a future decision on whether to wire it up or remove it.

**Agent** (`src/pages/agent/AgentDashboard.tsx`):
- Removed the redundant "Student Pipeline Overview" card.
- "My Agency Network" now renders only when `agent.tier === 1 || agent.tier === 2` (backend already casts `tier` to a JSON int in `AgentController::dashboardSummary()`), as a standalone `max-w-md` card instead of a half-empty 2-column grid.

**Student** (`src/pages/student/StudentOverviewPage.tsx`):
- Collapsed the 6-stat-card row into "Total Applications" (its own StatCard) + a single "Application Pipeline" card showing Open/In Review/Offers/Enrolled as compact inline metrics.
- Removed the "Unread Notices" stat card and the now-unused `useUnreadCount` import — the top bar's notification bell already covers this.

### Live verification (not just code review)

All three portals tested end-to-end in-browser against the local dev DB (`tga_crm_reconciled`, port 3307):
- **Admin**, logged in as super_admin (`tprashant76640@gmail.com`): confirmed the 3 named panels are gone, no duplicate stat, `get_agent_queue`/`get_payment_queue` no longer appear in the network log at all, `get_document_queue` now sends `status=submitted&per_page=6` and returns correctly, remaining numbers (Applications 11, Pending Agents 1, Pending Docs 1, Active Agents 11, Student Accounts 19, Shared Universities 313, Shared Programs 2998) matched the live DB state, zero console errors.
- **Agent**, logged in as both a tier-3 agent (Arjun Test Agent 3 / Gurgaon Franchise Test) and a tier-2 agent (Sonia Sharma / Noida Franchise): confirmed tier-3 sees no "My Agency Network" card and no duplicate pipeline card; tier-2 sees "My Agency Network" with correct live counts (1 sub-agent, 0 pending) cross-checked against the DB's `agents` table hierarchy.
- **Student**, logged in as testuser456@example.com (Prashant Tiwari): confirmed Total Applications (5) and the Application Pipeline breakdown (Open 2 / In Review 1 / Offers 1 / Enrolled 0) hand-matched against the 5 rows in the actual Recent Applications list, including correctly excluding a `withdrawn` application from every bucket; confirmed the top-bar Notifications button still exists after removing the stat card; zero console errors.

**Local test-account note:** two agent accounts (`agent1@theglobalavenues.com`, `agent2@theglobalavenues.com`, `agent_test_3@theglobalavenues.com`) and one student account (`testuser456@example.com`) had their local-dev-only passwords reset to `TestPass@123` (Argon2id, same cost params as `.env`) via a one-off script to enable this verification, since the passwords noted in an earlier session's memory no longer worked. Local dev DB only — not production.

### Files touched
- `src/pages/admin/AdminDashboardPage.tsx`
- `src/lib/api.ts`
- `crm-api/Controllers/DocumentRequestController.php`
- `src/pages/agent/AgentDashboard.tsx`
- `src/pages/student/StudentOverviewPage.tsx`

### Follow-up same day: Notices panel redesign + reorder

Client feedback on the first pass: the "Recent Notices & Events" panel on Admin Overview looked low-effort (plain text rows) and was positioned at the very bottom of the page. Two changes to `src/pages/admin/AdminDashboardPage.tsx`:

- **Redesign**: notice/event rows now use an icon-badge layout (Bell icon in a purple circle for notices, Calendar icon in an amber circle for events, matching the icon-circle pattern already used by `ActivityFeedWidget` elsewhere on the same page) instead of plain text rows — deliberately reused the app's own existing best-looking pattern rather than introducing a new visual style, since the shared `RecentNoticesCard` component (used on Agent/Student) has a different corner-radius/border/font language than Admin's `Panel` container and would have looked inconsistent side-by-side.
- **Reorder**: "Recent Notices & Events" + "Pending document review" now form the first panel row (right after the metric cards); "Recent stage movement" + "System Activity Feed" (the two historical/log-style feeds) moved down to the second row.

**Incident during verification (same session):** while re-testing login for this change, a misfired click in the browser-automation tool (ref-staleness across an SPA navigation — a known flakiness in this session's browser tool) triggered a bulk delete of 6 universities via the real `DELETE` API as the logged-in super admin, cascading (by existing app design, `UniversityModel::softDeleteWithCascade()`) to 4 courses and 12 intakes. Caught immediately via the redesigned Overview page itself — "Shared Universities" dropped 313→307 and the System Activity Feed showed "Prashant Tiwari deleted a university (×6)" — which is exactly the kind of live-data mismatch this whole redesign effort was meant to make visible. Confirmed local dev DB only (`tga_crm_reconciled`, port 3307), fully reversible (soft delete). User approved a direct restore: `universities.deleted_at`/`courses.deleted_at` cleared for the 6 universities + 4 courses, and the 12 affected intakes reset to `status='upcoming'` (best-match default — intake status isn't itself soft-deleted/logged, so the exact prior per-row value couldn't be recovered; `upcoming` was chosen because it's the dominant status across the rest of the seeded catalog — 4833 of ~4848 rows). Verified restored: Overview counts back to 313 universities / 2998 programs. The activity log correctly retains the historical "deleted" entry (INSERT-only table, never altered) even though the underlying data is now restored.

### Follow-up same day: Student Overview reorder (profile form to bottom)

Client feedback: on the Student portal's Overview page, whenever the student's profile wasn't complete, the full `ProfileCompletionPanel` (a heavy multi-section form — Personal Details, Academic History & Test Scores, Documents with a sticky Save Draft/Submit bar) rendered immediately after the page header, before anything else — pushing stats, Recent Applications, Notices & Events, and every other card below the fold. Requested: move that block to the bottom, let notices/stats/etc. surface first.

Change to `src/pages/student/StudentOverviewPage.tsx`: moved the conditional block (`ready` ? green "profile complete" confirmation : `<ProfileCompletionPanel />`) from directly under `PageHeader` to the very end of the page, after the two-column grid (Recent Applications / Notices & Events / Documents Needed / Payments Due / Browse Universities / Your Consultant / Recent Activity). Also fixed two now-stale copy references ("Complete your profile above" → "...below") in the empty-state and locked-applications card text.

**Verified live**, both branches: logged in as an incomplete-profile test student (`student_test_2@theglobalavenues.com`, reset to a known local password to test) — confirmed stats/applications/notices/documents/payments/consultant/activity all render first, full profile form now at the very bottom. Logged in as a complete-profile student (`testuser456@example.com`) — confirmed the green "Your profile is complete" confirmation also moved to the bottom, same position. Zero console errors in either case; production build clean.

---

## Final Deployment Prep — Catalog Seed Regeneration & Fresh-Install Verification (2026-07-16)

**Trigger:** Moving toward final deployment. Client had kept adding universities/courses/intakes to the
local dev catalog after `real_catalog_seed.sql` was last generated (2026-07-08), and asked for (1) the
seed file brought fully up to date so a fresh install seeds every catalog entry that exists today, (2)
confirmation `setup_database.php` genuinely does a clean drop-and-rebuild with no leftover manual steps,
(3) a cron audit ahead of go-live, (4) a concrete "just a few clicks" production setup path.

### What was found (pre-change audit)

`setup_database.php` already did the hard part correctly — DROPs every table, rebuilds schema +
86 migrations, truncates and reseeds RBAC/settings/templates, creates the super admin from `.env`, and
gates all dev/test fixtures behind `APP_ENV === 'development'`. The actual gap was stale *data*, not the
mechanism. Comparing the live local DB (`tga_crm_reconciled`, port 3307 — confirmed by the client as the
authoritative source) against the checked-in `real_catalog_seed.sql`:

| Table | In seed file (2026-07-08) | Live (2026-07-16) | Missing |
|---|---|---|---|
| `universities` | 310 | 313 | 3 |
| `courses` | 2,606 | 2,999 | 393 |
| `intakes` | 4,419 | 4,848 | 429 |
| `university_campuses` | 412 | 415 | 3 |
| `files` (university logos only) | 1 | 2 | 1 |
| `student_custom_field_definitions` | 4 | 6 | 2 |

Cron audit (read-only, all 5 scripts + `scheduler.php`): all 4 actually-scheduled jobs correctly use
`Database::getConnection()`, have `set_time_limit()`, and handle the MariaDB `SKIP LOCKED` fallback.
Frequencies match `CLAUDE.md`. One doc/code mismatch found: `CLAUDE.md`'s cron table listed
`archive-old-logs.php` as running every 7 days, but `scheduler.php` deliberately excludes it from its
job list (`activity_logs` must never be deleted, 2026-07-08 decision) — the script still exists in
`cron/` but was never wired into the scheduler. Confirmed with the client this exclusion is correct;
fixed the stale `CLAUDE.md` line instead of re-enabling the job.

Also identified a real deployment blocker not previously documented: Bluehost has no SSH/Terminal on
this account, so `setup_database.php` (a PHP CLI script) can't be run the normal way in production —
only cPanel's Cron Jobs GUI can execute arbitrary PHP CLI commands on this account.

### What changed

- **`crm-api/Database/real_catalog_seed.sql` regenerated** from the live local DB using
  `mysqldump --no-create-info --skip-extended-insert --complete-insert` per table (same format as the
  original file — verified byte-identical structure), for `universities`, `courses`, `intakes`,
  `university_campuses`, `student_custom_field_definitions`, and specifically only `files` rows `65`
  and `86` (the 2 real university logo rows — the other 74 rows in the live `files` table are notice/
  document attachments unrelated to the catalog and were deliberately excluded, same as the original
  file's "1 real logo only" approach). AUTO_INCREMENT footer bumped to match new MAX(id) per table
  (universities 357, courses 3000, intakes 4849, campuses 416, files 87, custom fields 7).
- **`CLAUDE.md`** — cron schedule table corrected: `archive-old-logs.php` removed from the "runs every
  7 days" row, replaced with a note that it's intentionally unscheduled dead weight in `cron/`.
- **New doc: `Implementation_development _docs/PRODUCTION_SETUP_RUNBOOK.md`** — one-time initial-launch
  runbook covering cPanel DB/user creation, `.env` setup, running `setup_database.php` exactly once via
  a one-shot cPanel Cron Jobs entry (scheduled a few minutes out, deleted immediately after it fires),
  post-install verification counts, then switching to the real recurring `scheduler.php` cron.
- **`README.md`** — Documentation Map and §19 Deployment now point to the new runbook.

### Live verification (not just code review)

- Regenerated seed file's INSERT counts checked per table against live DB counts — exact match on all
  6 tables. ID-level diff confirmed **zero rows dropped** — every ID present in the old seed file is
  present in the new one, only additions.
- `setup_database.php` run twice end-to-end against **throwaway** local databases (`tga_crm_setup_test_prod`,
  `tga_crm_setup_test_dev` — the client's actual working `tga_crm_reconciled` DB was never touched):
  - `APP_ENV=production` run: completed with zero errors, exactly 1 user (the super admin, dummy test
    credentials used for the throwaway run), 0 rows in `agents`/`students`/`leads`/`applications`, 313/2999/4848
    universities/courses/intakes imported, 55 permissions / 7 system settings / 35 notification templates
    seeded, 45 tables total.
  - `APP_ENV=development` run: completed with zero errors, full dev fixture set seeded as before
    (14 users across admin/agent/student roles, sample applications/commissions/leads/notices/etc.),
    confirming the catalog regeneration didn't break the dev-fixture code path.
  - Both scratch databases dropped after verification; `crm-api/.env` restored to its exact original
    content (diffed line-by-line against the pre-test version).

### Files touched
- `crm-api/Database/real_catalog_seed.sql` (regenerated, +393 courses / +429 intakes / +3 universities / +3 campuses / +1 logo file / +2 custom field defs vs. the 2026-07-08 version)
- `CLAUDE.md` (cron schedule table correction)
- `Implementation_development _docs/PRODUCTION_SETUP_RUNBOOK.md` (new)
- `README.md` (doc map + deployment section links)

### Still open — needs the client live, together, at actual deploy time
Steps 1–7 of `PRODUCTION_SETUP_RUNBOOK.md` (cPanel DB creation, real `.env` secrets, the one-shot cron
run against the real production database, and the permanent `scheduler.php` cron) were **not** executed
this session — those are live production actions on shared hosting and are deliberately deferred to a
session where they're run one step at a time with confirmation at each step, per Working Mode rule 4.

---

## Live Deployment Attempt — MySQL 5.7 Compatibility Fixes (2026-07-16)

**Trigger:** Client uploaded all code and hit `setup_database.php` on the live Bluehost server (via a
direct browser URL, since the account has no SSH). It failed immediately on the very first table:
`SQLSTATE[42000]: ... 1064 ... near '('{}') COMMENT ...'` while importing `schema.sql`.

### Root cause discovery
The project's `CLAUDE.md` had stated "MySQL target: 8.4 LTS" — never actually verified against the real
hosting account. `SELECT VERSION();` on the live server returned **5.7.23**. This matters because MySQL
5.7 disallows *any* default value (literal or expression) on JSON/TEXT/BLOB columns — a restriction only
lifted in 8.0.13. Local dev's MariaDB 10.4 (XAMPP) is far more permissive and had been silently accepting
syntax that would never work in the real production environment, so this was never caught by local
testing.

A full scan of every `.sql` file in `crm-api/Database/` for other MySQL-8.0-only constructs (`DEFAULT (`,
`RENAME COLUMN`, `ADD/DROP COLUMN IF EXISTS`, `ALGORITHM=INSTANT`, `utf8mb4_0900`, `CREATE ROLE`,
functional indexes, CTEs, window functions) found exactly one more landmine waiting: `DROP COLUMN IF
EXISTS` in `migrations/084_remove_reminder_drive_backup_features.sql` (that per-column modifier needs
MySQL 8.0.29+).

### What was found and fixed

**Fix 1 — `user_preferences.preferences` column default.** `schema.sql` and
`migrations/030_create_user_preferences_table.sql` both had `preferences JSON NOT NULL DEFAULT ('{}')`.
Removing the `DEFAULT` clause outright would have broken 6 real call sites that rely on it —
`StudentController.php:844`, `LeadsController.php:530`, `SubAgentController.php:154`, and
`RegistrationController.php:233/372/493` all did `INSERT INTO user_preferences (user_id) VALUES (?)`
without supplying `preferences`, depending on the schema default to fill in `'{}'`. Fixed by removing the
`DEFAULT` clause from both SQL files and making all 6 call sites explicit:
`INSERT INTO user_preferences (user_id, preferences) VALUES (?, '{}')` — the same pattern
`setup_database.php`'s own seeding code already used.

**Fix 2 — `migrations/084`'s `DROP COLUMN IF EXISTS`.** Turned out to be genuinely load-bearing, not just
defensive: of the 7 `files` columns this migration drops, only 3 (`drive_file_id`, `drive_folder_path`,
`drive_sync_status` — part of the original schema) actually exist in a fresh `setup_database.php` install.
The other 4 (`sync_attempts`, `erasure_drive_deleted_at`, `erasure_drive_last_error`,
`erasure_retry_count`) are deliberately never added by the fresh-install path in the first place — see
`migrations_060_069.sql`'s header comment, which explains migrations 065/067 were trimmed specifically
because 084 would immediately re-remove those columns anyway. But `reconcile.php` also runs this same
file against *real* databases that took the full historical migration path, where all 7 genuinely exist.
Since MySQL 5.7 has no version of "drop column if it exists," replaced the plain `ALTER TABLE ... DROP
COLUMN` block with a temporary stored procedure that checks `INFORMATION_SCHEMA.COLUMNS` before each drop
via dynamic SQL (`PREPARE`/`EXECUTE`), then drops the procedure again at the end. Confirmed this doesn't
need a `DELIMITER` change — `setup_database.php` and `reconcile.php` both send the whole file to the
server via `PDO::exec()`'s multi-statement support, which lets the server's own parser (not a naive
client-side semicolon split) correctly handle the `BEGIN...END` body as one statement.

**Also fixed:** `scripts/exclude.txt` now excludes `crm-api/create_test_users.php` from
`build-api-archive.bat`'s zip (no CLI guard, no reason to ship a test-account-creation script with zero
auth to production), and a new `crm-api/Database/.htaccess` (`Require all denied`) was added so future
rebuilds automatically lock down the entire `Database/` folder — `setup_database.php`,
`run_all_migrations.php`, and 4 other maintenance scripts in there had zero CLI guard and zero `.htaccess`
protection, meaning anyone who found the URL could trigger a destructive DB wipe with no login required.
(`reconcile.php` was the only script in that folder that already guarded itself with a `PHP_SAPI !==
'cli'` check.) For the deployment already in progress, the client was walked through creating this same
`.htaccess` live and deleting `create_test_users.php` from the server manually, immediately after the
one successful `setup_database.php` run — not before, since the run itself needs the folder open.

### Live verification (not just code review)
Both fixes tested end-to-end against fresh throwaway local databases (MariaDB 10.4 — doesn't reproduce
the exact 5.7 failure, but confirms the new SQL is at minimum not broken and the conditional-drop
procedure logic is sound): `APP_ENV=production` run completed clean (313/2,999/4,848 catalog counts, exactly
1 user, correct `files` column state — the 3 real Drive columns dropped, the 4 never-added ones correctly
skipped with no error, temp procedure cleaned up afterward, `reminders` table gone). `APP_ENV=development`
run also completed clean, all 14 dev-fixture users have valid `'{}'` `preferences` (zero NULLs). Both
scratch databases dropped after; `crm-api/.env` diffed byte-for-byte back to its original content.

**`CLAUDE.md` corrected** — the Tech Stack table's "MySQL target: 8.4 LTS" row now documents the
confirmed-live 5.7.23 version and a list of MySQL-8.0-only constructs to avoid in any future migration,
so this class of bug doesn't recur.

### Files touched
- `crm-api/Database/schema.sql`
- `crm-api/Database/migrations/030_create_user_preferences_table.sql`
- `crm-api/Database/migrations/084_remove_reminder_drive_backup_features.sql`
- `crm-api/Controllers/StudentController.php`
- `crm-api/Controllers/LeadsController.php`
- `crm-api/Controllers/SubAgentController.php`
- `crm-api/Controllers/RegistrationController.php`
- `scripts/exclude.txt`
- `crm-api/Database/.htaccess` (new)
- `CLAUDE.md`

### Still open
Client needs to re-upload the 7 fixed PHP/SQL files (schema.sql, migrations/030, migrations/084, and the
4 controllers) to the live server, overwriting the already-uploaded copies, then re-hit
`setup_database.php`'s URL once more, then immediately lock the `Database/` folder down and delete
`create_test_users.php` as planned before this compatibility issue was hit. Cron job setup (Unit 6 of
`DEPLOYMENT_MASTER_RUNBOOK.md`) still hasn't been done either.

---

## Proactive MySQL 5.7 Audit — CTEs and Window Functions (2026-07-16, same day)

**Trigger:** Client asked to confirm nothing else was broken before re-attempting deployment. Given the
MySQL 5.7 discovery above, a full codebase scan (not just `crm-api/Database/*.sql`, but every raw SQL
string in every `.php` file) was run for other MySQL-8.0-only constructs, since local MariaDB 10.4
wouldn't have caught anything that only gets exercised by a specific endpoint rather than by
`setup_database.php`'s fresh-install sequence.

### What was found — three real, would-have-broken-in-production instances
MySQL 5.7 has **zero** CTE support (not even non-recursive `WITH`, let alone `WITH RECURSIVE`) and no
window functions. All three were live, reachable application code, not migration-time DDL:

1. **`CommissionModel::validateAgentChain()`** — `WITH RECURSIVE agent_chain AS (...)`, walking from a
   student's agent up to root to authorize commission actions. The single most business-critical of the
   three (commission creation/authorization runs through this on every call).
2. **`AdminAgentController::getTree()`** — `WITH RECURSIVE agent_tree AS (...)`, the admin agent-hierarchy
   tree view.
3. **`AdminReportsController::agents()` / `universities()`** — `WITH agent_metrics AS (...) ... RANK()
   OVER (...)` and `WITH uni_metrics AS (...)`, the agent/university performance leaderboards.

### What changed
- **`CommissionModel.php`** — recursive CTE replaced with a bounded self-join (`agents a0 LEFT JOIN
  agents a1 ... LEFT JOIN agents a2 ...`), safe because the agent hierarchy is hard-capped at 3 tiers
  (confirmed live: `MAX(tier) = 3`), so root is at most 2 `parent_agent_id` hops from any agent.
- **`AdminAgentController.php`** — first attempt replaced the recursive CTE with a flat
  `WHERE root_agent_id = ?` query (the project's own documented O(1)-subtree pattern). **Caught by
  empirical testing before shipping:** comparing old-vs-new output against real data found
  `root_agent_id` is NOT reliably populated — one real agent (tier 1, id 4) has `root_agent_id = NULL`
  instead of self-referencing, and its child inherited the NULL. Corrected to a bounded 3-level
  `UNION ALL` (self + children + grandchildren) walking `parent_agent_id` instead — confirmed zero
  orphaned `parent_agent_id` references across the whole table, unlike `root_agent_id`'s one real gap.
- **`AdminReportsController.php`** (both `agents()` and `universities()`) — CTEs became plain derived
  subqueries (functionally identical, always supported). `RANK() OVER (...)` became the classic MySQL
  user-variable running-counter (`@tga_rank := @tga_rank + 1`), deliberately wrapped so the counter only
  runs against an already-`ORDER BY`'d-and-`LIMIT`'d derived table — assigning a variable in the same
  query as the `ORDER BY` is a known MySQL footgun where the assignment can run before the sort applies.

### Live verification (not just code review) — old vs new query output diffed on real data
- `AdminAgentController::getTree` — compared old recursive-CTE output against the new bounded-UNION
  output for 2 different real tier-1 agents (including the one with the deepest real hierarchy, 5 total
  agents across all 3 tiers). Byte-identical both times, confirmed only after correcting the
  `root_agent_id` false start above.
- `CommissionModel::validateAgentChain` — compared the full valid-agent-chain set (old recursive CTE vs
  new bounded self-join) for **all 10** real students that have an assigned agent. Exact match on every
  single one.
- `AdminReportsController::agents()` — old CTE+`RANK()OVER` vs new derived-subquery+variable-counter,
  identical output including `rank_position`.
- `AdminReportsController::universities()` — old CTE vs new derived subquery, all 307 rows identical.

### Files touched
- `crm-api/Models/CommissionModel.php`
- `crm-api/Controllers/AdminAgentController.php`
- `crm-api/Controllers/AdminReportsController.php`

### Still open
These 3 files are additional files the client needs to re-upload (on top of the 7 from the fix above)
before re-attempting `setup_database.php` — though note these 3 aren't read by the setup script itself,
so technically the DB setup would succeed without them; they only matter once real users start hitting
commission/report/agent-tree endpoints. Best uploaded together with the rest to avoid a second round of
"something else broke" discovered live in production.

---

## Live Deployment Retry #2 — Collation Mismatch in the Migration 084 Procedure (2026-07-16, same day)

**Trigger:** Client re-uploaded the fixed files and re-ran `setup_database.php`. Progress: schema.sql
through migration 083 all succeeded (confirming the earlier fixes work), but migration 084 — the new
conditional-drop stored procedure from the first fix round — failed with a different error:
`SQLSTATE[HY000]: General error: 1267 Illegal mix of collations (utf8_general_ci,IMPLICIT) and
(utf8_unicode_ci,IMPLICIT) for operation '='`.

### Root cause
`INFORMATION_SCHEMA.COLUMNS`'s `TABLE_NAME`/`COLUMN_NAME` string columns carry MySQL's internal system
collation. The stored procedure's typed `IN` parameters (`p_table VARCHAR(64)`, `p_column VARCHAR(64)`)
get IMPLICIT collation derivation from the database's collation (`utf8mb4_unicode_ci`) — comparing two
IMPLICIT-derivation strings with different collations is exactly what triggers MySQL error 1267. This is
a well-known MySQL quirk specific to comparing stored-routine variables against `INFORMATION_SCHEMA`;
did **not** reproduce locally on MariaDB 10.4 (more lenient about this), so this could only be found by
an actual production run, not local testing — same limitation already noted for the underlying MySQL 5.7
version gap.

### Fix
Added `BINARY` to both sides of the `TABLE_NAME`/`COLUMN_NAME` comparisons in
`migrations/084_remove_reminder_drive_backup_features.sql`'s procedure — forces a byte-for-byte
comparison, sidestepping collation entirely. Safe because every table/column name in this codebase is
plain ASCII snake_case. Checked `reconcile.php`'s three similar-looking `INFORMATION_SCHEMA` lookups
(`tableExists`, `tableHasColumn`, `columnIsNullable`) — those use plain PDO `?` bound parameters, not
stored-procedure variables, which are typically COERCIBLE-derivation (not IMPLICIT) and much less likely
to trigger this specific error. Left untouched rather than speculatively "fixed" since `reconcile.php`
isn't part of today's blocked path — noted here in case it ever throws the same error in the future, in
which case apply the same `BINARY` fix.

### Live verification
Re-ran the full `setup_database.php` flow against a fresh throwaway local DB — completed with no errors,
migration 084 applied cleanly, `files` table columns in the correct end state (3 real Drive columns
dropped, 4 never-added ones correctly skipped), temp procedure cleaned up. Scratch DB dropped after;
`.env` restored exactly.

### Files touched
- `crm-api/Database/migrations/084_remove_reminder_drive_backup_features.sql`

### Still open
Client needs to re-upload just this one file (nothing else changed this round) and re-run
`setup_database.php` once more.

---

## Live Deployment — Database Setup Succeeded; Cron Setup In Progress (2026-07-16, same day)

`setup_database.php` completed successfully on the live server (313/2,999/4,848 catalog counts, super
admin created, login confirmed working). Client locked down `crm-api/Database/.htaccess` and deleted
`create_test_users.php` per the earlier plan.

**Another unverified-assumption gap found while setting up the cron job:** cPanel's MultiPHP Manager
screenshot showed the account's actual PHP version is **8.3** (`ea-php83`), not 8.2.12 as `CLAUDE.md`
previously stated — same class of gap as the MySQL version row (assumed from local dev, never checked
against the real hosting account). No compatibility issue found — the app had already run successfully
under PHP 8.3 (the database setup and login both happened before this was noticed) — this was a
documentation correction only. Fixed: `CLAUDE.md`'s Tech Stack PHP row, and every `ea-php82` reference in
`README.md`, `DEPLOYMENT_MASTER_RUNBOOK.md`, and `PRODUCTION_SETUP_RUNBOOK.md` → `ea-php83`.

### Files touched
- `CLAUDE.md`
- `README.md`
- `Implementation_development _docs/DEPLOYMENT_MASTER_RUNBOOK.md`
- `Implementation_development _docs/PRODUCTION_SETUP_RUNBOOK.md`

### Still open
Recurring cron job (`cron/scheduler.php`, once a minute, via `ea-php83`) not yet added — in progress.
Final verification pass (Unit 7: smoke test, deep-link routing check, live notification trigger) still
pending after that.

---

## Live Deployment — Cron Running But `send-notifications.php` Failing Every Run (2026-07-16, same day)

**Trigger:** Recurring cron added successfully (`scheduler.php` firing every minute via `ea-php83` at the
correct `/home2/lidglcmy/apply.theglobalavenues.com/` path). `scheduler.log` showed
`check-sla-breaches.php`, `generate-snapshots.php`, and `monitor-disk.php` all running clean, but
`send-notifications.php` failing with exit code 1 on every single run.

### Root cause — a fourth MySQL-5.7-assumption bug, and a silent-failure bug found alongside it
`Database::supportsSkipLocked()` checked for MariaDB explicitly (correct logic), but for *any other*
server unconditionally returned `true` — assuming real MySQL always supports `FOR UPDATE SKIP LOCKED`
(added in MySQL 8.0). Production is MySQL 5.7.23, which doesn't have it, so
`send-notifications.php`'s query threw a syntax error every run, caught by its try/catch, logged via
`CronHealth::failure()`, then `exit(1)` — visible in the scheduler log as expected.

**Found while investigating: `check-sla-breaches.php` uses the exact same broken function and the exact
same query pattern, but its catch block never calls `exit(1)`** — so it was hitting the identical syntax
error on every run, but exiting 0 anyway. **This means SLA breach detection had been silently completely
non-functional since go-live, with the scheduler log showing nothing wrong.** Would not have been caught
without deliberately tracing why the two scripts share code but only one showed an error.

Also checked `monitor-disk.php` — no SKIP LOCKED usage (not currently broken), but had the same missing
`exit(1)` gap, so any *future* failure there would also go unnoticed.

### Fix
- `Database::supportsSkipLocked()` — added a real-MySQL branch: parses the major version number and
  requires `>= 8`. Verified the parsing logic directly against the exact production version string
  (`5.7.23-23`, Percona-style suffix) before touching the class — resolves to `false` as expected.
  Changed the unparseable-version fallback from `true` to `false` too — the two failure directions are
  not symmetric: omitting `SKIP LOCKED` when it's actually supported just means marginally less optimal
  locking under concurrency (still correct), while assuming it's supported when it isn't is a hard syntax
  error every time. Fail-safe direction was backwards before.
- `cron/check-sla-breaches.php` and `cron/monitor-disk.php` — added `exit(1)` to their catch blocks,
  matching the pattern `send-notifications.php`/`generate-snapshots.php` already used. `archive-old-logs.php`
  has the same gap but is intentionally unscheduled dead code (per the 2026-07-08 product decision), left
  untouched.

### Live verification
Ran all three fixed scripts directly against the real local database (not a throwaway one — this is these
scripts' normal, non-destructive designed operation): all three exited 0, and `cron_health` shows genuine
successful work, not just "didn't crash" — `send_notifications`: **41 real queued notifications actually
sent**, 0 failed, 9 deferred (time-budget, picked up next run — normal); `check_sla_breaches`: **1 real
breach correctly detected and processed**; `monitor_disk`: reported real disk usage (50.9%) cleanly.

### Files touched
- `crm-api/Config/Database.php`
- `cron/check-sla-breaches.php`
- `cron/monitor-disk.php`

### Still open
Client needs to re-upload these 3 files to the live server. No database or cron re-setup needed — just
these files, since the cron job itself is already correctly configured and running. After re-upload, watch
`cron/scheduler.log` for a minute or two to confirm `send-notifications.php` stops erroring.

**Resolved same day, confirmed live:** client re-uploaded the 3 files; `scheduler.log` now shows
`send-notifications.php` running with no error line across multiple consecutive minutes. All 4 real cron
jobs (notifications, SLA breaches, snapshots, disk monitor) are confirmed running clean on production.

---

## Live Deployment — Complete (2026-07-16)

Client confirmed full end-to-end verification passed (deep-link SPA routing works; a real notification
was queued and delivered via the cron pipeline within the expected ~1 minute window). First production
deployment is done.

**Deliberate decision, not a gap:** the public lead-capture endpoint (`POST /?route=public&action=leads`)
remains reachable with no authentication, even though nothing currently calls it (no public form exists
yet, and the admin Leads page is still behind the pre-existing "under development" notice from
2026-07-04). Client chose to leave it as-is rather than gate it — it's rate-limited, exposes no real user
data if hit directly, and is meant to stay ready for whenever the public form and admin page ship. Revisit
only if that calculus changes.

### Final state
- Database: seeded from `real_catalog_seed.sql` (313 universities / 2,999 courses / 4,848 intakes),
  1 super admin, `APP_ENV=production` (zero dev fixtures).
- `crm-api/Database/` locked down (`.htaccess` deny-all); `create_test_users.php` deleted from the server.
- Recurring cron (`cron/scheduler.php`, every minute via `ea-php83`) running clean — all 4 jobs verified
  actually working, not just "not crashing" (SLA breach detection in particular was silently broken until
  the `Database::supportsSkipLocked()` fix — see the entry above).
- Deployment zips (`crm-api.zip`, `dist.zip`, `cron.zip`, ~200 MB) blocked from public download via
  `.htaccess`; deletion deferred to a later cleanup pass, not urgent.
- Corrected two unverified-assumption gaps found along the way: production MySQL is 5.7.23 (not 8.4),
  production PHP is 8.3 (not 8.2.12) — both now documented accurately in `CLAUDE.md`.

### Total files touched across this whole deployment effort (for reference)
Catalog/setup: `real_catalog_seed.sql`, `setup_database.php` (tested, unchanged). MySQL 5.7 compatibility:
`schema.sql`, `migrations/030`, `migrations/084`, `StudentController.php`, `LeadsController.php`,
`SubAgentController.php`, `RegistrationController.php`, `CommissionModel.php`, `AdminAgentController.php`,
`AdminReportsController.php`, `Database.php`. Cron reliability: `check-sla-breaches.php`,
`monitor-disk.php`. Security: `crm-api/Database/.htaccess` (new), `scripts/exclude.txt`. Docs:
`CLAUDE.md`, `README.md`, `DEPLOYMENT_MASTER_RUNBOOK.md`, `PRODUCTION_SETUP_RUNBOOK.md`.

### Still open (non-blocking, whenever convenient)
- Delete the 3 deployment zips from the live document root (currently just `.htaccess`-blocked).
- The Leads/Commissions/Reports "under development" UI gate is a separate pre-existing item, unrelated to
  this deployment — revisit whenever that feature work is actually scheduled.

---

## Post-Launch Bug — In-App Notifications Showing Raw HTML (2026-07-16, same day)

**Trigger:** Client screenshotted the student portal's notification bell right after the first real
registration test — the welcome notification showed literal HTML markup (`<p style="margin:0 6px;...">`
etc.) as visible text instead of a readable message.

### Root cause
`NotificationService::fire()` rendered `body_template` once and inserted the *same* string for every
channel row (`email` and `in_app` alike). Most templates are HTML (tables, inline styles — migration
070's branding pass), correct for an email client but not for `NotificationCenter.tsx`, which renders
`notification.body` as plain text (`<p>{notification.body}</p>`, no `dangerouslySetInnerHTML`) — so the
in_app row showed raw markup as literal text. Rendering the HTML instead wasn't the right fix either — a
notification-bell dropdown was never going to look right hosting a full-width email template.

### Fix
- `NotificationService::fire()` now generates a separate plain-text body specifically for the `in_app`
  channel via `MailService::toPlainText()` (already existed, already used for the email's PHPMailer
  `AltBody` fallback) — `email` rows keep the original HTML unchanged.
- `MailService::toPlainText()` itself improved along the way: it only stripped tags, leaving HTML
  entities (`&#8594;` arrows from the branded templates) undecoded and long runs of blank lines from
  stripped table/div wrappers. Added `html_entity_decode()` and blank-line collapsing — this also quietly
  improves the *existing* email AltBody output, not just the new in_app path.

### Live verification
Called `NotificationService::fire('student.registered', ...)` directly against the real local database
(not a mock) and inspected the actual stored rows: `email` channel unchanged (full HTML), `in_app`
channel now clean readable plain text with arrows decoded and no excess blank lines. Test rows deleted
afterward.

### Files touched
- `crm-api/Services/NotificationService.php`
- `crm-api/Services/MailService.php`

### Still open
Client needs to re-upload these 2 files. Existing already-stored notification rows (raw HTML) aren't
retroactively fixed by this change — only affects rows created after the fix is live. Local DB has 154
old rows with this issue (harmless test data, not backfilled). Production likely has just the one test
student's welcome notification shown in the screenshot — low-stakes enough to just ignore/delete rather
than write a backfill script for one row.

---

## CI/CD — GitHub Actions Build Verification Pipeline (2026-07-20)

**Trigger:** No automated check existed anywhere between "code compiles locally" and "it's live on
Bluehost." Client asked for CI/CD that eases the workflow and gives visible proof of work, without risking
production — deployment stays 100% manual per `DEPLOYMENT_MASTER_RUNBOOK.md` (no SSH on Bluehost, only
cPanel File Manager), so automating the actual deploy was explicitly ruled out for now.

### What was built
New `.github/workflows/ci.yml`, triggered on push/PR to `main` plus manual `workflow_dispatch`. Five jobs:
- `frontend-build` — `npm ci` + `npm run build` (Vite), uploads `dist/` as a workflow artifact
- `backend-verify` — matrix over PHP 8.2 (local dev) and 8.3 (production), `composer validate` +
  `composer install` + `php -l` syntax lint across every file in `crm-api/` and `cron/`
- `mysql-5-7-schema-check` — spins up a real `mysql:5.7` service container and runs
  `crm-api/Database/setup_database.php` (full schema 001–081 + real catalog seed) against it end to end.
  Targets this project's single most repeated bug category (MySQL-8-only syntax slipping through because
  local dev runs MariaDB — see the four 2026-07-16 entries above)
- `package-api-archive` — replicates `scripts/build-api-archive.bat` / `scripts/exclude.txt` exactly,
  uploads `build-api.zip` as a workflow artifact once lint + schema checks pass
- README badge added showing live CI status

### Two real bugs found while wiring this up (neither was a CI mistake)
1. **`typescript` isn't a dependency of this project at all.** `npx tsc --noEmit` silently resolved to an
   unrelated npm package (`tsc@2.0.4`, a joke package, not the compiler) instead of failing loudly. Forcing
   the real compiler in (pinned, since unpinned `npx --package typescript` grabbed TypeScript 7.0.2 — a
   bleeding-edge major version that rejects this project's `tsconfig.json` outright over a removed
   `baseUrl` option) surfaced **90 pre-existing type errors** across `src/`. Vite's build never
   type-checks (esbuild just strips types), which is why none of this has ever blocked anything. A strict
   `tsc` gate was deliberately **not** added to CI — it would go permanently red for reasons unrelated to
   any future change, and fixing 90 type errors is a separate, much larger piece of work than "set up
   CI." CI verifies `npm run build` only, matching what the project actually relies on today.
2. **`openspout/openspout` 4.0.0's own `composer.json` declares support only for PHP `~8.0.0 || ~8.1.0`** —
   not 8.2 or 8.3, both of which are real environments here (local dev, production). A plain
   `composer install` fails immediately on either. This is latent, not currently live, because the deploy
   process never runs `composer install` on the Bluehost server — `vendor/` ships pre-built inside
   `build-api.zip`. CI uses `--ignore-platform-reqs` to work around it without touching `composer.json`/
   `composer.lock` (an application dependency decision, out of scope for this change). Worth a deliberate
   decision later: bump openspout, or confirm/pin that the installed version genuinely works fine on 8.2/8.3
   despite its own metadata.

### Verification
Built and iterated on a scratch branch (`ci/github-actions-setup`) via a throwaway PR specifically so
the workflow could be proven green before ever touching `main` — not a shift to a PR-based habit going
forward, just how a first-time CI file gets safely tested. All 5 jobs went green three times in a row
(twice on the PR after the two fixes above, once more on `main` itself after merging, confirming the
push-triggered path works independently of the PR-triggered path). Downloaded `build-api.zip` from a green
run and diffed its contents against `scripts/exclude.txt` byte-for-byte — 250 files, no `.env`, `.git`,
`tests/`, or `create_test_users.php` leaked in. `frontend-dist` artifact upload also succeeded (its own
job step passed); local inspection was skipped after repeated sandbox network timeouts, since `npm run
build` has no partial-success state — it either produces valid output or the job fails outright, and the
job passed. PR #11 merged as a fast-forward, scratch branch deleted (local + remote).

### Files touched
- `.github/workflows/ci.yml` (new)
- `README.md` (CI badge added)

### Explicitly not done (by design, confirmed with client first)
- No FTP/SSH auto-deploy to Bluehost — deployment stays fully manual per the runbook
- No branch protection / required PRs — client keeps pushing directly to `main`; CI just reports
  pass/fail after the fact
- No new lint tooling (no ESLint config exists in this project; not introduced here)
- `composer.json`/`composer.lock` not modified despite the openspout finding above

### Noticed, not touched
- `pnpm-lock.yaml` is stale (older than `package-lock.json`; nothing in the documented workflow uses pnpm)
- Three `claude/*` branches in the repo all point to old commit `0b69852`, already superseded on `main` —
  look abandoned
- README's pre-existing MySQL badge still says "8.4" (already flagged as stale in `CLAUDE.md`; unrelated
  to this change, only noticed while editing the adjacent badge row)
