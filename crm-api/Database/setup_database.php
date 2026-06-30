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
        $agent2Id = (int)$pdo->lastInsertId();
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

        $comm1PublicId = UlidGenerator::generate();
        $pdo->prepare("
            INSERT INTO commissions (public_id, application_id, agent_id, created_by_user_id, created_by_name, amount, percentage, currency, status, notes)
            VALUES (?, 1, ?, ?, 'Super Admin Test', 15000.00, 10.00, 'INR', 'pending', 'Test commission — AI & Data Science enrollment')
        ")->execute([$comm1PublicId, $agent1Id, $adminInfo['id']]);
        $comm1Id = (int)$pdo->lastInsertId();
        echo "-> Pending commission added.\n\n";

        // ═══════════════════════════════════════════════════════════════════════
        // COMPREHENSIVE TEST DATA — every table, every status, no blank pages
        // ═══════════════════════════════════════════════════════════════════════
        echo "Seeding comprehensive test data...\n";

        // ── ROLES + ROLE_PERMISSIONS ─────────────────────────────────────────
        // Load the permissions map that was seeded in step 7
        $permMap = [];
        foreach ($pdo->query("SELECT id, module, action FROM permissions")->fetchAll(PDO::FETCH_ASSOC) as $p) {
            $permMap[$p['module'] . '.' . $p['action']] = (int)$p['id'];
        }
        $rpStmt = $pdo->prepare("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)");

        // Role 1: Counsellor Test
        $pdo->prepare("INSERT INTO roles (public_id, name, description) VALUES (?, 'Counsellor Test', 'Test role — manage applications, documents, students')")
            ->execute([UlidGenerator::generate()]);
        $roleCounsellorId = (int)$pdo->lastInsertId();
        foreach (['applications.view','applications.edit','students.view','documents.view','documents.create','documents.approve','notices.view','internal_notes.view','internal_notes.create','sla.view'] as $k) {
            if (isset($permMap[$k])) $rpStmt->execute([$roleCounsellorId, $permMap[$k]]);
        }

        // Role 2: Visa Officer Test
        $pdo->prepare("INSERT INTO roles (public_id, name, description) VALUES (?, 'Visa Officer Test', 'Test role — read-only applications and reports')")
            ->execute([UlidGenerator::generate()]);
        $roleVisaId = (int)$pdo->lastInsertId();
        foreach (['applications.view','students.view','documents.view','documents.approve','reports.view','leads.view'] as $k) {
            if (isset($permMap[$k])) $rpStmt->execute([$roleVisaId, $permMap[$k]]);
        }

        // Role 3: Manager Test (all except system_settings.edit + user_management.delete)
        $pdo->prepare("INSERT INTO roles (public_id, name, description) VALUES (?, 'Manager Test', 'Test role — broad access for office managers')")
            ->execute([UlidGenerator::generate()]);
        $roleManagerId = (int)$pdo->lastInsertId();
        $excluded = ['system_settings.edit', 'user_management.delete'];
        foreach (array_keys($permMap) as $k) {
            if (!in_array($k, $excluded)) $rpStmt->execute([$roleManagerId, $permMap[$k]]);
        }
        echo "-> [DEV] Roles seeded: Counsellor Test, Visa Officer Test, Manager Test\n";

        // ── ADDITIONAL ADMIN ACCOUNTS ────────────────────────────────────────
        $cslInfo = $createUser('admin_test_counsellor@theglobalavenues.com', '+911146801141', 'Admin@12345', 'admin', 'active');
        $pdo->prepare("INSERT INTO admins (public_id, user_id, role_id, is_super_admin, full_name, created_by) VALUES (?, ?, ?, 0, 'Priya Counsellor Test', ?)")
            ->execute([UlidGenerator::generate(), $cslInfo['id'], $roleCounsellorId, $adminInfo['id']]);
        $cslAdminId = (int)$pdo->lastInsertId();
        echo "-> [DEV] Admin (Counsellor Test): admin_test_counsellor@theglobalavenues.com\n";

        $visaInfo = $createUser('admin_test_visa@theglobalavenues.com', '+911146801142', 'Admin@12345', 'admin', 'active');
        $pdo->prepare("INSERT INTO admins (public_id, user_id, role_id, is_super_admin, full_name, created_by) VALUES (?, ?, ?, 0, 'Rahul Visa Test', ?)")
            ->execute([UlidGenerator::generate(), $visaInfo['id'], $roleVisaId, $adminInfo['id']]);
        $visaAdminId = (int)$pdo->lastInsertId();
        echo "-> [DEV] Admin (Visa Officer Test): admin_test_visa@theglobalavenues.com\n";

        // ── ADDITIONAL AGENTS ────────────────────────────────────────────────
        // Agent 3 — Tier 3 (child of agent2), approved
        $ag3Info = $createUser('agent_test_3@theglobalavenues.com', '+919888888801', 'Agent@12345', 'agent', 'active');
        $ag3PublicId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO agents (public_id, user_id, parent_agent_id, root_agent_id, tier, full_name, agency_name, country, referral_code, status, approved_at) VALUES (?, ?, ?, ?, 3, 'Arjun Test Agent 3', 'Gurgaon Franchise Test', 'India', 'TGA-GUR003', 'approved', NOW())")
            ->execute([$ag3PublicId, $ag3Info['id'], $agent2Id, $agent1Id]);
        $ag3Id = (int)$pdo->lastInsertId();
        echo "-> [DEV] Agent L3 (Tier 3, approved): agent_test_3@theglobalavenues.com\n";

        // Agent 4 — PENDING (shows in admin approval queue)
        $ag4Info = $createUser('agent_test_4@theglobalavenues.com', '+919888888802', 'Agent@12345', 'agent', 'active');
        $ag4PublicId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO agents (public_id, user_id, tier, full_name, agency_name, country, business_reg_number, status) VALUES (?, ?, 1, 'Meena Test Agent 4', 'Chennai Partners Test', 'India', 'BRN-TEST-001', 'pending')")
            ->execute([$ag4PublicId, $ag4Info['id']]);
        $ag4Id = (int)$pdo->lastInsertId();
        echo "-> [DEV] Agent (PENDING): agent_test_4@theglobalavenues.com\n";

        // Agent 5 — PENDING (second pending, makes queue count = 2)
        $ag5Info = $createUser('agent_test_5@theglobalavenues.com', '+919888888803', 'Agent@12345', 'agent', 'active');
        $ag5PublicId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO agents (public_id, user_id, tier, full_name, agency_name, country, business_reg_number, status) VALUES (?, ?, 1, 'Vivek Test Agent 5', 'Hyderabad Consultants Test', 'India', 'BRN-TEST-002', 'pending')")
            ->execute([$ag5PublicId, $ag5Info['id']]);
        $ag5Id = (int)$pdo->lastInsertId();
        echo "-> [DEV] Agent (PENDING): agent_test_5@theglobalavenues.com\n";

        // ── ADDITIONAL STUDENTS ──────────────────────────────────────────────
        // Student 2 — just registered, no application (referred by agent2)
        $stu2Info = $createUser('student_test_2@theglobalavenues.com', '+919777777702', 'Student@12345', 'student', 'active');
        $stu2PubId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO students (public_id, user_id, agent_id, full_name, date_of_birth, nationality, passport_number, phone_in_profile, lead_source, referral_agent_code, profile_status) VALUES (?, ?, ?, 'Sneha Test Student 2', '2001-08-20', 'Indian', ?, ?, 'agent_referral', 'TGA-NOI002', 'registered')")
            ->execute([$stu2PubId, $stu2Info['id'], $agent2Id, EncryptionService::encrypt('B9876543'), EncryptionService::encrypt('+919777777702')]);
        $stu2Id = (int)$pdo->lastInsertId();
        echo "-> [DEV] Student 2 (registered, no app): student_test_2@theglobalavenues.com\n";

        // Student 3 — application under review (referred by agent1)
        $stu3Info = $createUser('student_test_3@theglobalavenues.com', '+919777777703', 'Student@12345', 'student', 'active');
        $stu3PubId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO students (public_id, user_id, agent_id, full_name, date_of_birth, nationality, passport_number, phone_in_profile, lead_source, referral_agent_code, profile_status) VALUES (?, ?, ?, 'Ravi Test Student 3', '2000-03-12', 'Indian', ?, ?, 'agent_referral', 'TGA-DEL001', 'application_in_progress')")
            ->execute([$stu3PubId, $stu3Info['id'], $agent1Id, EncryptionService::encrypt('C1122334'), EncryptionService::encrypt('+919777777703')]);
        $stu3Id = (int)$pdo->lastInsertId();
        echo "-> [DEV] Student 3 (under review): student_test_3@theglobalavenues.com\n";

        // Student 4 — enrolled (referred by agent3, locked to agent)
        $stu4Info = $createUser('student_test_4@theglobalavenues.com', '+919777777704', 'Student@12345', 'student', 'active');
        $stu4PubId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO students (public_id, user_id, agent_id, full_name, date_of_birth, nationality, passport_number, phone_in_profile, lead_source, referral_agent_code, profile_status, agent_lock_status) VALUES (?, ?, ?, 'Anjali Test Student 4', '1999-11-05', 'Indian', ?, ?, 'agent_referral', 'TGA-GUR003', 'enrolled', 'locked')")
            ->execute([$stu4PubId, $stu4Info['id'], $ag3Id, EncryptionService::encrypt('D5566778'), EncryptionService::encrypt('+919777777704')]);
        $stu4Id = (int)$pdo->lastInsertId();
        echo "-> [DEV] Student 4 (enrolled): student_test_4@theglobalavenues.com\n";

        // Student 5 — rejected application (referred by agent2)
        $stu5Info = $createUser('student_test_5@theglobalavenues.com', '+919777777705', 'Student@12345', 'student', 'active');
        $stu5PubId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO students (public_id, user_id, agent_id, full_name, date_of_birth, nationality, passport_number, phone_in_profile, lead_source, referral_agent_code, profile_status) VALUES (?, ?, ?, 'Karan Test Student 5', '2003-06-18', 'Indian', ?, ?, 'agent_referral', 'TGA-NOI002', 'registered')")
            ->execute([$stu5PubId, $stu5Info['id'], $agent2Id, EncryptionService::encrypt('E9900112'), EncryptionService::encrypt('+919777777705')]);
        $stu5Id = (int)$pdo->lastInsertId();
        echo "-> [DEV] Student 5 (rejected app): student_test_5@theglobalavenues.com\n";

        // ── ADDITIONAL APPLICATIONS ──────────────────────────────────────────
        // App 2: under_review (student3 → intake 2 MBA/EUAS, agent1)
        $app2PubId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO applications (id, public_id, reference_number, student_id, intake_id, agent_id_at_submission, status, submitted_at, notes) VALUES (2, ?, 'TGA-2026-000002', ?, 2, ?, 'under_review', DATE_SUB(NOW(), INTERVAL 4 DAY), 'Test application — Business Administration under review')")
            ->execute([$app2PubId, $stu3Id, $agent1Id]);
        echo "-> [DEV] Application 2 (under_review): TGA-2026-000002\n";

        // App 3: offer_received (student4 → intake 3 MD/St Georges, agent3)
        $app3PubId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO applications (id, public_id, reference_number, student_id, intake_id, agent_id_at_submission, status, submitted_at, notes) VALUES (3, ?, 'TGA-2026-000003', ?, 3, ?, 'offer_received', DATE_SUB(NOW(), INTERVAL 10 DAY), 'Test application — MD St. Georges offer received')")
            ->execute([$app3PubId, $stu4Id, $ag3Id]);
        echo "-> [DEV] Application 3 (offer_received): TGA-2026-000003\n";

        // App 4: enrolled (student4 → intake 1 AI/FH Kufstein, agent3)
        $app4PubId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO applications (id, public_id, reference_number, student_id, intake_id, agent_id_at_submission, status, submitted_at, notes) VALUES (4, ?, 'TGA-2026-000004', ?, 1, ?, 'enrolled', DATE_SUB(NOW(), INTERVAL 20 DAY), 'Test application — AI & Data Science FH Kufstein enrolled')")
            ->execute([$app4PubId, $stu4Id, $ag3Id]);
        echo "-> [DEV] Application 4 (enrolled): TGA-2026-000004\n";

        // App 5: rejected (student5 → intake 4 MBA/Benedictine, agent2)
        $app5PubId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO applications (id, public_id, reference_number, student_id, intake_id, agent_id_at_submission, status, submitted_at, notes) VALUES (5, ?, 'TGA-2026-000005', ?, 4, ?, 'rejected', DATE_SUB(NOW(), INTERVAL 14 DAY), 'Test application — MBA Benedictine rejected')")
            ->execute([$app5PubId, $stu5Id, $agent2Id]);
        echo "-> [DEV] Application 5 (rejected): TGA-2026-000005\n";

        // App 6: withdrawn (student1 second app → intake 2)
        $app6PubId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO applications (id, public_id, reference_number, student_id, intake_id, agent_id_at_submission, status, submitted_at, withdrawal_reason, notes) VALUES (6, ?, 'TGA-2026-000006', ?, 2, ?, 'withdrawn', DATE_SUB(NOW(), INTERVAL 7 DAY), 'Student relocated to a different country', 'Test application — Business Admin withdrawn')")
            ->execute([$app6PubId, $studentId, $agent1Id]);
        echo "-> [DEV] Application 6 (withdrawn): TGA-2026-000006\n";

        // Update sequence to 7
        $pdo->exec("UPDATE sequences SET next_val = 7 WHERE seq_name = 'application_ref'");

        // ── APPLICATION TIMELINE + DOCUMENT REQUESTS + PAYMENTS ─────────────
        // App 2 timeline
        $pdo->prepare("INSERT INTO application_updates (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id) VALUES (?, 2, 'student_to_admin', 'note', 'Test: Application submitted for Business Administration.', 'student', ?)")
            ->execute([UlidGenerator::generate(), $stu3Info['id']]);
        $pdo->prepare("INSERT INTO application_updates (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id) VALUES (?, 2, 'admin_to_student', 'note', 'Test: Application is now under review. We will update you within 3 business days.', 'admin', ?)")
            ->execute([UlidGenerator::generate(), $adminInfo['id']]);

        // App 2 — 2 document requests (submitted + requested → shows in pending reviews)
        $pdo->prepare("INSERT INTO document_requests (public_id, student_id, application_id, doc_label, description, deadline, status, requested_by) VALUES (?, ?, 2, 'Academic Transcripts Test', 'Upload all university academic transcripts', DATE_ADD(NOW(), INTERVAL 5 DAY), 'submitted', ?)")
            ->execute([UlidGenerator::generate(), $stu3Id, $adminInfo['id']]);
        $dr2Id = (int)$pdo->lastInsertId();
        $pdo->prepare("INSERT INTO document_requests (public_id, student_id, application_id, doc_label, description, deadline, status, requested_by) VALUES (?, ?, 2, 'English Proficiency Test Score', 'IELTS / TOEFL score card (min 6.5 overall)', DATE_ADD(NOW(), INTERVAL 3 DAY), 'requested', ?)")
            ->execute([UlidGenerator::generate(), $stu3Id, $adminInfo['id']]);
        $dr3Id = (int)$pdo->lastInsertId();

        // App 3 — approved doc + payment confirmed
        $pdo->prepare("INSERT INTO document_requests (public_id, student_id, application_id, doc_label, description, deadline, status, requested_by) VALUES (?, ?, 3, 'Passport Copy Test', 'Clear scan of valid passport — all pages', DATE_ADD(NOW(), INTERVAL 10 DAY), 'approved', ?)")
            ->execute([UlidGenerator::generate(), $stu4Id, $adminInfo['id']]);
        $pdo->prepare("INSERT INTO application_payments (public_id, application_id, label, amount, currency, due_date, status, created_by) VALUES (?, 3, 'Application Fee Test', 100.00, 'EUR', DATE_ADD(NOW(), INTERVAL 7 DAY), 'confirmed', ?)")
            ->execute([UlidGenerator::generate(), $adminInfo['id']]);

        // App 4 — enrolled payment paid
        $pdo->prepare("INSERT INTO application_payments (public_id, application_id, label, amount, currency, due_date, status, created_by) VALUES (?, 4, 'Enrollment Deposit Test', 726.00, 'EUR', DATE_SUB(NOW(), INTERVAL 5 DAY), 'confirmed', ?)")
            ->execute([UlidGenerator::generate(), $adminInfo['id']]);
        echo "-> [DEV] App timelines, document requests, payments seeded\n";

        // ── ADDITIONAL COMMISSIONS ───────────────────────────────────────────
        // Commission 2: pending (app 2, agent1)
        $comm2PubId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO commissions (public_id, application_id, agent_id, created_by_user_id, created_by_name, amount, percentage, currency, status, notes) VALUES (?, 2, ?, ?, 'Super Admin Test', 18000.00, 10.00, 'INR', 'pending', 'Test commission — Business Administration application')")
            ->execute([$comm2PubId, $agent1Id, $adminInfo['id']]);
        $comm2Id = (int)$pdo->lastInsertId();

        // Commission 3: confirmed (app 3, agent3)
        $comm3PubId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO commissions (public_id, application_id, agent_id, created_by_user_id, created_by_name, amount, percentage, currency, status, notes) VALUES (?, 3, ?, ?, 'Super Admin Test', 25000.00, 10.00, 'INR', 'confirmed', 'Test commission — MD St Georges offer confirmed')")
            ->execute([$comm3PubId, $ag3Id, $adminInfo['id']]);
        $comm3Id = (int)$pdo->lastInsertId();

        // Commission 4: paid (app 4, agent3) — INSERT as paid directly; trigger only fires on UPDATE
        $comm4PubId = UlidGenerator::generate();
        $pdo->prepare("INSERT INTO commissions (public_id, application_id, agent_id, created_by_user_id, created_by_name, paid_by_user_id, paid_by_name, paid_at, amount, percentage, currency, status, notes) VALUES (?, 4, ?, ?, 'Super Admin Test', ?, 'Super Admin Test', DATE_SUB(NOW(), INTERVAL 5 DAY), 12000.00, 10.00, 'INR', 'paid', 'Test commission — AI enrollment paid')")
            ->execute([$comm4PubId, $ag3Id, $adminInfo['id'], $adminInfo['id']]);
        $comm4Id = (int)$pdo->lastInsertId();
        echo "-> [DEV] Commissions (pending ×2, confirmed, paid) seeded\n";

        // ── COMMISSION AUDIT LOG ─────────────────────────────────────────────
        $calStmt = $pdo->prepare("INSERT INTO commission_audit_log (public_id, commission_id, commission_public_id, old_status, new_status, old_amount, new_amount, action, changed_by_user_id, changed_by_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $calStmt->execute([UlidGenerator::generate(), $comm1Id, $comm1PublicId, '',        'pending',   null,      15000.00, 'created',   $adminInfo['id'], 'Super Admin Test', 'Test seed: commission created']);
        $calStmt->execute([UlidGenerator::generate(), $comm2Id, $comm2PubId,    '',        'pending',   null,      18000.00, 'created',   $adminInfo['id'], 'Super Admin Test', 'Test seed: commission created']);
        $calStmt->execute([UlidGenerator::generate(), $comm3Id, $comm3PubId,    'pending', 'confirmed', 25000.00,  25000.00, 'confirmed', $adminInfo['id'], 'Super Admin Test', 'Test seed: admin confirmed commission']);
        $calStmt->execute([UlidGenerator::generate(), $comm4Id, $comm4PubId,    'pending', 'confirmed', 12000.00,  12000.00, 'confirmed', $adminInfo['id'], 'Super Admin Test', 'Test seed: admin confirmed commission']);
        $calStmt->execute([UlidGenerator::generate(), $comm4Id, $comm4PubId,    'confirmed','paid',     12000.00,  12000.00, 'paid',      $adminInfo['id'], 'Super Admin Test', 'Test seed: bank transfer completed']);
        echo "-> [DEV] Commission audit log (5 entries) seeded\n";

        // ── LEADS ────────────────────────────────────────────────────────────
        $createLead = function(string $name, string $email, string $phone, string $source, string $country, string $course, string $status, ?int $assignedTo = null, ?int $convertedStudentId = null) use ($pdo): array {
            $pubId = UlidGenerator::generate();
            $pdo->prepare("INSERT INTO leads (public_id, full_name, email, email_lookup_hash, phone, source, source_detail, interested_country, interested_course, status, assigned_to, converted_student_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                ->execute([$pubId, $name, EncryptionService::encrypt($email), EncryptionService::hash($email), EncryptionService::encrypt($phone), $source, json_encode(['medium' => 'test_seed', 'source' => $source]), $country, $course, $status, $assignedTo, $convertedStudentId]);
            return ['id' => (int)$pdo->lastInsertId(), 'public_id' => $pubId];
        };
        $lead1 = $createLead('Mohit Test Lead 1', 'lead_test_1@test.com', '+919600000001', 'website_form',  'Austria', 'AI & Data Science', 'new');
        $lead2 = $createLead('Deepa Test Lead 2', 'lead_test_2@test.com', '+919600000002', 'instagram',     'Germany', 'MBA',               'contacted', $cslAdminId);
        $lead3 = $createLead('Farhan Test Lead 3','lead_test_3@test.com', '+919600000003', 'referral',      'France',  'Graphic Design',    'qualified',  $cslAdminId);
        $lead4 = $createLead('Pooja Test Lead 4', 'lead_test_4@test.com', '+919600000004', 'google_ads',    'USA',     'Computer Science',  'converted',  null, $stu2Id);
        $lead5 = $createLead('Rohan Test Lead 5', 'lead_test_5@test.com', '+919600000005', 'facebook',      'Cyprus',  'Hospitality Mgmt',  'dropped');
        echo "-> [DEV] Leads (new, contacted, qualified, converted, dropped) seeded\n";

        // ── NOTICES ──────────────────────────────────────────────────────────
        $pdo->prepare("INSERT INTO notices (public_id, title, content, notice_type, visible_to_students, visible_to_agents, visible_to_admins, status, published_at, created_by) VALUES (?, 'Welcome to TGA Portal Test Notice 1', '<p>Welcome to The Global Avenues CRM portal. This is a <strong>test notice</strong> visible to all users.</p>', 'notice', 1, 1, 1, 'published', DATE_SUB(NOW(), INTERVAL 2 DAY), ?)")
            ->execute([UlidGenerator::generate(), $adminInfo['id']]);
        $pdo->prepare("INSERT INTO notices (public_id, title, content, notice_type, visible_to_students, visible_to_agents, visible_to_admins, status, published_at, expires_at, created_by) VALUES (?, 'Student Scholarship Test Notice 2', '<p>A scholarship is available for students applying to Austria and Estonia partner universities. Deadline: 30 July 2026.</p>', 'notice', 1, 0, 0, 'published', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 30 DAY), ?)")
            ->execute([UlidGenerator::generate(), $adminInfo['id']]);
        $pdo->prepare("INSERT INTO notices (public_id, title, content, notice_type, visible_to_students, visible_to_agents, visible_to_admins, status, published_at, created_by) VALUES (?, 'Agent Commission Update Test Notice 3', '<p>Commission rates updated for Fall 2026. Gold-tier agents receive <strong>12% base commission</strong> on confirmed enrollments.</p>', 'notice', 0, 1, 1, 'published', DATE_SUB(NOW(), INTERVAL 3 DAY), ?)")
            ->execute([UlidGenerator::generate(), $adminInfo['id']]);
        $pdo->prepare("INSERT INTO notices (public_id, title, content, notice_type, event_date, event_location, visible_to_students, visible_to_agents, visible_to_admins, status, created_by) VALUES (?, 'University Fair Test Event 1', '<p>Join us for an exclusive university fair featuring all TGA partner institutions. Free registration.</p>', 'event', DATE_ADD(NOW(), INTERVAL 14 DAY), 'New Delhi, India', 1, 1, 1, 'draft', ?)")
            ->execute([UlidGenerator::generate(), $adminInfo['id']]);
        echo "-> [DEV] Notices (published ×3, draft ×1) seeded\n";

        // ── INTERNAL NOTES ───────────────────────────────────────────────────
        $inStmt = $pdo->prepare("INSERT INTO internal_notes (public_id, entity_type, entity_id, content, author_type, author_id, visible_to_agent, visible_to_admin, is_pinned) VALUES (?, ?, ?, ?, 'admin', ?, ?, 1, ?)");
        $inStmt->execute([UlidGenerator::generate(), 'student',     $stu3Id,    'Test Note 1: Strong academics, IELTS 7.0. Prioritise Austria placement. Pinned for counsellor.', $adminInfo['id'], 0, 1]);
        $inStmt->execute([UlidGenerator::generate(), 'student',     $stu3Id,    'Test Note 2: Parent contacted re scholarship options. Sent brochure via email.', $cslAdminId, 1, 0]);
        $inStmt->execute([UlidGenerator::generate(), 'application', 2,          'Test Note 3: Transcripts look incomplete — need certified copies. Flag for student.', $cslAdminId, 0, 0]);
        $inStmt->execute([UlidGenerator::generate(), 'student',     $stu4Id,    'Test Note 4: Visa approved. Departure confirmed August 2026. Pre-departure briefing scheduled. Pinned.', $adminInfo['id'], 1, 1]);
        $inStmt->execute([UlidGenerator::generate(), 'application', 1,          'Test Note 5: First test application — needs follow-up on document submission timeline.', $adminInfo['id'], 0, 0]);
        echo "-> [DEV] Internal notes (5 entries) seeded\n";

        // ── AGENT REASSIGNMENT REQUESTS ──────────────────────────────────────
        // Pending request (student2 wants to move from agent2 → agent1)
        $pdo->prepare("INSERT INTO agent_reassignment_requests (public_id, student_id, current_agent_id, requested_agent_id, reason, status) VALUES (?, ?, ?, ?, ?, 'pending')")
            ->execute([UlidGenerator::generate(), $stu2Id, $agent2Id, $agent1Id, 'Test reassignment: Student prefers working with senior L1 agent for complex multi-country application.']);
        // Approved historical request (student3 already on agent1, this is past record)
        $pdo->prepare("INSERT INTO agent_reassignment_requests (public_id, student_id, current_agent_id, requested_agent_id, final_agent_id, reason, status, reviewed_by, reviewed_at, review_notes) VALUES (?, ?, ?, ?, ?, 'Test reassignment history: agent was unresponsive.', 'approved', ?, NOW(), 'Test: Approved after verification.')")
            ->execute([UlidGenerator::generate(), $stu3Id, $agent2Id, $agent1Id, $agent1Id, $adminInfo['id']]);
        echo "-> [DEV] Reassignment requests (1 pending, 1 approved) seeded\n";

        // ── SLA EVENTS ───────────────────────────────────────────────────────
        $slaRules = [];
        foreach ($pdo->query("SELECT id, rule_name FROM sla_rules")->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $slaRules[$r['rule_name']] = (int)$r['id'];
        }
        if (isset($slaRules['application_review'])) {
            // App 2 submitted 4 days ago → 72hr target already passed → BREACHED
            $pdo->prepare("INSERT INTO sla_events (sla_rule_id, entity_type, entity_id, started_at, target_at, status, breach_notified) VALUES (?, 'application', 2, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'breached', 1)")
                ->execute([$slaRules['application_review']]);
        }
        if (isset($slaRules['document_review'])) {
            // Doc request 2 submitted 12 hrs ago → 48hr target still active
            $pdo->prepare("INSERT INTO sla_events (sla_rule_id, entity_type, entity_id, started_at, target_at, status, breach_notified) VALUES (?, 'document_request', ?, DATE_SUB(NOW(), INTERVAL 12 HOUR), DATE_ADD(NOW(), INTERVAL 36 HOUR), 'active', 0)")
                ->execute([$slaRules['document_review'], $dr2Id]);
        }
        if (isset($slaRules['lead_first_contact'])) {
            // Lead 1 created 2 hrs ago → 24hr window → active
            $pdo->prepare("INSERT INTO sla_events (sla_rule_id, entity_type, entity_id, started_at, target_at, status, breach_notified) VALUES (?, 'lead', ?, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_ADD(NOW(), INTERVAL 22 HOUR), 'active', 0)")
                ->execute([$slaRules['lead_first_contact'], $lead1['id']]);
        }
        echo "-> [DEV] SLA events (1 breached, 2 active) seeded\n";

        // ── ACTIVITY LOGS ────────────────────────────────────────────────────
        $actStmt = $pdo->prepare("INSERT INTO activity_logs (actor_user_id, actor_user_type, actor_display_name, action, target_type, target_id, target_public_id, target_display, before_value, after_value, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '127.0.0.1')");
        // Application status changes — required by AdminDashboardController "recent stage movements"
        $actStmt->execute([$adminInfo['id'], 'admin', 'Super Admin Test', 'application.status_changed', 'application', 2, $app2PubId, 'TGA-2026-000002', json_encode(['status'=>'submitted']),     json_encode(['status'=>'under_review'])]);
        $actStmt->execute([$adminInfo['id'], 'admin', 'Super Admin Test', 'application.status_changed', 'application', 3, $app3PubId, 'TGA-2026-000003', json_encode(['status'=>'under_review']),  json_encode(['status'=>'offer_received'])]);
        $actStmt->execute([$adminInfo['id'], 'admin', 'Super Admin Test', 'application.status_changed', 'application', 4, $app4PubId, 'TGA-2026-000004', json_encode(['status'=>'offer_received']),json_encode(['status'=>'enrolled'])]);
        $actStmt->execute([$adminInfo['id'], 'admin', 'Super Admin Test', 'application.status_changed', 'application', 5, $app5PubId, 'TGA-2026-000005', json_encode(['status'=>'under_review']),  json_encode(['status'=>'rejected'])]);
        $actStmt->execute([$adminInfo['id'], 'admin', 'Super Admin Test', 'application.status_changed', 'application', 6, $app6PubId, 'TGA-2026-000006', json_encode(['status'=>'submitted']),     json_encode(['status'=>'withdrawn'])]);
        // Agent approvals
        $actStmt->execute([$adminInfo['id'], 'admin', 'Super Admin Test', 'agent.approved', 'agent', $agent1Id, $agent1PublicId, 'Rajesh Kumar — Delhi Consultations Test', json_encode(['status'=>'pending']), json_encode(['status'=>'approved'])]);
        $actStmt->execute([$adminInfo['id'], 'admin', 'Super Admin Test', 'agent.approved', 'agent', $agent2Id, $agent2PublicId, 'Sonia Sharma — Noida Franchise Test',    json_encode(['status'=>'pending']), json_encode(['status'=>'approved'])]);
        // Lead activity
        $actStmt->execute([$adminInfo['id'],  'admin', 'Super Admin Test',      'lead.created',         'lead', $lead1['id'], $lead1['public_id'], 'Mohit Test Lead 1',  null,                              json_encode(['status'=>'new'])]);
        $actStmt->execute([$cslAdminId,       'admin', 'Priya Counsellor Test', 'lead.status_changed',  'lead', $lead2['id'], $lead2['public_id'], 'Deepa Test Lead 2',  json_encode(['status'=>'new']),     json_encode(['status'=>'contacted'])]);
        // Commission paid
        $actStmt->execute([$adminInfo['id'],  'admin', 'Super Admin Test',      'commission.paid',      'commission', $comm4Id, $comm4PubId, 'INR 12000 — Anjali Test Student 4', json_encode(['status'=>'confirmed']), json_encode(['status'=>'paid'])]);
        echo "-> [DEV] Activity logs (10 entries) seeded\n";

        // ── REPORT SNAPSHOTS ─────────────────────────────────────────────────
        $snapStmt = $pdo->prepare("INSERT IGNORE INTO report_snapshots (snapshot_date, metric_key, metric_value, dimension_type, dimension_id) VALUES (?, ?, ?, ?, ?)");
        $today = new \DateTime();

        // 7 days of global + per-agent + per-source snapshots
        $globalMetrics = [
            ['total_students',          5],
            ['new_students',            1],
            ['total_applications',      6],
            ['total_offers',            1],
            ['total_enrollments',       1],
            ['total_leads',             5],
            ['conversion_rate_pct',    40.0],
            ['commissions_pending_inr', 33000],
            ['commissions_paid_inr',   12000],
        ];
        $agentMetrics = [
            // [agent_public_id, students, enrollments, conversion_rate, paid_inr]
            [$agent1PublicId, 3, 0,  0.0,   0],
            [$agent2PublicId, 2, 0,  0.0,   0],
            [$ag3PublicId,    1, 1, 100.0, 12000],
        ];
        $sourceMetrics = [
            ['website_form', 2, 1, 50.0],
            ['referral',     1, 0,  0.0],
            ['google_ads',   1, 0,  0.0],
        ];

        $uniRows = $pdo->query("SELECT public_id FROM universities WHERE deleted_at IS NULL LIMIT 4")->fetchAll(PDO::FETCH_COLUMN);
        $uniMetrics = [
            [$uniRows[0] ?? '_unk', 3, 2, 1, 66.7, 33.3],
            [$uniRows[1] ?? '_unk', 2, 1, 0, 50.0,  0.0],
            [$uniRows[2] ?? '_unk', 1, 0, 0,  0.0,  0.0],
        ];

        for ($i = 6; $i >= 0; $i--) {
            $d = clone $today;
            $d->modify("-{$i} days");
            $date = $d->format('Y-m-d');

            foreach ($globalMetrics as [$key, $val]) {
                $snapStmt->execute([$date, $key, $val, 'global', '_global']);
            }
            foreach ($agentMetrics as [$apid, $stu, $enr, $rate, $paid]) {
                $snapStmt->execute([$date, 'agent_students',         $stu,  'agent', $apid]);
                $snapStmt->execute([$date, 'agent_enrollments',      $enr,  'agent', $apid]);
                $snapStmt->execute([$date, 'agent_conversion_rate',  $rate, 'agent', $apid]);
                $snapStmt->execute([$date, 'agent_commissions_paid', $paid, 'agent', $apid]);
            }
            foreach ($sourceMetrics as [$src, $stu, $enr, $rate]) {
                $snapStmt->execute([$date, 'source_students',         $stu,  'lead_source', $src]);
                $snapStmt->execute([$date, 'source_enrollments',      $enr,  'lead_source', $src]);
                $snapStmt->execute([$date, 'source_conversion_rate',  $rate, 'lead_source', $src]);
            }
            foreach ($uniMetrics as [$upid, $apps, $offers, $enr, $offerRate, $enrRate]) {
                $snapStmt->execute([$date, 'uni_applications',    $apps,      'university', $upid]);
                $snapStmt->execute([$date, 'uni_offers',          $offers,    'university', $upid]);
                $snapStmt->execute([$date, 'uni_enrollments',     $enr,       'university', $upid]);
                $snapStmt->execute([$date, 'uni_offer_rate',      $offerRate, 'university', $upid]);
                $snapStmt->execute([$date, 'uni_enrollment_rate', $enrRate,   'university', $upid]);
            }
        }
        echo "-> [DEV] Report snapshots (7 days × global + agents + universities + sources) seeded\n";

        // ── AGENT STATS ──────────────────────────────────────────────────────
        $pdo->prepare("INSERT INTO agent_stats (agent_id, total_students, enrolled_count, in_progress_count, new_count, pending_commissions_inr, confirmed_commissions_inr, paid_commissions_inr, last_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())")
            ->execute([$agent1Id, 3, 0, 1, 2, 33000.00,  0.00,     0.00]);
        $pdo->prepare("INSERT INTO agent_stats (agent_id, total_students, enrolled_count, in_progress_count, new_count, pending_commissions_inr, confirmed_commissions_inr, paid_commissions_inr, last_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())")
            ->execute([$agent2Id, 2, 0, 0, 2,     0.00,  0.00,     0.00]);
        $pdo->prepare("INSERT INTO agent_stats (agent_id, total_students, enrolled_count, in_progress_count, new_count, pending_commissions_inr, confirmed_commissions_inr, paid_commissions_inr, last_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())")
            ->execute([$ag3Id,   1, 1, 0, 0,     0.00, 25000.00, 12000.00]);
        echo "-> [DEV] Agent stats seeded for 3 agents\n";

        // ── STUDENT ACADEMICS + TEST SCORES ─────────────────────────────────
        // Student 4 — full academic profile (enrolled, so expect complete docs)
        $pdo->prepare("INSERT INTO student_academics (public_id, student_id, institution_name, degree_level, field_of_study, start_date, end_date, score_type, score_value, is_highest_qualification) VALUES (?, ?, 'Delhi Public School Test', 'High School', 'Science (PCM)', '2015-04-01', '2017-03-31', 'Percentage', '87.4%', TRUE)")
            ->execute([UlidGenerator::generate(), $stu4Id]);
        $pdo->prepare("INSERT INTO student_academics (public_id, student_id, institution_name, degree_level, field_of_study, start_date, end_date, score_type, score_value, is_highest_qualification) VALUES (?, ?, 'Amity University Test', 'Bachelors', 'Computer Science', '2017-07-01', '2021-05-31', 'CGPA', '8.2 / 10', FALSE)")
            ->execute([UlidGenerator::generate(), $stu4Id]);
        $pdo->prepare("INSERT INTO student_test_scores (public_id, student_id, test_name, overall_score, reading_score, writing_score, listening_score, speaking_score, test_date) VALUES (?, ?, 'IELTS', '7.0', '7.0', '6.5', '7.5', '7.0', '2025-11-15')")
            ->execute([UlidGenerator::generate(), $stu4Id]);
        // Student 3 — in progress, has TOEFL
        $pdo->prepare("INSERT INTO student_test_scores (public_id, student_id, test_name, overall_score, reading_score, writing_score, listening_score, speaking_score, test_date) VALUES (?, ?, 'TOEFL', '105', '28', '24', '27', '26', '2025-09-20')")
            ->execute([UlidGenerator::generate(), $stu3Id]);
        echo "-> [DEV] Student academics (2 records) + test scores (2 records) seeded\n";

        // ── NOTIFICATIONS ────────────────────────────────────────────────────
        $notifStmt = $pdo->prepare("INSERT INTO notifications (public_id, event_key, recipient_user_id, channel, category, subject, body, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $now = date('Y-m-d H:i:s');
        $notifStmt->execute([UlidGenerator::generate(), 'application.status_changed', $studentInfo['id'], 'in_app', 'system',    'Application TGA-2026-000001 Submitted',       'Your application has been submitted successfully.',                          'sent',   $now]);
        $notifStmt->execute([UlidGenerator::generate(), 'application.status_changed', $stu4Info['id'],    'in_app', 'system',    'Congratulations — Application Enrolled',       'Your application TGA-2026-000004 has been moved to Enrolled.',                'sent',   $now]);
        $notifStmt->execute([UlidGenerator::generate(), 'commission.created',         $ag3Info['id'],     'in_app', 'approvals', 'Commission Record Created',                    'A commission of INR 12,000 has been recorded for Anjali Test Student 4.',    'sent',   $now]);
        $notifStmt->execute([UlidGenerator::generate(), 'notice.published',           $studentInfo['id'], 'in_app', 'system',    'New Notice: Welcome to TGA Portal Test Notice 1','Welcome to The Global Avenues CRM portal.',                              'queued', null]);
        $notifStmt->execute([UlidGenerator::generate(), 'lead.new',                   $adminInfo['id'],   'in_app', 'system',    'New Lead: Mohit Test Lead 1 from website_form','A new lead has been captured from the website.',                            'queued', null]);
        echo "-> [DEV] Notifications (3 sent, 2 queued) seeded\n";

        echo "\n[DEV] Comprehensive test data complete.\n";
        echo "Test accounts (password: Admin@12345 / Agent@12345 / Student@12345):\n";
        echo "  Admin (super):      env-configured SUPER_ADMIN_EMAIL\n";
        echo "  Admin (ops):        ops@theglobalavenues.com\n";
        echo "  Admin (counsellor): admin_test_counsellor@theglobalavenues.com\n";
        echo "  Admin (visa):       admin_test_visa@theglobalavenues.com\n";
        echo "  Agent L1 (approved):agent1@theglobalavenues.com   (TGA-DEL001)\n";
        echo "  Agent L2 (approved):agent2@theglobalavenues.com   (TGA-NOI002)\n";
        echo "  Agent L3 (approved):agent_test_3@theglobalavenues.com (TGA-GUR003)\n";
        echo "  Agent (pending):    agent_test_4@theglobalavenues.com\n";
        echo "  Agent (pending):    agent_test_5@theglobalavenues.com\n";
        echo "  Student 1 (app submitted):   student@theglobalavenues.com\n";
        echo "  Student 2 (registered):      student_test_2@theglobalavenues.com\n";
        echo "  Student 3 (under review):    student_test_3@theglobalavenues.com\n";
        echo "  Student 4 (enrolled):        student_test_4@theglobalavenues.com\n";
        echo "  Student 5 (rejected app):    student_test_5@theglobalavenues.com\n\n";
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
