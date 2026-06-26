# Phase 7 Release Notes
## TGA CRM — CRM & Operations
**Released**: 2026-06-26
**Branch**: main
**Scope**: Lead pipeline, internal notes, notices/announcements, global search, system settings management, maintenance mode

---

## Overview

Phase 7 delivers the CRM and operations layer. Leads are now captured with full UTM source tracking, managed through a kanban workflow, and converted to students. Internal collaboration is enabled via per-entity notes. A global search with FULLTEXT indexing serves instant results across students, applications, agents, and universities.

---

## Features Added

### Enterprise Lead Pipeline
- Lead capture with source tracking: website_form, landing_page, campaign_ad, event, manual_entry, imported
- UTM parameter capture: utm_source, utm_medium, utm_campaign stored on every lead
- Kanban workflow: new → contacted → qualified → converted → dropped
- Lead assignment to admin staff members
- Lead conversion: `POST /admin/leads/:pid/convert` creates a student record atomically and links `converted_student_id`
- Lead PII encrypted: email/phone encrypted via XSalsa20-Poly1305, lookup hash for search

### Internal Notes Collaboration
- `internal_notes` table supports per-entity notes (student, application)
- Audience visibility flags: visible_to_student, visible_to_agent, visible_to_admin
- Admin and agent can post notes; student visibility is per-note opt-in
- Soft-delete with audit preservation

### Notices & Announcements Publishing
- Admin creates notices (type: notice | event) with audience targeting (students / agents / admins)
- Draft → published → expired lifecycle
- Event notices include event_date and event_location
- Attachment file support linked to `files` table
- Student and agent portals filter by visible_to_students / visible_to_agents flags

### Global Search
- `GET /api/v1/search?q={query}&type={type}` with role-scoped results
- MySQL FULLTEXT UNION ALL across students, applications, agents, universities
- Role scoping: agents see only their subtree students; admins see everything
- Results grouped by entity type with relevance ordering
- CommandPalette frontend wired to real search API (replaces Phase 3 stub)

### System Settings Management
- Admin CRUD for all system_settings key-value pairs via `SystemSettingsController`
- Super-admin guard: only `is_super_admin = 1` can modify security-critical settings
- Argon2id cost parameters tunable at runtime without code deploy
- Filesystem JSON cache invalidated on every update (Phase 9 performance improvement)

### Maintenance Mode
- `MaintenanceMiddleware` checks for `.maintenance` file on every request
- Super-admin JWT bypasses maintenance lock for testing while system is offline
- Filesystem flag (not DB) — works even when MySQL is completely down
- `GET/POST /admin/maintenance` endpoints for toggle via admin dashboard

---

## Architecture Decisions

- **FULLTEXT UNION ALL over LIKE**: MySQL FULLTEXT with `MATCH ... AGAINST` (boolean mode) is 10-100x faster than `LIKE '%query%'` on indexed columns at scale
- **Filesystem `.maintenance` flag over DB flag**: DB-based flags require a working database — the entire purpose of maintenance mode is often to take the DB offline
- **Lead PII encrypted same as users**: consistent encryption posture across all PII in the system

---

## Security Improvements

- Lead email/phone encrypted at rest — lead table breach does not expose contact PII
- Global search respects RBAC — agents cannot search outside their subtree
- System settings super-admin guard prevents sub-admins from modifying security parameters
- Maintenance mode bypass requires valid JWT — cannot be bypassed without authentication

---

## Bug Fixes

- Lead conversion atomic transaction: user + student created in one transaction — no partial records on failure
- Notice audience validation: at least one audience must be selected (prevents orphaned notices)

---

## Known Limitations

- Global search is text-only (no date range, status filter in Phase 7)
- Lead import (CSV bulk upload) deferred to Phase 8
- UTM tracking requires frontend to pass UTM params in registration initiation call
