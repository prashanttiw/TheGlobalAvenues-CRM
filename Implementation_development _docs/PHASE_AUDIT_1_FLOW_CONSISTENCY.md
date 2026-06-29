# TGA CRM — Flow Consistency Audit Report
## PHASE_AUDIT_1_FLOW_CONSISTENCY.md

**Audit date:** 2026-06-28  
**Auditor:** Claude Code (read-only session — zero code changes made)  
**Scope:** End-to-end audit of the live TGA CRM across frontend, backend, cron jobs, and the
interaction surfaces between them. This session touched no files except this report.

---

## Purpose

This report documents flow inconsistencies, stale assumptions, data integrity gaps, change-velocity
delays, and token/session security issues found during a systematic read of source files. Every
finding is written to a level of specificity sufficient for a separate tool (or engineer) to fix it
without needing further explanation from this session.

Findings are grouped by pattern category. Within each category, findings are ordered by severity
(Critical → High → Medium → Low).

---

## What Was Checked

| Area | Files Read | Coverage |
|------|-----------|---------|
| Auth / session / JWT | `AuthController.php` (full), `AuthMiddleware.php` (full), `JWTService.php` (first 80 lines), `useAuth.ts` (full), `LoginPage.tsx` (first 180 lines), `ProtectedRoute.tsx`, `api.ts` (first 300 lines) | Full token lifecycle, cookie handling, 2FA flow |
| Email / notification | `MailService.php` (full), `NotificationService.php` (first 80 lines), `send-notifications.php` (full), `OTPService.php` (full) | Both sync and queued email paths |
| File handling | `FileUploadService.php` (full), `FileController.php` (full), `DocumentController.php`, `DocumentRequestController.php` (full), `sync-drive.php` (full) | Upload, download, Drive sync, versioning |
| Agent lifecycle | `AdminAgentController.php` (full) | Approval, rejection, suspension, ID exposure |
| Frontend auth state | `useStore.ts` (legacy mock store), `useAuth.ts`, `LoginPage.tsx` | localStorage check, OTP stubs, token storage |
| Global error handling | `index.php` (full) | Exception handler, error exposure |
| Change velocity | `JWTService.php`, `AuthMiddleware.php` | Permission freshness |

## What Was NOT Checked

- `ApplicationController.php` — not read in this session (StateManager usage, application-level integer ID leaks may exist beyond what is already documented in F3)
- `AdminDashboardController.php`, `AdminReportsController.php` — snapshot staleness not verified at source
- `RegistrationController.php` — only first 100 lines read before context cutoff
- `StudentController.php`, `AgentController.php`, `CommissionController.php` — not read
- `SystemSettings.php` — dual-layer cache invalidation on permission change not verified
- Route-level permission checks in `AdminRoutes.php`, `AgentRoutes.php` — not checked for ad-hoc bypasses
- `RateLimitMiddleware.php` — rate-limit logic details not verified

Any controller or service not listed above may contain additional instances of the patterns documented here (especially F3 integer ID leakage, which is systemic).

---

## Already-Fixed Issues — Not Re-Reported

The following were explicitly verified as already corrected in prior hotfix phases and are excluded
from this report:

- Phase 6: OTP synchronous dispatch via `MailService::sendNow()` (§6.14)
- Phase 6: Orphaned `pending_registration` cleanup on OTP failure (§6.15)
- Phase 6: `ActivityLogger` wrong column names (`metadata`/`entity_id` → `target_type`/`target_id`) (§6.5)
- Phase 6: `NotificationService` using `Database::connect()` instead of `getConnection()` (§6.1)
- Phase 6: `FileController` download using `file_path` instead of `storage_path` (§6.7)
- Phase 6: `FOR UPDATE SKIP LOCKED` rows not marked `processing` before commit (§RF-P6-01)
- Phase 7: `AuthMiddleware::requireAuth()` missing (§7 CRITICAL)
- Phase 7: JWT `sub` not duplicated to `id` in decoded payload (§7 HIGH)
- Phase 8: Non-cumulative funnel / Cartesian JOIN in snapshots (§8 CRITICAL/HIGH)
- Phase 9: Apache `.htaccess` missing `RewriteEngine On` (§9.1)
- Phase 9: DB credentials leaking through PDOException stack trace (§9 CRITICAL ISSUE 2)
- Phase 9: `jwt_min_iat` global JWT revocation added to `AuthMiddleware` (§9 HIGH ISSUE 6)

---

## Findings

---

### PATTERN 1 — Inconsistent Mechanisms for the Same Job

---

**Finding 1: SMTP HTML body rendered differently in sync vs. queued email paths**

```
Pattern:     Pattern 1 — Inconsistent mechanisms
Severity:    High
Where:       cron/send-notifications.php  lines 55–65 (queued path)
             crm-api/Services/MailService.php  sendNow() method (sync path)
```

**What's actually happening:**

