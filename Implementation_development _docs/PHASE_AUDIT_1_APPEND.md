# PHASE_AUDIT_1_APPEND.md
## Phase Audit 1 — Flow Consistency & ID Leakage: Research, Architecture & Implementation Record

**Created**: 2026-06-29
**Role**: Principal ERP Architect · Principal Backend Engineer · Principal Frontend Engineer ·
          Principal Security Engineer · Principal Performance Engineer · Principal QA Engineer · Product Manager
**Purpose**: Permanent research record, challenge analysis, architectural decisions, and implementation roadmap for Phase Audit 1.

---

## 1. RESEARCH FINDINGS & ARCHITECTURAL DECISIONS

### §RF-PA1-01 — Integer ID Exposure Vulnerabilities (Finding 3)

**Topic**: Exposure of auto-incrementing integer primary keys in API responses.

**Finding**:
In accordance with the project policy ("Integer database IDs must never leave the backend"), exposing integer IDs like `id`, `parent_agent_id`, or `root_agent_id` is a security risk. It enables row-count enumeration, sequential enumeration attacks, and leaks business-sensitive metrics. All identity references in responses must be ULIDs (`public_id`).

We audited the following exposure points:
- `AuthController::buildUserResponse()` exposed the integer `'id' => (int) $user['id']`.
- `AdminAgentController::listAll()` exposed `id`, `parent_agent_id`, and `root_agent_id`.
- `AdminAgentController::getTree()` exposed the same three integer fields.

**Decision**:
1. Remove `id` entirely from the user profile response in `AuthController::buildUserResponse()`.
2. Update the frontend `AuthUser` type and hooks (`useAuth.ts`) to use `public_id` directly without falling back to integer `id`.
3. Join the `agents` table on itself in `AdminAgentController::listAll()` to fetch `parent_public_id` and `root_public_id` instead of the integer equivalents.
4. Keep the integer `id` and `parent_agent_id` in `AdminAgentController::getTree()`'s SQL query and CTE so that `buildTree()` can construct the parent-child relationship by reference, but recursively strip these keys from the array using a new `sanitizeTreeNodes()` helper before responding.

### §RF-PA1-02 — Incomplete Document Review & Route Duplication (Finding 8)

**Topic**: Duplicate document review methods in `DocumentRequestController`, with the frontend route executing an action missing critical side effects.

**Finding**:
The controller contained two methods for reviewing document requests:
1. `adminReview(string $pid)`: The correct, full implementation that updates status, posts an application update note, logs activity, resolves the SLA event, and fires email notifications.
2. `reviewDocument()`: An incomplete implementation that only updated the status and added a status change update, missing all auditing (activity logs), SLA resolution, and student/agent notifications.

The frontend was routed to the incomplete `reviewDocument()` method via a POST request to `/?route=admin&action=review_document`.

**Decision**:
1. Merge the two methods by making `adminReview(?string $pid = null)` accept an optional URL parameter.
2. If `$pid` is not provided, read the document identifier from the JSON request body (`document_id` or `pid`).
3. Support both input parameter styles (PUT style: `status`, `rejection_reason`; POST style: `decision`, `reason`) so that both routing styles are supported.
4. Delete the incomplete `reviewDocument()` method entirely and update the `review_document` POST route in `AdminRoutes.php` to point to `adminReview()`.

### §RF-PA1-03 — Internal Storage Path Information Leakage (Finding 12)

**Topic**: Exposure of server-relative filesystem paths in the document review queue response.

**Finding**:
The `getDocumentQueue()` method selected and returned `f.storage_path as file_path`, exposing the internal folder structure (`storage/private/documents/...`) to the client. This leaks information about the server's directory layout and is unnecessary because the frontend downloads files using the secure `/files/:pid/download` route.

**Decision**:
Remove `f.storage_path as file_path` from the SELECT query in `getDocumentQueue()` and remove the unused `file_path` field from the frontend `AdminDocumentQueueItem` type definition in `api.ts`.

