# PHASE 4 — Academic Core
## Universities · Courses · Intakes · Applications · Unified Timeline · Document Requests · Payments

---

## BUILDER DIRECTIVE

**DO NOT TOUCH MARKETING WEBSITE FILES.**
Dashboard-only work. See Phase 3 for the off-limits file list.

**Before writing any code — research:**
- MySQL 8.4 JSON column support — verify JSON_CONTAINS, JSON_EXTRACT performance
  for requirements_notes queries if JSON is used
- PHP file streaming (readfile vs chunked) — best approach for large document downloads
- Image processing: GD vs Imagick available on Bluehost — for university logo thumbnails
- TanStack Query `useInfiniteQuery` vs standard `useQuery` for the application timeline
  (timeline grows unbounded — infinite scroll is better than pagination)
- Recharts: how to render the StatusTimeline component correctly
- PHP magic bytes detection — verify the approach from FileUploadService handles
  all common document types (PDF, DOC, DOCX, JPG, PNG)
- React Hook Form file input integration with TanStack Query mutation
- Optimistic updates pattern for status changes (update UI before server confirms)

---

## BUILDER RESEARCH NOTES
| Topic | Finding | Action |
|---|---|---|
| MySQL 8.4 JSON | JSON_EXTRACT on large tables causes full scans without functional index; Phase 4 uses no hot-path JSON queries | Use CTE JOIN for timeline query; no functional index needed |
| PHP file streaming | `readfile()` risks memory exhaustion on Bluehost; `X-Sendfile` unavailable on shared hosting | Use 8KB chunked `fread()` loop in FileGatewayController |
| GD vs Imagick | Both available on Bluehost; GD is enabled by default (Imagick needs cPanel activation) | Use GD for 400px university logo thumbnails |
| `useInfiniteQuery` v5 | **v5 requires `initialPageParam` (mandatory)**. `getNextPageParam` receives 3 args. Return `undefined` (not null) to stop. | Fix spec pattern — see §RF-P4-04 in PHASE_4_APPEND.md |
| Recharts + StatusTimeline | Already implemented in Phase 3. Wire real data in Phase 4 using `useQuery`. | Wire existing StatusTimeline with real status history data |
| PHP magic bytes | DOCX = `application/zip` (ambiguous); SVG can embed JS (XSS); DOC = `application/msword` (reliable) | Reject SVG + DOCX; accept PDF/JPG/PNG only |
| RHF file upload + progress | Axios `onUploadProgress` is the correct pattern (fetch API cannot track upload progress) | Use `onUploadProgress` callback in `useMutation` mutationFn |
| Optimistic update rollback | Spec had a **bug**: `setQueryData(ctx.previous, ctx.previous)` uses previous as the key. Correct: `setQueryData([key, publicId], ctx.previous)` | See corrected pattern in §RF-P4-09 |

---

## CONTEXT

Phase 1: DB schema (35 tables + sequences, cron_health, activity_logs_archive)
Phase 2: All auth flows complete
Phase 3: All portal shells built with skeleton data
Phase 4: Wire real data into the academic features.

MySQL 8.4 available. Use CTEs freely where they simplify queries.
All API responses use `public_id`, not integer id.
All writes: generate ULID, log to activity_logs, fire NotificationService where specified.

---

## WHAT PHASE 4 BUILDS

Universities, courses, intakes CRUD for admin.
Student and agent can browse universities and apply.
Full application pipeline with the state machine.
Unified application timeline (documents, payments, links, notes in one thread).
Admin-initiated document requests with the full request → submit → review cycle.
Payment tracking (link → mark paid → confirm).

---

## 4A. UNIVERSITIES

### Admin routes
```
GET    /api/v1/admin/universities          ModuleGuard: universities.view
POST   /api/v1/admin/universities          ModuleGuard: universities.create
GET    /api/v1/admin/universities/:pid     ModuleGuard: universities.view
PUT    /api/v1/admin/universities/:pid     ModuleGuard: universities.edit
DELETE /api/v1/admin/universities/:pid     ModuleGuard: universities.delete
POST   /api/v1/admin/universities/:pid/logo  Multipart upload — ModuleGuard: universities.edit
```