The queued path (cron `send-notifications.php`) processes the HTML email body at line 61 as:
```php
$htmlBody = nl2br(htmlspecialchars($body, ENT_QUOTES, 'UTF-8'));
```
This HTML-encodes all special characters and converts newlines to `<br>` tags.

The synchronous path (`MailService::sendNow()`) receives `$htmlBody` as a parameter and passes it
directly to `$mail->Body` with no transformation. Whatever the caller passes is what gets sent.

The OTP caller (`OTPService::generateAndSend()`) constructs a plain-text message string and passes
it as `$htmlBody`. Because no `nl2br`/`htmlspecialchars` is applied in the sync path, the rendering
in a real email client depends entirely on whether the caller happened to pre-format for HTML.

**Why this is a problem:**

Notification templates and OTP messages can appear correctly in queued batch emails while rendering
broken (or insecure) in synchronous OTP and reset emails — or vice versa. If a template body contains
user-controlled content (e.g., an inserted name or email), the sync path skips HTML encoding, creating
a cross-site scripting vector in HTML-capable email clients.

**How to fix:**

Pick one encoding contract and apply it in a single place. The correct approach: move the
`nl2br(htmlspecialchars(...))` call into `MailService::createMailer()` or a dedicated
`buildHtmlBody(string $rawBody): string` method in `MailService`. Both `sendNow()` and the queued
cron should call this helper so the transformation is applied once, consistently, before
`$mail->Body` is set. Mark `sendNow()`'s `$htmlBody` param as "plain text in" — apply HTML encoding
inside `sendNow()` before assigning to PHPMailer.

**Phase this belongs to:** Phase 6 (email / notification infrastructure)

**How to verify the fix worked:**

1. Send an OTP email and a queued notification email using the same template body containing `&`, `<`,
   and newlines.
2. Both emails should display identically with entities encoded and newlines rendered as line breaks.
3. Confirm no raw `&` or `<` characters appear as literals in the HTML source of either email.

---

**Finding 2: SMTP fallback in cron bypasses `MailService::createMailer()` — single source of truth broken**

```
Pattern:     Pattern 1 — Inconsistent mechanisms
Severity:    High
Where:       cron/send-notifications.php  lines 69–90 (fallback path)
             crm-api/Services/MailService.php  createMailer() method (primary config source)
```

**What's actually happening:**

The primary SMTP send path in `send-notifications.php` correctly calls
`MailService::createMailer()`, which reads all SMTP settings from environment variables. This is the
single authoritative config source.

The fallback path (triggered when primary send fails) instantiates `new PHPMailer(true)` inline and
re-configures SMTP host, port, username, password, encryption, and sender directly using
`Environment::get(...)` calls. This is a separate, independent config block that duplicates all the
same settings.

**Why this is a problem:**

Any SMTP configuration change (new host, changed credentials, TLS settings, the `MAIL_FALLBACK_HOST`
introduced in Phase 9) must be made in two places. If `MailService::createMailer()` is updated to
add a new header, change connection timeout, or handle the fallback host, the cron fallback block
will silently remain on the old behaviour. The fallback is also the path most likely to be exercised
during a primary SMTP outage — exactly when correct config matters most.

**How to fix:**

Replace the inline fallback PHPMailer instantiation with a second call to `MailService::createMailer()`
(or a `MailService::createFallbackMailer()` variant that internally reads `MAIL_FALLBACK_HOST`).
The goal is that all SMTP configuration flows through one method, regardless of which email path
is being exercised.

**Phase this belongs to:** Phase 6 / Phase 9 (email infrastructure + SMTP failover)

**How to verify the fix worked:**

Force a primary SMTP failure (temporarily set an invalid `MAIL_HOST`) and confirm a notification is
still delivered via the fallback path. Then change a setting in `MailService::createMailer()` (e.g.,
connection timeout) and confirm the change is reflected when the fallback fires.

---

**Finding 8: Two `DocumentRequestController` review methods do the same job, one missing all side effects**

```
Pattern:     Pattern 1 — Inconsistent mechanisms
Severity:    High
Where:       crm-api/Controllers/DocumentRequestController.php
             Method: adminReview(string $pid)  — full implementation
             Method: reviewDocument()          — incomplete duplicate
```

**What's actually happening:**

`adminReview(string $pid)` is the complete review handler. It:
- Changes document request status (`approved` / returned to `requested`)
- Calls `ActivityLogger::log()` to record the review action
- Calls `SLAService::resolveEvent()` on approval to close the SLA timer
- Fires `NotificationService::fire(...)` to notify the student

`reviewDocument()` performs the same status change but does none of the above. No activity log
entry, no SLA resolution, no student notification.

Both methods are active in the codebase and appear to be routable. It is not clear which route
currently dispatches to which method.

**Why this is a problem:**