### §RF-PA1-04 — Swallowed Disk Cleanup Failures (Finding 10)

**Topic**: Silent suppression of filesystem failures during orphaned file cleanup.

**Finding**:
If a database insertion failed after a file was successfully uploaded to disk, the catch block in `FileUploadService::upload()` attempted to clean up the file using `@unlink($absoluteTarget)`. The `@` operator silenced any errors. If the file could not be deleted (e.g. permission issues), it would remain on disk as an untracked orphan containing potential PII.

**Decision**:
Remove the `@` suppressor from the catch block, check if the file exists, attempt to delete it, and log a critical error message using `error_log()` if the deletion fails.

### §RF-PA1-05 — Insecure Access Token Cookie Fallback (Finding 5)

**Topic**: Acceptance of access tokens from cookies as an undocumented fallback in the authentication middleware.

**Finding**:
`AuthMiddleware::user()` was configured to accept an `access_token` from `$_COOKIE` if the `Authorization` header was missing. Since the frontend stores the access token exclusively in-memory and transmits it only via the `Authorization: Bearer` header, this fallback is undocumented and introduces a significant Cross-Site Request Forgery (CSRF) vulnerability if an attacker is able to set or exploit cookies on the domain.

**Decision**:
Remove the cookie fallback logic from `AuthMiddleware::user()` entirely, enforcing that access tokens are strictly verified from the `Authorization` header.

### §RF-PA1-06 — Stale IP Address Resolution in Session Saving (Finding 6)

**Topic**: Use of `$_SERVER['REMOTE_ADDR']` instead of Cloudflare-aware IP resolution when recording sessions.

**Finding**:
`AuthController::saveSession()` recorded the session creation IP address using
`$_SERVER['REMOTE_ADDR']`. When the system is behind Cloudflare (as it is in production at
`portal.theglobalavenues.com`), `REMOTE_ADDR` is Cloudflare's edge IP, not the actual user's IP.
The real user IP is in `HTTP_CF_CONNECTING_IP`.

**Decision**:
Replace `$_SERVER['REMOTE_ADDR']` in `saveSession()` with `RateLimitMiddleware::getIpAddress()`.

### §RF-PA1-07 — Inconsistent Email Body HTML Rendering & Duplicated SMTP Config (Findings 1 & 2)

**Topic**: Inconsistent formatting of email bodies between sync/queued paths and duplication of the SMTP fallback configuration.

**Finding**:
1. The queued notification cron (`send-notifications.php`) formatted the email body using `nl2br(htmlspecialchars($body))`, while the synchronous `MailService::sendNow()` set the body directly with no sanitization/formatting. This caused discrepancies in email formatting and created an XSS vector in synchronous emails.
2. The cron job duplicated the entire SMTP configuration block inside its catch block to handle SMTP failover to the fallback host, violating the single source of truth principle.

**Decision**:
1. Unify HTML body rendering by creating a static helper `MailService::buildHtmlBody(string $rawBody)` and calling it in both `sendNow()` and `send-notifications.php`.
2. Centralize SMTP configuration by introducing a `MailService::createFallbackMailer()` helper and using it in `send-notifications.php`'s fallback catch block.

### §RF-PA1-08 — Frontend Mock Data & Legacy Store Cleanup

**Topic**: Removal of leftover mock data and legacy Zustand store (`useStore`) imports from active frontend pages.

**Finding**:
1. `LoginPage.tsx` displayed `placeholder="Enter 123456"`, which is misleading because the `'123456'` OTP bypass is now disabled.
2. `ApplyPage.tsx` pre-filled the registration form with mock academic credentials (like `'90%'` GPA and `'IELTS 7.5'`), and imported the legacy `useStore` to update the mock state.
3. `AdminDashboardPage.tsx` imported the legacy `useStore` to check `currentUser` for the activity feed query, even though it already had access to the active session via `useAuth()`.