### Public routes (no auth — student/agent browsing)
```
GET /api/v1/universities                   Paginated, active only
GET /api/v1/universities/:pid              With active courses and open intakes
```

### Create university:
```php
// Input: name, country, city, description, ranking_info, website_url, partnership_type
// 1. INSERT universities (public_id = ULID, status = 'active')
// 2. If logo uploaded separately via /logo endpoint:
//    FileUploadService::store($file, 'university', $uni->id, is_public: true)
//    UPDATE universities SET logo_file_id = ?
// 3. ActivityLogger::log('university.created', 'university', $uni->id, null, $data)
// Return: university with public_id
```

### Logo upload:
```php
// FileUploadService handles:
// - Magic bytes validation (JPG/PNG/SVG only for logos)
// - Max size from system_settings: upload_max_size_mb
// - Stored in: public/uploads/public/universities/{uuid}.ext
// - display_filename: "{university_name}_logo.{ext}" (slugified)
// - Drive sync queued (drive_sync_status = 'pending')
// - UPDATE universities SET logo_file_id = new_file_id
```

### University list response:
```json
{
  "data": [{
    "public_id": "01JXYZ...",
    "name": "FH Kufstein",
    "country": "Austria",
    "city": "Kufstein",
    "logo_url": "/uploads/public/universities/uuid.jpg",
    "course_count": 8,
    "open_intake_count": 3,
    "status": "active"
  }],
  "meta": { "total": 45, "page": 1, "per_page": 20 }
}
```

---

## 4B. COURSES

```
GET    /api/v1/admin/universities/:pid/courses   ModuleGuard: courses.view
POST   /api/v1/admin/universities/:pid/courses   ModuleGuard: courses.create
GET    /api/v1/admin/courses/:pid                ModuleGuard: courses.view
PUT    /api/v1/admin/courses/:pid                ModuleGuard: courses.edit
DELETE /api/v1/admin/courses/:pid                ModuleGuard: courses.delete

GET /api/v1/universities/:pid/courses            Public — active courses only
```

### Create course:
```php
// Input: name, degree_level, duration_months, language, description, eligibility_criteria
// 1. Validate university exists and is active
// 2. INSERT courses (public_id = ULID, university_id, status = 'active')
// 3. ActivityLogger::log('course.created', ...)
```

---

## 4C. INTAKES

```
GET    /api/v1/admin/courses/:pid/intakes    ModuleGuard: intakes.view
POST   /api/v1/admin/courses/:pid/intakes    ModuleGuard: intakes.create
PUT    /api/v1/admin/intakes/:pid            ModuleGuard: intakes.edit
DELETE /api/v1/admin/intakes/:pid            ModuleGuard: intakes.delete
POST   /api/v1/admin/intakes/:pid/clone      ModuleGuard: intakes.create

GET /api/v1/courses/:pid/intakes             Public — open/upcoming only
```

### Clone intake (next year):
```php
// Input: none (or optional overrides)
// 1. Load source intake
// 2. INSERT new intake:
//    name = same label but intake_year + 1
//    intake_year = source.intake_year + 1
//    application_open_date = source.open_date (same month/day, next year)
//    application_deadline = source.deadline (same month/day, next year)
//    tuition_fee_amount = source.tuition_fee_amount (admin updates after)
//    status = 'upcoming'
//    cloned_from_intake_id = source.id
// 3. ActivityLogger::log('intake.cloned', ...)
// Return: new intake — admin edits fee/dates before opening
```

### Open/close intake status:
```php
// Admin can set intake status: upcoming → open → closed
// Validate transition in PHP (cannot go back to upcoming once open)
// When status changes to 'open': create SLA event for application_deadline reminder
```

---

## 4D. APPLICATIONS

