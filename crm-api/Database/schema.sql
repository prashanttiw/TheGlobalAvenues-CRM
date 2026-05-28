CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL,
  phone_country VARCHAR(5) DEFAULT '+91',
  password_hash VARCHAR(255) NULL,
  role ENUM('student','agent','sub_agent','counsellor','visa_officer','admin','super_admin') NOT NULL,
  oauth_provider ENUM('google','local') DEFAULT 'local',
  oauth_id VARCHAR(255) NULL,
  email_verified TINYINT(1) DEFAULT 0,
  phone_verified TINYINT(1) DEFAULT 0,
  two_fa_enabled TINYINT(1) DEFAULT 0,
  status ENUM('active','suspended','pending','deleted') DEFAULT 'pending',
  last_login DATETIME NULL,
  last_ip VARCHAR(45) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  email VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  purpose ENUM('email_verify','login_2fa','password_reset','phone_verify') NOT NULL,
  attempts TINYINT DEFAULT 0,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_purpose (email, purpose)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  requests INT DEFAULT 1,
  window_start DATETIME NOT NULL,
  INDEX idx_identifier_action (identifier, action)
);

CREATE TABLE IF NOT EXISTS consent_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  consent_type VARCHAR(100) NOT NULL,
  consent_version VARCHAR(50) NOT NULL,
  granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_consent (user_id, consent_type)
);

CREATE TABLE IF NOT EXISTS student_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  dob DATE NULL,
  gender ENUM('male','female','other','prefer_not_to_say') NULL,
  nationality VARCHAR(100) NULL,
  country_of_residence VARCHAR(100) NULL,
  passport_number VARCHAR(50) NULL,
  passport_expiry DATE NULL,
  desired_country VARCHAR(100) NULL,
  desired_countries_json JSON NULL,
  desired_subject VARCHAR(255) NULL,
  desired_degree_level ENUM('bachelors','masters','phd','diploma','certificate') NULL,
  budget_min DECIMAL(10,2) NULL,
  budget_max DECIMAL(10,2) NULL,
  budget_currency VARCHAR(10) DEFAULT 'USD',
  career_goal TEXT NULL,
  gamification_points INT UNSIGNED DEFAULT 0,
  profile_completion TINYINT UNSIGNED DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_education_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_profile_id INT UNSIGNED NOT NULL,
  qualification_level VARCHAR(100) NOT NULL,
  institution_name VARCHAR(255) NOT NULL,
  board_or_university VARCHAR(255) NULL,
  graduation_year YEAR NULL,
  score_value DECIMAL(6,2) NULL,
  score_scale DECIMAL(6,2) NULL,
  backlog_count SMALLINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_profile_id) REFERENCES student_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_test_scores (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_profile_id INT UNSIGNED NOT NULL,
  test_type ENUM('ielts','toefl','pte','duolingo','gre','gmat','sat','act','other') NOT NULL,
  overall_score DECIMAL(6,2) NULL,
  component_scores_json JSON NULL,
  test_date DATE NULL,
  valid_until DATE NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_profile_id) REFERENCES student_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  agency_name VARCHAR(255) NOT NULL,
  agency_type ENUM('sole_proprietorship','partnership','pvt_ltd','llp','other') DEFAULT 'other',
  registration_number VARCHAR(100) NULL,
  tax_id VARCHAR(100) NULL,
  website VARCHAR(255) NULL,
  agency_country VARCHAR(100) NOT NULL,
  agency_state VARCHAR(100) NULL,
  agency_city VARCHAR(100) NULL,
  agency_address TEXT NULL,
  years_in_business TINYINT NULL,
  annual_student_volume ENUM('1-10','11-50','51-100','100+') NULL,
  specialization_json JSON NULL,
  target_countries_json JSON NULL,
  partnership_type ENUM('exclusive','non_exclusive') DEFAULT 'non_exclusive',
  tier ENUM('bronze','silver','gold') DEFAULT 'bronze',
  pan_number VARCHAR(20) NULL,
  gstin VARCHAR(20) NULL,
  assigned_manager_id INT UNSIGNED NULL,
  approved_by INT UNSIGNED NULL,
  approved_at DATETIME NULL,
  rejection_reason TEXT NULL,
  status ENUM('pending','approved','rejected','suspended','inactive') DEFAULT 'pending',
  onboarding_completed TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_agents_status (status),
  INDEX idx_agents_tier (tier)
);