If any route points to `reviewDocument()`, document reviews conducted through that path:
1. Leave no audit trail (silent to the admin activity feed)
2. Never resolve the open SLA event (SLA timer keeps running forever on a "resolved" doc request)
3. Never notify the student that their document was approved or returned

This is a silent data integrity issue — the system looks correct externally while the underlying
state is inconsistent.

**How to fix:**

1. Confirm which routes call which method (check `DocumentRequestRoutes` or equivalent route file).
2. Delete `reviewDocument()` entirely.
3. Ensure all routes that called it now point to `adminReview(string $pid)`.
4. Verify `adminReview()` handles both the `approved` and `rejected`→`requested` transitions with
   correct notifications for each case.

**Phase this belongs to:** Phase 4 / Phase 6 (document requests + notification infrastructure)

**How to verify the fix worked:**

1. Submit a document as a student.
2. Review (approve and reject) it as admin.
3. Confirm: `activity_logs` contains the review event; the SLA event row shows `resolved`; the
   student receives a notification.

---

**Finding 9: Agent file resubmission skips version tracking that student resubmission uses**

```
Pattern:     Pattern 1 — Inconsistent mechanisms
Severity:    Medium
Where:       crm-api/Controllers/DocumentRequestController.php
             Method: studentSubmit()  — correct versioning
             Method: agentSubmit()    line ~120 — no versioning
```

**What's actually happening:**

`studentSubmit()` correctly implements file versioning:
1. Fetches the previous file record
2. Increments `version_number`
3. Sets `superseded_at = NOW()` on the old file record
4. Passes `$versionNumber` and `$previousVersionId` to `FileUploadService::upload()`

`agentSubmit()` simply overwrites `submitted_file_id` on the document request with the new file ID.
The previous file version is still in the `files` table but has no `superseded_at` timestamp and no
link indicating it was replaced. The old file effectively becomes an orphan with no provenance chain.

**Why this is a problem:**

The auditing story for agent-submitted documents is broken. If a compliance review needs to
reconstruct "what document was submitted when, and by whom," agent-submitted resubmissions only show
the final version. An agent could overwrite a suspicious document with a clean one, and the
intermediate version would be untrackable.

**How to fix:**

Apply the same versioning logic in `agentSubmit()` that `studentSubmit()` uses:
1. Before calling `FileUploadService::upload()`, fetch the current `submitted_file_id`
2. Increment version number
3. Mark the old file's `superseded_at = NOW()`
4. Pass version and previous-version ID to `FileUploadService::upload()`

**Phase this belongs to:** Phase 4 (document requests)

**How to verify the fix worked:**

1. An agent submits a document for an open document request.
2. Agent resubmits with a different file.
3. Query `SELECT * FROM files WHERE id IN (old_id, new_id)`: old file should have
   `superseded_at` set; new file should have `version_number = 2` and `previous_version_id = old_id`.

---

### PATTERN 2 — Stale Assumptions Left Over From Before Hotfixes

---

**Finding 13: Mock OTP bypass stubs remain active in `useStore.ts`**

```
Pattern:     Pattern 2 — Stale assumptions
Severity:    Low
Where:       src/hooks/useStore.ts  sendOTP() and verifyOTP() methods (lines ~350–360 approx)
```

**What's actually happening:**

`useStore.ts` is the legacy Zustand store, confirmed by PHASE_2_APPEND to no longer be the
production auth store (that is `useAuth.ts`). However, the legacy store still contains:

```typescript
sendOTP: async (_email) => { return '123456'; }
verifyOTP: async (email, code) => { return code === '123456'; }
```

These return hardcoded OTP values that unconditionally accept `'123456'` as a valid code.

These functions are not imported in any production component (confirmed by audit-time grep), but they
exist in an importable module. `LoginPage.tsx` imports `useStore` for `setCurrentUser`,
`upsertStudentRecord`, and `upsertAgentRecord` — the OTP stubs ride along in the same module.

**Why this is a problem:**

Any developer or AI tool that reaches for `sendOTP`/`verifyOTP` from `useStore` (e.g., adding a
new registration page without checking which store is correct) gets a mock that looks functional but
accepts any code where `code === '123456'`. The import path (`'../hooks/useStore'`) is shorter than
the correct auth path (`'../shared/hooks/useAuth'`), making accidental use plausible during rapid
development.

**How to fix:**

Option A (preferred): Remove `sendOTP` and `verifyOTP` entirely from `useStore.ts`. OTP flows must
go through `api.ts` functions (`requestOtpLogin`, `verifyOtpLogin`, etc.).

Option B: Add a `throw new Error('Not implemented — use api.ts OTP functions')` body to both
stubs so any accidental use causes an immediate, visible failure rather than a silent bypass.

**Phase this belongs to:** Phase 2 (auth / OTP)

**How to verify the fix worked:**

Grep for `sendOTP|verifyOTP` in `src/` — should return zero matches. Or confirm the stubs throw
on any call by testing a component that accidentally invokes one.