### Routes
```
GET    /api/v1/student/applications                Student's own apps
POST   /api/v1/student/applications                Create draft
GET    /api/v1/student/applications/:pid           Detail + timeline
PUT    /api/v1/student/applications/:pid/submit    Submit draft
DELETE /api/v1/student/applications/:pid           Delete draft only (not submitted)

GET    /api/v1/agent/applications                  Apps in agent's subtree
GET    /api/v1/agent/applications/:pid             Detail (read-only)

GET    /api/v1/admin/applications                  All apps
GET    /api/v1/admin/applications/:pid             Detail
PUT    /api/v1/admin/applications/:pid/status      Change status
```

### Create application (student or agent on behalf):
```php
// Input: intake_public_id
// 1. Resolve intake by public_id
// 2. Verify intake status is 'open' (cannot apply to upcoming/closed)
// 3. Check: student cannot have 2 DRAFT apps for same intake
//    (but can have multiple submitted apps across different intakes)
// 4. Generate reference_number via sequences table
// 5. INSERT applications:
//    public_id = ULID
//    reference_number = TGA-2026-000001
//    student_id = current student
//    intake_id = resolved intake
//    agent_id_at_submission = NULL (set when submitted, not when drafted)
//    status = 'draft'
// 6. ActivityLogger::log('application.created', ...)
// 7. NotificationService::fire('application.created', ...)
```

### Submit application:
```php
// PUT /api/v1/student/applications/:pid/submit
// 1. Load application, verify status = 'draft'
// 2. ApplicationStateManager::transition($app_id, 'submitted', $userType, $actorId)
//    This also:
//    - Sets agent_id_at_submission = current student.agent_id (snapshot)
//    - Sets submitted_at = NOW()
//    - Updates student.profile_status appropriately
// 3. Create SLA event: 'application_review', starts now, target = NOW() + 72h
// 4. Create reminders for agent chain (application submitted)
// 5. NotificationService::fire('application.status_changed', ...)
```

### Admin status change:
```php
// PUT /api/v1/admin/applications/:pid/status
// Input: { "status": "under_review", "notes": "..." }
// 1. ApplicationStateManager::canTransition($current, $new, 'admin') — or 403
// 2. ApplicationStateManager::transition(...) handles:
//    - DB update
//    - If 'enrolled': UPDATE students SET agent_lock_status = 'locked', profile_status = 'enrolled'
//    - SLA resolution/creation
//    - Reminder scheduling
//    - Activity log
//    - Notification to student + agent chain
```

### State machine transitions reference:
```
draft           → submitted      (student, agent, admin)
submitted       → under_review   (admin)
under_review    → offer_received (admin)
under_review    → rejected       (admin)
under_review    → waitlisted     (admin)
offer_received  → enrolled       (admin) ← locks agent_lock_status
offer_received  → rejected       (admin)
waitlisted      → submitted      (admin) ← re-open
waitlisted      → rejected       (admin)
```

---

## 4E. UNIFIED APPLICATION TIMELINE

Every application has a single thread mixing: documents, payment requests,
admin notes/links, and student submissions. Both directions in one view.

### Routes
```
GET  /api/v1/applications/:pid/timeline
     Returns all items ordered by created_at ASC
     Each item has: direction, item_type, content, file, posted_by, created_at

POST /api/v1/admin/applications/:pid/timeline
     Admin posts to student (file, link, or note)
     ModuleGuard: applications.edit

POST /api/v1/student/applications/:pid/timeline
     Student posts to admin (only in response to a request)
```

### Timeline item types:

| item_type | direction | Who posts | What it contains |
|---|---|---|---|
| `note` | admin_to_student | Admin | Text note |
| `file` | admin_to_student | Admin | Offer letter, brochure, admission doc |
| `link` | admin_to_student | Admin | Fee payment portal URL |
| `payment_request` | admin_to_student | Admin | Creates `application_payments` row |
| `file` | student_to_admin | Student/Agent | Uploaded document |

