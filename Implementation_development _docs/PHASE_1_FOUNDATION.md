# PHASE 1 — Foundation
## Complete Database Schema · PHP Skeleton · JWT Auth · Frontend Setup

---

## BUILDER DIRECTIVE — READ THIS FIRST, BEFORE ANYTHING ELSE

This document gives you the architecture, decisions, and specifications for this phase.
It does NOT tell you everything. That is intentional.

**Your responsibility as the builder:**

Before writing a single line of code, research. For every technology, library, pattern,
and approach specified in this document:

- Look up the current version, known issues, and best practices as of today
- Check if there is a better, simpler, or more secure alternative that has emerged
- Verify that the specified approach works correctly on PHP 8.2 + MySQL 8.4 LTS specifically
- Check for any breaking changes, deprecations, or security advisories

**You are not just executing instructions. You are the expert.**

If during your research you find:
- A better approach than what is specified
- A security issue with the current plan
- A library that is outdated or has a known vulnerability
- A MySQL 8.4 compatibility issue not already flagged
- A pattern that will cause problems at scale
- Something that contradicts best practices

Do the following:
1. Implement the better approach
2. Document what you found and what you changed at the bottom of this file
   under a section called: ## BUILDER RESEARCH NOTES

The research notes section must include:
- What you researched
- What you found
- What you changed from the original spec and why
- Any open questions or concerns for the next session

**This document is a living reference, not a locked contract.**
The architecture decisions here are the best thinking available at planning time.
Your research during build time will find things planning did not. That is expected and good.

What you must NOT change without flagging:
- The overall data model (table relationships, hierarchy design)
- The three-portal structure
- MySQL 8.4 LTS compatibility requirements
- The encryption approach for PII fields
- The soft-delete and append-only log patterns

For those, if you find a conflict, document it in BUILDER RESEARCH NOTES
and flag it for human review before changing.

---

## BUILDER RESEARCH NOTES
*(This section is filled in by the AI builder during implementation — not by the planner)*

| Topic | Finding | Action Taken |
|---|---|---|
| *(e.g. sodium extension availability on Bluehost)* | *(what you found)* | *(what you did)* |

---

## CONTEXT HEADER (read before every build session)

**Project:** The Global Avenues (TGA) CRM — India's premium international education consultancy.
**Three portals, one codebase:** Student (application tracker), Agent (recruitment dashboard), Admin (full operations control).
**Backend:** PHP 8.2.12 + MySQL 8.4 LTS, modern hosting, Apache, SSH available.
**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS, deployed on Vercel.
**Repo:** github.com/prashanttiw/TheGlobalAvenues-CRM

**Files to KEEP from existing repo (do not overwrite):**
JWTService.php, AuthMiddleware.php, FileUploadService.php, all Helpers/, all Config/

**Files to REPLACE entirely:**
schema.sql, all Controllers/, all Models/, all Routes/, OTPService.php, RoleMiddleware.php

**MySQL 8.4 LTS capabilities — FULLY SUPPORTED:**
CTEs (WITH...AS), window functions (ROW_NUMBER, RANK, LAG), utf8mb4_0900_ai_ci collation,
JSON_TABLE(), enforced CHECK constraints, DEFAULT expressions. Use them freely!

**Always use:** ENGINE=InnoDB, COLLATE=utf8mb4_unicode_ci, prepared statements (never string concatenation in SQL)

**Brand tokens:** Orange #FD7E14, Navy #1E2A4A, Warm surface #FAFAF8, Border #E8E4DE
**Fonts:** Plus Jakarta Sans (headings/display) + Inter (body/UI) — both from Google Fonts

---

## WHAT THIS PHASE BUILDS

Every database table (34 total), the PHP API skeleton with JWT auth and RBAC middleware, and the React frontend foundation with TanStack Query, Zod, route guards, and empty portal shells.

No features yet — this is the skeleton every subsequent phase attaches to. Every decision made here is hard to change later. Do it right once.

---

## 1A. COMPLETE DATABASE SCHEMA

### Design principles applied:
- **Public IDs:** Every entity gets a `public_id` CHAR(26) column (ULID format — sortable + unique). API responses always return `public_id`, never the integer `id`. Prevents sequential ID enumeration attacks. DB joins use integer `id` internally for performance.
- **Field encryption:** `email`, `phone`, `passport_number` are AES-256-GCM encrypted at rest. Because encrypted fields can't be searched with WHERE, each gets a companion `_lookup_hash` column (SHA-256 of the lowercased plaintext) for indexed lookup and uniqueness enforcement.
- **Document versioning:** `files` table supports version chains. When a document is resubmitted, old version stays. New version has `version_number = old + 1` and `previous_version_id` pointing back.
- **Human-readable filenames:** UUID stored internally for security (no guessable URLs). A `display_filename` stored for download headers and Drive folder naming.
- **Soft-delete everywhere:** `deleted_at DATETIME NULL` on all entity tables. App DB user has no DELETE grants on main tables.
- **Activity log append-only:** App DB user has INSERT-only grant on `activity_logs`. Tested in audit.
- **State machine:** Application status transitions are enforced in PHP StateManager, not just DB values.

Run migrations in numbered order on MySQL 5.7.

