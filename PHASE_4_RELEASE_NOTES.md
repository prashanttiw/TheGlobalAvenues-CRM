# Phase 4 Release Notes
## TGA CRM — Academic Core
**Released**: 2026-06-25
**Branch**: main
**Scope**: Universities, Courses, Intakes, Applications, Unified Timeline, Document Requests, Payment Tracking, File Gatekeeper

---

## Overview

Phase 4 wires real data into the Phase 3 portal shells and delivers the complete academic workflow engine. Every step from browsing a university to an enrolled student is now functional end-to-end. This phase introduced SLAService and ReminderService abstractions and closed 13 critical gaps found during pre-implementation audit.

---

## Features Added

### University Management
- Full admin CRUD with RBAC permission guards (universities.view/create/edit/delete)
- Logo upload: JPG/PNG only, GD library generates 400px-wide thumbnail
- Public browse endpoints (no auth): `/universities` + `/universities/:pid` with open intake counts
- Soft-delete cascade: deactivates all courses and closes all intakes atomically

### Course Management
- Nested under universities with status management
- Public endpoint returns min/max tuition fee computed from open intakes (no N+1)
- application_count returned via LEFT JOIN aggregate

### Intake Management
- Full CRUD with forward-only status transitions: `upcoming → open → closed` (cannot reverse)
- Clone intake: copies all fields, increments year by 1, resets to upcoming status
- Closing an intake does not cancel existing applications

### Application Lifecycle
- Atomic reference numbers: `TGA-2026-000001` format via sequences table `LAST_INSERT_ID(next_val+1)` — race-condition-free
- Draft creation: validates intake is open, enforces 1-draft-per-student-per-intake (HTTP 409 on duplicate)
- Submit: snapshots `agent_id_at_submission`, starts SLA event (72h), notifies agent chain
- Admin status transitions enforced by ApplicationStateManager — invalid transitions return 403
- Student withdrawal: `PUT /student/applications/:pid/withdraw` from submitted/under_review/waitlisted
- Enrolled: sets `students.agent_lock_status = 'locked'` and cascades `profile_status`
- `profile_status` auto-updated on every application transition (gap fix §GAP-P4-07)

### Unified Application Timeline
- Single thread: documents, links, notes, payment requests — all directions in one view
- CTE-optimized query: joins `application_updates + files` in one statement
- Infinite scroll: TanStack Query `useInfiniteQuery` with `initialPageParam: 1` (v5 requirement)
- Agent visibility filter: `is_visible_to_agent = 0` items hidden from agent responses
- Student posts allowed only when active document request exists (prevents unsolicited uploads)
- Admin can soft-delete incorrect timeline items (migration 045)

### Document Request Pipeline
- Admin creates request with deadline, triggering ReminderService scheduling
- Student submission: atomic versioning transaction — previous file gets `superseded_at`, new file gets `version_number = prev+1`
- Admin review loop: approved (SLA resolved) → or rejected (loops back to `requested`)
- Admin cancel: terminal status, hidden from student active list (migration 047)

### Payment Tracking (status-only, no gateway)
- Admin creates payment item with external payment link, amount, due date
- Student self-reports paid → Admin confirms or disputes
- Dispute resolution endpoint: `PUT /admin/payments/:pid/resolve` with `confirmed|cancelled`
- Reminders created for due dates via ReminderService

### File Gatekeeper
- `GET /api/v1/files/:publicId/download` — JWT-authenticated with full ownership matrix
- 8KB chunked `fread` streaming (Bluehost shared hosting: `readfile()` risks memory exhaustion)
- SHA-256 checksum verified on every download — mismatch logs `file_integrity_failure` security event and returns HTTP 500
- Every download logged to `activity_logs` for complete access audit trail
- `storage/private/` protected by `.htaccess Require all denied` — no direct web access

### New Services
- `SLAService`: `startEvent()` + `resolveEvent()` — abstracts SLA rule lookup and event lifecycle
- `ReminderService`: `scheduleForDeadline()` — reads `reminder_days_before_deadline` from system_settings

