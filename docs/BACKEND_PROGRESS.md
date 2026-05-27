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