```sql
-- 001: users
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE COMMENT 'ULID — used in all API responses',
  email BLOB NOT NULL COMMENT 'AES-256-GCM encrypted',
  email_lookup_hash VARCHAR(64) NOT NULL UNIQUE COMMENT 'SHA-256(lowercase(email)) for login lookup',
  phone BLOB NULL COMMENT 'AES-256-GCM encrypted',
  phone_lookup_hash VARCHAR(64) NULL COMMENT 'SHA-256(lowercase(phone)) for search',
  password_hash VARCHAR(255) NOT NULL COMMENT 'Argon2id',
  user_type VARCHAR(20) NOT NULL COMMENT 'student, agent, admin',
  status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active, suspended, pending',
  last_login_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_users_type (user_type),
  INDEX idx_users_status (status),
  INDEX idx_users_email_hash (email_lookup_hash),
  INDEX idx_users_phone_hash (phone_lookup_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 002: user_sessions (active JWT session tracking)
CREATE TABLE user_sessions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  device_label VARCHAR(255) NULL COMMENT 'e.g. Chrome on Windows, Safari on iPhone',
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  last_active_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_sess_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sess_user (user_id),
  INDEX idx_sess_token (refresh_token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 003: otp_verifications
CREATE TABLE otp_verifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier_hash VARCHAR(64) NOT NULL COMMENT 'SHA-256 of email/phone for lookup',
  otp_hash VARCHAR(64) NOT NULL COMMENT 'SHA-256 of the 6-digit code',
  purpose VARCHAR(50) NOT NULL COMMENT 'registration, login, password_reset',
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_identifier (identifier_hash, purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 004: security_events (security audit — separate from operational activity_logs)
CREATE TABLE security_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL
    COMMENT 'login_failed, otp_brute_force, suspicious_file_access, password_reset,
             session_revoked, account_suspended, permission_denied',
  user_id INT UNSIGNED NULL COMMENT 'NULL if pre-auth (e.g. login attempt with unknown email)',
  identifier VARCHAR(255) NULL COMMENT 'Email or IP involved',
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  details JSON NULL COMMENT 'Extra context (attempt count, accessed resource, etc.)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sec_type (event_type, created_at),
  INDEX idx_sec_user (user_id),
  INDEX idx_sec_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 005: rate_limits
CREATE TABLE rate_limits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  requests INT UNSIGNED DEFAULT 1,
  window_start DATETIME NOT NULL,
  INDEX idx_rl (identifier, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 006: roles (admin RBAC)
CREATE TABLE roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 007: permissions
CREATE TABLE permissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL COMMENT 'view, create, edit, delete, approve',
  description VARCHAR(255) NULL,
  UNIQUE KEY uk_perm (module, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 008: role_permissions
CREATE TABLE role_permissions (
  role_id INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY fk_rp_role (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY fk_rp_perm (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 009: admins
CREATE TABLE admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  role_id INT UNSIGNED NULL,
  is_super_admin TINYINT(1) NOT NULL DEFAULT 0,
  full_name VARCHAR(255) NOT NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_admin_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY fk_admin_role (role_id) REFERENCES roles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 010: agents (3-level self-referential tree, hard-capped)
-- root_agent_id enables fast subtree queries without CTEs (MySQL 5.7 safe)
CREATE TABLE agents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  parent_agent_id INT UNSIGNED NULL COMMENT 'NULL = Level 1 agent',
  root_agent_id INT UNSIGNED NULL COMMENT 'Level 1 ancestor; equals own id if Level 1',
  tier TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1=agent, 2=sub_agent, 3=sub_sub_agent',
  full_name VARCHAR(255) NOT NULL,
  agency_name VARCHAR(255) NULL,
  country VARCHAR(100) NULL,
  business_reg_number VARCHAR(100) NULL,
  partnership_scope TEXT NULL,
  referral_code VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    COMMENT 'pending, approved, rejected, suspended',
  terms_accepted_at DATETIME NULL,
  approved_by INT UNSIGNED NULL,
  approved_at DATETIME NULL,
  rejected_reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_agent_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY fk_agent_parent (parent_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  FOREIGN KEY fk_agent_root (root_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  INDEX idx_agent_root (root_agent_id),
  INDEX idx_agent_parent (parent_agent_id),
  INDEX idx_agent_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 011: students
CREATE TABLE students (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  agent_id INT UNSIGNED NULL,
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NULL COMMENT 'Store in plain date — non-critical PII',
  nationality VARCHAR(100) NULL,
  passport_number BLOB NULL COMMENT 'AES-256-GCM encrypted',
  passport_expiry DATE NULL,
  phone_in_profile BLOB NULL COMMENT 'AES-256-GCM encrypted (may differ from login phone)',
  lead_source VARCHAR(100) NULL
    COMMENT 'agent_referral, website, google, social_media, event, walk_in, other',
  referral_agent_code VARCHAR(20) NULL,
  registered_by_type VARCHAR(20) NULL COMMENT 'self, agent, admin',
  registered_by_id INT UNSIGNED NULL,
  agent_lock_status VARCHAR(20) NOT NULL DEFAULT 'open'
    COMMENT 'open = reassignment allowed; locked = admitted, no changes',
  profile_status VARCHAR(30) NOT NULL DEFAULT 'registered'
    COMMENT 'registered, profile_complete, documents_draft, documents_submitted,
             documents_verified, application_in_progress, application_submitted,
             offer_received, admitted, enrolled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_student_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY fk_student_agent (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  INDEX idx_student_agent (agent_id),
  INDEX idx_student_status (profile_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 012: agent_reassignment_requests
CREATE TABLE agent_reassignment_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  student_id INT UNSIGNED NOT NULL,
  current_agent_id INT UNSIGNED NULL,
  requested_agent_id INT UNSIGNED NULL,
  reason TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, approved, denied',
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  review_notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_arr_student (student_id) REFERENCES students(id),
  FOREIGN KEY fk_arr_curr (current_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  FOREIGN KEY fk_arr_new (requested_agent_id) REFERENCES agents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 013: files (versioned document storage)
CREATE TABLE files (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  owner_type VARCHAR(30) NOT NULL COMMENT 'student, application, university, notice',
  owner_id INT UNSIGNED NOT NULL,
  display_filename VARCHAR(500) NOT NULL
    COMMENT 'Human-readable: Rahul_Sharma_Passport_2026-06-22.pdf — used in download headers and Drive',
  stored_filename VARCHAR(500) NOT NULL COMMENT 'UUID-based — never guessable, used on disk',
  storage_path VARCHAR(1000) NOT NULL COMMENT 'Relative path from storage root',
  is_public TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0 = private/gatekeeper; 1 = public/direct',
  mime_type VARCHAR(100) NULL,
  file_size_bytes INT UNSIGNED NULL,
  checksum_sha256 VARCHAR(64) NULL COMMENT 'Computed after write, verified on access',
  version_number TINYINT UNSIGNED NOT NULL DEFAULT 1,
  previous_version_id INT UNSIGNED NULL COMMENT 'Points to older version of same document',
  superseded_at DATETIME NULL COMMENT 'Set when a newer version is uploaded',
  uploaded_by_type VARCHAR(20) NULL COMMENT 'student, agent, admin',
  uploaded_by_id INT UNSIGNED NULL,
  drive_file_id VARCHAR(255) NULL,
  drive_folder_path VARCHAR(500) NULL COMMENT 'Folder path in Drive for organisation',
  drive_sync_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    COMMENT 'pending, synced, failed',
  deleted_at DATETIME NULL,
  deleted_by INT UNSIGNED NULL,
  deletion_reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_file_prev (previous_version_id) REFERENCES files(id) ON DELETE SET NULL,
  INDEX idx_files_owner (owner_type, owner_id),
  INDEX idx_files_sync (drive_sync_status),
  INDEX idx_files_version (owner_type, owner_id, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 014: universities
CREATE TABLE universities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  name VARCHAR(500) NOT NULL,
  country VARCHAR(100) NOT NULL,
  city VARCHAR(255) NULL,
  description TEXT NULL,
  ranking_info VARCHAR(255) NULL,
  logo_file_id INT UNSIGNED NULL,
  website_url VARCHAR(500) NULL,
  partnership_type VARCHAR(30) NULL DEFAULT 'non_exclusive'
    COMMENT 'exclusive, non_exclusive',
  status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active, inactive',
  created_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_uni_logo (logo_file_id) REFERENCES files(id) ON DELETE SET NULL,
  INDEX idx_uni_country (country),
  INDEX idx_uni_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 015: courses
CREATE TABLE courses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  university_id INT UNSIGNED NOT NULL,
  name VARCHAR(500) NOT NULL,
  degree_level VARCHAR(50) NULL COMMENT 'bachelors, masters, phd, diploma, certificate',
  duration_months INT UNSIGNED NULL,
  language VARCHAR(50) NULL DEFAULT 'English',
  description TEXT NULL,
  eligibility_criteria TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_course_uni (university_id) REFERENCES universities(id) ON DELETE CASCADE,
  INDEX idx_course_uni (university_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 016: intakes
CREATE TABLE intakes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  course_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL COMMENT 'e.g. Fall 2026, Spring 2027',
  intake_month TINYINT UNSIGNED NULL,
  intake_year SMALLINT UNSIGNED NULL,
  application_open_date DATE NULL,
  application_deadline DATE NULL,
  course_start_date DATE NULL,
  tuition_fee_amount DECIMAL(12,2) NULL,
  tuition_fee_currency VARCHAR(10) NULL DEFAULT 'EUR',
  requirements_notes TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming' COMMENT 'upcoming, open, closed',
  cloned_from_intake_id INT UNSIGNED NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_intake_course (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY fk_intake_clone (cloned_from_intake_id) REFERENCES intakes(id)
    ON DELETE SET NULL,
  INDEX idx_intake_deadline (application_deadline),
  INDEX idx_intake_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 017: applications
-- reference_number: TGA-YYYY-NNNNNN (PHP-generated on insert, human-readable)
CREATE TABLE applications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  reference_number VARCHAR(20) NOT NULL UNIQUE
    COMMENT 'Format: TGA-2026-000001. PHP generates this on insert.',
  student_id INT UNSIGNED NOT NULL,
  intake_id INT UNSIGNED NOT NULL,
  agent_id_at_submission INT UNSIGNED NULL
    COMMENT 'Snapshot of agent at submission time — never mutated after submit',
  status VARCHAR(30) NOT NULL DEFAULT 'draft'
    COMMENT 'State machine enforced in PHP — see StateManager.
             Valid states: draft, submitted, under_review,
             offer_received, rejected, waitlisted, enrolled',
  submitted_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_app_student (student_id) REFERENCES students(id),
  FOREIGN KEY fk_app_intake (intake_id) REFERENCES intakes(id),
  FOREIGN KEY fk_app_agent (agent_id_at_submission) REFERENCES agents(id)
    ON DELETE SET NULL,
  INDEX idx_app_student (student_id),
  INDEX idx_app_status (status),
  INDEX idx_app_ref (reference_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 018: application_updates (unified timeline — documents, links, notes, payment requests)
CREATE TABLE application_updates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  application_id INT UNSIGNED NOT NULL,
  direction VARCHAR(30) NOT NULL COMMENT 'admin_to_student, student_to_admin',
  item_type VARCHAR(20) NOT NULL COMMENT 'file, link, note, payment_request',
  content TEXT NULL COMMENT 'Link URL or note text',
  file_id INT UNSIGNED NULL,
  posted_by_type VARCHAR(20) NULL COMMENT 'admin, student, agent',
  posted_by_id INT UNSIGNED NULL,
  is_visible_to_agent TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_au_app (application_id) REFERENCES applications(id),
  FOREIGN KEY fk_au_file (file_id) REFERENCES files(id) ON DELETE SET NULL,
  INDEX idx_au_app (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 019: document_requests
CREATE TABLE document_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  student_id INT UNSIGNED NOT NULL,
  application_id INT UNSIGNED NULL,
  doc_label VARCHAR(255) NOT NULL COMMENT 'Admin-defined name',
  description TEXT NULL,
  deadline DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'requested'
    COMMENT 'requested, submitted, approved, rejected',
  requested_by INT UNSIGNED NOT NULL,
  submitted_file_id INT UNSIGNED NULL,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_dr_student (student_id) REFERENCES students(id),
  FOREIGN KEY fk_dr_app (application_id) REFERENCES applications(id) ON DELETE SET NULL,
  FOREIGN KEY fk_dr_requester (requested_by) REFERENCES admins(id),
  FOREIGN KEY fk_dr_file (submitted_file_id) REFERENCES files(id) ON DELETE SET NULL,
  INDEX idx_dr_student (student_id),
  INDEX idx_dr_deadline (deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 020: application_payments
CREATE TABLE application_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  application_id INT UNSIGNED NOT NULL,
  label VARCHAR(255) NOT NULL COMMENT 'e.g. Application Fee, Tuition Deposit',
  amount DECIMAL(12,2) NULL,
  currency VARCHAR(10) NULL DEFAULT 'EUR',
  payment_link TEXT NULL,
  due_date DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    COMMENT 'pending, student_marked_paid, confirmed, disputed',
  marked_paid_at DATETIME NULL,
  confirmed_by INT UNSIGNED NULL,
  confirmed_at DATETIME NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_pay_app (application_id) REFERENCES applications(id),
  FOREIGN KEY fk_pay_confirmer (confirmed_by) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_pay_due (due_date),
  INDEX idx_pay_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 021: leads (TGA-internal only — agents never have access to this table)
CREATE TABLE leads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  full_name VARCHAR(255) NULL,
  email BLOB NULL COMMENT 'AES-256-GCM encrypted',
  email_lookup_hash VARCHAR(64) NULL,
  phone BLOB NULL COMMENT 'AES-256-GCM encrypted',
  source VARCHAR(100) NULL
    COMMENT 'website_form, landing_page, campaign_ad, event, manual_entry, imported',
  source_detail VARCHAR(255) NULL,
  interested_country VARCHAR(100) NULL,
  interested_course VARCHAR(255) NULL,
  notes TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    COMMENT 'new, contacted, qualified, converted, dropped',
  assigned_to INT UNSIGNED NULL COMMENT 'Points to admins.id — never an agent',
  converted_student_id INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_lead_staff (assigned_to) REFERENCES admins(id) ON DELETE SET NULL,
  FOREIGN KEY fk_lead_student (converted_student_id) REFERENCES students(id)
    ON DELETE SET NULL,
  INDEX idx_lead_status (status),
  INDEX idx_lead_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 022: commissions
CREATE TABLE commissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  application_id INT UNSIGNED NOT NULL,
  agent_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NULL,
  percentage DECIMAL(5,2) NULL,
  currency VARCHAR(10) NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    COMMENT 'pending, confirmed, paid',
  notes TEXT NULL,
  decided_by INT UNSIGNED NULL,
  decided_at DATETIME NULL,
  paid_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_comm_app (application_id) REFERENCES applications(id),
  FOREIGN KEY fk_comm_agent (agent_id) REFERENCES agents(id),
  FOREIGN KEY fk_comm_decider (decided_by) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_comm_agent (agent_id),
  INDEX idx_comm_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 023: notices
CREATE TABLE notices (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  content TEXT NULL,
  notice_type VARCHAR(20) NOT NULL DEFAULT 'notice' COMMENT 'notice, event',
  event_date DATETIME NULL,
  event_location VARCHAR(255) NULL,
  attachment_file_id INT UNSIGNED NULL,
  visible_to_students TINYINT(1) NOT NULL DEFAULT 0,
  visible_to_agents TINYINT(1) NOT NULL DEFAULT 0,
  visible_to_admins TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, published, expired',
  published_at DATETIME NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_notice_file (attachment_file_id) REFERENCES files(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 024: internal_notes (per-note audience targeting)
CREATE TABLE internal_notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  entity_type VARCHAR(30) NOT NULL COMMENT 'student, application',
  entity_id INT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  author_type VARCHAR(20) NOT NULL COMMENT 'admin, agent',
  author_id INT UNSIGNED NOT NULL,
  visible_to_student TINYINT(1) NOT NULL DEFAULT 0,
  visible_to_agent TINYINT(1) NOT NULL DEFAULT 0,
  visible_to_admin TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_notes_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 025: notification_templates
CREATE TABLE notification_templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_key VARCHAR(100) NOT NULL UNIQUE,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL COMMENT 'Supports {{placeholder}} variables',
  channels VARCHAR(100) NOT NULL DEFAULT 'email,in_app',
  category VARCHAR(50) NULL
    COMMENT 'documents, applications, payments, approvals, system, agent',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 026: notifications (queue + delivery log + categorised notification center)
CREATE TABLE notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  event_key VARCHAR(100) NOT NULL,
  recipient_user_id INT UNSIGNED NOT NULL,
  channel VARCHAR(20) NOT NULL COMMENT 'email, in_app',
  category VARCHAR(50) NULL
    COMMENT 'documents, applications, payments, approvals, system, agent',
  subject TEXT NULL,
  body TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    COMMENT 'queued, sent, failed, read',
  related_entity_type VARCHAR(50) NULL,
  related_entity_id INT UNSIGNED NULL,
  related_entity_public_id CHAR(26) NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_attempt_at DATETIME NULL,
  sent_at DATETIME NULL,
  read_at DATETIME NULL,
  error_message TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_notif_user (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_recipient (recipient_user_id, status),
  INDEX idx_notif_category (recipient_user_id, category, status),
  INDEX idx_notif_queued (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 027: reminders (universal deadline engine)
CREATE TABLE reminders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(30) NOT NULL
    COMMENT 'document_request, application_payment, intake, commission',
  entity_id INT UNSIGNED NOT NULL,
  reminder_type VARCHAR(50) NOT NULL
    COMMENT 'deadline_3days, deadline_1day, overdue, payment_overdue,
             commission_pending, intake_deadline',
  remind_at DATETIME NOT NULL,
  recipient_user_ids JSON NOT NULL COMMENT 'JSON array of user ids to notify',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, sent, cancelled',
  sent_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reminder_pending (status, remind_at),
  INDEX idx_reminder_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 028: sla_rules (define service level expectations)
CREATE TABLE sla_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL UNIQUE,
  entity_type VARCHAR(30) NOT NULL COMMENT 'document_request, application, lead',
  trigger_status VARCHAR(30) NOT NULL COMMENT 'Status that starts the SLA clock',
  target_hours INT UNSIGNED NOT NULL COMMENT 'Hours to resolve before SLA breach',
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 029: sla_events (track SLA per entity instance)
CREATE TABLE sla_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sla_rule_id INT UNSIGNED NOT NULL,
  entity_type VARCHAR(30) NOT NULL,
  entity_id INT UNSIGNED NOT NULL,
  started_at DATETIME NOT NULL,
  target_at DATETIME NOT NULL COMMENT 'started_at + rule target_hours',
  resolved_at DATETIME NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    COMMENT 'active, met, breached',
  breach_notified TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_sla_rule (sla_rule_id) REFERENCES sla_rules(id),
  INDEX idx_sla_status (status, target_at),
  INDEX idx_sla_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 030: user_preferences
CREATE TABLE user_preferences (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  preferences JSON NOT NULL DEFAULT ('{}')
    COMMENT 'Keys: table_page_size, sidebar_collapsed, dashboard_widgets,
             notification_categories, theme',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_pref_user (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 031: activity_logs
-- APPEND-ONLY: app DB user has INSERT-only grant on this table.
-- No updated_at, no deleted_at. Rows are never modified or removed.
CREATE TABLE activity_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT UNSIGNED NULL,
  actor_user_type VARCHAR(20) NULL COMMENT 'student, agent, admin, system',
  actor_display_name VARCHAR(255) NULL COMMENT 'Name snapshot at time of action',
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NULL,
  target_id INT UNSIGNED NULL,
  target_public_id CHAR(26) NULL,
  target_display VARCHAR(255) NULL COMMENT 'Human-readable snapshot of target',
  before_value JSON NULL,
  after_value JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_al_actor (actor_user_id, created_at),
  INDEX idx_al_target (target_type, target_id),
  INDEX idx_al_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 032: report_snapshots (daily pre-computed metrics for fast dashboard queries)
-- Populated by generate_snapshots cron job daily at midnight
CREATE TABLE report_snapshots (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  metric_key VARCHAR(100) NOT NULL
    COMMENT 'total_students, new_students, total_applications, total_offers,
             total_enrollments, total_leads, commissions_pending_inr,
             commissions_paid_inr, conversion_rate_pct',
  metric_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  dimension_type VARCHAR(50) NULL
    COMMENT 'global, agent, university, country, lead_source',
  dimension_id VARCHAR(255) NULL
    COMMENT 'agent public_id, university public_id, country name, or source key',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_snapshot (snapshot_date, metric_key, dimension_type, dimension_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 033: api_request_logs (API performance monitoring)
CREATE TABLE api_request_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  method VARCHAR(10) NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  status_code SMALLINT UNSIGNED NOT NULL,
  response_time_ms INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NULL,
  user_type VARCHAR(20) NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_api_endpoint (endpoint, created_at),
  INDEX idx_api_status (status_code),
  INDEX idx_api_slow (response_time_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 034: cron_health (heartbeat monitoring — every cron writes here on each run)
CREATE TABLE cron_health (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL UNIQUE,
  last_run_at DATETIME NULL,
  last_run_status VARCHAR(20) NOT NULL DEFAULT 'never_run'
    COMMENT 'success, failed, running, never_run',
  last_run_duration_ms INT UNSIGNED NULL,
  last_error TEXT NULL,
  run_count INT UNSIGNED NOT NULL DEFAULT 0,
  fail_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 035: system_settings (super admin configurable — replaces .env for operational values)
CREATE TABLE system_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  value_type VARCHAR(20) NOT NULL DEFAULT 'string'
    COMMENT 'string, integer, boolean, json',
  label VARCHAR(255) NOT NULL,
  description TEXT NULL,
  group_name VARCHAR(50) NULL
    COMMENT 'otp, upload, reminders, commissions, security, sla, backup',
  is_editable TINYINT(1) NOT NULL DEFAULT 1,
  updated_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEEDS
-- ============================================================

-- Permissions (56 rows)
INSERT INTO permissions (module, action) VALUES
  ('universities','view'),('universities','create'),('universities','edit'),
  ('universities','delete'),
  ('courses','view'),('courses','create'),('courses','edit'),('courses','delete'),
  ('intakes','view'),('intakes','create'),('intakes','edit'),('intakes','delete'),
  ('applications','view'),('applications','create'),('applications','edit'),
  ('applications','approve'),
  ('students','view'),('students','create'),('students','edit'),
  ('students','delete'),('students','approve'),
  ('agents','view'),('agents','create'),('agents','edit'),
  ('agents','delete'),('agents','approve'),
  ('leads','view'),('leads','create'),('leads','edit'),('leads','delete'),
  ('documents','view'),('documents','create'),('documents','approve'),
  ('commissions','view'),('commissions','create'),('commissions','edit'),
  ('commissions','approve'),
  ('notices','view'),('notices','create'),('notices','edit'),('notices','delete'),
  ('activity_logs','view'),
  ('security_events','view'),
  ('user_management','view'),('user_management','create'),
  ('user_management','edit'),('user_management','delete'),
  ('reports','view'),
  ('system_settings','view'),('system_settings','edit'),
  ('internal_notes','view'),('internal_notes','create'),
  ('sla','view'),('sla','edit');

-- System settings defaults
INSERT INTO system_settings
  (setting_key, setting_value, value_type, label, description, group_name)
VALUES
  ('otp_expiry_minutes','10','integer','OTP Expiry (minutes)',
   'How long an OTP remains valid','otp'),
  ('otp_max_attempts','3','integer','OTP Max Attempts',
   'Failed attempts before OTP is blocked','otp'),
  ('upload_max_size_mb','10','integer','Max Upload Size (MB)',
   'Maximum file size per document upload','upload'),
  ('reminder_days_before_deadline','[3,1]','json','Reminder Days Before Deadline',
   'Days before deadline to send reminder notifications','reminders'),
  ('commission_pending_alert_days','30','integer','Commission Pending Alert (days)',
   'Alert admin when a commission has been pending this many days','commissions'),
  ('disk_warn_threshold_pct','80','integer','Disk Warning Threshold (%)',
   'Alert when disk usage exceeds this percentage','security'),
  ('disk_critical_threshold_pct','95','integer','Disk Critical Threshold (%)',
   'Critical alert threshold for disk usage','security'),
  ('session_max_per_user','5','integer','Max Active Sessions Per User',
   'Oldest session revoked when limit is exceeded','security'),
  ('api_log_slow_threshold_ms','500','integer','Slow API Threshold (ms)',
   'Log warning when API response exceeds this time','security'),
  ('backup_retain_daily','7','integer','Daily Backup Retention',
   'Number of daily backups to keep','backup'),
  ('backup_retain_weekly','4','integer','Weekly Backup Retention',
   'Number of weekly backups to keep','backup'),
  ('backup_retain_monthly','6','integer','Monthly Backup Retention',
   'Number of monthly backups to keep','backup');

-- SLA rules defaults
INSERT INTO sla_rules (rule_name, entity_type, trigger_status, target_hours, description)
VALUES
  ('document_review','document_request','submitted',48,
   'Document must be reviewed within 48 hours of submission'),
  ('application_review','application','submitted',72,
   'Application status must be updated within 72 hours of submission'),
  ('lead_first_contact','lead','new',24,
   'New lead must be contacted within 24 hours');

-- Cron health seeds
INSERT INTO cron_health (job_name) VALUES
  ('send_notifications'),('sync_drive'),('backup_db'),
  ('generate_snapshots'),('process_reminders'),('monitor_disk'),
  ('check_sla_breaches'),('verify_backups'),('archive_old_logs');
```

