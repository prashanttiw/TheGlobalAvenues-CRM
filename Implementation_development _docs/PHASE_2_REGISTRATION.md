# PHASE 2 — Registration, Authentication & User Onboarding
## Student Registration · Agent Onboarding · Sub-Agent Creation · Admin User Management · Forgot Password · OTP Login

---

## BUILDER DIRECTIVE — READ THIS FIRST

This document gives you architecture and specifications for Phase 2.
It does not tell you everything. That is intentional.

**ABSOLUTE RULE — DO NOT TOUCH THE MARKETING WEBSITE:**
The following files and folders must never be modified in this phase or any phase
unless explicitly instructed with a separate brief:
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
src/components/home/         (all marketing home sections)
src/components/layout/       (marketing header, footer, WhatsApp button)
src/data/                    (all TGA data files)
src/styles/theme.css         (only touch if explicitly told to)
```
Dashboard work (student, agent, admin portals) is completely separate from
the marketing website. Never bleed changes between them.

**MINIMAL FRONTEND PRINCIPLE (from Phase 1 AI Memory Directive):**
Do NOT make major changes to the frontend. ONLY build the minimal frontend
parts that are absolutely necessary to support backend integrations.
Dashboard design and full UI comes in Phase 3. Here we wire data.

**Before writing any code — research:**
- PHP Argon2id memory/time/thread cost settings appropriate for shared hosting
  (wrong settings = very slow logins on low-CPU shared environments)
- `sodium_crypto_secretbox` — confirm nonce byte length and correct usage on PHP 8.2.12
- Cross-origin HttpOnly cookie behaviour: Vercel (frontend) ↔ Bluehost (API)
  Refresh token in HttpOnly cookie requires: SameSite=None; Secure — research if
  Bluehost shared hosting supports this or if a workaround is needed
- React Hook Form v7 + Zod resolver — check for known issues with multi-step forms
- sessionStorage behaviour across same-origin tabs (relevant for autosave)
- Bluehost SMTP sending limits and SPF/DKIM requirements for OTP delivery in 2026
- Password reset token security: signed token vs OTP — research current best practice
- Rate limiting bypass techniques and whether the Phase 1 atomic implementation covers them

**If you find something better — implement it and document it in BUILDER RESEARCH NOTES.**

**Must not change without human review:**
- 3-entry-point registration (self / agent / admin)
- OTP always goes to the real student's email regardless of who fills the form
- Agent registration requires admin approval before any dashboard access
- 3-level agent tree cap, parent_agent_id + root_agent_id structure
- Encrypted storage for email, phone, passport_number (XSalsa20-Poly1305)
- Marketing website files (listed above)

---

## BUILDER RESEARCH NOTES
*(Completed by research audit — 2026-06-24)*

| Topic researched | What you found | What you changed |
|---|---|---|
| **Argon2id settings for shared hosting** | PHP defaults (64 MiB memory, 4 iterations) are too heavy for Bluehost shared hosting. OWASP minimum: `memory_cost=19456` (19 MiB), `time_cost=2`, `threads=1`. Target 100–300ms per hash. | Always pass explicit options array to `password_hash()`. Added `argon2_memory_cost` and `argon2_time_cost` to `system_settings` seeds for runtime tuning. See PHASE_2_APPEND.md §RF-01. |
| **Cross-origin HttpOnly cookie (Vercel ↔ Bluehost)** | Bluehost shared hosting DOES support `SameSite=None; Secure` cookies when serving over HTTPS. CORS must set explicit `Access-Control-Allow-Origin` (never wildcard) + `Access-Control-Allow-Credentials: true` + handle OPTIONS preflight. Cookie `Path` should be `/api/auth/refresh` only (not `/`). | Use PHP `setcookie()` array syntax. Restrict cookie path. Ensure CORS config is confirmed before Phase 2 deploy. See PHASE_2_APPEND.md §RF-02. |
| **PHP sessions on Bluehost shared hosting** | Default file-based PHP sessions stored in shared `/tmp` — cross-tenant read risk on shared hosting. Database-backed sessions are significantly safer. | **DEVIATION FROM SPEC**: Do NOT use PHP sessions for pending registration data. Use a `pending_registrations` DB table instead. Data is `EncryptionService::encrypt()`-ed before storage. Client receives an opaque SHA-256-keyed token. See PHASE_2_APPEND.md §RF-03 and §AD-01. |
| **Rate limiting bypass techniques** | IP rotation, X-Forwarded-For spoofing, and distributed attacks can defeat pure IP-based rate limits. Phase 1 `RateLimitMiddleware` has no `Retry-After` header, no dual-key limiting, and trusts raw `REMOTE_ADDR`. | Add `Retry-After` header to all 429 responses. Implement dual-key rate limiting (IP + email_hash, whichever is stricter) for login and forgot-password. Guard against X-Forwarded-For spoofing — only trust Cloudflare `CF-Connecting-IP` if behind Cloudflare. See PHASE_2_APPEND.md §RF-04. |
| **Account enumeration via timing attacks** | `AuthController::login()` returns early when user not found — before calling `password_verify()`. Measurable timing difference allows email enumeration. Phase 2 forgot-password correctly returns generic messages, but login does not. | Add a static `DUMMY_ARGON2_HASH` constant. Always run `password_verify()` against it even when user not found, ensuring constant-time responses. See PHASE_2_APPEND.md §RF-05 and §SE-05. |
| **OTP brute force — return type granularity** | `OTPService::verify()` returns `bool`. Controllers cannot distinguish between "OTP not found", "OTP expired", and "brute force limit hit" — all return the same `false`. Frontend cannot show appropriate messages. | Change `OTPService::verify()` to return a PHP 8.1 `enum OTPResult { Valid, Invalid, Expired, BruteForced, NotFound }`. Controllers map enum to specific HTTP error codes. See PHASE_2_APPEND.md §RF-06. |
| **JWT reset token — single-use enforcement** | Industry standard: embed a `jti` in the reset token and mark it as "used" in a database store. Additionally, embedding a `pwd_h` fragment (first 12 chars of current password hash) invalidates the token if the user already changed their password. A separate `JWT_RESET_SECRET` prevents token substitution attacks. | Reset token uses `JWT_RESET_SECRET` (new env var), has `'typ' => 'password-reset'` claim, and has `pwd_h` claim. JTI stored in `otp_verifications` table with purpose `'reset_jti'` and consumed on use. No new table needed. See PHASE_2_APPEND.md §RF-07. |
| **React Hook Form v7 + Zod — multi-step architecture** | Most common mistake: multiple `useForm` instances per step (unmounting loses data). Correct: single `useForm` at wizard parent + `FormProvider`. Step validation via `form.trigger(['field1','field2'])` on Next click — NOT full schema validation. | Both registration wizards (student 4-step, agent 6-step) must use one `useForm` instance with `FormProvider`. Zod schemas are per-step, triggered selectively. sessionStorage autosave uses `getValues()`, excluding password/OTP fields. See PHASE_2_APPEND.md §RF-08. |
| **Bluehost SMTP limits** | Bluehost shared hosting email limit ~500/hour. Current `.env` uses Gmail SMTP with app password — Gmail limit ~500/day per account. SPF/DKIM required for `noreply@theglobalavenues.com`. | Keep Gmail SMTP for Phase 2 (startup scale acceptable). Phase 6 email dispatch cron must evaluate Mailgun or AWS SES for higher volume. Add `MAIL_FROM_DOMAIN` env var for SPF verification. See PHASE_2_APPEND.md §RF-09. |
| **Referral code collision avoidance** | Current do-while loop has no max-iteration guard. With TGA-XXX999 format (~10.6M combinations), collision risk is negligible at startup scale, but infinite loops in degenerate test cases are a concern. | Add max-iteration guard of 10 to the referral code generation loop. Throw a `RuntimeException` if exceeded. See PHASE_2_APPEND.md §RF-10. |
| **`agents.referral_code` UNIQUE constraint — CRITICAL BUG** | `referral_code VARCHAR(20) NOT NULL UNIQUE` with an implicit empty-string default means the SECOND pending agent registration will throw a MySQL unique constraint violation — breaking all agent onboarding. This is a Phase 1 bug. | **Migration required**: `ALTER TABLE agents MODIFY COLUMN referral_code VARCHAR(20) NULL` + re-add UNIQUE index. `UPDATE agents SET referral_code = NULL WHERE referral_code = ''`. See PHASE_2_APPEND.md §P1-BUG-07. |
| **`AuthController::login()` queries plaintext email — CRITICAL BUG** | `SELECT * FROM users WHERE email = ?` — but `users.email` is an encrypted BLOB. This will never find any user created by the Phase 2 registration flow. | Fix login to query `WHERE email_lookup_hash = EncryptionService::hash($email)`. See PHASE_2_APPEND.md §P1-BUG-01. |
| **`AuthController::refresh()` reads from JSON body — CRITICAL BUG** | `$refreshToken = $input['refresh_token'] ?? ''` reads from request body. The refresh token must be read from `$_COOKIE['refresh_token']`. This breaks the entire HttpOnly cookie security model. | Fix refresh() to read `$_COOKIE['refresh_token'] ?? ''`. See PHASE_2_APPEND.md §P1-BUG-03. |
| **`RouteRegistry` cannot handle parameterized routes** | RouteRegistry only supports static 2-segment paths (`/route/action`). Phase 2 requires `/admin/agents/:publicId/approve` (3+ segments with dynamic params). Admin approval endpoints are physically impossible to implement without this fix. | RouteRegistry must be extended to support parameterized routes before any admin routes can be written. See PHASE_2_APPEND.md §P1-BUG-09. |
| **`login()` column name mismatch — `utype` vs `user_type`** | `if ($user['utype'] === 'admin')` — but the DB column is `user_type`. Admin permissions never load on login. | Fix to `$user['user_type']`. See PHASE_2_APPEND.md §P1-BUG-02. |
| **Security events store plaintext email** | `security_events.identifier` stores the raw `$email` string in `otp_not_found` and `otp_brute_force` events. If the security_events table is compromised, all attacker-targeted emails are exposed in plaintext. | Store `EncryptionService::hash($email)` in the `identifier` field, not plaintext. The hash is sufficient for correlation in admin investigations. See PHASE_2_APPEND.md §SE-04. |
| **Password strength inconsistency across codebase** | `resetPasswordConfirm()` checks `strlen < 8` (Phase 1 stub). Phase 2 spec requires min 10 chars + uppercase + number + symbol. Rules are inconsistent. | Create a shared `PasswordValidator` service as the single source of truth. Called in student registration, agent registration, forgot-password reset, and password change. See PHASE_2_APPEND.md §SI-01. |
| **`users.two_factor_enabled` column missing** | `AuthController::login()` line 51 references `$user['two_factor_enabled']` but the `users` schema has no such column — produces PHP notices on every login. | Migration: `ALTER TABLE users ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0`. See PHASE_2_APPEND.md §P1-BUG-AF06. |
| **`agents.suspension_reason` column missing** | Notification template `agent.suspended` uses `{{suspension_reason}}` but no such column exists in the `agents` table. `NotificationService::fire()` would receive an empty variable. | Migration: `ALTER TABLE agents ADD COLUMN suspension_reason TEXT NULL`. See PHASE_2_APPEND.md §SI-03. |
| **Sub-agent status check must use fresh DB query** | Sub-agent creation spec checks `$creator['status']` — but this comes from the JWT payload which may be stale (agent approved/suspended between token issuance and request). `AuthMiddleware` checks `users.status` but NOT `agents.status`. | Sub-agent creation endpoint must always perform a fresh `SELECT status FROM agents WHERE user_id = ?` lookup, not trust JWT claims for agent-specific status. See PHASE_2_APPEND.md §SE-05. |
| **No login security event for suspended users** | When a suspended user attempts login, `AuthController` returns `ACCOUNT_INACTIVE` but logs no security event. Admin has zero visibility into suspended-user login attempts. | Log `SecurityEventLogger::log('login_blocked_suspended', ...)` before returning the error. See PHASE_2_APPEND.md §SE-06. |
| **`rate_limits` table has no cleanup — unbounded growth** | The `rate_limits` table grows indefinitely with every auth attempt. On Bluehost shared hosting with disk quotas, this is an operational risk. | Add `cleanup_rate_limits` job to `cron_health` seeds. The cron (Phase 6) should run `DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 2 HOUR)` periodically. See PHASE_2_APPEND.md §OP-01. |

---

## CONTEXT — WHAT PHASE 1 DELIVERED

**Phase 1 must be 100% audited before starting Phase 2.**

Phase 1 built and confirmed working:
- **38 tables** in MySQL 8.4 LTS (sequences, activity_logs_archive included)
- **EncryptionService** — `sodium_crypto_secretbox` (XSalsa20-Poly1305),
  version byte prefix, `sodium_memzero()` key wipe after every operation
- **UlidGenerator** — monotonic, 26-char, Crockford Base32
- **OTPService** — `FOR UPDATE` row lock, `hash_equals()` timing-safe, brute force logging
- **JWTService** extended with `jti` claim — validated on every request via `jti_hash`
  in `user_sessions` (enables instant revocation on account suspension)
- **AuthMiddleware** — validates Bearer token + JTI + user.status on every request
- **RBACMiddleware** — module/action check for admins,
  `assertAgentSubtreeAccess()` via `root_agent_id` for agents
- **BaseModel** — soft-delete scope + `States.php` intercepting invalid status strings
- **ApplicationStateManager** — explicit transition map
- **RateLimitMiddleware** — atomic `INSERT ... ON DUPLICATE KEY UPDATE`
- **Frontend** — Zustand memory-only auth store, HttpOnly cookie for refresh token,
  `ProtectedRoute`, `ModuleGuard`, `usePermission` hook, TanStack Query wired

**MySQL 8.4 LTS — use freely:**
CTEs (`WITH...AS`), window functions, enforced `CHECK` constraints,
`DEFAULT` expressions, `JSON_TABLE()`, `utf8mb4_unicode_ci`

**Key services available for Phase 2:**
```
EncryptionService::encrypt($value)       // XSalsa20-Poly1305
EncryptionService::decrypt($ciphertext)
EncryptionService::hash($value)          // SHA-256 for lookup hashes
UlidGenerator::generate()               // 26-char monotonic ULID
OTPService::generate($identifier, $purpose)  // returns plain 6-digit code
OTPService::verify($identifier, $code, $purpose)  // returns bool
ActivityLogger::log($action, $type, $id, $before, $after)
NotificationService::fire($event_key, $vars, $recipient_user_ids)
SecurityEventLogger::log($event_type, $user_id, $identifier, $ip, $ua, $details)
```

**HttpOnly cookie pattern (cross-origin):**
Refresh token set by PHP as `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=None; Path=/api/auth/refresh`
Frontend never reads refresh token. Axios sends it automatically on `/auth/refresh`.
This requires HTTPS on both ends. Confirm this is working before Phase 2 begins.

**Sequences table (for reference numbers):**
```php
$pdo->exec("INSERT INTO sequences (name, current_value) VALUES ('app_ref_2026', 1)
            ON DUPLICATE KEY UPDATE current_value = LAST_INSERT_ID(current_value + 1)");
$seq = $pdo->lastInsertId(); // Atomic — no race condition
return 'TGA-2026-' . str_pad($seq, 6, '0', STR_PAD_LEFT); // TGA-2026-000001
```

---

## WHAT PHASE 2 BUILDS

All authentication flows end-to-end:

1. **Student registration** — 4-step wizard, OTP verification, agent attachment
2. **Agent onboarding** — 6-step wizard, T&C acceptance, OTP, pending status
3. **Sub-agent creation** — by approved parent agent, same approval flow
4. **Admin user management** — super admin creates sub-admins, role assignment
5. **Agent approval workflow** — admin approves/rejects/suspends agents
6. **Forgot password** — OTP-based reset for all 3 user types
7. **OTP login** — passwordless login via email OTP (all user types)
8. **Password change** — authenticated user changes their own password
9. **Notification templates seeded** — 8 templates in DB for Phase 6 dispatch
10. **Frontend** — login fixed (Partner → Agent), registration wired to API,
    pending/rejected agent screens, admin user management and roles pages

---

## 2A. STUDENT REGISTRATION

### Three entry points, one endpoint

| Who fills the form | registered_by_type | Agent attached |
|---|---|---|
| Student themselves | `self` | Via referral code if entered |
| Agent on behalf of student | `agent` | Auto-attached to the creating agent |
| Admin/staff | `admin` | Via referral code or direct admin assignment |

In all cases: **OTP goes to the real student's email/phone — no exceptions.**
`registered_by_type` and `registered_by_id` are set server-side from the
JWT of whoever calls the endpoint. Client cannot spoof these values.

### Wizard steps and fields

**Step 1 — Basic Details**
- First Name (required)
- Last Name (required)
- Email Address (required — OTP goes here)
- Phone Number (optional)
- Password (min 10 chars, 1 uppercase, 1 number, 1 symbol)
- Confirm Password

**Step 2 — Personal Info**
- Date of Birth (required)
- Nationality (required, searchable dropdown)
- Passport Number (optional)
- Passport Expiry Date (optional)

**Step 3 — Lead Source**
- How did you hear about us? (required):
  `agent_referral | website | google | social_media | event | walk_in | other`
- Agent Referral Code (visible only when `agent_referral` selected):
  - Real-time validation on blur — lookup by referral_code, confirm status = 'approved'
  - Show agent name + agency name on successful lookup (student confirms attachment)
  - Invalid/suspended code: clear error, cannot proceed to Step 4

**Step 4 — OTP Verification**
- 6-digit code sent to Step 1 email
- 60-second countdown before resend is available
- Max 3 resends per registration session
- Expiry countdown shown in UI

### Autosave — sessionStorage

```ts
// src/features/auth/hooks/useRegistrationDraft.ts
const DRAFT_KEY = 'tga_student_reg_draft';

// Save on every step change (never save password or OTP):
const { password, confirm_password, ...safeData } = formData;
sessionStorage.setItem(DRAFT_KEY, JSON.stringify(safeData));

// Load on mount:
const saved = sessionStorage.getItem(DRAFT_KEY);
if (saved) showResumeBanner(); // "Continue where you left off?"

// Clear on success:
sessionStorage.removeItem(DRAFT_KEY);
```

Use `sessionStorage` — draft expires when tab closes (not persistent like localStorage).

### Zod schemas (per step)

Define in `src/features/auth/schemas/studentRegistration.ts`:

```ts
export const step1Schema = z.object({
  first_name: z.string().min(2, 'At least 2 characters'),
  last_name:  z.string().min(2, 'At least 2 characters'),
  email:      z.string().email('Enter a valid email address'),
  phone:      z.string().optional(),
  password: z.string()
    .min(10, 'Minimum 10 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a symbol'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match', path: ['confirm_password'],
});

export const step3Schema = z.object({
  lead_source: z.enum([
    'agent_referral','website','google',
    'social_media','event','walk_in','other',
  ]),
  referral_code: z.string().optional(),
}).refine(
  d => !(d.lead_source === 'agent_referral' && !d.referral_code?.trim()),
  { message: 'Agent referral code is required', path: ['referral_code'] }
);
```

Validate per-step on "Next" click. Validate individual fields on blur.
Never run full-form validation at once.

### Backend API routes

```
POST /api/v1/auth/register/student/validate-agent-code
POST /api/v1/auth/register/student/initiate
POST /api/v1/auth/register/student/verify-otp
```

**validate-agent-code:**
```
Input:  { "referral_code": "TGA-RKX492" }
Output: { "success": true, "data": { "agent_name": "Ravi Sharma", "agency_name": "Excel Abroad" } }
Logic:
  SELECT id, full_name, agency_name FROM agents
  WHERE referral_code = ? AND status = 'approved' AND deleted_at IS NULL
  Return ONLY full_name + agency_name — no other agent data exposed to frontend
Rate limit: 10 req/min per IP
```

**initiate:**
```
Input: { first_name, last_name, email, phone, password, date_of_birth, nationality,
         passport_number (opt), passport_expiry (opt), lead_source,
         referral_code (opt), notes (opt) }

Logic:
1. Server-side validate all fields
2. Hash email: EncryptionService::hash($email)
3. Check uniqueness: SELECT COUNT(*) FROM users WHERE email_lookup_hash = ?
   If exists → EMAIL_ALREADY_REGISTERED error
4. Validate referral_code if provided
5. OTPService::generate($email, 'registration') — returns plain 6-digit code
6. Store pending data server-side:
   Option A: PHP session (session_start())
   Option B: Short-lived signed JWT (15 min, separate signing key)
   Store under key: "reg_pending_{EncryptionService::hash($email)}"
   DO NOT create users or students rows yet
7. Send OTP email via PHPMailer
8. SecurityEventLogger::log('registration_initiated', null, $email, ...)
9. Return: { "success": true, "expires_in_minutes": 10 }

Rate limit: 3 req/hour per IP
```

**verify-otp:**
```
Input: { "email": "...", "otp_code": "482915" }
registration_data retrieved from server-side session — NOT from client input

Logic — entire block inside one PDO transaction:
1. OTPService::verify($email, $otp_code, 'registration') → bool
   false → OTP_INVALID or OTP_EXPIRED error (rollback, exit)
2. Retrieve pending data from server session
   Not found → SESSION_EXPIRED (ask to re-register)
3. Transaction:
   a. INSERT users:
      public_id = UlidGenerator::generate()
      email = EncryptionService::encrypt($email)
      email_lookup_hash = EncryptionService::hash($email)
      phone = EncryptionService::encrypt($phone) if provided, else NULL
      phone_lookup_hash = EncryptionService::hash($phone) if provided, else NULL
      password_hash = password_hash($password, PASSWORD_ARGON2ID)
      user_type = 'student', status = 'active'

   b. INSERT students:
      public_id = UlidGenerator::generate()
      user_id = (new users.id)
      full_name = "{first_name} {last_name}"
      date_of_birth, nationality
      passport_number = EncryptionService::encrypt($passport) if provided
      lead_source, referral_agent_code
      registered_by_type (from JWT if agent/admin, else 'self')
      registered_by_id (from JWT user id, else null)
      agent_lock_status = 'open'
      profile_status = 'registered'

   c. If valid referral_code provided:
      SELECT id FROM agents WHERE referral_code = ? AND status = 'approved'
      UPDATE students SET agent_id = {agent.id}

   d. INSERT user_preferences (user_id, preferences = '{}')

4. ActivityLogger::log('student.registered', 'student', $student->id, ...)
5. NotificationService::fire('student.registered', $vars,
     [$user_id, ...$agentChainUserIds])
6. Issue JWT with jti + set HttpOnly refresh cookie
7. Return: { access_token, user_type: 'student', public_id }

On ANY failure inside transaction → ROLLBACK
No partial rows ever created
```

---

## 2B. AGENT ONBOARDING

### Wizard steps

**Step 1** — Agency Name, Country, Partnership Scope (textarea, required)
**Step 2** — Full Name, Contact Email, Phone (all required)
**Step 3** — Business Registration Number (optional), Recruitment description (optional)
**Step 4** — Password + Confirm Password
**Step 5** — T&C acceptance (2 required checkboxes, scrollable full text)
**Step 6** — OTP Verification

Autosave: `tga_agent_reg_draft` in sessionStorage. Never save password.

### Backend routes

```
POST /api/v1/auth/register/agent/initiate
POST /api/v1/auth/register/agent/verify-otp
```

**verify-otp (transaction):**
```
1. OTPService::verify($email, $otp_code, 'registration')
2. INSERT users: user_type='agent', status='pending'
3. INSERT agents:
   public_id = UlidGenerator::generate()
   tier = 1
   parent_agent_id = NULL
   root_agent_id = NULL  ← updated in next step
   status = 'pending'
   referral_code = ''    ← blank until admin approves
   terms_accepted_at = NOW()
4. UPDATE agents SET root_agent_id = id WHERE id = {new_id}
   (Level 1 agents: root = self)
5. INSERT user_preferences
6. ActivityLogger::log('agent.onboarding_submitted', ...)
7. NotificationService::fire('agent.onboarding_submitted', $vars, [$superAdminUserIds])

Return: { "success": true, "status": "pending_approval" }
NO JWT issued. Pending agents have zero dashboard access.
```

### Login behaviour for non-active agents

```php
// AuthController::login() — after password verified, before issuing JWT:
if ($user['user_type'] === 'agent') {
    $agent = AgentModel::findByUserId($user['id']);
    match($agent['status']) {
        'pending'   => Response::success([
                         'account_status' => 'pending_approval',
                         'submitted_at'   => $agent['created_at'],
                       ], 'Your application is under review'),    // HTTP 200, no JWT
        'rejected'  => Response::success([
                         'account_status'   => 'rejected',
                         'rejection_reason' => $agent['rejected_reason'],
                       ], 'Application not approved'),            // HTTP 200, no JWT
        'suspended' => Response::error('ACCOUNT_SUSPENDED',
                         'Account suspended. Contact support.', [], 403),
        default     => null // 'approved' — continue normal JWT flow
    };
}
```

---

## 2C. ADMIN — AGENT APPROVAL WORKFLOW

```
GET  /api/v1/admin/agents/pending            ModuleGuard: agents.approve
POST /api/v1/admin/agents/:publicId/approve  ModuleGuard: agents.approve
POST /api/v1/admin/agents/:publicId/reject   ModuleGuard: agents.approve
POST /api/v1/admin/agents/:publicId/suspend  ModuleGuard: agents.delete
```

**Approve:**
```php
// Generate unique referral code:
do {
    $code = 'TGA-' . strtoupper(substr(str_shuffle('ABCDEFGHJKMNPQRSTVWXYZ'), 0, 3))
                   . str_pad(random_int(0, 999), 3, '0', STR_PAD_LEFT);
} while (AgentModel::referralCodeExists($code));

// UPDATE agents SET status='approved', referral_code=?, approved_by=?, approved_at=NOW()
// UPDATE users SET status='active'
// ActivityLogger::log('agent.approved', ...)
// NotificationService::fire('agent.approved', ['referral_code' => $code, ...], [$agentUserId])
```

**Reject:**
```php
// Input: { "reason": "..." }
// UPDATE agents SET status='rejected', rejected_reason=?
// UPDATE users SET status='pending'
// ActivityLogger::log('agent.rejected', ...)
// NotificationService::fire('agent.rejected', ['rejection_reason' => $reason], [$agentUserId])
```

**Suspend:**
```php
// Input: { "reason": "..." }
// UPDATE agents SET status='suspended'
// UPDATE users SET status='suspended'
// Revoke all JTIs instantly:
// UPDATE user_sessions SET revoked_at = NOW()
//   WHERE user_id = $agent->user_id AND revoked_at IS NULL
// SecurityEventLogger::log('account_suspended', ...)
// ActivityLogger::log('agent.suspended', ...)
// NotificationService::fire('agent.suspended', [...], [$agentUserId])
```

---

## 2D. SUB-AGENT CREATION

Route: `POST /api/v1/agent/sub-agents/invite` (RoleGuard: agent, status=approved)

**PHP rules — enforced in code:**
```php
if ($creator['status'] !== 'approved')
    → 403 AGENT_NOT_APPROVED

if ($creator['tier'] >= 3)
    → 403 TIER_LIMIT_REACHED "Maximum depth is 3 levels"

$new['tier']            = $creator['tier'] + 1;
$new['parent_agent_id'] = $creator['id'];
$new['root_agent_id']   = $creator['root_agent_id'];
$new['status']          = 'pending';
$new['referral_code']   = ''; // blank until admin approval
```

Same admin approval flow as Level 1 agent.
Creating agent sees pending sub-agent in their team view immediately.

---

## 2E. FORGOT PASSWORD (all 3 user types)

This works identically for students, agents, and admins.
OTP-based — no magic links (simpler, no token storage, no expiry URL concerns).

### Routes

```
POST /api/v1/auth/forgot-password
POST /api/v1/auth/forgot-password/verify-otp
POST /api/v1/auth/forgot-password/reset
```

**forgot-password:**
```
Input: { "email": "..." }

Logic:
1. hash = EncryptionService::hash($email)
2. SELECT * FROM users WHERE email_lookup_hash = ? AND deleted_at IS NULL
3. If NOT found: still return success (prevents email enumeration)
   "If an account exists, you will receive an OTP"
4. If found and status = 'suspended': still return generic success
   (suspended users should not know their account exists)
5. If found and active: OTPService::generate($email, 'password_reset')
   Send OTP email with subject "Reset Your TGA Password"
6. SecurityEventLogger::log('password_reset_requested', $user['id'], $email, ...)
7. Return: { "success": true, "message": "If an account exists, check your email" }

Rate limit: 3 req/hour per email hash
```

**verify-otp:**
```
Input: { "email": "...", "otp_code": "..." }

Logic:
1. OTPService::verify($email, $otp_code, 'password_reset') → bool
2. If false: return OTP_INVALID
3. If true: generate a short-lived reset token (signed JWT, 15 min, separate key)
   Store: reset_token = JWT({ email_hash, purpose: 'password_reset', jti: unique })
4. Return: { "reset_token": "..." }
   (this token authorises the actual password change in next step)
```

**reset:**
```
Input: { "reset_token": "...", "new_password": "...", "confirm_password": "..." }

Logic:
1. Verify reset_token JWT signature and expiry
2. Validate new_password meets strength requirements (same as registration)
3. Confirm new_password === confirm_password
4. Find user by email_hash from token
5. password_hash($new_password, PASSWORD_ARGON2ID)
6. UPDATE users SET password_hash = ?
7. Revoke ALL active sessions for this user (force re-login everywhere):
   UPDATE user_sessions SET revoked_at = NOW()
   WHERE user_id = ? AND revoked_at IS NULL
8. Invalidate the reset_token (mark jti as used in a separate store or in otp_verifications)
9. SecurityEventLogger::log('password_reset_completed', $user['id'], ...)
10. ActivityLogger::log('user.password_reset', 'user', $user['id'], ...)
11. Return: { "success": true, "message": "Password updated. Please log in again." }
    DO NOT auto-login — require fresh login for security
```

---

## 2F. OTP LOGIN (passwordless)

Available for all 3 user types. User chooses "OTP Secure Login" tab on login page.

### Routes

```
POST /api/v1/auth/otp-login/request   (same as forgot-password but for login purpose)
POST /api/v1/auth/otp-login/verify
```

**request:**
```
Input: { "email": "..." }
Logic:
1. Find user by email_lookup_hash
2. If not found or suspended: generic response (no enumeration)
3. OTPService::generate($email, 'login')
4. Send email: "Your TGA Login Code: {code} — valid for 10 minutes"
5. Return: { "success": true }
Rate limit: 3 req/hour per email hash
```

**verify:**
```
Input: { "email": "...", "otp_code": "..." }
Logic:
1. OTPService::verify($email, $otp_code, 'login')
2. Find user, check status = 'active'
3. Same post-login flow as password login:
   - Check agent approval status if agent
   - Count/manage sessions
   - Issue JWT with jti
   - Set HttpOnly refresh cookie
4. SecurityEventLogger::log('login_success', $user['id'], $email, ...)
5. Return: { access_token, user_type, public_id }
```

---

## 2G. PASSWORD CHANGE (authenticated user)

For any logged-in user who wants to change their password from their profile.

### Route

```
POST /api/v1/auth/change-password
Protected: requires valid JWT
```

```
Input: { "current_password": "...", "new_password": "...", "confirm_password": "..." }

Logic:
1. Get user from JWT
2. password_verify($current_password, $user['password_hash'])
   If false → INCORRECT_CURRENT_PASSWORD error
3. Validate new_password strength
4. Confirm new_password === confirm_password
5. Ensure new_password !== current_password (no point changing to the same one)
6. UPDATE users SET password_hash = password_hash($new_password, PASSWORD_ARGON2ID)
7. Revoke all OTHER sessions (keep current session active):
   UPDATE user_sessions SET revoked_at = NOW()
   WHERE user_id = ? AND public_id != {current_session_public_id} AND revoked_at IS NULL
8. ActivityLogger::log('user.password_changed', 'user', $user['id'], ...)
9. Return: { "success": true, "message": "Password changed" }
```

---

## 2H. ADMIN USER MANAGEMENT

Super admin only. Sub-admins cannot create other admins.

### Routes

```
GET    /api/v1/admin/users              ModuleGuard: user_management.view
POST   /api/v1/admin/users              Super admin PHP guard
PUT    /api/v1/admin/users/:publicId    Super admin PHP guard
DELETE /api/v1/admin/users/:publicId    Super admin PHP guard

GET    /api/v1/admin/roles              ModuleGuard: user_management.view
POST   /api/v1/admin/roles              Super admin PHP guard
PUT    /api/v1/admin/roles/:publicId    Super admin PHP guard
DELETE /api/v1/admin/roles/:publicId    Super admin PHP guard
```

### Super admin hard guards (in every write operation):
```php
// Cannot modify self:
if ($target['user_id'] === $requestingUserId)
    → 403 "You cannot modify your own admin account via API"

// Cannot touch another super admin:
if ($target['is_super_admin'] === 1)
    → 403 "Super admin accounts are protected"

// Strip is_super_admin from input — never settable via API:
unset($input['is_super_admin']);
```

### Create admin:
```php
// 1. Encrypt email, check uniqueness
// 2. INSERT users (user_type='admin', status='active')
// 3. INSERT admins (is_super_admin=0, role_id=?)
// 4. INSERT user_preferences
// 5. Send welcome email via PHPMailer
// 6. ActivityLogger::log('admin.created', ...)
```

### Role management:
```php
// Create: INSERT roles → INSERT role_permissions for each (module, action)
// Update: DELETE FROM role_permissions WHERE role_id = ? → INSERT new set (in transaction)
//         Log before/after permission lists in activity_log
// Delete guard: if admins assigned → 409 ROLE_IN_USE with count
```

---

## 2I. RATE LIMITING — ALL AUTH ENDPOINTS

RateLimitMiddleware from Phase 1 (atomic INSERT ON DUPLICATE KEY UPDATE).
Apply to:

| Endpoint | Limit | Window |
|---|---|---|
| POST /auth/login | 10 requests | 15 minutes per IP |
| POST /auth/otp-login/request | 3 requests | 1 hour per email hash |
| POST /auth/otp-login/verify | 5 requests | 15 minutes per email hash |
| POST /auth/register/student/initiate | 3 requests | 1 hour per IP |
| POST /auth/register/agent/initiate | 3 requests | 1 hour per IP |
| POST /auth/forgot-password | 3 requests | 1 hour per email hash |
| POST /auth/forgot-password/verify-otp | 5 requests | 15 minutes per email hash |
| POST /auth/register/student/validate-agent-code | 10 requests | 1 minute per IP |

On 429: return HTTP 429, `Retry-After` header (seconds until window resets),
log `SecurityEvent: rate_limit_exceeded`.

---

## 2J. SECURITY EVENT LOGGING

Every auth security event writes to `security_events`:

| Trigger | event_type |
|---|---|
| Wrong password on login | `login_failed` |
| Successful login (any method) | `login_success` |
| OTP attempts exceeded max | `otp_brute_force` |
| Registration started | `registration_initiated` |
| Account created | `registration_completed` |
| Agent account suspended | `account_suspended` |
| Session manually revoked | `session_revoked` |
| Rate limit hit | `rate_limit_exceeded` |
| Password reset requested | `password_reset_requested` |
| Password reset completed | `password_reset_completed` |
| Password changed (authenticated) | `password_changed` |

---

## 2K. NOTIFICATION TEMPLATES — SEED THESE 8

Insert into `notification_templates` before Phase 6 dispatch is built.
`NotificationService::fire()` only writes to the `notifications` queue table.
Actual email/in-app dispatch is Phase 6's cron job.

```sql
INSERT INTO notification_templates
  (event_key, subject_template, body_template, channels, category) VALUES

('student.registered',
 'Welcome to The Global Avenues, {{student_name}}!',
 'Hi {{student_name}},\n\nYour TGA account is ready.\nLog in at: {{portal_url}}\n\nThe TGA Team',
 'email,in_app', 'system'),

('agent.onboarding_submitted',
 'New Partner Application: {{agency_name}}',
 'New agent application submitted.\nAgency: {{agency_name}}\nContact: {{full_name}}\nCountry: {{country}}\nReview: {{admin_url}}',
 'email,in_app', 'approvals'),

('agent.approved',
 'Your TGA Partnership Is Approved!',
 'Hi {{full_name}},\n\nWelcome to the TGA partner network!\n\nYour referral code: {{referral_code}}\nPortal: {{portal_url}}\n\nThe TGA Team',
 'email,in_app', 'system'),

('agent.rejected',
 'Update on Your TGA Partnership Application',
 'Hi {{full_name}},\n\nWe are unable to approve your application.\nReason: {{rejection_reason}}\n\nContact connect@theglobalavenues.com\n\nThe TGA Team',
 'email,in_app', 'system'),

('agent.suspended',
 'Your TGA Partner Account Has Been Suspended',
 'Hi {{full_name}},\n\nYour account has been suspended.\nReason: {{suspension_reason}}\n\nContact connect@theglobalavenues.com',
 'email', 'system'),

('subagent.created',
 'New Sub-Agent Application Under Your Account',
 'Hi {{parent_agent_name}},\n\nNew sub-agent pending TGA approval.\nName: {{subagent_name}}\nAgency: {{subagent_agency}}',
 'email,in_app', 'agent'),

('admin.created',
 'Your TGA Admin Account Is Ready',
 'Hi {{full_name}},\n\nYour TGA admin account has been created.\nPortal: {{portal_url}}\n\nThe TGA Team',
 'email', 'system'),

('password.reset_otp',
 'Reset Your TGA Password',
 'Hi,\n\nYour password reset code: {{otp_code}}\nValid for {{expiry_minutes}} minutes.\n\nIf you did not request this, ignore this email.',
 'email', 'security');
```

---

## 2L. FRONTEND — MINIMAL ONLY

**DO NOT TOUCH:** All marketing pages, components, data files listed at the top.
**DO NOT REDESIGN:** Portals get full design treatment in Phase 3, not here.

### 1. Fix "Partner" → "Agent" everywhere

```bash
grep -rn "Partner\|partner" src/ \
  --include="*.tsx" --include="*.ts" \
  --exclude-dir="node_modules"
```
Change only tab labels, placeholder text, headings.
Do not restructure any component for this change.

### 2. Login page — connect to real API

```ts
const loginMutation = useMutation({
  mutationFn: (data: LoginInput) => api.post('/auth/login', data),
  onSuccess: ({ data }) => {
    const { access_token, user_type, public_id, account_status } = data.data;
    if (account_status === 'pending_approval') { navigate('/agent/pending'); return; }
    if (account_status === 'rejected') { navigate('/agent/rejected'); return; }
    authStore.setAuth({ accessToken: access_token, userType: user_type, publicId: public_id });
    navigate({ student: '/student/', agent: '/agent/', admin: '/admin/' }[user_type]);
  },
  onError: (err: any) => setLoginError(err.response?.data?.message ?? 'Login failed'),
});
```

**OTP login tab:**
- Show email input → POST /auth/otp-login/request
- Show OTP input after send → POST /auth/otp-login/verify
- Same redirect logic as password login

### 3. Forgot password pages

Two minimal pages (no custom design — use existing form components):
- `/auth/forgot-password` — email input → request OTP
- `/auth/forgot-password/verify` — OTP input → verify → show new password form
- On success: "Password changed. Please log in." → redirect to login

### 4. Agent status pages (new, minimal)

`/agent/pending` — heading + submitted date + contact email + logout button
`/agent/rejected` — heading + rejection_reason + contact email + back to home

No sidebar on these pages. Use bare layout with TGA logo only.

### 5. Admin user management (wire to real API only)

`/admin/users` — table + create slide-over. Use existing DataTable, SlideOverPanel.
`/admin/roles` — role list + permissions matrix table.
Permissions matrix: `<table>` with rows = modules, columns = actions, checkboxes.
No custom styling beyond what already exists in the component library.

---

## BEFORE RUNNING THE AUDIT

1. Fill in BUILDER RESEARCH NOTES at top of this document
2. Confirm Phase 1 audit is 100% complete
3. Confirm HttpOnly cookie is set and received cross-origin (check browser devtools — Network tab → Set-Cookie header on login response)
4. Confirm Axios sends the cookie automatically on /auth/refresh (check Network tab)
5. Confirm encryption roundtrip: register with email → logout → login with same email (hash lookup must find the user)
6. Confirm JTI invalidation: suspend an agent → their existing access token must be rejected on the next API call

---

## PHASE 2 AUDIT CHECKLIST

### Student Registration:
- [ ] 4-step wizard completes successfully end to end
- [ ] OTP email arrives at the Step 1 email address
- [ ] Successful OTP creates `users` + `students` in one transaction
- [ ] Transaction mid-failure: no partial rows exist (rollback confirmed)
- [ ] `users.email` stored as encrypted BLOB (not plaintext)
- [ ] `users.email_lookup_hash` is SHA-256 of lowercase email (not encrypted)
- [ ] Login works after registration (lookup by hash, decrypt for display)
- [ ] Duplicate email registration returns EMAIL_ALREADY_REGISTERED
- [ ] Valid agent code: `students.agent_id` set correctly after registration
- [ ] Invalid agent code: error shown at Step 3, cannot proceed
- [ ] `profile_status` = 'registered' on creation
- [ ] `agent_lock_status` = 'open' on creation
- [ ] `registered_by_type` = 'self' for self-registration
- [ ] `public_id` on both `users` and `students` rows are valid 26-char ULIDs
- [ ] Password hash starts with `$argon2id$`
- [ ] sessionStorage draft saves on step change (no password stored)
- [ ] sessionStorage draft clears after successful registration
- [ ] OTP resend available after 60 seconds, max 3 resends
- [ ] OTP blocks after system_settings max_attempts reached

### Agent Onboarding:
- [ ] 6-step wizard completes successfully
- [ ] `agents.status` = 'pending', `users.status` = 'pending' after registration
- [ ] `agents.referral_code` = '' (empty on pending)
- [ ] `agents.root_agent_id` = own `agents.id` (Level 1)
- [ ] `agents.tier` = 1
- [ ] `agents.terms_accepted_at` recorded
- [ ] Login by pending agent: HTTP 200 with `account_status: 'pending_approval'` (no JWT)
- [ ] Frontend shows /agent/pending (not dashboard)
- [ ] Admin notified via `notifications` queue (status: 'queued')

### Agent Approval:
- [ ] Admin approves: status → 'approved', referral_code generated (TGA-XXX999 format)
- [ ] Approval notification queued for agent
- [ ] Approved agent can login and reaches dashboard
- [ ] Admin rejects: `rejected_reason` stored, notification queued
- [ ] Rejected agent sees /agent/rejected on login attempt
- [ ] Admin suspends: all `user_sessions.revoked_at` set
- [ ] Suspended agent's active JWT rejected on next API call (JTI invalidated)
- [ ] `security_events` row: `account_suspended`

### Sub-Agent Creation:
- [ ] L1 → L2 sub-agent creation works
- [ ] L2 → L3 sub-agent creation works
- [ ] L3 attempting to create sub-agent: 403 TIER_LIMIT_REACHED
- [ ] Sub-agent `tier` = parent.tier + 1
- [ ] Sub-agent `parent_agent_id` = creating agent's id
- [ ] Sub-agent `root_agent_id` = creating agent's `root_agent_id`
- [ ] Sub-agent starts 'pending', requires admin approval

### Forgot Password:
- [ ] Request with unknown email returns generic success (no enumeration)
- [ ] Request with known email: OTP delivered, queued in notifications
- [ ] OTP verify with wrong code returns error
- [ ] OTP verify with correct code returns reset_token
- [ ] Reset with valid token + matching passwords: password updated (Argon2id hash)
- [ ] Reset revokes all sessions for that user
- [ ] Reset does not auto-login (requires fresh login)
- [ ] Reset with expired reset_token returns error
- [ ] rate limit: 4th forgot-password request in 1 hour → 429

### OTP Login:
- [ ] Request OTP: email not found → generic success (no enumeration)
- [ ] Request OTP: valid email → OTP queued in notifications
- [ ] Verify OTP: correct → JWT issued + HttpOnly cookie set
- [ ] Verify OTP: incorrect → error
- [ ] OTP login respects agent pending/rejected/suspended status checks

### Password Change (authenticated):
- [ ] Wrong current password → error
- [ ] Correct current password + valid new password → updated
- [ ] New hash starts with `$argon2id$`
- [ ] Other sessions revoked, current session stays active

### Admin User Management:
- [ ] Super admin creates sub-admin with role
- [ ] Sub-admin cannot create another admin (403)
- [ ] Sub-admin with `universities.view` only: 403 on /admin/commissions
- [ ] Super admin cannot be deleted (403)
- [ ] Deleting admin revokes all their sessions
- [ ] Role created: permissions saved in role_permissions
- [ ] Role update: old permissions fully replaced (not additive)
- [ ] Role delete blocked if any admins assigned (409 with count)

### Rate Limiting:
- [ ] 11th login attempt in 15 min: 429 with Retry-After header
- [ ] 4th forgot-password in 1 hour: 429
- [ ] Rate limit events logged to security_events

### Notifications:
- [ ] All 8 templates seeded in notification_templates
- [ ] NotificationService::fire() creates rows in notifications (status: 'queued')
- [ ] No emails actually sent (Phase 6 cron handles dispatch)

### Frontend:
- [ ] Zero instances of "Partner" as a tab label (grep confirms)
- [ ] Login connects to real API (no mock store calls)
- [ ] Forgot password flow works end to end
- [ ] OTP login tab works
- [ ] /agent/pending page renders
- [ ] /agent/rejected page renders
- [ ] Admin users table loads from API
- [ ] Role permissions matrix renders all modules × actions
- [ ] Marketing website pages completely untouched (git diff confirms no changes to listed files)