---

### PATTERN 3 — Data Integrity Gaps in File Handling

---

**Finding 10: Filesystem cleanup failure after upload is silently swallowed**

```
Pattern:     Pattern 3 — Data integrity gaps
Severity:    Medium
Where:       crm-api/Services/FileUploadService.php  lines 135–139
             upload() catch block
```

**What's actually happening:**

After `move_uploaded_file()` succeeds and the file is on disk at its final path, `FileUploadService`
attempts a DB INSERT. If the INSERT fails, the catch block tries to clean up:

```php
} catch (\Exception $e) {
    @unlink($absoluteTarget);
    throw $e;
}
```

The `@` error-suppression operator silences any failure from `unlink()`. If `unlink()` fails (file
already moved, permissions issue, path mismatch), the error is discarded. The catch block re-throws
the original DB exception — the caller sees a DB error, not a "file stranded on disk" error, and has
no way to know cleanup failed.

**Why this is a problem:**

A failed DB INSERT followed by a failed `unlink()` leaves a file permanently on disk with no
corresponding `files` table row. The file is:
- Not accessible to any user (no DB row to reference it)
- Not included in Drive sync (sync reads the DB)
- Not included in backup retention cleanup
- Not discoverable without a full `storage/private/` or `uploads/public/` directory scan

Over time, these orphaned files consume disk space silently. More importantly, if the file contains
sensitive PII (passport scans, bank statements), it sits on the server indefinitely with no record
of its existence or expiry.

**How to fix:**

Remove the `@` suppressor. If `unlink()` fails, log the absolute path with `error_log()` and/or
`ActivityLogger::log()` so an operator can manually remove it. Consider also adding a separate
orphaned-file scanner cron (or extending `monitor-disk.php`) that cross-references `storage/private/`
directory contents against `files.storage_path` and flags mismatches.

**Phase this belongs to:** Phase 3 (file management)

**How to verify the fix worked:**

Force a DB INSERT failure after a successful `move_uploaded_file()` (e.g., temporarily drop a NOT
NULL constraint). Confirm that `unlink()` is attempted, that any failure is logged with the file
path, and that the PHP error log contains the path of the stranded file.

---

**Finding 11: Drive sync marks files as `synced` without verifying upload content integrity**

```
Pattern:     Pattern 3 — Data integrity gaps
Severity:    Medium
Where:       cron/sync-drive.php  lines 108–116
```

**What's actually happening:**

After a chunked Drive upload completes, the script checks:

```php
if ($result && $result->getId()) {
    $pdo->prepare("UPDATE files SET drive_file_id=?, drive_sync_status='synced' ...")->execute([...]);
}
```

The check is: did the Drive API return a file object with an ID? If yes, mark as `synced`.

The local `files.checksum_sha256` column contains the SHA-256 hash of the file at the time it was
uploaded and stored locally. No comparison is made between that hash and the data that reached
Drive. The Drive API does not verify content integrity by default — it confirms delivery of chunks
but not byte-level correctness.

**Why this is a problem:**

A corrupted or truncated file can be marked `drive_sync_status = 'synced'` while the Drive copy
differs from the local copy. If the local file is ever deleted (e.g., by a future disk-cleanup
cron, or disk failure), the Drive backup would be the only copy — and it would be silently corrupt.
This defeats the purpose of the Drive backup.

**How to fix:**

After the upload completes and before marking `synced`, use the Drive API to read the uploaded
file's MD5 checksum from Drive metadata (`$result->getMd5Checksum()`) and compare it to the locally
computed SHA-256. Note: Drive returns MD5, not SHA-256, so you would need to either (a) compute
MD5 of the local file during upload alongside SHA-256, or (b) download the Drive file header and
re-hash it. The simplest approach: compute MD5 locally before upload (`md5_file($absolutePath)`)
and store it temporarily; compare against `$result->getMd5Checksum()` before marking synced. If
they differ, mark `drive_sync_status = 'failed'` and log.

**Phase this belongs to:** Phase 6 (Drive sync)

**How to verify the fix worked:**

Corrupt a file byte on disk after computing its stored checksum, re-queue it for Drive sync, and
confirm that the sync job marks it `failed` (or reports a checksum mismatch) rather than `synced`.

---

### STEP 0 — Change Velocity

---

**Finding 7: RBAC permission changes take up to 15 minutes to enforce on already-logged-in users**

```
Pattern:     Step 0 — Change velocity
Severity:    High
Where:       crm-api/Services/JWTService.php  issueToken() — perms embedded at issuance
             crm-api/Middleware/AuthMiddleware.php  user() — no per-request DB permission check
```

**What's actually happening:**

At login (and at token refresh), `JWTService::issueToken()` embeds the user's current RBAC
permissions into the JWT payload as a `perms` array. `AuthMiddleware::user()` validates the JWT
signature, checks `jwt_min_iat` global revocation, and verifies the JTI session — but it does NOT
re-fetch permissions from the `roles`/`permissions`/`role_permissions` tables on each request.
`RBACMiddleware::requirePermission()` checks the permissions from the already-decoded JWT payload.