### Post timeline item (admin):
```php
// Input: { item_type, content, file (multipart), is_visible_to_agent }
// 1. If file: FileUploadService::store() → get file_id
//    Files for applications go to: storage/private/applications/{app_public_id}/
//    display_filename: "{student_name}_{doc_type}_{date}.{ext}"
// 2. INSERT application_updates (public_id=ULID, application_id, direction='admin_to_student',
//    item_type, content, file_id, posted_by_type='admin', posted_by_id, is_visible_to_agent)
// 3. If item_type = 'payment_request': also INSERT application_payments
// 4. ActivityLogger::log('application.timeline_item_added', ...)
// 5. NotificationService::fire('application.update.received', $vars,
//      [$student_user_id, ...$agentChainUserIds])
```

---

## 4F. DOCUMENT REQUESTS

Admin requests a specific document from a student. Separate from the timeline
(these have their own status pipeline).

### Routes
```
GET  /api/v1/admin/students/:pid/document-requests    All requests for a student
POST /api/v1/admin/students/:pid/document-requests    Create new request
PUT  /api/v1/admin/document-requests/:pid/review      Approve or reject

GET  /api/v1/student/document-requests                Own pending requests
POST /api/v1/student/document-requests/:pid/submit    Upload document
```

### Create document request:
```php
// Input: { doc_label, description, deadline, application_id (optional) }
// 1. INSERT document_requests:
//    public_id = ULID
//    student_id, application_id (nullable)
//    doc_label, description, deadline
//    status = 'requested'
//    requested_by = admin.id
// 2. Create SLA event: 'document_review' clock starts when student submits
//    (not now — clock starts on submission)
// 3. Create reminders:
//    - For each day in system_settings.reminder_days_before_deadline:
//      INSERT reminders (entity_type='document_request', remind_at=deadline-Xdays)
// 4. ActivityLogger::log('document_request.created', ...)
// 5. NotificationService::fire('document_request.created', $vars,
//      [$student_user_id, ...$agentChainUserIds])
//    Notification body includes: what's needed, deadline, upload link
```

### Student submits document:
```php
// POST /api/v1/student/document-requests/:pid/submit
// Multipart: file upload
// 1. FileUploadService::store():
//    - Magic bytes validation
//    - Max size from system_settings
//    - Path: storage/private/students/{student_public_id}/documents/
//    - display_filename: "{student_name}_{doc_label}_{date}.{ext}" (slugified)
//    - Versioning: check if previous submission exists for same doc_request
//      If yes: set previous file superseded_at, version_number = prev + 1
// 2. UPDATE document_requests SET status='submitted', submitted_file_id=new_file_id
// 3. Start SLA event: document_review (48h target)
// 4. ActivityLogger::log('document_request.submitted', ...)
// 5. NotificationService::fire('document_request.submitted', $vars, [$admin_user_ids])
```

### Admin reviews submission:
```php
// PUT /api/v1/admin/document-requests/:pid/review
// Input: { "decision": "approved" | "rejected", "rejection_reason": "..." }
// If approved:
//   UPDATE document_requests SET status='approved', reviewed_by, reviewed_at
//   Resolve SLA event: status='met'
//   NotificationService::fire('document_request.approved', ...)
// If rejected:
//   UPDATE document_requests SET status='rejected', rejection_reason
//   Then immediately: UPDATE SET status='requested' (loop back)
//   Resolve SLA event: status='met' (review was done, even if rejected)
//   NotificationService::fire('document_request.rejected', $vars,
//     [$student_user_id, ...$agentChainUserIds])
//   Rejection reason visible to student on their documents page
```

---

## 4G. PAYMENTS

Payment items attached to applications. Admin creates, student marks paid, admin confirms.

### Routes
```
GET  /api/v1/applications/:pid/payments
POST /api/v1/admin/applications/:pid/payments     Create payment item
PUT  /api/v1/student/payments/:pid/mark-paid      Student self-reports paid
PUT  /api/v1/admin/payments/:pid/confirm          Admin confirms
PUT  /api/v1/admin/payments/:pid/dispute          Admin flags as disputed
```

