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