---

## Architecture Decisions

- **GD over Imagick** for thumbnails: GD enabled by default on Bluehost; Imagick requires manual cPanel activation
- **SVG rejected for logos**: SVG is XML and can embed `<script>` tags — XSS vector eliminated entirely
- **DOCX rejected for documents**: `application/zip` MIME is ambiguous; PDF-only is the education consultancy industry standard
- **Chunked fread over readfile()**: Bluehost shared hosting `readfile()` can exhaust `memory_limit` on large PDFs
- **File gatekeeper over signed tokens**: JWT + ownership check is < 5ms — signed token storage complexity not justified at this scale
- **TanStack Query v5 `initialPageParam: 1`**: v5 made this mandatory; spec had v4 pattern (corrected per §RF-P4-04)
- **Page-based pagination for timeline**: cursor-based deferred to Phase 7 — page drift negligible for append-only timeline at startup scale

---

## Security Improvements

- `storage/private/` directory: `.htaccess Require all denied` on all subdirectories
- `display_filename` sanitized via unicode-safe regex — path traversal in `Content-Disposition` prevented
- `stored_filename` is UUID + extension only — never derived from user input
- SHA-256 integrity check on every file download — corrupted files never served to users
- Student timeline post requires active document request — prevents unsolicited file uploads
- `post_max_size > upload_max_filesize` enforced in `.htaccess` — Bluehost gotcha that silently discards uploads if reversed

---

## Performance Improvements

- Application list: single CTE JOIN query — no N+1 across application→student→intake→course→university chain
- Course tuition fee range: single GROUP BY aggregate — no N+1 across intakes
- `staleTime` strategy: university list 300s, application detail 15s, timeline 10s
- `useInfiniteQuery` with IntersectionObserver — auto-fetches next page as user scrolls to bottom

---

## Bug Fixes (Gaps Closed)

| Gap ID | Issue | Fix |
|--------|-------|-----|
| §GAP-P4-01 | No student application withdrawal | `PUT /student/applications/:pid/withdraw` added |
| §GAP-P4-07 | `profile_status` not updated by ApplicationStateManager | Full status map cascade added |
| §GAP-P4-09 | `application_updates` had no soft delete | Migration 045 adds `deleted_at` |
| §GAP-P4-10 | Document requests could not be cancelled | `cancelled` status + cancel endpoint added |
| §GAP-P4-12 | `storage/private/` web-accessible | `.htaccess` files created on all private dirs |
| §GAP-P4-13 | University soft-delete orphaned courses/intakes | JOIN UPDATE cascades to courses and intakes |
| §AD-P4-04 | Students could post to timeline without request | Controller guard requires active document request |
| §AD-P4-05 | Payment dispute had no resolution path | `PUT /admin/payments/:pid/resolve` added |
| §RF-P4-09 | Optimistic update rollback used wrong key | `setQueryData(['applications', publicId], ctx.previous)` corrected |

---

## Migration Notes

| Migration | Purpose |
|-----------|---------|
| 045 | `deleted_at` added to `application_updates` |
| 046 | `withdrawn` status documented for applications |
| 047 | `cancelled` status + `cancelled_by` added to `document_requests` |

---

## Known Limitations

- Google Drive sync: `drive_sync_status = 'pending'` set on all uploads — actual sync cron is Phase 6
- SLA breach alerts not yet surfaced in admin UI (Phase 6 cron reads `sla_events`)
- Reminders inserted in DB — dispatch cron is Phase 6
- University logo thumbnail generated locally; Drive backup queued but not executed until Phase 6

---

## Phase 4 Commits

```
05718be  feat(db): add Phase 4 schema migrations -- timeline soft delete, new statuses
f64fdb6  feat(academic): implement university, course, and intake management
cdd9e9b  feat(application): implement full application lifecycle, timeline, documents, and payments
c356668  feat(files): secure private file gatekeeper with ownership matrix and chunked streaming
80e3803  feat(api): complete Phase 4 route wiring for admin, agent, and student portals
```