---

## 1B. ENCRYPTION IMPLEMENTATION

### Encrypted fields across the schema:
- `users.email` (BLOB) + `users.email_lookup_hash` (VARCHAR 64)
- `users.phone` (BLOB) + `users.phone_lookup_hash` (VARCHAR 64)
- `students.passport_number` (BLOB)
- `students.phone_in_profile` (BLOB)
- `leads.email` (BLOB) + `leads.email_lookup_hash` (VARCHAR 64)
- `leads.phone` (BLOB)

### EncryptionService.php (new file in src/Services/):
```php
class EncryptionService {

    // Key from .env: ENCRYPTION_KEY (must be exactly 32 bytes)
    // NEVER store this key in DB or code

    public static function encrypt(string $plaintext): string {
        $key = sodium_base642bin(getenv('ENCRYPTION_KEY'), SODIUM_BASE64_VARIANT_ORIGINAL);
        $nonce = random_bytes(SODIUM_CRYPTO_AEAD_AES256GCM_NPUBBYTES);
        $ciphertext = sodium_crypto_aead_aes256gcm_encrypt(
            $plaintext, '', $nonce, $key
        );
        // Store nonce + ciphertext together, base64 encoded
        return base64_encode($nonce . $ciphertext);
    }

    public static function decrypt(string $encrypted): string {
        $key = sodium_base642bin(getenv('ENCRYPTION_KEY'), SODIUM_BASE64_VARIANT_ORIGINAL);
        $decoded = base64_decode($encrypted);
        $nonce = substr($decoded, 0, SODIUM_CRYPTO_AEAD_AES256GCM_NPUBBYTES);
        $ciphertext = substr($decoded, SODIUM_CRYPTO_AEAD_AES256GCM_NPUBBYTES);
        return sodium_crypto_aead_aes256gcm_decrypt($ciphertext, '', $nonce, $key);
    }

    public static function hash(string $value): string {
        // For lookup columns — lowercase first for case-insensitive search
        return hash('sha256', strtolower(trim($value)));
    }
}
```

### .env additions required:
```
ENCRYPTION_KEY=<32-byte-random-key-base64-encoded>
# Generate with: php -r "echo base64_encode(random_bytes(32));"
```

### How to query by encrypted email (login example):
```php
// NEVER: WHERE email = '{$email}'
// ALWAYS: hash the input, query the lookup column
$hash = EncryptionService::hash($loginEmail);
$user = $db->query(
    "SELECT * FROM users WHERE email_lookup_hash = ? AND deleted_at IS NULL",
    [$hash]
)->fetch();
// Then decrypt for display: EncryptionService::decrypt($user['email'])
```

---

## 1C. ULID GENERATION (Public IDs)

### UlidGenerator.php (new file in src/Helpers/):
```php
class UlidGenerator {
    public static function generate(): string {
        // ULID: 26-char, URL-safe, sortable, unique
        // No external library needed — pure PHP
        $time = (int)(microtime(true) * 1000);
        $timeStr = '';
        $chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32
        for ($i = 9; $i >= 0; $i--) {
            $timeStr = $chars[$time % 32] . $timeStr;
            $time = (int)($time / 32);
        }
        $random = '';
        for ($i = 0; $i < 16; $i++) {
            $random .= $chars[random_int(0, 31)];
        }
        return $timeStr . $random;
    }
}
// Every INSERT must generate a ULID in PHP and include it in the INSERT statement
// Example: 'public_id' => UlidGenerator::generate()
```

---

## 1D. STATE MACHINE (Application Status)

### StateManager.php (new file in src/Services/):
```php
class ApplicationStateManager {

    // Valid transitions: [from_state => [to_state => allowed_roles]]
    private static array $transitions = [
        'draft'         => ['submitted'      => ['student','agent','admin']],
        'submitted'     => ['under_review'   => ['admin']],
        'under_review'  => [
            'offer_received' => ['admin'],
            'rejected'       => ['admin'],
            'waitlisted'     => ['admin'],
        ],
        'offer_received' => [
            'enrolled'  => ['admin'],
            'rejected'  => ['admin'],
        ],
        'waitlisted'    => [
            'submitted' => ['admin'],  // re-open
            'rejected'  => ['admin'],
        ],
    ];

    public static function canTransition(
        string $fromStatus,
        string $toStatus,
        string $userType
    ): bool {
        $allowed = self::$transitions[$fromStatus][$toStatus] ?? [];
        return in_array($userType, $allowed, true);
    }

    public static function transition(
        int $applicationId,
        string $toStatus,
        string $userType,
        int $actorId
    ): array {
        // 1. Load current application status
        // 2. Call canTransition() — throw 403 if not allowed
        // 3. UPDATE applications SET status = ?, updated_at = NOW() WHERE id = ?
        // 4. If toStatus = 'enrolled': UPDATE students SET agent_lock_status = 'locked'
        // 5. Log to activity_logs
        // 6. Fire notification event application.status_changed
        // 7. Start/resolve relevant SLA events
        // Return updated application
    }
}
```

---

## 1E. PHP BACKEND FOLDER STRUCTURE

```
crm-api/
  public/
    index.php                 Single entry point
    .htaccess                 Route all to index.php; deny /storage
    uploads/
      public/                 University logos, brochures (direct access)
  src/
    Controllers/              (populated Phase 2+)
    Models/
      BaseModel.php           PDO + soft-delete scope + paginate()
    Middleware/
      AuthMiddleware.php      KEEP existing
      RBACMiddleware.php      REWRITE — module-based + agent tree check
      RateLimitMiddleware.php KEEP existing
    Services/
      JWTService.php          KEEP existing exactly
      FileUploadService.php   KEEP + extend (checksum, files table, versioning)
      OTPService.php          REWRITE (see below)
      EncryptionService.php   NEW
      NotificationService.php SCAFFOLD (Phase 6)
      ActivityLogger.php      SCAFFOLD (Phase 6)
      ApplicationStateManager.php  NEW
      ReminderEngine.php      SCAFFOLD (Phase 6)
    Helpers/
      Response.php            KEEP + add paginated()
      Validator.php           KEEP
      Sanitizer.php           KEEP
      Paginator.php           KEEP
      FileHelper.php          KEEP
      UlidGenerator.php       NEW
    Routes/
      api.php                 All route definitions
  storage/
    private/                  Sensitive docs — gatekeeper only
    temp/                     Atomic write staging
    logs/
    backups/                  Daily/weekly/monthly DB dumps
  config/
    database.php
    jwt.php
    app.php
    .env                      Never in git
  cron/
    send-notifications.php
    sync-drive.php
    backup-db.php
    generate-snapshots.php
    process-reminders.php
    monitor-disk.php
    check-sla-breaches.php
    verify-backups.php
    archive-old-logs.php
  migrations/
    001_users.sql ... 035_system_settings.sql
  composer.json
```

### composer.json:
```json
{
  "require": {
    "php": "^8.2",
    "phpmailer/phpmailer": "^6.0",
    "google/apiclient": "^2.0",
    "vlucas/phpdotenv": "^5.0"
  }
}
```
Note: No UUID library needed (UlidGenerator is pure PHP). No JWT library needed (JWTService.php is self-contained).

### BaseModel.php — critical methods:
```php
// All SELECT queries append: AND {table}.deleted_at IS NULL
// findByPublicId($publicId) — API-facing lookups always use public_id
// paginate($page, $perPage) — used by all list endpoints
// softDelete($id) — sets deleted_at, never deletes
// All writes: generate ULID for public_id before INSERT
```

### OTPService.php — complete rewrite:
```php
// generate(string $identifier, string $purpose): string
//   - Read otp_expiry_minutes from system_settings
//   - Delete existing unused OTPs for this identifier+purpose
//   - Generate 6-digit random code
//   - Store hash('sha256', $code) in otp_verifications
//   - Store EncryptionService::hash($identifier) as identifier_hash
//   - Set expires_at = NOW() + {otp_expiry_minutes} minutes
//   - Return plain $code (caller sends it to user via email)

// verify(string $identifier, string $code, string $purpose): bool
//   - Read otp_max_attempts from system_settings
//   - Lookup by identifier_hash + purpose + used_at IS NULL + expires_at > NOW()
//   - If not found: log security event otp_not_found, return false
//   - If attempts >= max_attempts: log otp_brute_force, return false
//   - Increment attempts
//   - Compare hash('sha256', $code) with stored hash
//   - If match: SET used_at = NOW(), return true
//   - If no match: return false
```

### API response format (all endpoints):
```json
{
  "success": true,
  "data": {},
  "message": "OK",
  "meta": {
    "timestamp": "2026-06-22T10:30:00Z",
    "page": 1, "per_page": 20, "total": 143
  }
}
```
Error:
```json
{
  "success": false,
  "error": "VALIDATION_FAILED",
  "message": "Email is required",
  "fields": { "email": "Email address is required" }
}
```

