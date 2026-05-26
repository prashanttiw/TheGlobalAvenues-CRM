# TGA CRM Master Architecture

## Current Phase

Backend implementation has started. The first implementation unit covers canonical docs, PHP API scaffolding, core bootstrap, and security-oriented foundations.

## System Overview

The CRM ecosystem contains one frontend portal codebase and one PHP API:

1. Marketing website: `theglobalavenues.com`
2. CRM frontend: `portal.theglobalavenues.com`
3. Shared backend: `admin.theglobalavenues.com/public/api` or equivalent CRM API path

The frontend remains a React application. The backend is a standalone PHP API optimized for Windows shared hosting, MySQL, secure uploads, and role-based access control.

## Backend Principles

- PHP 8.1+ compatible
- PDO only, prepared statements only
- PSR-style namespacing and file layout
- REST-style JSON responses with consistent success/error envelopes
- JWT access and refresh token model
- Role-aware authorization for student, agent, sub-agent, counsellor, visa officer, admin, and super admin
- Auditability for admin actions and sensitive pipeline changes
- Shared-hosting-safe architecture with minimal operational assumptions

## Backend Folder Strategy

The backend lives under `crm-api/` at repo root and uses these main areas:

- `config/` for environment, database, constants, and CORS
- `helpers/` for responses, sanitization, validation, pagination, and file helpers
- `middleware/` for auth, RBAC, rate limiting, validation, and CSRF boundaries
- `routes/` for route registration by domain area
- `controllers/` for request handling
- `models/` for data access
- `services/` for JWT, OTP, upload, email, commission, quiz, notifications, and audit logic
- `database/` for schema, seeds, and migrations
- `uploads/` and `logs/` for mutable runtime storage

## Security Model

### Authentication

- Short-lived access token
- Longer-lived refresh token with rotation
- Refresh token revocation storage
- HTTP-only secure cookie strategy in production

### Authorization

- Route-level role checks
- Object-level access checks inside controllers and models
- Clear separation of internal-only and user-visible data

### Upload Safety

- MIME validation using server-side inspection
- Size caps by document class
- UUID-based stored filenames
- Direct-execution blocking for storage paths

### Operational Safety

- No raw superglobal use outside controlled request handling
- No raw SQL interpolation
- Database-backed rate limiting
- Logged errors without leaking internals to clients

## Core Domain Modules

### Identity and access

- Users
- OTP codes
- Refresh tokens
- Rate limits
- Consent logs

### Student domain

- Student profiles
- Education history
- Test scores
- Financial profile
- Travel history
- Applications
- Documents
- Gamification
- Quiz responses

### Agent domain

- Agents
- Sub-agents
- Leads
- Resources
- Commission rules
- Commission claims

### Admin domain

- University and program management
- Pipeline oversight
- Audit logs
- Notification templates and dispatch
- Analytics and KPI aggregation

## Pipeline Design

The backend should support both:

1. Detailed internal operational statuses
2. A simplified 11-node student journey map for frontend visualization

Required stage gating is checklist-driven so TGA can prevent unsafe transitions and maintain process discipline.

## Frontend Integration Expectations

The PHP API must return frontend-ready data. The React app should not need to interpret cryptic database field names or reconstruct presentation semantics.

Examples:

- Statuses should include labels and colors when helpful
- University responses should include partnership semantics
- Pagination metadata must be consistent
- Error codes must map cleanly to frontend UX states

## Session Resume Rule

Every future session should begin by reading:

1. `TGA_PROJECT_VISION.md`
2. `TGA_CRM_MASTER_ARCHITECTURE.md`

Then continue from the latest phase recorded in the progress documentation.
