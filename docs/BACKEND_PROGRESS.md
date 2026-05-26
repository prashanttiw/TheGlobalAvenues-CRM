# Backend Progress

## Session 1 - May 26, 2026

- Added canonical startup docs: `TGA_PROJECT_VISION.md` and `TGA_CRM_MASTER_ARCHITECTURE.md`
- Added `docs/BACKEND_RESEARCH_SUMMARY.md` to preserve the approved Phase 0 research decisions
- Started backend implementation under `crm-api/`
- Added environment loader, database connection, CORS handling, JSON response helper, validation helpers, route registry, auth controller, user model, JWT service, and an initial schema baseline
- Scaffolded auth endpoints for register, login, refresh, logout, and get-me
- Added uploads, logs, and database folder structure for the PHP API
- PHP runtime is not installed in the current workspace, so runtime syntax checks and endpoint execution are still pending

## Session 2 - May 26, 2026

- Extended the schema with universities, programs, applications, stage history, notes, documents, and notifications
- Added `StudentController` with profile, dashboard, applications, and notifications endpoints
- Added `ApplicationController` with create, detail, status history, status update, and documents endpoints
- Added `StudentProfile`, `Application`, and `Notification` models
- Added route registration for `student` and `application` domains
- Added agent and sub-agent access checks for application ownership
- Added upfront validation for missing or invalid program and university references

## Session 3 - May 26, 2026

- Added agent routes for dashboard, profile, leads, applications, commissions, resources, and sub-agent listing
- Added `AgentController` and `Agent` model
- Extended schema with `commission_claims`, `resources`, and `leads`
- Added agent and sub-agent aware dashboard aggregation and access checks
- Added lead creation, listing, and update flows