If a `super_admin` modifies a sub-admin's permissions (e.g., removes `agents.approve`), the
sub-admin's current access token continues to carry `agents.approve` in its `perms` array until
that token expires (`JWT_ACCESS_EXPIRY = 900` seconds, i.e., 15 minutes).

The agent suspension flow (`AdminAgentController::suspend()`) is unaffected — it sets
`users.status = 'suspended'` which `AuthMiddleware` re-checks live on every request. But permission
changes (not status changes) have no equivalent live check.

**Why this is a problem:**

An admin whose `agents.approve` permission has just been revoked by a super_admin can continue to
approve or reject agent onboarding applications for up to 15 minutes after the revocation. In a
compliance context (ICEF certification), this window is a risk — the same window applies to any
sensitive permission including document approval, commission confirmation, and student reassignment.

**How to fix:**

Option A (minimal change): When a permission is changed for a role or user, call the existing
global-revocation mechanism — update `system_settings.jwt_min_iat` to `NOW()` for that user's
tokens. This forces an immediate token refresh on their next request, at which point permissions are
re-fetched. Implementation: `JWTService::revokeUserTokens($userId)` or a targeted
`user_sessions.revoked_at` flush (which `suspend()` already does at line 197–200).

Option B (per-request check): Add a lightweight DB query in `AuthMiddleware::user()` to re-load
permissions from `role_permissions` + `roles` for the current user on every request. Adds one JOIN
per API call but eliminates the stale-permission window entirely.

Option A is appropriate here — the revoke-sessions approach is already battle-tested by the
suspension flow.

**Phase this belongs to:** Phase 2 / Phase 7 (RBAC + auth middleware)

**How to verify the fix worked:**

1. Admin A is logged in with `agents.approve` permission.
2. Super admin revokes that permission.
3. Admin A immediately attempts to approve an agent — confirm HTTP 403 (not 200).
4. Without the fix, step 3 returns 200 for up to 15 minutes.

---

**Finding 14: No real-time push for admin action queue — concurrent admins operate on stale state**

```
Pattern:     Step 0 — Change velocity
Severity:    Medium
Where:       src/pages/admin/AdminDashboardPage.tsx (and all admin list pages)
             Architecture: no WebSocket, no SSE, no polling interval configured
```

**What's actually happening:**

All admin data — pending agent approvals, pending document requests, pending reassignment requests,
pending commission confirmations — is fetched via TanStack Query on page load and on explicit refetch.
There is no real-time push mechanism (WebSocket, Server-Sent Events, or short polling interval).

If two admins are simultaneously working the same queue, Admin A sees "5 pending agents." Admin B
approves one — now there are 4. Admin A's screen still shows 5. If Admin A also tries to approve the
same agent that Admin B just approved, Admin B's approval already changed the status to `approved`,
and Admin A's approval hits the `already approved` guard in `AdminAgentController::approve()`.
This guard exists, so no data corruption occurs. But Admin A gets a confusing error with no
explanation of why.

**Why this is a problem:**

While data integrity is preserved by DB-level guards, the user experience for concurrent admin
sessions is silent staleness. In a busy intake period (multiple staff approving 50+ agent
applications), every second admin action could fail with a cryptic "already approved" error.
Worse, for actions without guards (e.g., duplicate internal note creation, duplicate commission
creation), there may be no protection at all.

**How to fix:**

Short-term: Add a `refetchInterval` (e.g., 30–60 seconds) to TanStack Query calls that back pending
action queues, so at least the stale window is bounded. This requires no backend changes.

Medium-term: Implement an SSE endpoint (`/notifications/stream`) that pushes a lightweight event
`{type: 'queue_changed', entity: 'agents'}` whenever an agent status changes. The admin frontend
subscribes on mount and calls `queryClient.invalidateQueries(['pending-agents'])` on receipt.
This keeps queues live without WebSocket infrastructure.

**Phase this belongs to:** Phase 7 (admin portal)

**How to verify the fix worked:**

Two browser sessions logged in as different admins. Admin A loads the pending agent list. Admin B
approves an agent. Within the configured interval (or immediately with SSE), Admin A's list
reflects the change without manual refresh.

---

### STEP 1 — Token / Session Security

---

**Finding 3: Integer row IDs exposed in API responses — violates ULID-everywhere policy**

```
Pattern:     Step 1 — Token/session security
Severity:    Critical
Where:       crm-api/Controllers/AuthController.php  buildUserResponse()  line 1094
             crm-api/Controllers/AdminAgentController.php  listAll()  lines 287–290
             crm-api/Controllers/AdminAgentController.php  getTree()  lines 349–352
             src/lib/api.ts  AuthUser type  line 127 (id: number)
             src/lib/api.ts  multiple other response types (StudentApplicationSummary.id,
                             AdminDashboardStats.pendingAgentsPreview[].id, AdminPipelineItem.id)
```