### Create payment item:
```php
// Input: { label, amount, currency, payment_link, due_date }
// 1. INSERT application_payments (public_id=ULID, status='pending')
// 2. Create reminders for due_date (same pattern as document deadlines)
// 3. NotificationService::fire('application.payment_created', $vars,
//      [$student_user_id, ...$agentChainUserIds])
// Also add to application timeline as item_type='payment_request'
```

### Student marks paid:
```php
// UPDATE application_payments SET status='student_marked_paid', marked_paid_at=NOW()
// NotificationService::fire('application.payment_marked_paid', ...)
// Admin must then confirm or dispute
```

### Admin confirms:
```php
// UPDATE application_payments SET status='confirmed', confirmed_by, confirmed_at=NOW()
// ActivityLogger::log('payment.confirmed', ...)
// NotificationService::fire('application.payment_confirmed', $vars,
//   [$student_user_id, ...$agentChainUserIds])
```

---

## 4H. FILE DOWNLOADS (Gatekeeper)

Private files must never be directly web-accessible.
Route: `GET /api/v1/files/:publicId/download`

```php
// 1. Load file by public_id
// 2. Auth check: valid JWT required
// 3. Ownership/access check:
//    - Student: can access files where owner_type='student' AND owner_id=own_student_id
//              OR submitted_file_id on their own document_requests
//    - Agent: can access files for students in their subtree (root_agent_id match)
//    - Admin: can access all private files IF documents.view permission
// 4. If file.is_public = 1: serve directly (no ownership check needed)
// 5. Verify checksum: hash_file('sha256', $absolutePath) === file.checksum_sha256
//    If mismatch: log security event 'file_integrity_failure', return 500
// 6. header('Content-Type: ' . $file->mime_type)
//    header('Content-Disposition: attachment; filename="' . $file->display_filename . '"')
//    readfile($absolutePath)
```

---

## 4I. FRONTEND — PHASE 4 DATA WIRING

Phase 3 built all the page shells. Phase 4 connects real data.

### TanStack Query patterns to use consistently:

```ts
// List with search/filter/pagination:
const { data, isLoading } = useQuery({
  queryKey: ['admin', 'students', filters],
  queryFn: () => api.get('/admin/students', { params: filters }),
  staleTime: 30_000,
});

// Mutation with optimistic update (status change):
const statusMutation = useMutation({
  mutationFn: ({ publicId, status }: StatusChange) =>
    api.put(`/admin/applications/${publicId}/status`, { status }),
  onMutate: async ({ publicId, status }) => {
    // Cancel in-flight queries
    await queryClient.cancelQueries({ queryKey: ['applications', publicId] });
    // Snapshot old data
    const previous = queryClient.getQueryData(['applications', publicId]);
    // Optimistically update
    queryClient.setQueryData(['applications', publicId], (old: any) => ({
      ...old, data: { ...old.data, status }
    }));
    return { previous };
  },
  onError: (_, { publicId }, ctx) => {
    // Rollback on error — NOTE: ctx.previous is the VALUE, publicId is the KEY
    if (ctx?.previous) {
      queryClient.setQueryData(['applications', publicId], ctx.previous);
    }
    toast.error('Status update failed. Please refresh.');
  },
  onSettled: (_, __, { publicId }) => {
    queryClient.invalidateQueries({ queryKey: ['applications', publicId] });
  },
});
```

### Pages to wire up in Phase 4:

**Student portal:**
- StudentApplicationsPage → `useQuery(['student', 'applications'])`
- ApplicationDetailPage → `useQuery(['applications', pid])` + timeline infinite scroll
- StudentDocumentsPage → `useQuery(['student', 'document-requests'])`
- Document submit: file upload mutation with progress tracking

**Agent portal:**
- AgentApplicationsPage → `useQuery(['agent', 'applications'])`

**Admin portal:**
- AdminUniversitiesPage → CRUD, logo upload
- AdminCoursesPage → CRUD
- AdminIntakesPage → CRUD + clone button
- AdminApplicationsPage → list + status change
- AdminApplicationDetailPage → timeline, document requests, payments
- AdminStudentsPage → link to document request creation

