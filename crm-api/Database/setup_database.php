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
    echo "All migrations applied successfully.\n\n";

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
        ['argon2_time_cost','2','integer','Argon2 Time Cost','Time cost for Argon2id','security']
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

    // Seed Notification Templates
    $templatesSeed = [
        ['agent.approved', 'Welcome to TGA Partner Network', '<p>Dear {{agent_name}}, your agency registration has been approved. Your referral code is: <strong>{{referral_code}}</strong>.</p>', 'email,in_app', 'agent'],
        ['agent.reassignment_denied', 'Reassignment Request Denied', '<p>The reassignment request for student {{student_name}} has been denied by the administrator.</p>', 'email,in_app', 'agent'],
        ['student.welcome', 'Welcome to The Global Avenues Portal', '<p>Dear {{student_name}}, your account has been successfully created. Welcome aboard!</p>', 'email,in_app', 'system'],
        ['document.requested', 'Action Required: Document Requested', '<p>An administrator has requested the following document: <strong>{{document_label}}</strong> for application {{reference_number}}.</p>', 'email,in_app', 'documents']
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

    // Seed Super Admin
    $adminInfo = $createUser('admin@theglobalavenues.com', '+911146801133', 'Admin@12345', 'admin', 'active');
    $pdo->prepare("
        INSERT INTO admins (public_id, user_id, is_super_admin, full_name)
        VALUES (?, ?, 1, 'Super Admin')
    ")->execute([UlidGenerator::generate(), $adminInfo['id']]);
    echo "-> Super Admin created: admin@theglobalavenues.com / Admin@12345\n";

    // Seed Ops Admin
    $opsInfo = $createUser('ops@theglobalavenues.com', '+911146801134', 'Admin@12345', 'admin', 'active');
    $pdo->prepare("
        INSERT INTO admins (public_id, user_id, is_super_admin, full_name)
        VALUES (?, ?, 0, 'Operations Officer')
    ")->execute([UlidGenerator::generate(), $opsInfo['id']]);
    echo "-> Operations Admin created: ops@theglobalavenues.com / Admin@12345\n";

    // Seed Agent L1 (Rajesh Kumar)
    $agent1Info = $createUser('agent1@theglobalavenues.com', '+919999999901', 'Agent@12345', 'agent', 'active');
    $agent1PublicId = UlidGenerator::generate();
    $pdo->prepare("
        INSERT INTO agents (public_id, user_id, parent_agent_id, root_agent_id, tier, full_name, agency_name, country, referral_code, status)
        VALUES (?, ?, NULL, NULL, 1, 'Rajesh Kumar', 'Delhi Consultations', 'India', 'TGA-DEL001', 'approved')
    ")->execute([$agent1PublicId, $agent1Info['id']]);
    $agent1Id = (int)$pdo->lastInsertId();
    // Self-root trigger emulation for root_agent_id O(1) bounds
    $pdo->prepare("UPDATE agents SET root_agent_id = ? WHERE id = ?")->execute([$agent1Id, $agent1Id]);
    echo "-> Agent L1 created: agent1@theglobalavenues.com / Agent@12345 (Code: TGA-DEL001)\n";

    // Seed Agent L2 (Sonia Sharma, parent Rajesh Kumar)
    $agent2Info = $createUser('agent2@theglobalavenues.com', '+919999999902', 'Agent@12345', 'agent', 'active');
    $agent2PublicId = UlidGenerator::generate();
    $pdo->prepare("
        INSERT INTO agents (public_id, user_id, parent_agent_id, root_agent_id, tier, full_name, agency_name, country, referral_code, status)
        VALUES (?, ?, ?, ?, 2, 'Sonia Sharma', 'Noida Franchise', 'India', 'TGA-NOI002', 'approved')
    ")->execute([$agent2PublicId, $agent2Info['id'], $agent1Id, $agent1Id]);
    echo "-> Agent L2 (Sub-agent) created: agent2@theglobalavenues.com / Agent@12345\n";

    // Seed Student (Amit Kumar, referred by রাজেশ / Agent L1)
    $studentInfo = $createUser('student@theglobalavenues.com', '+919999999903', 'Student@12345', 'student', 'active');
    $studentPublicId = UlidGenerator::generate();
    $passportEnc = EncryptionService::encrypt('Z1234567');
    $phoneProfileEnc = EncryptionService::encrypt('+919999999903');
    $pdo->prepare("
        INSERT INTO students (public_id, user_id, agent_id, full_name, date_of_birth, nationality, passport_number, phone_in_profile, lead_source, referral_agent_code, profile_status)
        VALUES (?, ?, ?, 'Amit Kumar', '2002-05-15', 'Indian', ?, ?, 'agent_referral', 'TGA-DEL001', 'application_in_progress')
    ")->execute([$studentPublicId, $studentInfo['id'], $agent1Id, $passportEnc, $phoneProfileEnc]);
    $studentId = (int)$pdo->lastInsertId();
    echo "-> Student created: student@theglobalavenues.com / Student@12345 (Referred by Rajesh)\n\n";

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
    $pdo->exec("INSERT INTO sequences (seq_name, next_val) VALUES ('application_ref', 2) ON DUPLICATE KEY UPDATE next_val = VALUES(next_val);");

    // 13. Seed an active Application and Commission log
    echo "Creating Sample Application & Timeline...\n";
    $appPublicId = UlidGenerator::generate();
    $appRef = "TGA-2026-000001";
    $pdo->prepare("
        INSERT INTO applications (id, public_id, reference_number, student_id, intake_id, agent_id_at_submission, status, submitted_at, notes)
        VALUES (1, ?, ?, ?, 1, ?, 'submitted', NOW(), 'Initial seeding application draft')
    ")->execute([$appPublicId, $appRef, $studentId, $agent1Id]);
    echo "-> Created application TGA-2026-000001 under review.\n";

    // Add Timeline updates
    $pdo->prepare("
        INSERT INTO application_updates (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id)
        VALUES (?, 1, 'student_to_admin', 'note', 'Applied for AI & Data Science course!', 'student', ?)
    ")->execute([UlidGenerator::generate(), $studentInfo['id']]);

    $pdo->prepare("
        INSERT INTO application_updates (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id)
        VALUES (?, 1, 'admin_to_student', 'note', 'Application received. We are waiting for document submission.', 'admin', ?)
    ")->execute([UlidGenerator::generate(), $adminInfo['id']]);

    // Create Document Request
    $docReqPublicId = UlidGenerator::generate();
    $pdo->prepare("
        INSERT INTO document_requests (public_id, student_id, application_id, doc_label, description, deadline, status, requested_by)
        VALUES (?, ?, 1, 'High School Transcript', 'Official academic transcript for High School graduation', '2026-07-15', 'requested', ?)
    ")->execute([$docReqPublicId, $studentId, $opsInfo['id']]);
    echo "-> Document request generated.\n";

    // Create Payment Item
    $pdo->prepare("
        INSERT INTO application_payments (public_id, application_id, label, amount, currency, payment_link, due_date, status, created_by)
        VALUES (?, 1, 'Enrollment Deposit', 150.00, 'EUR', 'https://stripe.com/tga-test-payment', '2026-07-20', 'pending', ?)
    ")->execute([UlidGenerator::generate(), $adminInfo['id']]);
    echo "-> Application payment requested.\n";

    // Create Commission Log
    $pdo->prepare("
        INSERT INTO commissions (public_id, application_id, agent_id, amount, percentage, currency, status, notes)
        VALUES (?, 1, ?, 15000.00, 10.00, 'INR', 'pending', 'Draft commission seed for राजेश')
    ")->execute([UlidGenerator::generate(), $agent1Id]);
    echo "-> Pending commission added.\n\n";

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