### Auth routes in Phase 1:
```
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/request-otp
POST /api/v1/auth/verify-otp
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/me
GET  /api/v1/auth/sessions          List own active sessions
DELETE /api/v1/auth/sessions/:id    Revoke a specific session
GET  /api/v1/health                 System health check
```

### Login logic with session management:
```
1. Hash the email input: EncryptionService::hash($email)
2. SELECT WHERE email_lookup_hash = $hash AND deleted_at IS NULL
3. password_verify($password, $user['password_hash'])  // works with both bcrypt and argon2id
4. Check user status = 'active'
5. Count active sessions for user — if >= system_setting(session_max_per_user): revoke oldest
6. Generate JWT access token (24h) + refresh token (30d)
7. INSERT into user_sessions (device_label from User-Agent, IP, token hash, expires_at)
8. Log activity_logs: user.login
9. Return access_token, refresh_token, user_type, public_id
```

---

## 1F. FRONTEND FOUNDATION

### Install dependencies:
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install axios zod
npm install react-hook-form @hookform/resolvers
npm install zustand
npm install react-router-dom@7
npm install cmdk     # Command palette (Ctrl+K)
# Already present: tailwindcss, framer-motion, lucide-react, shadcn/ui components
```

### tailwind.config.js additions:
```js
theme: {
  extend: {
    colors: {
      brand: {
        orange: '#FD7E14',
        navy:   '#1E2A4A',
        amber:  '#F59E0B',
      },
      surface: { warm: '#FAFAF8', card: '#FFFFFF' },
      'border-warm': '#E8E4DE',
    },
    fontFamily: {
      display: ['Plus Jakarta Sans', 'sans-serif'],
      body:    ['Inter', 'sans-serif'],
    },
    boxShadow: {
      card:       '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      'card-hover': '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
    },
    borderRadius: {
      card: '12px',
      button: '8px',
    },
  }
}
```

### Files to create:
```
src/shared/lib/api.ts
src/shared/lib/auth.ts
src/shared/lib/queryClient.ts
src/shared/lib/encryption.ts      Client-side display helpers (NOT encryption — that's server-side)
src/shared/hooks/useAuth.ts
src/shared/hooks/usePermission.ts
src/shared/hooks/useToast.ts
src/shared/stores/authStore.ts    Zustand store for auth state only
src/routes/index.tsx              Complete router rewrite
src/routes/guards/ProtectedRoute.tsx
src/routes/guards/RoleGuard.tsx
src/routes/guards/ModuleGuard.tsx
```

### src/shared/lib/api.ts:
```ts
// Axios instance:
// - baseURL: import.meta.env.VITE_API_BASE_URL
// - Request interceptor: attach 'Authorization: Bearer {token}' from authStore
// - Response interceptor:
//   On 401: attempt POST /auth/refresh with refresh token
//   If refresh succeeds: retry original request with new access token
//   If refresh fails: clear authStore, redirect to /portal/login
// - Log response time to console in development
```

### src/shared/lib/queryClient.ts:
```ts
// QueryClient with:
// - staleTime: 30_000 (30 seconds)
// - gcTime: 5 * 60_000 (5 minutes)
// - retry: 1
// - refetchOnWindowFocus: true
// - Global onError: show toast for network errors
```

### src/shared/hooks/usePermission.ts:
```ts
// For admin users — checks if their role has a specific permission
// usePermission('agents', 'approve') → boolean
// Used to conditionally show/hide action buttons
// Super admin always returns true for everything
// Pulls permissions list from JWT payload or /auth/me response
```

### Complete route structure (rewrite src/router/index.tsx):
```
Marketing routes (untouched, under PublicLayout):
  / /destinations /courses /partners /about /contact /services

Auth routes:
  /portal/login       LoginPage
  /apply              ApplyPage

Student portal (ProtectedRoute → RoleGuard('student') → StudentLayout):
  /student/               StudentOverviewPage
  /student/applications   StudentApplicationsPage
  /student/applications/:publicId   ApplicationDetailPage
  /student/documents      StudentDocumentsPage
  /student/agent          StudentAgentPage
  /student/notices        StudentNoticesPage
  /student/profile        StudentProfilePage

Agent portal (ProtectedRoute → RoleGuard('agent') → AgentLayout):
  /agent/               AgentOverviewPage
  /agent/students       AgentStudentsPage
  /agent/students/:publicId   AgentStudentDetailPage
  /agent/team           AgentTeamPage
  /agent/applications   AgentApplicationsPage
  /agent/commissions    AgentCommissionsPage
  /agent/notices        AgentNoticesPage
  /agent/profile        AgentProfilePage

Admin portal (ProtectedRoute → RoleGuard('admin') → AdminLayout):
  /admin/                 AdminOverviewPage
  /admin/universities     ModuleGuard('universities','view')
  /admin/universities/:publicId   UniversityDetailPage
  /admin/courses/:uniPublicId     ModuleGuard('courses','view')
  /admin/intakes/:coursePublicId  ModuleGuard('intakes','view')
  /admin/students         ModuleGuard('students','view')
  /admin/students/:publicId   AdminStudentDetailPage
  /admin/agents           ModuleGuard('agents','view')
  /admin/agents/:publicId     AdminAgentDetailPage
  /admin/applications     ModuleGuard('applications','view')
  /admin/applications/:publicId   AdminApplicationDetailPage
  /admin/commissions      ModuleGuard('commissions','view')
  /admin/leads            ModuleGuard('leads','view')
  /admin/notices          ModuleGuard('notices','view')
  /admin/reports          ModuleGuard('reports','view')
  /admin/users            ModuleGuard('user_management','view')
  /admin/roles            ModuleGuard('user_management','view')
  /admin/settings         ModuleGuard('system_settings','view')
  /admin/logs             ModuleGuard('activity_logs','view')
  /admin/security         ModuleGuard('security_events','view')
```

---

## BEFORE RUNNING THE AUDIT

Before ticking anything on the checklist below:

1. Fill in the BUILDER RESEARCH NOTES table at the top of this document
2. If any research finding caused a spec change, note which checklist item it affects
3. If you are unsure about anything — a MySQL version quirk, a PHP function's behaviour
   on shared hosting, a library's compatibility — do not guess. Research it first,
   then implement. Document what you found.

The audit checklist exists to verify the implementation is correct and complete.
It cannot catch things the spec missed. Your research notes capture those.

---

## PHASE 1 AUDIT CHECKLIST

### Database:
- [ ] All 35 migrations ran without error on MySQL 5.7
- [ ] Every table has ENGINE=InnoDB and COLLATE=utf8mb4_unicode_ci
- [ ] No utf8mb4_0900_ai_ci collation used anywhere
- [ ] All foreign keys enforce correctly
- [ ] `activity_logs`: test in phpMyAdmin — UPDATE must fail, INSERT must succeed
- [ ] `permissions` table: count = 56 rows
- [ ] `system_settings`: 12 seed rows present
- [ ] `sla_rules`: 3 seed rows present
- [ ] `cron_health`: 9 seed rows, all status = 'never_run'
- [ ] `report_snapshots`: empty table (populated by cron Phase 8)

### Encryption:
- [ ] ENCRYPTION_KEY set in .env (32 bytes, base64-encoded)
- [ ] sodium extension enabled in PHP (check with php -m | grep sodium)
- [ ] EncryptionService::encrypt() + decrypt() roundtrip test passes
- [ ] Login with encrypted email works (lookup by hash, not by encrypted value)
- [ ] email_lookup_hash column is UNIQUE — duplicate email correctly rejected

### Auth:
- [ ] POST /api/v1/auth/login returns access_token + refresh_token
- [ ] Password verified with password_verify() — works with both bcrypt and argon2id hashes
- [ ] New password hashes use PASSWORD_ARGON2ID (check hash prefix: $argon2id$)
- [ ] Invalid password returns 401 and logs security_event login_failed
- [ ] Suspended user returns 403
- [ ] GET /api/v1/auth/me with valid token returns user public_id (NOT integer id)
- [ ] GET /api/v1/auth/me with expired token returns 401
- [ ] Refresh token creates new access_token
- [ ] GET /api/v1/auth/sessions returns active sessions for current user
- [ ] DELETE /api/v1/auth/sessions/:id revokes that session
- [ ] Super admin bypasses all RBAC checks
- [ ] Sub-admin without permission gets 403 on protected route
- [ ] OTP: correct code verifies, wrong code 3 times is blocked

### Public IDs:
- [ ] All API responses return public_id, never integer id
- [ ] Route parameters use public_id (e.g. /students/:publicId)
- [ ] ULID format confirmed (26 chars, starts with timestamp-ordered prefix)

### Backend:
- [ ] CORS allows localhost:5173 and the Vercel domain
- [ ] GET /api/v1/health returns 200 with database + disk + cron status
- [ ] All SQL uses PDO prepared statements — grep for string concatenation to confirm
- [ ] storage/private/ has .htaccess: Deny from all
- [ ] .env is not accessible at any public URL

### Frontend:
- [ ] Login page tabs read: Student / Agent / Admin (NOT "Partner")
- [ ] Successful login redirects to correct portal based on user_type
- [ ] /admin/* without token redirects to /portal/login
- [ ] /agent/* accessed by student user redirects to /student/
- [ ] TanStack Query QueryClientProvider wraps the app
- [ ] Axios interceptor attaches Bearer token
- [ ] Axios interceptor handles 401 and attempts refresh
- [ ] Plus Jakarta Sans loading as heading font
- [ ] Inter loading as body font
- [ ] No blue-500 or indigo-* classes in codebase (grep to confirm)
- [ ] Brand orange #FD7E14 in sidebar active state
- [ ] Navy #1E2A4A as sidebar background
- [ ] All 3 portal shells render with correct layout
- [ ] usePermission hook correctly returns false for missing permissions
- [ ] ModuleGuard redirects admin without permission to /admin/ overview

---

---

# SENIOR ARCHITECT REVIEW — Phase 1 Foundation Audit
**Reviewed by:** Antigravity (Senior Architect Pass)
**Review Date:** 2026-06-23
**Stack confirmed:** PHP 8.2.12 · MySQL 5.7.23 · React 18 + Vite · Bluehost India shared hosting
**Scope:** Security · Schema · Indexes · MySQL 5.7 Compatibility · RBAC · Scalability · Implementation Risks

> **Convention used below:**
> — Blocks prefixed `DIFF SQL`, `DIFF PHP`, `DIFF TS` show the exact change.
> — `[CRITICAL]` = must fix before first production deploy.
> — `[HIGH]` = must fix in Phase 1 / Phase 2.
> — `[MEDIUM]` = fix before Phase 3 or when the module is first touched.
> — `[LOW]` = technical debt / nice-to-have, log and revisit.

---

## SECTION A — SECURITY ISSUES

---

### A-01 [CRITICAL] AES-256-GCM hardware requirement — sodium extension may not be available on Bluehost shared

**Finding:**
`EncryptionService` calls `sodium_crypto_aead_aes256gcm_encrypt()`. This function requires **AES-NI CPU instructions**. Bluehost India shared hosting runs on virtualised hardware; AES-NI is **not guaranteed**. If the CPU does not support AES-NI, `sodium_crypto_aead_aes256gcm_encrypt()` throws a `SodiumException` at runtime — breaking every login and registration.

**Risk:** Application unusable in production if AES-NI is absent. Discovered at runtime, not build time.

**Fix:** Use `sodium_crypto_secretbox` (XSalsa20-Poly1305) as primary, fall back only with a documented decision. Also add a boot-time check that throws a clear error rather than a runtime exception during a user request.

```diff
DIFF PHP — src/Services/EncryptionService.php

-    public static function encrypt(string $plaintext): string {
-        $key = sodium_base642bin(getenv('ENCRYPTION_KEY'), SODIUM_BASE64_VARIANT_ORIGINAL);
-        $nonce = random_bytes(SODIUM_CRYPTO_AEAD_AES256GCM_NPUBBYTES);
-        $ciphertext = sodium_crypto_aead_aes256gcm_encrypt(
-            $plaintext, '', $nonce, $key
-        );
-        return base64_encode($nonce . $ciphertext);
-    }
-
-    public static function decrypt(string $encrypted): string {
-        $key = sodium_base642bin(getenv('ENCRYPTION_KEY'), SODIUM_BASE64_VARIANT_ORIGINAL);
-        $decoded = base64_decode($encrypted);
-        $nonce = substr($decoded, 0, SODIUM_CRYPTO_AEAD_AES256GCM_NPUBBYTES);
-        $ciphertext = substr($decoded, SODIUM_CRYPTO_AEAD_AES256GCM_NPUBBYTES);
-        return sodium_crypto_aead_aes256gcm_decrypt($ciphertext, '', $nonce, $key);
-    }

+    // XSalsa20-Poly1305 — does NOT require AES-NI hardware.
+    // Key must be exactly SODIUM_CRYPTO_SECRETBOX_KEYBYTES (32) bytes.
+    public static function encrypt(string $plaintext): string {
+        self::assertSodiumAvailable();
+        $key   = self::loadKey();
+        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
+        $ciphertext = sodium_crypto_secretbox($plaintext, $nonce, $key);
+        sodium_memzero($key);
+        // prefix with version byte 0x01 for future algorithm migration
+        return base64_encode("\x01" . $nonce . $ciphertext);
+    }
+
+    public static function decrypt(string $encrypted): string {
+        self::assertSodiumAvailable();
+        $key     = self::loadKey();
+        $decoded = base64_decode($encrypted, true);
+        if ($decoded === false || strlen($decoded) <= 1 + SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
+            throw new \RuntimeException('Encrypted payload is malformed.');
+        }
+        $version    = ord($decoded[0]);
+        $nonce      = substr($decoded, 1, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
+        $ciphertext = substr($decoded, 1 + SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
+        $plain = sodium_crypto_secretbox_open($ciphertext, $nonce, $key);
+        sodium_memzero($key);
+        if ($plain === false) {
+            throw new \RuntimeException('Decryption failed — ciphertext tampered or wrong key.');
+        }
+        return $plain;
+    }
+
+    private static function loadKey(): string {
+        $raw = sodium_base642bin(
+            (string) getenv('ENCRYPTION_KEY'),
+            SODIUM_BASE64_VARIANT_ORIGINAL
+        );
+        if (strlen($raw) !== SODIUM_CRYPTO_SECRETBOX_KEYBYTES) {
+            throw new \RuntimeException('ENCRYPTION_KEY must be exactly 32 bytes (base64-encoded).');
+        }
+        return $raw;
+    }
+
+    /** Call once at bootstrap (index.php) to fail fast, not mid-request */
+    public static function assertSodiumAvailable(): void {
+        if (!extension_loaded('sodium')) {
+            throw new \RuntimeException('PHP sodium extension is not loaded. Enable it in php.ini.');
+        }
+    }
```

**Additional bootstrap check — index.php:**
```diff
DIFF PHP — crm-api/index.php (after Environment::load)

+EncryptionService::assertSodiumAvailable();
```

**Audit checklist addition:**
```
- [ ] ssh: php -r "echo function_exists('sodium_crypto_secretbox') ? 'OK' : 'MISSING';"
- [ ] Verify sodium extension listed in phpinfo() on the actual Bluehost server
```

---

### A-02 [CRITICAL] JWT: `sub` contains raw integer `user_id` — must include `public_id` and `user_type` to prevent horizontal privilege escalation

**Finding:**
`JWTService::issueTokenPair(int $userId, string $role)` stores `sub = $userId` (internal integer) and `role` in the payload. The existing `AuthMiddleware` returns only these fields. Controllers that rely on `$user['sub']` are using **internal DB integers in auth context**. If a controller does any ownership check using `$user['sub']`, it risks comparing an integer ID from the JWT against a public_id from a URL, always failing silently or always passing depending on implementation.

Also: `role` is a flat string. The spec's RBAC uses `user_type` (student/agent/admin) + module/action permissions. These are two different concepts and the JWT must carry both.

```diff
DIFF PHP — src/Services/JWTService.php

-    public static function issueTokenPair(int $userId, string $role): array
+    public static function issueTokenPair(
+        int    $userId,
+        string $publicId,
+        string $userType,   // 'student' | 'agent' | 'admin'
+        array  $permissions = []   // ['agents.approve', 'students.view', …]
+    ): array

     $accessToken = self::encode([
-        'sub'  => $userId,
-        'role' => $role,
+        'sub'       => $userId,          // internal id — used ONLY for DB joins in trusted server code
+        'pid'       => $publicId,        // public_id — use this in API responses and ownership checks
+        'utype'     => $userType,        // portal gate
+        'perms'     => $permissions,     // module.action flat array for usePermission() hook
         'type' => 'access',
         'iat'  => time(),
         'exp'  => time() + $accessExpiry,
     ], Environment::getRequired('JWT_ACCESS_SECRET'));
```

---

### A-03 [CRITICAL] Rate limit table — race condition allows burst through

**Finding:**
`RateLimitMiddleware::assertAllowed()` does SELECT → check → UPDATE/INSERT in three separate queries. Under concurrent requests (even with MySQL InnoDB row locking), two requests arriving simultaneously can both pass the SELECT (seeing 4 of 5) and both increment — effectively bypassing the limit by +N concurrent threads.

**Fix:** Use `INSERT ... ON DUPLICATE KEY UPDATE` with a unique composite key to make the counter increment atomic, or wrap in a transaction with `SELECT ... FOR UPDATE`.

```diff
DIFF SQL — migration 005 (rate_limits table)

-  INDEX idx_rl (identifier, action)
+  UNIQUE KEY uk_rl (identifier, action)   -- required for ON DUPLICATE KEY UPDATE

DIFF PHP — src/Middleware/RateLimitMiddleware.php

-    $select = $pdo->prepare(
-        'SELECT id, requests, window_start FROM rate_limits
-         WHERE identifier = :identifier AND action = :action LIMIT 1'
-    );
-    $select->execute([...]);
-    $existing = $select->fetch(PDO::FETCH_ASSOC);
-
-    if ($existing === false) { /* INSERT */ return; }
-    if ($existing['window_start'] < $windowStart) { /* RESET */ return; }
-    if ($currentRequests >= $maxRequests) { /* 429 */ }
-    /* UPDATE requests + 1 */

+    // Atomic upsert — avoids SELECT + UPDATE race condition
+    $upsert = $pdo->prepare(
+        'INSERT INTO rate_limits (identifier, action, requests, window_start)
+         VALUES (:identifier, :action, 1, :now)
+         ON DUPLICATE KEY UPDATE
+           requests     = IF(window_start < :windowStart, 1, requests + 1),
+           window_start = IF(window_start < :windowStart, :now, window_start)'
+    );
+    $upsert->execute([
+        'identifier'  => $identifier,
+        'action'      => $action,
+        'now'         => gmdate('Y-m-d H:i:s', $now),
+        'windowStart' => $windowStart,
+    ]);
+
+    // Now read the current count
+    $select = $pdo->prepare(
+        'SELECT requests FROM rate_limits WHERE identifier = :identifier AND action = :action'
+    );
+    $select->execute(['identifier' => $identifier, 'action' => $action]);
+    $row = $select->fetch(PDO::FETCH_ASSOC);
+
+    if ($row && (int) $row['requests'] > $maxRequests) {
+        Response::error('Too many requests', 'RATE_LIMIT_EXCEEDED', 429);
+    }
```

---

### A-04 [HIGH] `security_events.identifier` stores plaintext email/phone — PII in audit log

**Finding:**
Column `security_events.identifier VARCHAR(255) NULL COMMENT 'Email or IP involved'`. When a login_failed event is logged, the code is expected to store the raw email here. This is PII stored in plaintext in a table with no encryption, accessible to any DB user with read access, and may appear in log exports or backups.

**Fix:** Store only the SHA-256 hash (same pattern as `email_lookup_hash`) in `security_events.identifier`. This allows correlation lookups without exposing PII.

```diff
DIFF SQL — migration 004 (security_events)

-  identifier VARCHAR(255) NULL COMMENT 'Email or IP involved',
+  identifier VARCHAR(64) NULL COMMENT 'SHA-256 hash of email/phone — never plaintext PII',
```

```diff
DIFF PHP — any place that logs security events:

-  'identifier' => $rawEmail,
+  'identifier' => EncryptionService::hash($rawEmail),  // SHA-256 of lowercased value
```

---

### A-05 [HIGH] `otp_verifications` — no IP-based lockout, only identifier-based

**Finding:**
OTP brute force protection counts attempts per `identifier_hash + purpose`. An attacker controlling many IPs can create multiple OTP records per identifier and attempt each independently. Each record starts with `attempts = 0`, effectively resetting the brute-force counter.

**Fix:** Add `ip_address` to `otp_verifications` and enforce a separate global IP-based rate limit (e.g., max 10 OTP attempts from any single IP in 60 minutes, regardless of identifier).

```diff
DIFF SQL — migration 003 (otp_verifications)

+  ip_address VARCHAR(45) NULL,
   INDEX idx_otp_identifier (identifier_hash, purpose)
+  INDEX idx_otp_ip (ip_address, created_at)
```

```diff
DIFF PHP — OTPService::generate()

+  // Store the client IP with each OTP record
+  'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
```

```diff
DIFF PHP — OTPService::verify() — add at top

+  // IP-level brute force gate — checked before identifier lookup
+  $ipAttempts = $db->query(
+      "SELECT COUNT(*) FROM otp_verifications
+       WHERE ip_address = ? AND created_at > DATE_SUB(NOW(), INTERVAL 60 MINUTE)",
+      [$clientIp]
+  )->fetchColumn();
+  if ((int)$ipAttempts >= 10) {
+      // log security event otp_ip_brute_force
+      return false;
+  }
```

---

### A-06 [HIGH] `files` table — `is_public` flag not enforced in storage path

**Finding:**
The spec stores all files under a single `storage_path` relative to storage root. There is no structural separation between public and private files. The `is_public` flag only exists in the DB. If the gatekeeper PHP download endpoint has a bug, a private file might be served. On shared hosting, `.htaccess Deny from all` protects the `storage/private/` path, but if a file for a public university logo ends up in the private folder (due to a bug in upload routing), it will be inaccessible, and vice versa.

**Fix:** Enforce path-level separation. Public files go to `uploads/public/`, private files go to `storage/private/`. This makes the protection structural (Apache/Nginx config + `.htaccess`), not logical.

```diff
DIFF PHP — FileUploadService.php (extend method)

+    private function resolveStorageRoot(bool $isPublic): string {
+        $base = dirname(__DIR__);
+        return $isPublic
+            ? FileHelper::joinPaths($base, 'uploads', 'public')
+            : FileHelper::joinPaths($base, 'storage', 'private');
+    }
```

---

### A-07 [HIGH] No CSRF protection on state-mutating endpoints (cookie token path)

**Finding:**
`AuthMiddleware` accepts tokens from both `Authorization: Bearer` header AND `$_COOKIE['access_token']`. When the cookie path is used, state-mutating POST/PUT/DELETE endpoints are vulnerable to CSRF from any origin that can make a browser-initiated form POST to the API domain.

The existing `CsrfMiddleware.php` is a 280-byte stub — it exists but is not wired into the route registry.

**Fix:** Either (a) always use `Authorization: Bearer` header (not cookies) — then CSRF is not possible because a cross-origin page cannot set the Authorization header — or (b) wire the CSRF middleware for all non-GET routes when the cookie token path is used.

```diff
DIFF PHP — src/Middleware/CsrfMiddleware.php (rewrite the stub)

+    public static function enforce(): void {
+        // Only applies when token comes from cookie (Bearer header is CSRF-safe by nature)
+        if (isset($_COOKIE['access_token']) && !isset($_SERVER['HTTP_AUTHORIZATION'])) {
+            $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
+            $sessionToken = $_SESSION['csrf_token'] ?? '';
+            if ($token === '' || !hash_equals($sessionToken, $token)) {
+                Response::error('CSRF token mismatch', 'CSRF_INVALID', 403);
+            }
+        }
+    }
```

---

### A-08 [MEDIUM] Refresh token stored as `VARCHAR(255)` hash but no expiry index

**Finding:**
`user_sessions.refresh_token_hash` has a UNIQUE index but no composite index on `(refresh_token_hash, expires_at)`. The refresh-token lookup query must verify both the hash AND `expires_at > NOW()` AND `revoked_at IS NULL`. Without the composite index, MySQL performs a hash lookup (fast) then a table row scan for the other conditions. As the table grows, this degrades.

```diff
DIFF SQL — migration 002 (user_sessions)

-  INDEX idx_sess_token (refresh_token_hash)
+  INDEX idx_sess_token (refresh_token_hash, expires_at, revoked_at(1))
   -- The revoked_at(1) prefix is MySQL 5.7 compatible (prefix on DATETIME via length is not valid,
   -- but we can use a generated column trick or just keep two separate indexes):
+  INDEX idx_sess_active (user_id, expires_at, revoked_at)
```

---

### A-09 [MEDIUM] `system_settings` encryption key lookup — sensitive values stored in plaintext DB

**Finding:**
`system_settings` stores all operational config. While most values are benign (OTP expiry minutes, backup retention), if any sensitive value (e.g., a third-party API key) is later stored here, it will be in plaintext in the DB and visible to any admin with `system_settings.view` permission.

**Fix:** Add a `is_sensitive TINYINT(1) DEFAULT 0` column. When a setting is marked sensitive, the API omits its `setting_value` from `view` responses (returns `***` or null), and only allows it to be set (not read) through the admin UI. For truly sensitive values, store them in `.env`, not the DB.

```diff
DIFF SQL — migration 035 (system_settings)

+  is_sensitive TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = value hidden in API responses',
```

---

## SECTION B — SCHEMA ISSUES

---

### B-01 [HIGH] `user_preferences.preferences` — DEFAULT expression not MySQL 5.7 compatible

**Finding:**
```sql
preferences JSON NOT NULL DEFAULT ('{}')
```
The `DEFAULT (expression)` syntax with parentheses is a **MySQL 8.0+ feature**. MySQL 5.7 does not support `DEFAULT (...)` with functional expressions for JSON columns. This migration **will fail on MySQL 5.7**.

```diff
DIFF SQL — migration 030 (user_preferences)

-  preferences JSON NOT NULL DEFAULT ('{}')
+  preferences JSON NOT NULL
   COMMENT 'Keys: table_page_size, sidebar_collapsed, dashboard_widgets, notification_categories, theme',
```

```diff
DIFF PHP — any INSERT into user_preferences (set the default in PHP):

+  'preferences' => json_encode((object)[]),   // PHP sets the default, not MySQL
```

This was flagged in the spec's own constraints section (`DEFAULT expressions — set defaults in PHP instead`) but then violated in migration 030. Fix before running migrations.

---

### B-02 [HIGH] `report_snapshots` — `UNIQUE KEY uk_snapshot` with nullable `dimension_id` — MySQL 5.7 NULL uniqueness behavior

**Finding:**
```sql
UNIQUE KEY uk_snapshot (snapshot_date, metric_key, dimension_type, dimension_id)
```
`dimension_id VARCHAR(255) NULL`. In MySQL 5.7, a UNIQUE index **allows multiple NULL values** in a nullable column. This means two rows with `dimension_id = NULL` and the same `snapshot_date + metric_key + dimension_type` can coexist, silently creating duplicate global metrics. The cron job would insert duplicate rows without error.

**Fix:** Use a sentinel value `'_global'` for rows where no dimension applies (rather than NULL), so the UNIQUE constraint actually enforces uniqueness.

```diff
DIFF SQL — migration 032 (report_snapshots)

-  dimension_id VARCHAR(255) NULL
-    COMMENT 'agent public_id, university public_id, country name, or source key',
+  dimension_id VARCHAR(255) NOT NULL DEFAULT '_global'
+    COMMENT 'agent public_id, university public_id, country name, source key, or _global',
```

```diff
DIFF PHP — cron/generate-snapshots.php (when inserting global metrics):

-  'dimension_id' => null,
+  'dimension_id' => '_global',
```

---

### B-03 [MEDIUM] `files.version_number` is `TINYINT UNSIGNED` — max 255 versions

**Finding:**
`TINYINT UNSIGNED` maxes at 255. For a production CRM handling passport/visa documents, 255 version limit is reasonable in theory, but a `SMALLINT UNSIGNED` (max 65535) costs nothing extra and eliminates any future edge case (a student who resubmits many times over years of enrollment).

```diff
DIFF SQL — migration 013 (files)

-  version_number TINYINT UNSIGNED NOT NULL DEFAULT 1,
+  version_number SMALLINT UNSIGNED NOT NULL DEFAULT 1,
```

---

### B-04 [MEDIUM] `agents.referral_code` — no index on the lookup column

**Finding:**
`referral_code VARCHAR(20) NOT NULL UNIQUE` has a UNIQUE key (which creates an implicit index), but during registration/lead-assignment flows, the code is always looked up with `WHERE referral_code = ?`. The implicit index from UNIQUE is sufficient — this is a false alarm. **However**: `students.referral_agent_code VARCHAR(20) NULL` which mirrors this value has **no index at all**. Reports joining students → agents by referral code will do full table scans.

```diff
DIFF SQL — migration 011 (students)

   INDEX idx_student_agent (agent_id),
   INDEX idx_student_status (profile_status),
+  INDEX idx_student_referral (referral_agent_code)
```

---

### B-05 [MEDIUM] `applications` — no composite index for the most common admin query

**Finding:**
Admin dashboard query: `WHERE student_id = X AND status NOT IN ('draft') ORDER BY created_at DESC`. The current indexes are `idx_app_student (student_id)` and `idx_app_status (status)` separately. MySQL 5.7 cannot use both for a single query efficiently; it picks one. A composite index serves the primary access pattern.

```diff
DIFF SQL — migration 017 (applications)

   INDEX idx_app_student (student_id),
   INDEX idx_app_status (status),
+  INDEX idx_app_student_status (student_id, status, created_at),
   INDEX idx_app_ref (reference_number)
```

---

### B-06 [MEDIUM] `notifications` — `idx_notif_queued` index column order suboptimal for cron query

**Finding:**
The cron job that processes the notification queue runs: `WHERE status = 'queued' ORDER BY created_at ASC LIMIT 50`. The index `idx_notif_queued (status, created_at)` is correct. However, a more useful variant for the polling query is to also include `attempts` to allow filtering `attempts < 3` (retry limit) without a table fetch.

```diff
DIFF SQL — migration 026 (notifications)

-  INDEX idx_notif_queued (status, created_at)
+  INDEX idx_notif_queued (status, attempts, created_at)
```

---

### B-07 [LOW] `activity_logs` — no partition strategy; will grow unboundedly

**Finding:**
`activity_logs` has no `deleted_at` (intentionally append-only). At 100 applications/day with 10 events each = 1000 rows/day = 365,000 rows/year. Not catastrophic, but at 2-3 years it degrades. MySQL 5.7 on shared hosting does not support `PARTITION BY RANGE` without super privileges.

**Mitigation (no schema change):**
The spec already lists a `cron/archive-old-logs.php` job. Ensure it moves rows older than 180 days to an `activity_logs_archive` table (same structure) and deletes from the main table. This is the MySQL 5.7 safe solution.

**Checklist addition:**
```
- [ ] archive-old-logs.php: verify it moves rows to activity_logs_archive, not just deletes them
- [ ] activity_logs_archive table: created in a separate migration (036)
```

---

### B-08 [LOW] `sla_events` — missing index on `breach_notified` for breach-check cron

**Finding:**
`check-sla-breaches.php` cron query: `WHERE status = 'active' AND target_at < NOW() AND breach_notified = 0`. The index `idx_sla_status (status, target_at)` covers the first two conditions; `breach_notified = 0` is resolved via table fetch. Adding it to the composite index covers the full query.

```diff
DIFF SQL — migration 029 (sla_events)

-  INDEX idx_sla_status (status, target_at),
+  INDEX idx_sla_status (status, target_at, breach_notified),
```

---

## SECTION C — MySQL 5.7 COMPATIBILITY

---

### C-01 [CRITICAL] `user_preferences.preferences DEFAULT ('{}')` — see B-01 above

Repeated here for emphasis: this **will throw a syntax error** on MySQL 5.7 and halt the migration run. Fix before any migration is attempted.

---

### C-02 [HIGH] `JSON_TABLE()` — do not use anywhere in cron or report queries

**Finding:**
The spec correctly lists `JSON_TABLE()` as forbidden. However, `reminders.recipient_user_ids JSON` stores a JSON array of user IDs. The cron that processes reminders (`process-reminders.php`) will need to expand this array to send notifications. The temptation is to use `JSON_TABLE()` — which is MySQL 8.0+ only.

**Required pattern for MySQL 5.7 safe expansion:**

```diff
DIFF PHP — cron/process-reminders.php

-  // DON'T: SELECT ... JSON_TABLE(recipient_user_ids, '$[*]' COLUMNS (uid INT PATH '$')) AS t
+  // DO: fetch the row in PHP, then json_decode the column
+  $reminder = $row; // fetched from DB
+  $recipientIds = json_decode($reminder['recipient_user_ids'], true) ?? [];
+  foreach ($recipientIds as $userId) {
+      // insert notification for this userId
+  }
```

---

### C-03 [HIGH] `GENERATED COLUMNS` — if used anywhere for the lookup hash, they are MySQL 5.7 restricted

**Finding:**
MySQL 5.7 supports generated columns, but **stored generated columns with functions like SHA2()** are supported only in MySQL 5.7.6+. The spec's approach of maintaining `email_lookup_hash` manually in PHP is correct. **Document explicitly** that generated columns must not be added as a "shortcut" by any builder.

**Builder note added to spec constraints:**
```
NEVER use GENERATED ALWAYS AS (...) columns for lookup_hash fields.
The hash is computed in PHP and written explicitly. This is intentional.
```

---

### C-04 [MEDIUM] `DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` — MySQL 5.7 allows only ONE such column per table

**Finding:**
MySQL 5.7.x had a restriction: only **one** `TIMESTAMP` column per table could have `DEFAULT CURRENT_TIMESTAMP` or `ON UPDATE CURRENT_TIMESTAMP`. This restriction was **lifted in MySQL 5.6.5+** for both `TIMESTAMP` and `DATETIME`. Since the spec uses `DATETIME` (not `TIMESTAMP`), this is safe in MySQL 5.6.5+. However, if the actual server is an older 5.7.x build, verify.

**Audit checklist addition:**
```
- [ ] Run: SELECT VERSION(); and confirm >= 5.7.5 so multiple DATETIME auto-defaults are safe.
```

---

### C-05 [MEDIUM] `INDEX idx_api_slow (response_time_ms)` — low-cardinality index will be ignored by MySQL optimizer

**Finding:**
`api_request_logs.response_time_ms INT UNSIGNED`. An index on a continuous INT column is useful for range queries (`WHERE response_time_ms > 500`). MySQL's optimizer may skip it for low-selectivity ranges. This is not a correctness issue — just document that it's a monitoring convenience index, not a business-critical one.

No schema change needed. Builder note: queries against this table should always have a `created_at` range condition to keep them bounded.

---

## SECTION D — RBAC WEAKNESSES

---

### D-01 [CRITICAL] Current `RoleMiddleware` is single-string role check — not module+action RBAC

**Finding:**
The existing `RoleMiddleware::enforce(array $user, array $allowedRoles)` compares `$user['role']` (from JWT) against an array of strings like `['admin', 'agent']`. This is a **portal-gate check**, not RBAC. The spec defines a full permission table (`permissions.module + permissions.action`) and a role → permissions assignment (`role_permissions`). The middleware to enforce module-level permissions (`RBACMiddleware.php`) is listed as "REWRITE" but the rewrite is not specified.

**Complete spec for the rewrite:**

```diff
DIFF PHP — src/Middleware/RBACMiddleware.php (full implementation spec)

+final class RBACMiddleware {
+    /**
+     * Enforce a module+action permission for admin users.
+     * Super-admins bypass all checks.
+     * Non-admin user types (student, agent) are never checked here —
+     * use RoleMiddleware::enforce() for portal-gate checks first.
+     */
+    public static function enforce(
+        array  $user,          // JWT payload (must include 'sub', 'utype', 'perms' or 'is_super')
+        string $module,        // e.g. 'agents'
+        string $action         // e.g. 'approve'
+    ): void {
+        // Super admin bypass
+        if (!empty($user['is_super'])) {
+            return;
+        }
+        // Only admin users have module-level RBAC
+        if (($user['utype'] ?? '') !== 'admin') {
+            Response::error('Forbidden', 'FORBIDDEN', 403);
+        }
+        $permKey = $module . '.' . $action;
+        $perms   = (array) ($user['perms'] ?? []);
+        if (!in_array($permKey, $perms, true)) {
+            Response::error(
+                "You do not have '{$action}' permission on '{$module}'.",
+                'PERMISSION_DENIED',
+                403
+            );
+        }
+    }
+
+    /**
+     * Build the permissions array at login time (stored in JWT payload).
+     * Called once during AuthController::login() for admin users.
+     */
+    public static function loadPermissionsForAdmin(int $adminId, PDO $pdo): array {
+        // Check is_super_admin first
+        $adminRow = $pdo->prepare(
+            'SELECT a.is_super_admin, a.role_id FROM admins a WHERE a.id = ? LIMIT 1'
+        );
+        $adminRow->execute([$adminId]);
+        $admin = $adminRow->fetch(PDO::FETCH_ASSOC);
+        if (!$admin) return [];
+        if ((int)$admin['is_super_admin'] === 1) {
+            // Return a sentinel — RBACMiddleware checks is_super in JWT
+            return ['*'];
+        }
+        if ($admin['role_id'] === null) return [];
+        // Fetch permissions for this role
+        $stmt = $pdo->prepare(
+            'SELECT p.module, p.action
+             FROM role_permissions rp
+             JOIN permissions p ON p.id = rp.permission_id
+             WHERE rp.role_id = ?'
+        );
+        $stmt->execute([(int)$admin['role_id']]);
+        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
+        return array_map(fn($r) => $r['module'] . '.' . $r['action'], $rows);
+    }
+}
```

---

### D-02 [HIGH] Agent tree access check not defined

**Finding:**
The spec says `RBACMiddleware.php` should include "agent tree check" but gives no implementation. An agent at tier=2 (sub_agent) must only see students whose `students.agent_id` points to agents where `agents.root_agent_id = {current agent's root_agent_id}`. Without this check, a sub-agent could enumerate any student ID and access records they don't own.

**Required pattern:**

```diff
DIFF PHP — BaseModel or AgentAccessChecker (new helper)

+    /**
+     * Assert that $targetAgentId is within $requestingAgentId's subtree.
+     * Uses root_agent_id for O(1) lookup (no CTE needed — MySQL 5.7 safe).
+     */
+    public static function assertAgentSubtreeAccess(
+        int $requestingAgentId,
+        int $targetAgentId,
+        PDO $pdo
+    ): void {
+        // Fetch the requesting agent's root
+        $req = $pdo->prepare(
+            'SELECT root_agent_id, tier FROM agents WHERE id = ? AND deleted_at IS NULL LIMIT 1'
+        );
+        $req->execute([$requestingAgentId]);
+        $reqAgent = $req->fetch(PDO::FETCH_ASSOC);
+        if (!$reqAgent) {
+            Response::error('Agent not found', 'NOT_FOUND', 404);
+        }
+        // A tier-1 agent can access all agents sharing their root (which is themselves)
+        $targetCheck = $pdo->prepare(
+            'SELECT id FROM agents WHERE id = ? AND root_agent_id = ? AND deleted_at IS NULL LIMIT 1'
+        );
+        $targetCheck->execute([$targetAgentId, $reqAgent['root_agent_id']]);
+        if (!$targetCheck->fetch()) {
+            Response::error('Access denied — student not in your network', 'FORBIDDEN', 403);
+        }
+    }
```

---

### D-03 [HIGH] `admins.role_id` nullable — an admin with no role has zero permissions but no explicit block

**Finding:**
`admins.role_id INT UNSIGNED NULL`. An admin whose `role_id IS NULL` and `is_super_admin = 0` will have an empty permissions array from `loadPermissionsForAdmin()`. They can log in, reach `/admin/`, but every module action will 403. This is a silent UX failure — the admin thinks they're authorized but gets permission-denied on everything.

**Fix:** Either (a) deny login for admin users with no role assigned, or (b) return a specific error message in the auth/me response indicating "your account has no role assigned — contact your administrator." Option (b) is better UX.

```diff
DIFF PHP — AuthController::login() (after loading admin record)

+    if ($user['utype'] === 'admin' && !$adminRecord['is_super_admin'] && $adminRecord['role_id'] === null) {
+        Response::error(
+            'Your admin account has no role assigned. Please contact the super admin.',
+            'NO_ROLE_ASSIGNED',
+            403
+        );
+    }
```

---

### D-04 [MEDIUM] Permission seeding — 56 rows not validated against actual module list in routes

**Finding:**
The seed INSERT has 56 permission rows. The routes defined in section 1F reference modules like `'sla'`, `'security_events'`, `'internal_notes'`. Verify the seeded module names exactly match the string constants used in `RBACMiddleware::enforce($user, 'sla', 'view')` calls. A typo in either means the permission check always fails.

**Action:** Create a `src/Config/Permissions.php` constants file:
```diff
DIFF PHP — src/Config/Permissions.php (NEW)

+final class Permissions {
+    // Modules — must match permissions.module in DB exactly
+    const UNIVERSITIES    = 'universities';
+    const COURSES         = 'courses';
+    const INTAKES         = 'intakes';
+    const APPLICATIONS    = 'applications';
+    const STUDENTS        = 'students';
+    const AGENTS          = 'agents';
+    const LEADS           = 'leads';
+    const DOCUMENTS       = 'documents';
+    const COMMISSIONS     = 'commissions';
+    const NOTICES         = 'notices';
+    const ACTIVITY_LOGS   = 'activity_logs';
+    const SECURITY_EVENTS = 'security_events';
+    const USER_MANAGEMENT = 'user_management';
+    const REPORTS         = 'reports';
+    const SYSTEM_SETTINGS = 'system_settings';
+    const INTERNAL_NOTES  = 'internal_notes';
+    const SLA             = 'sla';
+
+    // Actions
+    const VIEW    = 'view';
+    const CREATE  = 'create';
+    const EDIT    = 'edit';
+    const DELETE  = 'delete';
+    const APPROVE = 'approve';
+}
```

Use `Permissions::AGENTS` and `Permissions::APPROVE` in every call to `RBACMiddleware::enforce()` to guarantee string consistency.

---

## SECTION E — SCALABILITY CONCERNS

---

### E-01 [HIGH] Reference number generation — `TGA-YYYY-NNNNNN` race condition on shared hosting

**Finding:**
The spec says `reference_number VARCHAR(20) NOT NULL UNIQUE, COMMENT 'PHP generates this on insert'`. The typical naive PHP implementation reads `MAX(id)` or `COUNT(*)` to generate the sequence, then inserts. Under concurrent inserts (two admins create applications simultaneously), both can read the same MAX and generate duplicate reference numbers — the UNIQUE constraint catches it and throws an exception, but the user gets a 500.

**Fix:** Use MySQL `AUTO_INCREMENT` on a separate sequence table, or use the `LAST_INSERT_ID()` pattern with a dedicated sequence counter.

```diff
DIFF SQL — add migration 036_sequences.sql

+CREATE TABLE sequences (
+  seq_name VARCHAR(50) NOT NULL PRIMARY KEY,
+  next_val INT UNSIGNED NOT NULL DEFAULT 1
+) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
+
+INSERT INTO sequences (seq_name, next_val) VALUES ('application_ref', 1);
```

```diff
DIFF PHP — ApplicationModel::generateReferenceNumber()

+    private static function nextApplicationSequence(PDO $pdo): int {
+        // Atomic increment — safe under concurrent inserts
+        $pdo->exec(
+            "UPDATE sequences SET next_val = LAST_INSERT_ID(next_val + 1) WHERE seq_name = 'application_ref'"
+        );
+        return (int) $pdo->lastInsertId();
+    }
+
+    public static function generateReferenceNumber(PDO $pdo): string {
+        $seq = self::nextApplicationSequence($pdo);
+        return 'TGA-' . date('Y') . '-' . str_pad((string)$seq, 6, '0', STR_PAD_LEFT);
+    }
```

---

### E-02 [HIGH] `api_request_logs` — unbounded growth, written on every request, no TTL

**Finding:**
Every API request writes one row to `api_request_logs`. At 100 users × 50 requests/session × 20 sessions/day = 100,000 rows/day. After 30 days: 3 million rows. After 1 year: 36 million rows. On shared hosting with no partition support, this table becomes a performance bottleneck.

**Fix:** (a) Write to a flat log file (`logs/api-YYYY-MM-DD.log`) in JSONL format instead of the DB. (b) Only DB-log requests with `status_code >= 400` or `response_time_ms > threshold`. (c) The DB table is kept for slow/error query analysis only.

```diff
DIFF PHP — API logger middleware

-   // Insert every request into api_request_logs
+   // Only DB-log slow requests (> threshold) and client/server errors
+   $shouldLog = ($statusCode >= 400) || ($responseTimeMs > (int)getSetting('api_log_slow_threshold_ms', 500));
+   if ($shouldLog) {
+       // INSERT into api_request_logs
+   }
+   // Always append to flat log file (cheaper I/O than DB write)
+   file_put_contents(
+       $logPath,
+       json_encode(['ts' => time(), 'method' => $method, 'ep' => $endpoint, ...]) . "\n",
+       FILE_APPEND | LOCK_EX
+   );
```

---

### E-03 [MEDIUM] `notifications` table — polling cron without a queue abstraction will miss bursts

**Finding:**
The notification cron runs periodically and selects `WHERE status = 'queued' LIMIT N`. If a bulk event (e.g., admin publishes a notice to 500 students) fires more notifications than the cron batch size, they queue up and are delayed by cron interval. On shared hosting, cron granularity is typically 1 minute minimum.

**Mitigation (no infrastructure change):**
Set `LIMIT` high enough (e.g., 200 per run). Use `status` + `attempts` index (already recommended in B-06). Document that notification delivery is best-effort with up to 2-minute delay — acceptable for this use case.

---

### E-04 [MEDIUM] `report_snapshots` daily cron — no mutex prevents double-run

**Finding:**
If `generate-snapshots.php` runs twice in the same minute (hosting cron quirk), the UNIQUE KEY `uk_snapshot` will throw a duplicate key error on INSERT. This crashes the cron silently (the cron health table will show `failed`).

**Fix:** Use `INSERT IGNORE` or `INSERT ... ON DUPLICATE KEY UPDATE metric_value = VALUES(metric_value)`.

```diff
DIFF PHP — cron/generate-snapshots.php

-   // INSERT INTO report_snapshots (...) VALUES (...)
+   // INSERT IGNORE INTO report_snapshots (...) VALUES (...)
+   // OR:
+   // INSERT INTO report_snapshots (...) VALUES (...)
+   // ON DUPLICATE KEY UPDATE metric_value = VALUES(metric_value), created_at = created_at
```

---

### E-05 [LOW] `activity_logs.before_value / after_value JSON` — can be very large for document records

**Finding:**
If `before_value` captures the full file record (including potentially large `storage_path` or metadata), and the log table has many rows, storage compounds. Limit the size of JSON snapshots.

**Pattern:** Only log the fields that changed (diff, not full snapshot):
```diff
DIFF PHP — ActivityLogger

+    // Never log binary fields; truncate large text fields to 500 chars
+    private static function sanitizeSnapshot(array $record): array {
+        unset($record['password_hash'], $record['email'], $record['phone'], $record['passport_number']);
+        foreach ($record as $k => $v) {
+            if (is_string($v) && strlen($v) > 500) {
+                $record[$k] = substr($v, 0, 500) . '…[truncated]';
+            }
+        }
+        return $record;
+    }
```

---

## SECTION F — IMPLEMENTATION RISKS

---

### F-01 [CRITICAL] Missing migration for `activity_logs_archive` — archive cron will fail

The `archive-old-logs.php` cron moves rows to `activity_logs_archive`. This table does not exist in the 35 migrations. Add migration 036.

```diff
DIFF SQL — migrations/036_activity_logs_archive.sql (NEW FILE)

+CREATE TABLE activity_logs_archive LIKE activity_logs;
+ALTER TABLE activity_logs_archive COMMENT = 'Archived rows from activity_logs older than 180 days';
```

---

### F-02 [CRITICAL] `FileUploadService` does not write to `files` table — orphaned files on disk

**Finding:**
`FileUploadService::upload()` stores a file on disk and returns an array with `uuid`, `file_path`, `file_name`, `mime_type`, `file_size`. It does **not** insert into the `files` table. If the controller that calls `upload()` fails before its INSERT into `files`, you get an orphaned file on disk with no DB record. There is no reconciliation mechanism.

**Fix:** Move the `files` table INSERT into `FileUploadService::upload()` within a transaction that wraps both the `move_uploaded_file()` and the DB insert. Since `move_uploaded_file()` is a filesystem operation (not transactional), use a two-step approach: write to a temp directory first, insert DB record, then move to final location. Roll back DB on filesystem failure.

```diff
DIFF PHP — FileUploadService::upload() — extended return contract

+    // After moving file, compute checksum and insert files record
+    $checksum = hash_file('sha256', $absoluteTarget);
+    $publicId  = UlidGenerator::generate();
+    $pdo->prepare(
+        'INSERT INTO files
+         (public_id, owner_type, owner_id, display_filename, stored_filename,
+          storage_path, is_public, mime_type, file_size_bytes, checksum_sha256,
+          version_number, uploaded_by_type, uploaded_by_id, created_at)
+         VALUES (?,?,?,?,?,?,0,?,?,?,1,?,?,NOW())'
+    )->execute([
+        $publicId, $ownerType, $ownerId,
+        $displayFilename, $storedFileName, $relativePath,
+        $mimeType, $fileSize, $checksum,
+        $uploadedByType, $uploadedById
+    ]);
+
+    return [
+        'public_id'    => $publicId,
+        'file_path'    => $relativePath,
+        'stored_name'  => $storedFileName,
+        'mime_type'    => $mimeType,
+        'file_size'    => $fileSize,
+        'checksum'     => $checksum,
+        'absolute_path'=> $absoluteTarget,
+    ];
```

---

### F-03 [HIGH] No `.htaccess` specified for `crm-api/storage/private/` in the spec

**Finding:**
The spec mentions `storage/private/ has .htaccess: Deny from all` in the audit checklist, but the folder structure section only shows `uploads/public/` as having documented web access. The `.htaccess` file for `storage/private/` is not explicitly created in the skeleton.

**Action:** Create this file as part of Phase 1 scaffolding.

```diff
DIFF — crm-api/storage/private/.htaccess (NEW FILE)

+Order Deny,Allow
+Deny from all
```

```diff
DIFF — crm-api/storage/temp/.htaccess (NEW FILE)

+Order Deny,Allow
+Deny from all
```

---

### F-04 [HIGH] `OTPService.php` stub is 431 bytes — likely not implemented

**Finding:**
The existing `OTPService.php` is 431 bytes (essentially empty). The spec describes a complete rewrite. This is Phase 1 work that must be completed before any auth flow is tested.

**Risk:** Auth checklist item "OTP: correct code verifies, wrong code 3 times is blocked" will trivially fail if the service is a stub.

**Action:** Implement per the spec in section 1E, incorporating fixes from A-05 (IP-based lockout).

---

### F-05 [HIGH] Shared hosting cron minimum interval is 1 minute — `send_notifications` cron timing

**Finding:**
Bluehost India shared hosting typically enforces a minimum cron job interval of 1 minute. If `send_notifications.php` is designed to run every 30 seconds, it cannot. Design all crons to be idempotent and safe to run at 1-minute minimum intervals.

**Action:** Document in each cron file header:
```php
// Minimum run interval: 1 minute (shared hosting constraint)
// This cron is idempotent — safe to run multiple times in the same window
```

---

### F-06 [MEDIUM] `composer.json` — `google/apiclient: ^2.0` pulls 60+ MB of dependencies

**Finding:**
`google/apiclient ^2.0` has many transitive dependencies (guzzle, google-auth, firebase, etc.) totaling ~60MB. On shared hosting with disk quotas and slow SSH connectivity, `composer install` may time out or hit disk limits.

**Mitigation:**
```diff
DIFF JSON — composer.json

+  "config": {
+    "optimize-autoloader": true,
+    "prefer-dist": true
+  },
   "require": {
     "php": "^8.2",
     "phpmailer/phpmailer": "^6.0",
-    "google/apiclient": "^2.0",
+    "google/apiclient": "^2.15",
     "vlucas/phpdotenv": "^5.0"
+  },
+  "scripts": {
+    "post-autoload-dump": [
+      "Google\\Task\\Composer::cleanup"
+    ]
+  },
+  "extra": {
+    "google/apiclient-services": [
+      "Drive"
+    ]
   }
```

The `Google\Task\Composer::cleanup` post-install script removes all Google API service classes except Drive, reducing the package from 60MB to ~3MB.

---

### F-07 [MEDIUM] Frontend: `usePermission` hook sources permissions from JWT but JWT may be stale

**Finding:**
The spec says `usePermission` "Pulls permissions list from JWT payload or /auth/me response." JWT access tokens expire in 24h. If a super admin changes an admin's role permissions during the day, the affected admin's active JWT still carries the old permissions — they see (or don't see) UI elements incorrectly until their token refreshes.

**Fix:** Always load permissions from `/auth/me` response (not JWT payload directly). Cache this response in Zustand store with a 5-minute TTL. On permission-denied (403) response from any API call, force a re-fetch of `/auth/me`.

```diff
DIFF TS — src/shared/hooks/usePermission.ts

-  // Pulls permissions list from JWT payload
+  // Pulls from authStore.permissions (loaded from /auth/me, not decoded from JWT)
+  // JWT payload 'perms' is used only as a fast-path hint — the authoritative source is the server
   const { permissions, userType } = useAuthStore();

+  // On any 403, trigger permission refresh
+  useEffect(() => {
+    const unsubscribe = api.interceptors.response.use(undefined, (error) => {
+      if (error.response?.status === 403) {
+        authStore.getState().refreshPermissions(); // re-calls /auth/me
+      }
+      return Promise.reject(error);
+    });
+    return () => api.interceptors.response.eject(unsubscribe);
+  }, []);
```

---

### F-08 [MEDIUM] No `jti` (JWT ID) claim — token revocation is not possible mid-lifetime

**Finding:**
The JWT has no `jti` (unique token identifier) claim. The `user_sessions` table tracks refresh tokens but not access tokens. If a user's account is suspended by an admin, their active access token (valid for 24h) continues to work until it expires. 24 hours of access after suspension is unacceptable for a production CRM.

**Fix:** Add `jti` to the access token. Store it in `user_sessions`. Validate `jti` in `AuthMiddleware::user()` by checking it against the `user_sessions` table (the revoked_at column handles revocation).

This does add one DB query per authenticated request — but on shared hosting with proper connection pooling via persistent PDO connections, it's acceptable.

```diff
DIFF PHP — JWTService::issueTokenPair()

+    $jti = bin2hex(random_bytes(16)); // 32-char hex token ID

     $accessToken = self::encode([
         'sub'  => $userId,
         'pid'  => $publicId,
         'utype'=> $userType,
         'perms'=> $permissions,
+        'jti'  => $jti,
         'type' => 'access',
         'iat'  => time(),
         'exp'  => time() + $accessExpiry,
     ], Environment::getRequired('JWT_ACCESS_SECRET'));

+    // Store jti in user_sessions so it can be revoked
+    // INSERT INTO user_sessions (jti_hash, user_id, ...) — add jti_hash column to table
```

```diff
DIFF SQL — migration 002 (user_sessions) — add jti_hash

+  jti_hash VARCHAR(64) NULL UNIQUE COMMENT 'SHA-256(jti) of access token for revocation checks',
+  INDEX idx_sess_jti (jti_hash)
```

```diff
DIFF PHP — AuthMiddleware::user()

+    // Validate JTI — catches suspended users and force-revoked sessions
+    if (isset($payload['jti'])) {
+        $jtiHash = hash('sha256', $payload['jti']);
+        $session = $pdo->prepare(
+            'SELECT id, revoked_at FROM user_sessions WHERE jti_hash = ? LIMIT 1'
+        );
+        $session->execute([$jtiHash]);
+        $sess = $session->fetch();
+        if (!$sess || $sess['revoked_at'] !== null) {
+            Response::error('Session has been revoked', 'SESSION_REVOKED', 401);
+        }
+    }
+    // Also check user.status = 'active'
+    $userRow = $pdo->prepare('SELECT status FROM users WHERE id = ? LIMIT 1');
+    $userRow->execute([$payload['sub']]);
+    $u = $userRow->fetch();
+    if (!$u || $u['status'] !== 'active') {
+        Response::error('Account suspended or not found', 'ACCOUNT_INACTIVE', 401);
+    }
```

---

### F-09 [LOW] `students.profile_status` and `applications.status` use VARCHAR — no DB-level enum validation

**Finding:**
Both columns use `VARCHAR` with PHP StateManager enforcement. This is correct per MySQL 5.7 constraints (CHECK constraints are parsed but not enforced). However, an errant direct DB insert (via admin phpmyadmin during debugging) can put an invalid status that the state machine never accepts.

**Mitigation:** Add a validation constant class mirroring the valid states:

```diff
DIFF PHP — src/Config/States.php (NEW)

+final class States {
+    const APPLICATION = [
+        'draft', 'submitted', 'under_review',
+        'offer_received', 'rejected', 'waitlisted', 'enrolled'
+    ];
+    const STUDENT_PROFILE = [
+        'registered', 'profile_complete', 'documents_draft',
+        'documents_submitted', 'documents_verified',
+        'application_in_progress', 'application_submitted',
+        'offer_received', 'admitted', 'enrolled'
+    ];
+    // Use in: BaseModel::update() to validate before any status write
+}
```

---

## SECTION G — ADDITIONAL IMPROVEMENTS (BEYOND ISSUES)

---

### G-01 [IMPROVEMENT] Health endpoint should verify DB connectivity AND sodium extension AND disk

The spec mentions `GET /api/v1/health` returning "database + disk + cron status." Make it production-grade:

```diff
DIFF PHP — HealthController::ping()

+    return [
+        'status'    => 'ok',
+        'timestamp' => date(DATE_ATOM),
+        'checks'    => [
+            'database'  => self::checkDatabase(),    // SELECT 1
+            'sodium'    => extension_loaded('sodium') ? 'ok' : 'MISSING',
+            'disk_pct'  => self::checkDiskUsage(),   // round(used/total*100,1)
+            'cron'      => self::checkCronHealth(),  // rows from cron_health
+        ]
+    ];
```

---

### G-02 [IMPROVEMENT] ULID generator — use `monotonic_microseconds` to prevent same-millisecond collisions

The spec's `UlidGenerator` uses `microtime(true) * 1000` (milliseconds). At high throughput, two ULIDs generated within the same millisecond will have the same time prefix and different random suffixes — which is fine for uniqueness but breaks monotonic ordering within the same millisecond.

For production correctness, use the officially recommended ULID monotonic approach: if the timestamp equals the last generated timestamp, increment the random portion by 1 rather than generating a fresh random.

This is a low-risk improvement (ULID is still unique without it) but recommended for correctness.

---

### G-03 [IMPROVEMENT] Separate DB user for activity_logs INSERT-only grant — document the SQL

The spec says "App DB user has INSERT-only grant on activity_logs" but doesn't provide the SQL. Add it to the setup documentation.

```sql
-- Run as MySQL root — separate from migration files
CREATE USER 'tga_app'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON tga_crm.* TO 'tga_app'@'localhost';
-- Revoke DELETE and UPDATE on activity_logs (INSERT-only for app)
REVOKE UPDATE, DELETE ON tga_crm.activity_logs FROM 'tga_app'@'localhost';
-- Revoke everything on security_events except INSERT (same append-only pattern)
REVOKE UPDATE, DELETE ON tga_crm.security_events FROM 'tga_app'@'localhost';
FLUSH PRIVILEGES;
```

---

### G-04 [IMPROVEMENT] Frontend: Zustand `authStore` — token stored in `localStorage` (XSS risk) vs `memory`

The spec uses `src/shared/stores/authStore.ts` (Zustand) for auth state. Zustand by default stores in memory (not persisted). If the implementation uses `zustand/middleware/persist` to localStorage for refresh-across-tab-close, the `access_token` is exposed to XSS attacks.

**Recommended pattern:**
- Access token: **Zustand memory only** (lost on page close — requires refresh on re-open, which is acceptable)
- Refresh token: **HttpOnly cookie** (set by the PHP API, never readable by JS)

```diff
DIFF TS — src/shared/stores/authStore.ts

-  // DON'T persist to localStorage
-  export const authStore = create(persist(...))
+  // Memory-only store — access token never touches localStorage
+  export const authStore = create<AuthState>()(
+    (set, get) => ({
+      accessToken: null,       // in-memory only
+      user: null,
+      permissions: [],
+      // refresh token is in HttpOnly cookie — never accessible here
+      ...
+    })
+  );
```

---

## SECTION H — UPDATED BUILDER RESEARCH NOTES TABLE

Append these rows to the BUILDER RESEARCH NOTES table at the top of this document:

| Topic | Finding | Action Taken |
|---|---|---|
| `sodium_crypto_aead_aes256gcm_encrypt` on shared hosting | Requires AES-NI CPU instructions not guaranteed on Bluehost VMs | **CHANGED** — use `sodium_crypto_secretbox` (XSalsa20-Poly1305, no AES-NI requirement). See A-01. |
| `DEFAULT ('{}')` on JSON column in MySQL 5.7 | Functional DEFAULT expressions are MySQL 8.0+ only — will fail on 5.7 | **CHANGED** — removed DEFAULT, set in PHP. See B-01 / C-01. |
| UNIQUE KEY with NULL columns in MySQL 5.7 | Multiple NULLs allowed in UNIQUE index — report_snapshots global rows not truly unique | **CHANGED** — `dimension_id DEFAULT '_global'` (NOT NULL). See B-02. |
| Rate limit race condition | SELECT + UPDATE in two queries allows burst bypass under concurrency | **CHANGED** — use `INSERT ... ON DUPLICATE KEY UPDATE` atomic upsert. See A-03. |
| JWT token revocation on account suspension | 24h access token lifetime means suspended user retains access | **CHANGED** — add `jti` claim + `jti_hash` column in `user_sessions`, validate on every request. See F-08. |
| `google/apiclient` size on shared hosting | ^2.0 pulls 60+ MB; disk quota risk | **CHANGED** — use Composer service cleanup script, only load Drive service. See F-06. |
| `FileUploadService` does not write to `files` DB table | Orphaned disk files if controller fails after upload | **CHANGED** — file INSERT moved into service, compute SHA-256 checksum at same time. See F-02. |
| Agent subtree access check | Spec mentions it in RBACMiddleware but gives no implementation | **ADDED** — `assertAgentSubtreeAccess()` using `root_agent_id` (MySQL 5.7 safe, no CTE). See D-02. |
| Application reference number concurrency | PHP MAX(id)+1 pattern has race condition under concurrent inserts | **CHANGED** — dedicated `sequences` table with `LAST_INSERT_ID()` atomic increment. See E-01. |
| `api_request_logs` write-on-every-request | At scale this table grows to 36M+ rows/year; bottleneck on shared hosting | **CHANGED** — only DB-log slow/error requests; all requests go to flat JSONL log file. See E-02. |

---

## SECTION I — DEVELOPMENT KICKOFF PROMPT (for Gemini / next session)

Use this prompt to begin the actual implementation session:

```
You are building Phase 1 of the TGA CRM backend and frontend.
Stack: PHP 8.2.12, MySQL 8.4 LTS, modern hosting, React 18 + TypeScript + Vite.

Read these documents in order before writing any code:
1. TGA_PROJECT_VISION.md
2. TGA_CRM_MASTER_ARCHITECTURE.md
3. Implementation_development _docs/PHASE_1_FOUNDATION.md — read the ENTIRE file including
   the SENIOR ARCHITECT REVIEW section appended at the bottom.

The architect review contains critical fixes that OVERRIDE the original spec where they conflict.
Specifically, implement these BEFORE anything else:
- A-01: Use sodium_crypto_secretbox (not aes256gcm) in EncryptionService
- A-03: Use atomic ON DUPLICATE KEY UPDATE in RateLimitMiddleware
- F-08: Add jti claim to JWT and jti_hash column to user_sessions

Implementation order for Phase 1:
1. Run all 35 migrations + 036 (activity_logs_archive) on MySQL 8.4
   — Verify: SELECT COUNT(*) FROM permissions; (expect 56)
2. Implement EncryptionService.php (sodium_crypto_secretbox version)
3. Implement UlidGenerator.php
4. Rewrite OTPService.php (per spec section 1E + architect fix A-05)
5. Rewrite RBACMiddleware.php (per architect section D-01 + D-02)
6. Extend JWTService to accept publicId, userType, permissions, jti
7. Extend AuthMiddleware to validate jti + user.status on every request
8. Implement ApplicationStateManager.php
9. Implement BaseModel.php with soft-delete scope
10. Wire all auth routes: login, refresh, logout, request-otp, verify-otp,
    forgot-password, reset-password, me, sessions list/revoke
11. Test all Phase 1 audit checklist items
12. Frontend: set up QueryClient, authStore (memory-only, no localStorage),
    Axios interceptors, route guards (ProtectedRoute, RoleGuard, ModuleGuard)

After completing each item, run the corresponding checklist items from the
Phase 1 audit checklist to confirm correctness before moving on.

Do not proceed to Phase 2 until all 35 checklist items in the Phase 1 audit
checklist pass. Document any deviation in the BUILDER RESEARCH NOTES table
at the top of PHASE_1_FOUNDATION.md.
```

---

*End of Senior Architect Review — Phase 1 Foundation*
*Append any implementation findings to BUILDER RESEARCH NOTES at top of this file.*