**Decision**:
1. Remove `useStore` imports from `ApplyPage.tsx` and `AdminDashboardPage.tsx`.
2. Set all student registration form `defaultValues` in `ApplyPage.tsx` to empty strings (`''`) so the form starts blank.
3. Update `LoginPage.tsx`'s placeholder to `Enter 6-digit OTP`.
4. Update `AdminDashboardPage.tsx`'s query `enabled` condition to use `user` from `useAuth()`.

---

## 2. DETAILED IMPLEMENTATION RECORD

### 2.1 Backend Changes

#### [MODIFY] [AuthController.php](file:///d:/TheGlobalAvenues-CRM/crm-api/Controllers/AuthController.php)
- Removed `'id' => (int) $user['id']` from `buildUserResponse()`.
- Updated `saveSession()` to resolve the client IP using `RateLimitMiddleware::getIpAddress()`.

#### [MODIFY] [AdminAgentController.php](file:///d:/TheGlobalAvenues-CRM/crm-api/Controllers/AdminAgentController.php)
- **`listAll()`**:
  - Updated the query to select `ap.public_id AS parent_public_id` and `ar.public_id AS root_public_id` using left joins on `agents`.
  - Removed `a.id`, `a.parent_agent_id`, and `a.root_agent_id` from the SQL SELECT statement.
  - Removed the integer mapping loop assignments for these fields.
- **`getTree()`**:
  - Added left joins to fetch `ap.public_id AS parent_public_id` and `ar.public_id AS root_public_id`.
  - Added `sanitizeTreeNodes(array &$nodes)` to recursively unset `id`, `parent_agent_id`, and `root_agent_id` from the constructed tree before responding.

#### [MODIFY] [DocumentRequestController.php](file:///d:/TheGlobalAvenues-CRM/crm-api/Controllers/DocumentRequestController.php)
- **`adminReview()`**:
  - Updated signature to `public function adminReview(?string $pid = null)`.
  - Added code to read `documentId` from either `$pid` or the JSON body (`document_id`/`pid`), resolving the record via integer `id` or string `public_id`.
  - Added compatibility mapping for `status`/`decision` and `rejection_reason`/`reason`.
  - Ensured all side effects (note, activity log, SLA resolution, notifications) are executed.
  - Returns both `document_request` and `document` keys in the JSON response.
- Deleted `reviewDocument()` entirely.
- **`getDocumentQueue()`**:
  - Removed `f.storage_path as file_path` from the SELECT query.

#### [MODIFY] [AdminRoutes.php](file:///d:/TheGlobalAvenues-CRM/crm-api/Routes/AdminRoutes.php)
- Updated `review_document` POST route to point to `adminReview` instead of `reviewDocument`.

#### [MODIFY] [FileUploadService.php](file:///d:/TheGlobalAvenues-CRM/crm-api/Services/FileUploadService.php)
- Updated the `upload()` catch block to log a `CRITICAL` error message to PHP's error log if `unlink()` fails.

#### [MODIFY] [AuthMiddleware.php](file:///d:/TheGlobalAvenues-CRM/crm-api/Middleware/AuthMiddleware.php)
- Removed the cookie `access_token` check and fallback logic from the `user()` method.

#### [MODIFY] [MailService.php](file:///d:/TheGlobalAvenues-CRM/crm-api/Services/MailService.php)
- Added the `buildHtmlBody()` helper to safely format plain text into HTML.
- Added the `createFallbackMailer()` helper to configure the fallback SMTP server.
- Updated `sendNow()` to apply `buildHtmlBody()` to the raw body.

#### [MODIFY] [send-notifications.php](file:///d:/TheGlobalAvenues-CRM/cron/send-notifications.php)
- Updated the main loop to use `MailService::buildHtmlBody()` for formatting.
- Updated the catch block to use `MailService::createFallbackMailer()` for SMTP failover.