### Application timeline (infinite scroll):
```ts
// NOTE: TanStack Query v5 (installed) requires initialPageParam — mandatory
import { useInView } from 'react-intersection-observer'; // npm install react-intersection-observer

const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['applications', pid, 'timeline'],
  queryFn: ({ pageParam }) =>
    api.get(`/applications/${pid}/timeline`, { params: { page: pageParam, per_page: 20 } }),
  initialPageParam: 1,  // REQUIRED in v5 — spec had v4 syntax
  getNextPageParam: (lastPage, _allPages, lastPageParam) =>
    lastPage.meta.has_next ? lastPageParam + 1 : undefined,
  staleTime: 10_000,
});

// Trigger on scroll:
const { ref, inView } = useInView({ threshold: 0.1 });
useEffect(() => {
  if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);
```

---

## PHASE 4 AUDIT CHECKLIST

### Universities:
- [ ] Admin creates university with logo (logo in public uploads, synced to Drive queue)
- [ ] Logo served directly at /uploads/public/... URL
- [ ] Student/agent can browse universities without authentication
- [ ] Soft delete: university disappears from list but row preserved

### Courses & Intakes:
- [ ] Admin creates course under university
- [ ] Admin creates intake under course
- [ ] Intake clone creates new-year copy with same fields and incremented year
- [ ] Status transition: upcoming → open → closed (cannot reverse to upcoming)
- [ ] Only open intakes visible on public browse endpoint

### Applications:
- [ ] Student creates draft application against open intake
- [ ] Cannot create draft against upcoming or closed intake (error returned)
- [ ] Student submits draft — status → 'submitted', agent_id_at_submission snapshot set
- [ ] Agent submits on behalf of student — registered_by captured
- [ ] Admin changes status: only valid transitions allowed (invalid → 403)
- [ ] Status → 'enrolled': student.agent_lock_status set to 'locked'
- [ ] Reference number format: TGA-2026-000001, sequential, no duplicates
- [ ] Concurrent application creation: no duplicate reference numbers (sequences table)

### Application timeline:
- [ ] Admin posts a note → appears in timeline → student + agent notified (queued)
- [ ] Admin uploads a file → file stored in storage/private, queued for Drive
- [ ] Admin posts a link → appears as clickable link in timeline
- [ ] Agent cannot see timeline items where is_visible_to_agent = 0
- [ ] Student sees complete timeline for their application

### Document requests:
- [ ] Admin creates request → student sees upload slot in their documents page
- [ ] Student + agent notified (notification queued)
- [ ] Student uploads document:
  - [ ] File stored in private storage with UUID filename
  - [ ] display_filename is human-readable (student_name_doc_type_date.ext)
  - [ ] SHA-256 checksum recorded in files table
  - [ ] drive_sync_status = 'pending'
- [ ] Resubmission: old file has superseded_at set, new file has version_number = 2
- [ ] Admin approves: status → 'approved', student notified
- [ ] Admin rejects: status loops back to 'requested', reason visible to student
- [ ] SLA event created when student submits (48h target)

### Payments:
- [ ] Admin creates payment item with link
- [ ] Student + agent notified
- [ ] Student marks paid: status → 'student_marked_paid'
- [ ] Admin confirms: status → 'confirmed', student notified
- [ ] Reminders created for due_date

### File gatekeeper:
- [ ] Direct URL to storage/private/ returns 403
- [ ] Student accessing their own file via /files/:pid/download: works
- [ ] Student accessing another student's file: 403
- [ ] Agent accessing student in their subtree: works
- [ ] Agent accessing student outside subtree: 403
- [ ] SHA-256 checksum verified on every download (corrupted file → 500 + security log)

### Frontend:
- [ ] University list loads from real API with logos
- [ ] Application list shows real data with correct status badges
- [ ] Timeline loads with infinite scroll
- [ ] File upload shows progress bar
- [ ] Status change updates UI optimistically before server responds
- [ ] Optimistic update rolls back correctly if server returns error