CREATE TABLE IF NOT EXISTS sub_agents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  agent_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  display_name VARCHAR(255) NULL,
  permissions_json JSON NULL,
  status ENUM('active','suspended') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS universities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50) NULL,
  country VARCHAR(100) NOT NULL,
  city VARCHAR(100) NULL,
  partnership_type ENUM('exclusive','non_exclusive') DEFAULT 'non_exclusive',
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  university_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  degree_level ENUM('certificate','diploma','bachelors','masters','phd','short_course') NOT NULL,
  subject_area VARCHAR(255) NULL,
  tuition_fee DECIMAL(12,2) NULL,
  tuition_currency VARCHAR(10) DEFAULT 'EUR',
  intake_months_json JSON NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
  INDEX idx_program_university (university_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference_number VARCHAR(20) NOT NULL UNIQUE,
  student_user_id INT UNSIGNED NOT NULL,
  agent_id INT UNSIGNED NULL,
  sub_agent_id INT UNSIGNED NULL,
  program_id INT UNSIGNED NOT NULL,
  university_id INT UNSIGNED NOT NULL,
  status ENUM(
    'inquiry',
    'profile_review',
    'applied',
    'documents_submitted',
    'under_review',
    'offer_received',
    'conditional_offer',
    'unconditional_offer',
    'enrolled',
    'cas_coe_issued',
    'visa_applied',
    'visa_approved',
    'visa_rejected',
    'pre_departure',
    'departed',
    'deferred',
    'withdrawn',
    'rejected'
  ) DEFAULT 'inquiry',
  priority ENUM('normal','high','urgent') DEFAULT 'normal',
  intake_month TINYINT NOT NULL,
  intake_year YEAR NOT NULL,
  assigned_to INT UNSIGNED NULL,
  is_flagged TINYINT(1) DEFAULT 0,
  flag_reason TEXT NULL,
  source ENUM('direct','agent','referral','website') DEFAULT 'direct',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (program_id) REFERENCES programs(id),
  FOREIGN KEY (university_id) REFERENCES universities(id),
  INDEX idx_application_student (student_user_id),
  INDEX idx_application_status (status)
);

CREATE TABLE IF NOT EXISTS application_stage_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id INT UNSIGNED NOT NULL,
  from_status VARCHAR(50) NULL,
  to_status VARCHAR(50) NOT NULL,
  changed_by INT UNSIGNED NOT NULL,
  note TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_stage_history_application (application_id)
);

CREATE TABLE IF NOT EXISTS application_notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  note TEXT NOT NULL,
  is_internal TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_application_notes (application_id)
);

CREATE TABLE IF NOT EXISTS documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id INT UNSIGNED NOT NULL,
  uploaded_by INT UNSIGNED NOT NULL,
  document_type ENUM(
    'passport','visa_copy','academic_transcript','degree_certificate',
    'english_test_result','sop','lor','cv_resume','bank_statement',
    'financial_sponsorship','offer_letter','cas_coe','enrollment_letter',
    'photograph','birth_certificate','police_clearance','medical_certificate',
    'insurance','other'
  ) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT UNSIGNED NULL,
  mime_type VARCHAR(100) NULL,
  file_uuid VARCHAR(36) NOT NULL UNIQUE,
  status ENUM('pending','verified','rejected','expired') DEFAULT 'pending',
  verified_by INT UNSIGNED NULL,
  verified_at DATETIME NULL,
  rejection_reason TEXT NULL,
  expiry_date DATE NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_documents_application (application_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NULL,
  entity_id INT UNSIGNED NULL,
  old_data JSON NULL,
  new_data JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_entity (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data_json JSON NULL,
  channel ENUM('in_app','email','whatsapp','sms') DEFAULT 'in_app',
  read_at DATETIME NULL,
  sent_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_read_at (read_at)
);

CREATE TABLE IF NOT EXISTS commission_claims (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  agent_id INT UNSIGNED NOT NULL,
  application_id INT UNSIGNED NOT NULL,
  tuition_fee DECIMAL(12,2) NULL,
  commission_pct DECIMAL(5,2) NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  tax_deducted DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  status ENUM('pending','under_review','approved','paid','disputed','cancelled') DEFAULT 'pending',
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  paid_at DATETIME NULL,
  payment_reference VARCHAR(100) NULL,
  dispute_reason TEXT NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_commission_agent (agent_id),
  INDEX idx_commission_status (status)
);

CREATE TABLE IF NOT EXISTS resources (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category ENUM('visa_guide','country_guide','brochure','marketing_material','training','template','other') DEFAULT 'other',
  file_url VARCHAR(500) NULL,
  file_type VARCHAR(50) NULL,
  target_role ENUM('agent','sub_agent','all') DEFAULT 'all',
  target_country VARCHAR(100) NULL,
  is_active TINYINT(1) DEFAULT 1,
  download_count INT UNSIGNED DEFAULT 0,
  created_by INT UNSIGNED NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  agent_id INT UNSIGNED NOT NULL,
  sub_agent_id INT UNSIGNED NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(20) NULL,
  phone_country VARCHAR(5) NULL,
  nationality VARCHAR(100) NULL,
  desired_country VARCHAR(100) NULL,
  desired_subject VARCHAR(255) NULL,
  desired_level VARCHAR(50) NULL,
  budget VARCHAR(50) NULL,
  notes TEXT NULL,
  status ENUM('new','contacted','qualified','converted','lost') DEFAULT 'new',
  converted_to INT UNSIGNED NULL,
  source VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  INDEX idx_leads_agent (agent_id),
  INDEX idx_leads_status (status)
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quiz_type ENUM('course_finder','country_matcher','profile_assessment') NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('single_choice','multi_choice','slider','text') NOT NULL,
  options_json JSON NULL,
  weight_map_json JSON NULL,
  help_text VARCHAR(255) NULL,
  order_index TINYINT NOT NULL,
  is_required TINYINT(1) DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_responses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_profile_id INT UNSIGNED NOT NULL,
  quiz_type ENUM('course_finder','country_matcher','profile_assessment') NOT NULL,
  responses_json JSON NOT NULL,
  result_json JSON NULL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_profile_id) REFERENCES student_profiles(id) ON DELETE CASCADE
);