**What's actually happening:**

The project rule is: "Integer `id` never leaves the backend." All API responses must use `public_id`
(ULID).

`AuthController::buildUserResponse()` at line 1094 returns:
```php
'id' => (int) $user['id'],
```
This integer primary key is included in every login, refresh, and `/me` response.

`AdminAgentController::listAll()` (lines 287–290) and `getTree()` (lines 349–352) each do:
```php
$agent['id'] = (int)$agent['id'];
$agent['parent_agent_id'] = $agent['parent_agent_id'] ? (int)$agent['parent_agent_id'] : null;
$agent['root_agent_id'] = $agent['root_agent_id'] ? (int)$agent['root_agent_id'] : null;
```
All three are returned as integer fields in the JSON response.

On the frontend, `AuthUser.id: number` in `api.ts` line 127 confirms the integer is consumed and
typed. `LoginPage.tsx::syncLegacyProfileCache()` at line 55 uses `user.public_id || user.id` —
falling back to the integer when `public_id` is absent.

**Why this is a problem:**

Integer IDs:
1. Enable row-count enumeration (the largest `id` value reveals the approximate number of users,
   agents, etc.)
2. Enable sequential enumeration attacks (try id=1, id=2, etc. on any endpoint that mistakenly
   accepts integer ids)
3. Reveal business-sensitive metrics (e.g., "your agent ID is 12" reveals you are the 12th agent
   to join)

These risks are the exact reason ULIDs were chosen. The auth response is particularly sensitive
because every user receives it at login.

**How to fix:**

In `AuthController::buildUserResponse()`: remove the `'id'` key entirely. Ensure `'public_id'` is
present and that the frontend uses it. Search the frontend for all accesses of `user.id` and replace
with `user.public_id`.

In `AdminAgentController::listAll()` and `getTree()`: remove `$agent['id']` from the response
(only return `public_id`). Remove `parent_agent_id` and `root_agent_id` integer fields — if the
hierarchy UI needs them, replace with `parent_public_id` and `root_public_id` looked up from the
`agents` table.

Run a project-wide grep: `"'id' => \(int\)"` and `"id: number"` to find additional instances
in other controllers and frontend types.

**Phase this belongs to:** Cross-cutting (Phase 1 DB schema, Phase 2 auth, Phase 7 admin portal)

**How to verify the fix worked:**

Log in as any user role and inspect the full JSON response body. No field named `id` should be an
integer. All identity references in responses should be ULIDs (26 characters, Crockford Base32).

---

**Finding 4: Refresh token cookie path is `/crm-api` instead of `/api/auth/refresh`**

```
Pattern:     Step 1 — Token/session security
Severity:    High
Where:       crm-api/Controllers/AuthController.php  setRefreshCookie()  ~line 1186
             Spec: PHASE_2_APPEND.md §RF-02
```

**What's actually happening:**

`setRefreshCookie()` sets the `refresh_token` HttpOnly cookie with `'path' => '/crm-api'`. This
means the browser sends the `refresh_token` cookie on every request to any URL under `/crm-api/` —
including GET requests for student profiles, agent lists, file downloads, and every other API call.

The Phase 2 spec (§RF-02) requires the cookie path to be `/api/auth/refresh` (or the equivalent
narrow path), so the cookie is only sent when explicitly hitting the refresh endpoint.

**Why this is a problem:**

The refresh token has a 7-day expiry (vs. 15-minute access token expiry) and is the credential that
issues new access tokens. Sending it on every API request:
1. Significantly expands the CSRF attack surface — any endpoint reached by a cross-origin form
   submission or clickjacking attack now receives the long-lived refresh token
2. Exposes the refresh token to any logging or monitoring that captures raw HTTP headers
3. Makes every API endpoint a potential refresh-token extraction point in XSS scenarios

**How to fix:**

Change `'path' => '/crm-api'` to the narrowest possible path that still covers the refresh
endpoint. If the backend is mounted at `/crm-api/`, the refresh route action is
`route=auth&action=refresh`. Since PHP query-string routing means all requests hit the same
`/crm-api/index.php`, the cookie path cannot be narrowed to a specific action. Options:
1. Move the refresh endpoint to a dedicated script (e.g., `/crm-api/refresh.php`) and set the
   cookie path to `/crm-api/refresh.php`.
2. Accept that the path must cover the full backend but tighten CSRF protection on all state-
   changing endpoints (verify `Origin` + `Referer` headers in `Cors.php`).
3. Move to a double-submit CSRF token pattern for non-GET requests.

At minimum, document the current scope and ensure `Cors.php` validates `Origin` on all mutating
requests.

**Phase this belongs to:** Phase 2 (auth / cookie security)

