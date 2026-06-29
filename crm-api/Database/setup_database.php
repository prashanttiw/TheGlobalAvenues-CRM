<?php

declare(strict_types=1);

namespace TGA\CRM\Database;

use PDO;
use PDOException;
use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;
use TGA\CRM\Services\EncryptionService;
use TGA\CRM\Helpers\UlidGenerator;

// Bootstrap autoloader and environment
require_once __DIR__ . '/../autoload.php';
Environment::load(__DIR__ . '/../.env');

echo "==========================================\n";
echo "       TGA CRM DATABASE SETUP & SEEDER    \n";
echo "==========================================\n\n";

try {
    $dbHost = Environment::getRequired('DB_HOST');
    $dbUser = Environment::getRequired('DB_USER');
    $dbPass = Environment::get('DB_PASS', '');
    $dbPort = Environment::get('DB_PORT', '3306');
    $dbName = Environment::getRequired('DB_NAME');
    $dbCharset = Environment::get('DB_CHARSET', 'utf8mb4');

    // 1. Connect to MySQL server (without selecting DB)
    echo "Connecting to MySQL server at {$dbHost}:{$dbPort}...\n";
    $dsn = sprintf('mysql:host=%s;port=%s;charset=%s', $dbHost, $dbPort, $dbCharset);
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    // 2. Prepare Database
    echo "Preparing database `{$dbName}`...\n";
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    $pdo->exec("USE `{$dbName}`;");
    
    echo "Dropping any existing tables in `{$dbName}`...\n";
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $tablesStmt = $pdo->query("SHOW TABLES");
    $tables = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $table) {
        $pdo->exec("DROP TABLE IF EXISTS `{$table}`;");
    }
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    echo "Database tables cleared.\n\n";

    // 3. Disable Foreign Key Checks for clean re-install
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

    // 4. Load & Execute schema.sql
    $schemaFile = __DIR__ . '/schema.sql';
    if (!is_file($schemaFile)) {
        throw new \RuntimeException("schema.sql not found at {$schemaFile}");
    }
    echo "Importing base schema (schema.sql)...\n";
    $schemaSql = file_get_contents($schemaFile);
    $pdo->exec($schemaSql);
    echo "Base schema imported successfully.\n\n";

    // 5. Load & Execute combined migrations
    $migrationsFile = __DIR__ . '/all_migrations_combined.sql';
    if (!is_file($migrationsFile)) {
        throw new \RuntimeException("all_migrations_combined.sql not found at {$migrationsFile}");
    }
    echo "Importing all migrations (038 to 059)...\n";
    $migrationsSql = file_get_contents($migrationsFile);
    $pdo->exec($migrationsSql);
    echo "Migrations 038-059 applied.\n\n";

    // 5b. Apply migrations 060-069 directly (these are not in the combined file)
    echo "Applying Phase 7-9 migrations (060-069)...\n";

    // 060: notices.expires_at + internal_notes.is_pinned
    $pdo->exec("ALTER TABLE notices ADD COLUMN expires_at DATETIME NULL COMMENT 'Auto-expires notice from feed'");
    $pdo->exec("ALTER TABLE internal_notes ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Pinned notes stay at top of timeline'");

    // 060+061 merged: FULLTEXT indexes for global search (060 column set is superset — 061 skipped to avoid duplicate key names)
    $pdo->exec("ALTER TABLE students ADD FULLTEXT INDEX ft_students_name (full_name)");
    $pdo->exec("ALTER TABLE agents ADD FULLTEXT INDEX ft_agents_name (full_name, agency_name)");
    $pdo->exec("ALTER TABLE universities ADD FULLTEXT INDEX ft_universities (name, city, country)");
    $pdo->exec("ALTER TABLE applications ADD FULLTEXT INDEX ft_applications_ref (reference_number)");
    $pdo->exec("ALTER TABLE leads ADD FULLTEXT INDEX ft_leads_name (full_name)");

    // 062: Phase 8 performance indexes
    $pdo->exec("ALTER TABLE report_snapshots ADD INDEX idx_reports_lookup (dimension_type, dimension_id, metric_key, snapshot_date)");
    $pdo->exec("ALTER TABLE applications ADD INDEX idx_applications_deleted_submitted (deleted_at, submitted_at)");
    $pdo->exec("ALTER TABLE students ADD INDEX idx_students_deleted_created (deleted_at, created_at)");

    // 063: Phase 9 academic profile tables
    $pdo->exec("CREATE TABLE student_academics (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        public_id CHAR(26) NOT NULL UNIQUE,
        student_id INT UNSIGNED NOT NULL,
        institution_name VARCHAR(255) NOT NULL,
        degree_level VARCHAR(100) NOT NULL COMMENT 'High School, Diploma, Bachelors, Masters',
        field_of_study VARCHAR(255) NULL,
        start_date DATE NULL,
        end_date DATE NULL,
        score_type VARCHAR(50) NULL COMMENT 'CGPA, Percentage, Grade',
        score_value VARCHAR(50) NULL,
        is_highest_qualification BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student_academics_student (student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE student_test_scores (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        public_id CHAR(26) NOT NULL UNIQUE,
        student_id INT UNSIGNED NOT NULL,
        test_name VARCHAR(100) NOT NULL COMMENT 'IELTS, TOEFL, PTE, Duolingo, GRE, GMAT',
        overall_score VARCHAR(50) NOT NULL,
        reading_score VARCHAR(50) NULL,
        writing_score VARCHAR(50) NULL,
        listening_score VARCHAR(50) NULL,
        speaking_score VARCHAR(50) NULL,
        test_date DATE NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student_tests_student (student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 064: applications.withdrawal_reason
    $pdo->exec("ALTER TABLE applications ADD COLUMN withdrawal_reason TEXT NULL COMMENT 'Reason provided when application is withdrawn'");

    // 065: files.sync_attempts + jwt_min_iat setting
    $pdo->exec("ALTER TABLE files ADD COLUMN sync_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER drive_sync_status");

    // 067: files erasure tracking columns
    $pdo->exec("ALTER TABLE files
        ADD COLUMN erasure_status ENUM('not_erased','erase_pending_remote_delete','erased') NOT NULL DEFAULT 'not_erased'
            COMMENT 'not_erased=normal. erase_pending_remote_delete=Drive delete pending. erased=both copies confirmed deleted.',
        ADD COLUMN erasure_local_deleted_at DATETIME NULL,
        ADD COLUMN erasure_drive_deleted_at DATETIME NULL,
        ADD COLUMN erasure_drive_last_error TEXT NULL,
        ADD COLUMN erasure_retry_count INT UNSIGNED NOT NULL DEFAULT 0");

    // 069: Reminders deduplication — virtual column + unique constraint
    $pdo->exec("ALTER TABLE reminders
        ADD COLUMN pending_status VARCHAR(10) GENERATED ALWAYS AS (IF(status = 'pending', 'pending', NULL)) VIRTUAL");
    $pdo->exec("ALTER TABLE reminders
        ADD CONSTRAINT uq_reminders_pending_only UNIQUE (entity_type, entity_id, reminder_type, pending_status)");

    echo "Phase 7-9 migrations applied.\n\n";

    // 6. Clean target tables before seeding
    echo "Cleaning tables for a fresh seed...\n";
    $tablesToTruncate = [
        'users', 'admins', 'agents', 'students', 'user_preferences', 'user_sessions',
        'universities', 'courses', 'intakes', 'applications', 'application_updates',
        'document_requests', 'application_payments', 'commissions', 'activity_logs',
        'security_events', 'notification_templates', 'notifications', 'sla_events'
    ];
    foreach ($tablesToTruncate as $table) {
        $pdo->exec("TRUNCATE TABLE `{$table}`;");
    }
    echo "Tables cleaned successfully.\n\n";

    // Re-enable Foreign Key Checks
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    // 7. Seed Permissions (from 038_seeds.sql)
    echo "Seeding default permissions, settings, and templates...\n";
    $permissionsSeed = [
        ['universities','view'],['universities','create'],['universities','edit'],['universities','delete'],
        ['courses','view'],['courses','create'],['courses','edit'],['courses','delete'],
        ['intakes','view'],['intakes','create'],['intakes','edit'],['intakes','delete'],
        ['applications','view'],['applications','create'],['applications','edit'],['applications','approve'],
        ['students','view'],['students','create'],['students','edit'],['students','delete'],['students','approve'],
        ['agents','view'],['agents','create'],['agents','edit'],['agents','delete'],['agents','approve'],
        ['leads','view'],['leads','create'],['leads','edit'],['leads','delete'],
        ['documents','view'],['documents','create'],['documents','approve'],
        ['commissions','view'],['commissions','create'],['commissions','edit'],['commissions','approve'],
        ['notices','view'],['notices','create'],['notices','edit'],['notices','delete'],
        ['activity_logs','view'],['security_events','view'],
        ['user_management','view'],['user_management','create'],['user_management','edit'],['user_management','delete'],
        ['reports','view'],['system_settings','view'],['system_settings','edit'],
        ['internal_notes','view'],['internal_notes','create'],['sla','view'],['sla','edit']
    ];
    $permStmt = $pdo->prepare("INSERT IGNORE INTO permissions (module, action) VALUES (?, ?)");
    foreach ($permissionsSeed as $perm) {
        $permStmt->execute($perm);
    }

    // Seed System Settings
    $settingsSeed = [
        ['otp_expiry_minutes','10','integer','OTP Expiry (minutes)','How long an OTP remains valid','otp'],
        ['otp_max_attempts','3','integer','OTP Max Attempts','Failed attempts before OTP is blocked','otp'],
        ['upload_max_size_mb','10','integer','Max Upload Size (MB)','Maximum file size per document upload','upload'],
        ['reminder_days_before_deadline','[3,1]','json','Reminder Days Before Deadline','Days before deadline to send reminders','reminders'],
        ['commission_pending_alert_days','30','integer','Commission Pending Alert (days)','Alert when pending this long','commissions'],
        ['disk_warn_threshold_pct','80','integer','Disk Warning Threshold (%)','Warning threshold','security'],
        ['disk_critical_threshold_pct','95','integer','Disk Critical Threshold (%)','Critical threshold','security'],
        ['session_max_per_user','5','integer','Max Active Sessions Per User','Max sessions per user','security'],
        ['api_log_slow_threshold_ms','500','integer','Slow API Threshold (ms)','Slow API logging threshold','security'],
        ['backup_retain_daily','7','integer','Daily Backup Retention','Retention count','backup'],
        ['backup_retain_weekly','4','integer','Weekly Backup Retention','Retention count','backup'],
        ['backup_retain_monthly','6','integer','Monthly Backup Retention','Retention count','backup'],
        ['argon2_memory_cost','19456','integer','Argon2 Memory Cost','Memory cost for Argon2id','security'],
        ['argon2_time_cost','2','integer','Argon2 Time Cost','Time cost for Argon2id','security'],
        // Migration 065 — global JWT revocation baseline
        ['jwt_min_iat','0','integer','JWT Minimum Issued-At','Invalidates all tokens issued before this Unix timestamp (0 = none)','security'],
    ];
    $setStmt = $pdo->prepare("INSERT IGNORE INTO system_settings (setting_key, setting_value, value_type, label, description, group_name) VALUES (?, ?, ?, ?, ?, ?)");
    foreach ($settingsSeed as $setting) {
        $setStmt->execute($setting);
    }

    // Seed SLA Rules
    $slaSeed = [
        ['document_review','document_request','submitted',48,'Document must be reviewed within 48 hours of submission'],
        ['application_review','application','submitted',72,'Application status must be updated within 72 hours of submission'],
        ['lead_first_contact','lead','new',24,'New lead must be contacted within 24 hours']
    ];
    $slaStmt = $pdo->prepare("INSERT IGNORE INTO sla_rules (rule_name, entity_type, trigger_status, target_hours, description) VALUES (?, ?, ?, ?, ?)");
    foreach ($slaSeed as $sla) {
        $slaStmt->execute($sla);
    }

    // Seed Cron Health Status
    $cronSeed = ['send_notifications', 'sync_drive', 'backup_db', 'generate_snapshots', 'process_reminders', 'monitor_disk', 'check_sla_breaches', 'verify_backups', 'archive_old_logs'];
    $cronStmt = $pdo->prepare("INSERT IGNORE INTO cron_health (job_name) VALUES (?)");
    foreach ($cronSeed as $job) {
        $cronStmt->execute([$job]);
    }

    // Seed Notification Templates — complete set (migrations 041, 044, 058, 060, 066, 068)
    $templatesSeed = [
        // ── Auth / OTP (migration 066) ──────────────────────────────────────────
        ['student.registration_otp',
         'Your TGA Verification Code: {{otp_code}}',
         "Hi,\n\nYour verification code is: {{otp_code}}\n\nValid for {{expiry_minutes}} minutes. If you did not request this, ignore this email.\n\nThe Global Avenues Team",
         'email', 'system'],

        ['agent.registration_otp',
         'Your TGA Agent Verification Code: {{otp_code}}',
         "Hi,\n\nYour verification code is: {{otp_code}}\n\nValid for {{expiry_minutes}} minutes. If you did not request this, ignore this email.\n\nThe Global Avenues Team",
         'email', 'system'],

        ['login.otp',
         'Your TGA Login Code: {{otp_code}}',
         "Hi,\n\nYour one-time login code is: {{otp_code}}\n\nValid for {{expiry_minutes}} minutes. If you did not request this, someone may be trying to access your account.\n\nThe Global Avenues Team",
         'email', 'system'],

        ['admin.2fa_otp',
         'Your TGA Admin 2FA Code: {{otp_code}}',
         "Hi,\n\nYour admin 2FA code is: {{otp_code}}\n\nValid for {{expiry_minutes}} minutes. If you did not request this, someone may be trying to access your account.\n\nThe Global Avenues Team",
         'email', 'security'],

        ['password.reset_otp',
         'Reset Your TGA Password',
         "Hi,\n\nYour password reset code: {{otp_code}}\nValid for {{expiry_minutes}} minutes.\n\nIf you did not request this, ignore this email.",
         'email', 'security'],

        // ── System / Account (migrations 041, 044) ──────────────────────────────
        ['student.registered',
         'Welcome to The Global Avenues, {{student_name}}!',
         "Hi {{student_name}},\n\nYour TGA student account is ready.\nLog in at: {{portal_url}}\n\nThe TGA Team",
         'email,in_app', 'system'],

        ['admin.created',
         'Your TGA Admin Account Is Ready',
         "Hi {{full_name}},\n\nYour TGA admin account has been created.\nPortal: {{portal_url}}\n\nThe TGA Team",
         'email', 'system'],

        // ── Agent Lifecycle (migrations 041, 044) ───────────────────────────────
        ['agent.onboarding_submitted',
         'New Partner Application: {{agency_name}}',
         "New agent application submitted.\nAgency: {{agency_name}}\nContact: {{full_name}}\nCountry: {{country}}\nReview: {{admin_url}}",
         'email,in_app', 'approvals'],

        ['agent.approved',
         'Your TGA Partnership Is Approved!',
         "Hi {{full_name}},\n\nWelcome to the TGA partner network!\n\nYour referral code: {{referral_code}}\nPortal: {{portal_url}}\n\nThe TGA Team",
         'email,in_app', 'system'],

        ['agent.rejected',
         'Update on Your TGA Partnership Application',
         "Hi {{full_name}},\n\nWe are unable to approve your application.\nReason: {{rejection_reason}}\n\nContact connect@theglobalavenues.com\n\nThe TGA Team",
         'email,in_app', 'system'],

        ['agent.suspended',
         'Your TGA Partner Account Has Been Suspended',
         "Hi {{full_name}},\n\nYour account has been suspended.\nReason: {{suspension_reason}}\n\nContact connect@theglobalavenues.com",
         'email', 'system'],

        ['subagent.created',
         'New Sub-Agent Application Under Your Account',
         "Hi {{parent_agent_name}},\n\nNew sub-agent pending TGA approval.\nName: {{subagent_name}}\nAgency: {{subagent_agency}}",
         'email,in_app', 'agent'],

        // ── Notices (migration 060) ──────────────────────────────────────────────
        ['notice.published',
         'New Notice: {{title}}',
         "{{title}}\n\n{{content_preview}}\n\nView on your portal: {{portal_url}}",
         'email,in_app', 'system'],

        // ── Agent Reassignment (migration 058) ──────────────────────────────────
        ['agent.reassignment_requested',
         'Agent Reassignment Request — Action Required',
         'Student {{student_name}} has requested an agent reassignment. Current agent: {{current_agent_name}}. Reason: {{reason}}. Review in admin panel.',
         'email,in_app', 'approvals'],

        ['agent.reassignment_approved',
         'Your Agent Reassignment Has Been Approved',
         'Hi {{student_name}}, your request to change agents has been approved. New agent: {{new_agent_name}}. The TGA Team.',
         'email,in_app', 'system'],

        ['agent.reassignment_denied',
         'Your Agent Reassignment Request Was Not Approved',
         'Hi {{student_name}}, your request to change agents could not be approved at this time. Reason: {{review_notes}}. Contact support if you have questions.',
         'email,in_app', 'system'],

        ['agent.reassignment_lost',
         'Student Reassigned to Another Agent',
         'Hi {{agent_name}}, student {{student_name}} has been reassigned to another agent. Your historical records remain in your activity log.',
         'email,in_app', 'agent'],

        ['agent.reassignment_gained',
         'New Student Assigned to You',
         'Hi {{agent_name}}, student {{student_name}} has been assigned to your portfolio.',
         'email,in_app', 'agent'],

        // ── Commissions (migration 058) ──────────────────────────────────────────
        ['commission.created',
         'Commission Record Created',
         'Hi {{agent_name}}, a commission of {{amount}} {{currency}} has been recorded for student {{student_name}}. Status: Pending.',
         'email,in_app', 'approvals'],

        ['commission.confirmed',
         'Commission Confirmed',
         'Hi {{agent_name}}, your commission of {{amount}} {{currency}} for student {{student_name}} has been confirmed by admin.',
         'email,in_app', 'approvals'],

        ['commission.paid',
         'Commission Paid',
         'Hi {{agent_name}}, your commission of {{amount}} {{currency}} for student {{student_name}} has been marked as paid.',
         'email,in_app', 'approvals'],

        // ── Leads (migration 060) ────────────────────────────────────────────────
        ['lead.new',
         'New Lead: {{full_name}} from {{source}}',
         "A new lead has been captured.\n\nName: {{full_name}}\nSource: {{source}}\nInterested in: {{interested_country}} — {{interested_course}}\n\nView: {{admin_url}}",
         'email,in_app', 'system'],

        ['lead.assigned',
         'Lead Assigned to You: {{full_name}}',
         "Hi {{staff_name}},\n\nA lead has been assigned to you.\n\nName: {{full_name}}\nSource: {{source}}\n\nView: {{admin_url}}",
         'email,in_app', 'system'],

        ['lead.status_changed',
         'Lead Status Updated: {{full_name}}',
         'Lead {{full_name}} has moved to status: {{new_status}}. View: {{admin_url}}',
         'in_app', 'system'],

        // ── Application (known gap — StateManager fires this but no template existed) ──
        ['application.status_changed',
         'Application Update: {{reference_number}}',
         "Hi {{recipient_name}},\n\nYour application {{reference_number}} has been updated.\nNew status: {{new_status}}\n\nLog in to view details: {{portal_url}}\n\nThe TGA Team",
         'email,in_app', 'system'],

        // ── System Alerts (migration 068) ────────────────────────────────────────
        ['system.erase_remote_delete_failed',
         'CRITICAL: Permanent File Erase Remote Delete Failed',
         'The permanent erasure for file {{file_name}} (ID: {{public_id}}) could not delete its Google Drive copy after {{attempts}} attempts. Error: {{error}}. Manual intervention in the Drive console is required.',
         'email,db', 'system'],
    ];
    $tempStmt = $pdo->prepare("INSERT IGNORE INTO notification_templates (event_key, subject_template, body_template, channels, category) VALUES (?, ?, ?, ?, ?)");
    foreach ($templatesSeed as $template) {
        $tempStmt->execute($template);
    }

    echo "Initial settings and templates seeded.\n\n";

    // 8. Helper to create a user record with encryption and lookup hashes
    $createUser = function (string $email, string $phone, string $password, string $userType, string $status = 'active') use ($pdo): array {
        $publicId = UlidGenerator::generate();
        $emailEnc = EncryptionService::encrypt($email);
        $emailHash = EncryptionService::hash($email);
        $phoneEnc = EncryptionService::encrypt($phone);
        $phoneHash = EncryptionService::hash($phone);

        $pwdHash = password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 19456,
            'time_cost' => 2,
            'threads' => 1
        ]);

        $stmt = $pdo->prepare("
            INSERT INTO users (public_id, email, email_lookup_hash, phone, phone_lookup_hash, password_hash, user_type, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$publicId, $emailEnc, $emailHash, $phoneEnc, $phoneHash, $pwdHash, $userType, $status]);
        $userId = (int)$pdo->lastInsertId();

        // Seed Preferences
        $prefStmt = $pdo->prepare("INSERT INTO user_preferences (user_id, preferences) VALUES (?, '{}')");
        $prefStmt->execute([$userId]);

        return [
            'id' => $userId,
            'public_id' => $publicId
        ];
    };

    echo "Seeding Users...\n";

    // ── Super Admin 1 (required) ─────────────────────────────────────────────
    $sa1Email    = Environment::getRequired('SUPER_ADMIN_EMAIL');
    $sa1Phone    = Environment::getRequired('SUPER_ADMIN_PHONE');
    $sa1Password = Environment::getRequired('SUPER_ADMIN_PASSWORD');
    $sa1Name     = Environment::get('SUPER_ADMIN_NAME', 'Super Admin') ?? 'Super Admin';

    $adminInfo = $createUser($sa1Email, $sa1Phone, $sa1Password, 'admin', 'active');
    $pdo->prepare("
        INSERT INTO admins (public_id, user_id, is_super_admin, full_name)
        VALUES (?, ?, 1, ?)
    ")->execute([UlidGenerator::generate(), $adminInfo['id'], $sa1Name]);
    echo "-> Super Admin 1 created: {$sa1Email}\n";

    // ── Super Admin 2 (optional — set all four vars in .env to enable) ───────
    $sa2Email    = Environment::get('SUPER_ADMIN_2_EMAIL', '');
    $sa2Phone    = Environment::get('SUPER_ADMIN_2_PHONE', '');
    $sa2Password = Environment::get('SUPER_ADMIN_2_PASSWORD', '');
    $sa2Name     = Environment::get('SUPER_ADMIN_2_NAME', 'Super Admin 2') ?? 'Super Admin 2';

    if (!empty($sa2Email) && !empty($sa2Phone) && !empty($sa2Password)) {
        $admin2Info = $createUser($sa2Email, $sa2Phone, $sa2Password, 'admin', 'active');
        $pdo->prepare("
            INSERT INTO admins (public_id, user_id, is_super_admin, full_name)
            VALUES (?, ?, 1, ?)
        ")->execute([UlidGenerator::generate(), $admin2Info['id'], $sa2Name]);
        echo "-> Super Admin 2 created: {$sa2Email}\n";
    } else {
        echo "-> Super Admin 2 skipped (SUPER_ADMIN_2_EMAIL / PHONE / PASSWORD not set).\n";
    }

    // ── Dev/test seed admin (non-super, active only in dev) ──────────────────
    $appEnv = Environment::get('APP_ENV', 'production') ?? 'production';
    if ($appEnv === 'development') {
        $opsInfo = $createUser('ops@theglobalavenues.com', '+911146801134', 'Admin@12345', 'admin', 'active');
        $pdo->prepare("
            INSERT INTO admins (public_id, user_id, is_super_admin, full_name)
            VALUES (?, ?, 0, 'Operations Officer')
        ")->execute([UlidGenerator::generate(), $opsInfo['id']]);
        echo "-> [DEV] Ops Admin created: ops@theglobalavenues.com / Admin@12345\n";
    }

    // ── Dev-only test accounts (agents + student) ────────────────────────────
    $agent1Id = null;
    $studentId = null;
    $studentInfo = null;
    if ($appEnv === 'development') {
        $agent1Info = $createUser('agent1@theglobalavenues.com', '+919999999901', 'Agent@12345', 'agent', 'active');
        $agent1PublicId = UlidGenerator::generate();
        $pdo->prepare("
            INSERT INTO agents (public_id, user_id, parent_agent_id, root_agent_id, tier, full_name, agency_name, country, referral_code, status)
            VALUES (?, ?, NULL, NULL, 1, 'Rajesh Kumar', 'Delhi Consultations', 'India', 'TGA-DEL001', 'approved')
        ")->execute([$agent1PublicId, $agent1Info['id']]);
        $agent1Id = (int)$pdo->lastInsertId();
        // Self-root for O(1) subtree checks
        $pdo->prepare("UPDATE agents SET root_agent_id = ? WHERE id = ?")->execute([$agent1Id, $agent1Id]);
        echo "-> [DEV] Agent L1 created: agent1@theglobalavenues.com / Agent@12345 (Code: TGA-DEL001)\n";

        $agent2Info = $createUser('agent2@theglobalavenues.com', '+919999999902', 'Agent@12345', 'agent', 'active');
        $agent2PublicId = UlidGenerator::generate();
        $pdo->prepare("
            INSERT INTO agents (public_id, user_id, parent_agent_id, root_agent_id, tier, full_name, agency_name, country, referral_code, status)
            VALUES (?, ?, ?, ?, 2, 'Sonia Sharma', 'Noida Franchise', 'India', 'TGA-NOI002', 'approved')
        ")->execute([$agent2PublicId, $agent2Info['id'], $agent1Id, $agent1Id]);
        echo "-> [DEV] Agent L2 created: agent2@theglobalavenues.com / Agent@12345\n";

        $studentInfo = $createUser('student@theglobalavenues.com', '+919999999903', 'Student@12345', 'student', 'active');
        $studentPublicId = UlidGenerator::generate();
        $passportEnc = EncryptionService::encrypt('Z1234567');
        $phoneProfileEnc = EncryptionService::encrypt('+919999999903');
        $pdo->prepare("
            INSERT INTO students (public_id, user_id, agent_id, full_name, date_of_birth, nationality, passport_number, phone_in_profile, lead_source, referral_agent_code, profile_status)
            VALUES (?, ?, ?, 'Amit Kumar', '2002-05-15', 'Indian', ?, ?, 'agent_referral', 'TGA-DEL001', 'application_in_progress')
        ")->execute([$studentPublicId, $studentInfo['id'], $agent1Id, $passportEnc, $phoneProfileEnc]);
        $studentId = (int)$pdo->lastInsertId();
        echo "-> [DEV] Student created: student@theglobalavenues.com / Student@12345 (Referred by Rajesh)\n\n";
    }

    // 9. Seed Partner Universities
    echo "Seeding Partner Universities...\n";
    $unisSeed = [
        [1, 'FH Kufstein Tirol', 'FH Kufstein', 'Austria', 'Kufstein', 'exclusive'],
        [2, 'Estonian Entrepreneurship University of Applied Sciences', 'EUAS', 'Estonia', 'Tallinn', 'exclusive'],
        [3, 'St. George\'s University', 'SGU', 'Grenada', 'St. George\'s', 'exclusive'],
        [4, 'Benedictine University', 'Benedictine', 'USA', 'Lisle, Illinois', 'exclusive'],
        [5, 'Elmhurst University', 'Elmhurst', 'USA', 'Elmhurst, Illinois', 'exclusive'],
        [6, 'EIT InnoEnergy', 'InnoEnergy', 'Europe', 'Pan-European', 'exclusive'],
        [7, 'MJM Graphic Design', 'MJM', 'France', 'Paris / London', 'exclusive'],
        [8, 'ICN Business School', 'ICN', 'France', 'Nancy / Paris', 'exclusive'],
        [9, 'Mesoyios College', 'Mesoyios', 'Cyprus', 'Limassol', 'exclusive'],
        [10, 'CEFAM International School', 'CEFAM', 'France', 'Lyon', 'exclusive'],
        [11, 'KES College Nicosia', 'KES', 'Cyprus', 'Nicosia', 'exclusive'],
        [12, 'International American University', 'IAU', 'USA', 'Los Angeles, California', 'exclusive']
    ];
    $uniStmt = $pdo->prepare("
        INSERT INTO universities (id, public_id, name, country, city, partnership_type, status)
        VALUES (?, ?, ?, ?, ?, ?, 'active')
    ");
    foreach ($unisSeed as $uni) {
        $uniStmt->execute([
            $uni[0],
            UlidGenerator::generate(),
            $uni[1],
            $uni[3],
            $uni[4],
            $uni[5]
        ]);
    }
    echo "-> 12 partner universities imported.\n\n";

    // 10. Seed Courses
    echo "Seeding Courses & Programs...\n";
    $coursesSeed = [
        [1, 1, 'AI & Data Science', 'bachelors', 36, 'English', 'Comprehensive AI curriculum'],
        [2, 1, 'Business Management', 'bachelors', 36, 'English', 'Global MBA foundation'],
        [3, 2, 'Business Administration', 'bachelors', 36, 'English', 'Entrepreneurship focus'],
        [4, 2, 'MBA', 'masters', 24, 'English', 'Master of Business Administration'],
        [5, 3, 'Doctor of Medicine (MD)', 'phd', 60, 'English', 'MD with hospital rotations'],
        [6, 3, 'Public Health', 'masters', 24, 'English', 'Epidemiology and health structures'],
        [7, 4, 'MBA', 'masters', 24, 'English', 'Accelerated MBA'],
        [8, 4, 'Computer Science', 'bachelors', 48, 'English', 'Software engineering track'],
        [9, 5, 'Business Administration', 'bachelors', 48, 'English', 'Liberal arts core administration'],
        [10, 5, 'Nursing', 'bachelors', 48, 'English', 'BSN Clinical Nursing Program']
    ];
    $courseStmt = $pdo->prepare("
        INSERT INTO courses (id, public_id, university_id, name, degree_level, duration_months, language, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    ");
    foreach ($coursesSeed as $course) {
        $courseStmt->execute([
            $course[0],
            UlidGenerator::generate(),
            $course[1],
            $course[2],
            $course[3],
            $course[4],
            $course[5],
            $course[6]
        ]);
    }
    echo "-> 10 academic courses imported.\n\n";

    // 11. Seed Intakes
    echo "Seeding Intakes...\n";
    $intakesSeed = [
        [1, 1, 'Fall 2026', 9, 2026, '2026-02-01', '2026-06-30', '2026-09-01', 726.00, 'EUR', 'open'],
        [2, 2, 'Fall 2026', 9, 2026, '2026-02-01', '2026-06-30', '2026-09-01', 726.00, 'EUR', 'open'],
        [3, 3, 'Fall 2026', 9, 2026, '2026-02-01', '2026-06-15', '2026-09-01', 3500.00, 'EUR', 'open'],
        [4, 4, 'Fall 2026', 9, 2026, '2026-01-01', '2026-05-30', '2026-09-10', 6000.00, 'EUR', 'open'],
        [5, 5, 'Winter 2027', 1, 2027, '2026-05-01', '2026-10-15', '2027-01-10', 32000.00, 'USD', 'open']
    ];
    $intakeStmt = $pdo->prepare("
        INSERT INTO intakes (id, public_id, course_id, name, intake_month, intake_year, application_open_date, application_deadline, course_start_date, tuition_fee_amount, tuition_fee_currency, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    foreach ($intakesSeed as $intake) {
        $intakeStmt->execute([
            $intake[0],
            UlidGenerator::generate(),
            $intake[1],
            $intake[2],
            $intake[3],
            $intake[4],
            $intake[5],
            $intake[6],
            $intake[7],
            $intake[8],
            $intake[9],
            $intake[10]
        ]);
    }
    echo "-> 5 active intakes open for enrollment.\n\n";

    // 12. Seed Atomic Sequence reference counter
    $pdo->exec("INSERT INTO sequences (seq_name, next_val) VALUES ('application_ref', 1) ON DUPLICATE KEY UPDATE next_val = VALUES(next_val);");

    // 13. Dev-only: sample application, timeline, document request, payment, commission
    if ($appEnv === 'development' && $studentId !== null && $agent1Id !== null && $studentInfo !== null) {
        // Advance sequence to 2 (since we'll insert ref 000001 manually)
        $pdo->exec("UPDATE sequences SET next_val = 2 WHERE seq_name = 'application_ref';");

        echo "Creating [DEV] Sample Application & Timeline...\n";
        $appPublicId = UlidGenerator::generate();
        $appRef = "TGA-2026-000001";
        $pdo->prepare("
            INSERT INTO applications (id, public_id, reference_number, student_id, intake_id, agent_id_at_submission, status, submitted_at, notes)
            VALUES (1, ?, ?, ?, 1, ?, 'submitted', NOW(), 'Initial seeding application draft')
        ")->execute([$appPublicId, $appRef, $studentId, $agent1Id]);
        echo "-> Created application TGA-2026-000001.\n";

        $pdo->prepare("
            INSERT INTO application_updates (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id)
            VALUES (?, 1, 'student_to_admin', 'note', 'Applied for AI & Data Science course!', 'student', ?)
        ")->execute([UlidGenerator::generate(), $studentInfo['id']]);

        $pdo->prepare("
            INSERT INTO application_updates (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id)
            VALUES (?, 1, 'admin_to_student', 'note', 'Application received. We are waiting for document submission.', 'admin', ?)
        ")->execute([UlidGenerator::generate(), $adminInfo['id']]);

        $docReqPublicId = UlidGenerator::generate();
        $pdo->prepare("
            INSERT INTO document_requests (public_id, student_id, application_id, doc_label, description, deadline, status, requested_by)
            VALUES (?, ?, 1, 'High School Transcript', 'Official academic transcript for High School graduation', '2026-07-15', 'requested', ?)
        ")->execute([$docReqPublicId, $studentId, $adminInfo['id']]);
        echo "-> Document request generated.\n";

        $pdo->prepare("
            INSERT INTO application_payments (public_id, application_id, label, amount, currency, payment_link, due_date, status, created_by)
            VALUES (?, 1, 'Enrollment Deposit', 150.00, 'EUR', 'https://stripe.com/tga-test-payment', '2026-07-20', 'pending', ?)
        ")->execute([UlidGenerator::generate(), $adminInfo['id']]);
        echo "-> Application payment requested.\n";

        $pdo->prepare("
            INSERT INTO commissions (public_id, application_id, agent_id, amount, percentage, currency, status, notes)
            VALUES (?, 1, ?, 15000.00, 10.00, 'INR', 'pending', 'Draft commission seed for Rajesh')
        ")->execute([UlidGenerator::generate(), $agent1Id]);
        echo "-> Pending commission added.\n\n";
    }

    echo "==========================================\n";
    echo "   DATABASE INSTALLED & SEEDED SUCCESSFULLY\n";
    echo "==========================================\n";

} catch (PDOException $e) {
    echo "MySQL DB error: " . $e->getMessage() . "\n";
    exit(1);
} catch (\Throwable $t) {
    echo "Unexpected error: " . $t->getMessage() . "\n";
    exit(1);
}
