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

## Session 4 - May 26, 2026

- Added seed files for admin, universities, programs, and quiz questions
- Extended schema with quiz question and response tables
- Improved auth payloads so frontend layouts receive usable display names
- Imported schema and seed files into the local `tga_crm` database
- Verified live backend flows for health, admin login, student registration, and student profile update/read
- Added a frontend API client and wired `/apply` and `/portal/login` to live backend password auth instead of mock-only flows
- Removed fake success behavior for OTP and Google login flows until the backend supports them

## Session 5 - May 27, 2026

- Added public `university` API routes for live catalog listing, program search, university detail, and compare flows
- Added `UniversityController` and `University` model with frontend-ready payloads and pagination metadata
- Hardened application creation so the backend derives and validates the correct university for a selected program
- Hardened auth header parsing to support Apache/Windows variants like `REDIRECT_HTTP_AUTHORIZATION`
- Rebuilt `/courses` and `/courses/:category` around live backend catalog data instead of static-only marketing counts
- Rebuilt the student dashboard around live profile, dashboard, application, and catalog APIs
- Replaced the fake quiz apply action with real application creation against the PHP API
- Verified with PHP lint, public catalog endpoint smoke tests, bearer-token auth, cookie-auth student flow, and `npm run build`

## Session 6 - May 27, 2026

- Implemented secure student document upload in the PHP API with a new `FileUploadService`
- Added server-side MIME validation, document-type-specific rules, file-size caps, UUID-based filenames, image payload inspection, and runtime upload directory creation
- Blocked direct access to uploaded student documents with `crm-api/uploads/documents/.htaccess`
- Added multipart form handling to the backend base controller and document create/delete persistence to the application model
- Implemented live `upload_document` and `delete_document` application endpoints with access checks
- Extended the frontend API client to support multipart upload and document deletion
- Reworked the student portal documents tab so it now uploads real files, refreshes from the backend, and only allows deleting unverified documents
- Verified with PHP lint, a real multipart upload/delete API flow, and another successful frontend production build

## Session 7 - May 27, 2026

- Implemented the role-based internal admin portal backend with new `admin` routes, controller, model, audit logging service, and schema support for `audit_logs`, `is_flagged`, and `flag_reason`
- Added internal-role permissions for `counsellor`, `visa_officer`, `admin`, and `super_admin`, including a stage-transition matrix and document-review restrictions
- Added live admin endpoints for dashboard stats, pipeline, application detail/update, document queue/review, users/detail/update, agent approvals, university/program CRUD, and audit-log reads
- Seeded local internal users for `super_admin`, `admin`, `counsellor`, and `visa_officer` with a shared development password for XAMPP verification
- Replaced the mock admin frontend with a live `/portal/admin` console and role-aware layout/menu, including overview, pipeline, users/agents, document review, catalog management, and audit views
- Extended the frontend API client with typed admin operations and routed the new admin sections through the real backend
- Fixed PDO named-placeholder collisions in catalog/admin search queries so public catalog search and admin filters work reliably with native prepared statements
- Verified with PHP lint, live role logins for all four internal roles, permission-denial tests, shared catalog create/disable propagation to the public university listing, audit-log recording, and a successful `npm run build`
