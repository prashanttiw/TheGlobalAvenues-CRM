
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
  jti_hash VARCHAR(64) NULL UNIQUE COMMENT 'SHA-256(jti) of access token for revocation checks',
  device_label VARCHAR(255) NULL COMMENT 'e.g. Chrome on Windows, Safari on iPhone',
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  last_active_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY fk_sess_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sess_user (user_id),
  INDEX idx_sess_token (refresh_token_hash),
  INDEX idx_sess_jti (jti_hash)
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
  UNIQUE KEY uk_rl (identifier, action)
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
  INDEX idx_student_status (profile_status),
  INDEX idx_student_referral (referral_agent_code)
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
  version_number SMALLINT UNSIGNED NOT NULL DEFAULT 1,
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
  INDEX idx_app_student_status (student_id, status, created_at),
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
  INDEX idx_notif_queued (status, attempts, created_at)
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
  INDEX idx_sla_status (status, target_at, breach_notified),
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
  dimension_id VARCHAR(255) NOT NULL DEFAULT '_global'
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
  ('upload_max_size_mb','10','integer','Max Upload Size (MB)',
   'Maximum file size per document upload','upload'),
  ('disk_warn_threshold_pct','80','integer','Disk Warning Threshold (%)',
   'Alert when disk usage exceeds this percentage','security'),
  ('disk_critical_threshold_pct','95','integer','Disk Critical Threshold (%)',
   'Critical alert threshold for disk usage','security'),
  ('session_max_per_user','5','integer','Max Active Sessions Per User',
   'Oldest session revoked when limit is exceeded','security'),
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


-- 036: sequences (for atomic generation)
CREATE TABLE sequences (
  seq_name VARCHAR(50) NOT NULL PRIMARY KEY,
  next_val INT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO sequences (seq_name, next_val) VALUES ('application_ref', 1);


-- 037: activity_logs_archive
CREATE TABLE activity_logs_archive LIKE activity_logs;
ALTER TABLE activity_logs_archive COMMENT = 'Archived rows from activity_logs older than 180 days';