**How to verify the fix worked:**

Open browser DevTools Network tab. After login, send an API request for (e.g.) student profile.
The `Cookie` header should NOT include `refresh_token`. Only the `/refresh` request should carry it.

---

**Finding 5: `AuthMiddleware` accepts access token from cookie as undocumented fallback**

```
Pattern:     Step 1 — Token/session security
Severity:    Medium
Where:       crm-api/Middleware/AuthMiddleware.php  user()  line 16
```

**What's actually happening:**

`AuthMiddleware::user()` begins with:
```php
$bearerToken = $this->getBearerToken();
$cookieToken = $_COOKIE['access_token'] ?? null;
$token = $bearerToken ?? $cookieToken;
```

If no `Authorization: Bearer` header is present, the middleware falls back to reading an
`access_token` cookie. The frontend never sets this cookie — access tokens live only in the
`useAuth` Zustand store's in-memory `token` field and are sent exclusively as `Authorization: Bearer`
headers via `api.ts`. But if an `access_token` cookie were ever set (by any code path, a bug, or
an attacker who can write cookies), all API endpoints would silently accept it.

**Why this is a problem:**

The security model assumes access tokens never touch cookies. Bearer-header-only transmission means
CSRF attacks cannot directly use the access token (because CSRF exploits cookie-only auth). Adding a
cookie fallback breaks this assumption. An XSS vulnerability on any same-origin page that could set
an `access_token` cookie would then allow CSRF attacks on all protected endpoints — the access token
would be sent automatically by the browser on every cross-origin form submission.

This is undocumented: no phase spec or CLAUDE.md mentions this fallback. It appears to be a
development convenience or oversight.

**How to fix:**