### 2.2 Frontend Changes

#### [MODIFY] [api.ts](file:///d:/TheGlobalAvenues-CRM/src/lib/api.ts)
- Updated the `AuthUser` type definition to remove `id: number` and make `public_id: string` a required property.
- Updated the `AdminDocumentQueueItem` type definition to remove `file_path: string`.

#### [MODIFY] [useAuth.ts](file:///d:/TheGlobalAvenues-CRM/src/shared/hooks/useAuth.ts)
- Removed all fallbacks to `apiUser.id`, mapping `User.id` and `userId` directly to `apiUser.public_id`.

#### [MODIFY] [AgentTreeNode.tsx](file:///d:/TheGlobalAvenues-CRM/src/components/agent/AgentTreeNode.tsx)
- Updated the `AgentNode` type definition to remove `id`, `parent_agent_id`, and `root_agent_id`, and add `parent_public_id` and `root_public_id`.

#### [MODIFY] [LoginPage.tsx](file:///d:/TheGlobalAvenues-CRM/src/pages/LoginPage.tsx)
- Changed the OTP input `placeholder` from `Enter 123456` to `Enter 6-digit OTP`.

#### [MODIFY] [ApplyPage.tsx](file:///d:/TheGlobalAvenues-CRM/src/pages/ApplyPage.tsx)
- Removed the legacy `useStore` import and `updateProfile` hook call.
- Reset the student registration form `defaultValues` for GPA, English Score, Country, Subject, and Budget to empty strings `''` so that the form starts blank.

#### [MODIFY] [AdminDashboardPage.tsx](file:///d:/TheGlobalAvenues-CRM/src/pages/admin/AdminDashboardPage.tsx)
- Removed the legacy `useStore` import and `currentUser` assignment.
- Updated the TanStack Query `enabled` condition for the activity feed to use the active `user` from `useAuth()`.

---

## 3. VERIFICATION & TESTING

### 3.1 Verification Scenarios

1. **User Authentication**:
   - The `/me` and `/login` JSON responses contain `public_id` and do not contain `id` (integer).
   - Frontend layouts successfully read `currentUser.id` as the string ULID.

2. **Agent Directory Listing & Tree**:
   - The `/agents` and `/agents/:pid/tree` JSON responses contain `public_id`, `parent_public_id`, and `root_public_id`, with all integer IDs completely removed.
   - The tree hierarchy renders correctly in the admin detail page.

3. **Document Reviews (Finding 8)**:
   - Document reviews completed via the dashboard trigger all side effects:
     - Status updates.
     - `activity_logs` receives the `document_request.reviewed` action.
     - `sla_events` receives `resolved`.
     - Student and agent are notified.

4. **Information Leakage (Finding 12)**:
   - Checked the `/get_document_queue` response. The objects contain `file_public_id` and `file_name` but do not contain `file_path` or expose `storage/private/`.

5. **Auth Cookie Fallback (Finding 5)**:
   - Verified that protected requests containing ONLY the `access_token` cookie are rejected with an HTTP 401 response.

6. **Cloudflare IP Resolution (Finding 6)**:
   - Verified that the `ip_address` recorded in the `user_sessions` table is resolved via `RateLimitMiddleware` (handling `HTTP_CF_CONNECTING_IP`).

7. **Email Formatting & Fallback (Findings 1 & 2)**:
   - Verified that synchronous and queued emails format HTML identically.
   - Verified that triggering a primary SMTP failure successfully redirects mail delivery to the fallback SMTP host via `MailService::createFallbackMailer()`.

8. **Frontend Mock Data Cleanup**:
   - Verified that the login OTP input displays `Enter 6-digit OTP`.
   - Verified that the registration form starts completely blank.
   - Verified that the admin dashboard activity feed loads and queries correctly using `useAuth()`.

9. **Vite Production Build**:
   - Verified that the frontend compiles and bundles successfully with `npm run build`.