Remove the `$cookieToken` fallback entirely. `AuthMiddleware::user()` should only accept Bearer
tokens. If a future use case requires cookie-based auth (e.g., server-side file download links
where headers can't be set), that should be handled via a separate, dedicated signed-URL mechanism
rather than a generic Bearer fallback.

**Phase this belongs to:** Phase 2 / Phase 7 (auth middleware)

**How to verify the fix worked:**

Make an API request with no `Authorization` header but with an `access_token=<valid_token>` cookie.
The response should be HTTP 401, not a successful response.

---

**Finding 6: Session IP address recorded using `$_SERVER['REMOTE_ADDR']` instead of Cloudflare-aware IP resolution**

```
Pattern:     Step 1 — Token/session security
Severity:    Medium
Where:       crm-api/Controllers/AuthController.php  saveSession()  line 659
             cf. crm-api/Middleware/RateLimitMiddleware.php  getIpAddress() — correct implementation
```

**What's actually happening:**

`AuthController::saveSession()` records the session creation IP address using
`$_SERVER['REMOTE_ADDR']`. When the system is behind Cloudflare (as it is in production at
`portal.theglobalavenues.com`), `REMOTE_ADDR` is Cloudflare's edge IP, not the actual user's IP.
The real user IP is in `HTTP_CF_CONNECTING_IP`.

`RateLimitMiddleware::getIpAddress()` already implements correct Cloudflare-aware IP resolution,
conditionally reading `HTTP_CF_CONNECTING_IP` when `TRUST_CLOUDFLARE_IP_HEADER=true` is set in env.

**Why this is a problem:**

The `user_sessions` table records the `ip_address` at login for security audit purposes —
"was this session created from the expected country/IP?" When all sessions show Cloudflare datacenter
IPs instead of user IPs, this audit value is useless. Security investigations that attempt to
correlate sessions with geographic anomalies (e.g., "was this login from a known-compromised IP?")
will fail.

**How to fix:**

In `saveSession()`, replace `$_SERVER['REMOTE_ADDR']` with a call to
`RateLimitMiddleware::getIpAddress()` — the exact same call already used elsewhere in the auth
controller for rate limiting.

**Phase this belongs to:** Phase 2 (auth / session management)

**How to verify the fix worked:**

Log in from a real browser through Cloudflare. Query `user_sessions` and confirm `ip_address` shows
the real client IP (matching what Cloudflare reports) rather than a Cloudflare AS IP.

---

### INTERNAL PATH EXPOSURE

---

**Finding 12: Internal `storage_path` filesystem path exposed in document queue API response**

```
Pattern:     Pattern 1 (information leakage)
Severity:    Low
Where:       crm-api/Controllers/DocumentRequestController.php  getDocumentQueue()
             SELECT fragment: f.storage_path as file_path
```

**What's actually happening:**

`getDocumentQueue()` includes `f.storage_path as file_path` in its SELECT statement. This column
contains the server-relative filesystem path to the file, e.g.,
`storage/private/documents/student-42/abcdef.pdf`.

This path is returned in the JSON response to the admin frontend. The admin portal uses it (likely
to construct a file download URL), but the raw filesystem path is exposed directly.

**Why this is a problem:**

The internal directory layout (`storage/private/`, subdirectory naming scheme, file UUID format) is
leaked to any admin user and to anyone who can intercept or log API responses. This aids directory
traversal attacks, server fingerprinting, and reduces the obscurity around file storage structure.
The correct pattern is to expose only `public_id` and construct download URLs from that.

**How to fix:**

Remove `f.storage_path as file_path` from the `getDocumentQueue()` SELECT. Return `f.public_id`
instead. The admin frontend should use `public_id` to construct a download URL:
`/api/?route=files&action=download/{public_id}` — which goes through `FileController::download()`'s
access check, chunked streaming, and checksum verification.

**Phase this belongs to:** Phase 4 (document requests / file access)

**How to verify the fix worked:**

Call the document queue endpoint as an admin and inspect the JSON response. No field should contain
a path resembling `storage/private/...` or `uploads/public/...`. File access should go through the
`/files/download/{public_id}` endpoint only.

---

## Summary Table

| # | Title | Pattern | Severity | Primary File |
|---|-------|---------|----------|--------------|
| F1 | SMTP body rendered differently in sync vs queued paths | P1 — Inconsistent mechanisms | High | `MailService.php`, `send-notifications.php` |
| F2 | SMTP fallback bypasses `MailService::createMailer()` | P1 — Inconsistent mechanisms | High | `send-notifications.php` |
| F3 | Integer row IDs exposed in API responses | Step 1 — Token/session security | **Critical** | `AuthController.php`, `AdminAgentController.php`, `api.ts` |
| F4 | Refresh token cookie path too broad (`/crm-api`) | Step 1 — Token/session security | High | `AuthController.php` |
| F5 | Access token accepted from `$_COOKIE` fallback | Step 1 — Token/session security | Medium | `AuthMiddleware.php` |
| F6 | Session IP uses `REMOTE_ADDR` not Cloudflare-aware resolve | Step 1 — Token/session security | Medium | `AuthController.php` |
| F7 | RBAC permissions stale in JWT for up to 15 min | Step 0 — Change velocity | High | `JWTService.php`, `AuthMiddleware.php` |
| F8 | Two document review methods — one missing all side effects | P1 — Inconsistent mechanisms | High | `DocumentRequestController.php` |
| F9 | Agent resubmission skips file versioning student uses | P1 — Inconsistent mechanisms | Medium | `DocumentRequestController.php` |
| F10 | `@unlink` on upload failure silences cleanup errors | P3 — Data integrity gaps | Medium | `FileUploadService.php` |
| F11 | Drive sync marks `synced` without content integrity check | P3 — Data integrity gaps | Medium | `sync-drive.php` |
| F12 | Internal `storage_path` exposed in document queue response | P1 — Information leakage | Low | `DocumentRequestController.php` |
| F13 | Mock OTP bypass stubs remain in `useStore.ts` | P2 — Stale assumptions | Low | `useStore.ts` |
| F14 | No real-time push for admin action queues | Step 0 — Change velocity | Medium | Admin frontend pages |

---

## Positive Findings — Confirmed Working Correctly

These were checked explicitly and found to be correct. They are noted here so future readers do not
re-investigate them.

| Area | What Was Verified |
|------|------------------|
| Agent suspension | `AdminAgentController::suspend()` correctly sets `users.status = 'suspended'` AND revokes all active sessions via `user_sessions.revoked_at`. `AuthMiddleware` live-checks `user.status` on every request. Suspension takes effect on the very next request after commit. |
| Access token storage | `useAuth.ts` stores `token` in Zustand state with no `persist` middleware. Not written to `localStorage` or `sessionStorage` at any point in the auth flow. |
| Refresh token transport | `api.ts` sends `credentials: 'include'` on all fetch calls. The HttpOnly `refresh_token` cookie is sent automatically by the browser. No JavaScript access to the refresh token. |
| Global JWT revocation | `AuthMiddleware::user()` checks `jwt_min_iat` from `system_settings` on every authenticated request. A super_admin can revoke all tokens system-wide by updating this value. |
| 2FA pre-auth token | `AuthMiddleware` rejects `pre_auth_token` JWTs on all routes except the 2FA verify endpoint. Login flow correctly branches on `two_factor_enabled = 1`. The `pre_auth_token` is not stored in Zustand or localStorage — it lives only in React component state. |
| OTP rate limiting | `OTPService::generateAndSend()` checks rate limits BEFORE any DB write. Brute-force counter incremented on wrong OTP. |
| Production error handler | `index.php` returns `'Internal server error'` with no file/line/trace in production. Dev mode correctly exposes details. The DB credential stack-trace fix from Phase 9 is verified in place. |
| File download integrity | `FileController::download()` re-computes SHA-256 at download time and compares against `checksum_sha256`. Mismatch is logged as `file_integrity_failure` and the download is aborted. |

---

*End of audit report — 14 findings documented, zero code changes made.*
