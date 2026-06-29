<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use Exception;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Services\EncryptionService;
use TGA\CRM\Services\OTPService;
use TGA\CRM\Services\OTPResult;
use TGA\CRM\Services\PendingRegistrationService;
use TGA\CRM\Services\PasswordValidator;
use TGA\CRM\Services\JWTService;
use TGA\CRM\Middleware\RateLimitMiddleware;
use TGA\CRM\Middleware\AuthMiddleware;

final class RegistrationController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function validateAgentCode(): void
    {
        $ip = RateLimitMiddleware::getIpAddress();
        RateLimitMiddleware::assertAllowed("agent_code_ip_{$ip}", 'validate_agent_code', 10, 60);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $code = trim($input['referral_code'] ?? '');

        if (!$code) {
            Response::error('Referral code required', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare(
            "SELECT full_name, agency_name FROM agents 
             WHERE referral_code = ? AND status = 'approved' AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute([$code]);
        $agent = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$agent) {
            Response::error('Invalid or inactive agent code', 'NOT_FOUND', 404);
        }

        Response::json([
            'agent_name' => $agent['full_name'],
            'agency_name' => $agent['agency_name']
        ]);
    }

    public function initiateStudent(): void
    {
        $ip = RateLimitMiddleware::getIpAddress();
        RateLimitMiddleware::assertAllowed("init_student_ip_{$ip}", 'initiate_student', 3, 3600);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $firstName = trim($input['first_name'] ?? '');
        $lastName = trim($input['last_name'] ?? '');
        $email = trim($input['email'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $password = $input['password'] ?? '';
        $dob = trim($input['date_of_birth'] ?? '');
        $nationality = trim($input['nationality'] ?? '');
        $leadSource = trim($input['lead_source'] ?? 'website');
        $referralCode = trim($input['referral_code'] ?? '');
        $passportNumber = trim($input['passport_number'] ?? '');
        $passportExpiry = trim($input['passport_expiry'] ?? '');
        $notes = trim($input['notes'] ?? '');

        if (!$firstName || !$lastName || !$email || !$password || !$dob || !$nationality) {
            Response::error('Missing required fields', 'VALIDATION_ERROR', 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email format', 'VALIDATION_ERROR', 400);
        }

        $pwdValidation = PasswordValidator::validate($password);
        if (!$pwdValidation['valid']) {
            Response::error(implode(', ', $pwdValidation['errors']), 'VALIDATION_ERROR', 400);
        }

        $emailHash = EncryptionService::hash(strtolower($email));
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM users WHERE email_lookup_hash = ? AND deleted_at IS NULL');
        $stmt->execute([$emailHash]);
        if ((int)$stmt->fetchColumn() > 0) {
            Response::error('Email already registered', 'EMAIL_ALREADY_REGISTERED', 409);
        }

        $registeredByType = 'self';
        $registeredById = null;
        $agentId = null;

        // Extract auth token manually to allow optional auth without throwing exception
        $token = $_COOKIE['access_token'] ?? null;
        if (!$token && isset($_SERVER['HTTP_AUTHORIZATION']) && preg_match('/Bearer\s+(.*)$/i', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
            $token = trim($matches[1]);
        }
        if ($token) {
            $payload = JWTService::verifyAccessToken($token);
            if ($payload) {
                $registeredByType = $payload['utype'] ?? $payload['user_type'] ?? 'self';
                $registeredById = $payload['sub'] ?? null;
            }
        }

        if ($referralCode) {
            $agentStmt = $this->pdo->prepare(
                "SELECT id FROM agents WHERE referral_code = ? AND status = 'approved' AND deleted_at IS NULL LIMIT 1"
            );
            $agentStmt->execute([$referralCode]);
            $agentId = $agentStmt->fetchColumn();
            if (!$agentId) {
                Response::error('Invalid or inactive agent code', 'VALIDATION_ERROR', 400);
            }
        }

        $ip = \TGA\CRM\Middleware\RateLimitMiddleware::getIpAddress();

        try {
            $code = OTPService::generateAndSend(
                $email,
                'registration',
                'student.registration_otp',
                ['student_name' => trim($firstName . ' ' . $lastName)],
                $ip
            );
        } catch (\RuntimeException $e) {
            if (str_starts_with($e->getMessage(), 'OTP_RATE_LIMITED:')) {
                $retryAfter = (int) explode(':', $e->getMessage())[1];
                header('Retry-After: ' . $retryAfter);
                Response::json([
                    'success' => false,
                    'error'   => 'RATE_LIMITED',
                    'message' => 'Too many attempts. Please wait before trying again.',
                ], 429);
            }
            Response::json([
                'success' => false,
                'error'   => 'EMAIL_DELIVERY_FAILED',
                'message' => 'We could not send your verification code. Please try again.',
            ], 502);
        }

        $pendingData = [
            'full_name' => trim($firstName . ' ' . $lastName),
            'email' => strtolower($email),
            'phone' => $phone,
            'password_hash' => password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_MEMORY_COST', '19456'),
            'time_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_TIME_COST', '2'),
            'threads' => 1,
        ]),
            'date_of_birth' => $dob,
            'nationality' => $nationality,
            'lead_source' => $leadSource,
            'passport_number' => $passportNumber,
            'passport_expiry' => $passportExpiry,
            'notes' => $notes,
            'agent_id' => $agentId,
            'referral_agent_code' => $referralCode,
            'registered_by_type' => $registeredByType,
            'registered_by_id' => $registeredById
        ];

        $pendingSvc = new PendingRegistrationService($this->pdo);
        $token = $pendingSvc->store('student', $email, $pendingData);

        $this->pdo->prepare("INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('registration_initiated', ?, ?, NOW())")->execute([$emailHash, $ip]);

        $devOtp = (\TGA\CRM\Config\Environment::get('APP_ENV') === 'development') ? ['otp_code_preview' => $code] : [];
        Response::json(array_merge([
            'success' => true,
            'session_token' => $token,
            'expires_in_minutes' => 15
        ], $devOtp), 202);
    }

    public function verifyStudentOtp(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $token = trim($input['session_token'] ?? '');
        $otpCode = trim($input['otp_code'] ?? '');

        if (!$token || !$otpCode) {
            Response::error('Session token and OTP code required', 'VALIDATION_ERROR', 400);
        }

        $pendingSvc = new PendingRegistrationService($this->pdo);
        $data = $pendingSvc->retrieve($token);
        
        if (!$data) {
            Response::error('Session expired or invalid', 'SESSION_EXPIRED', 400);
        }

        $email = $data['email'];
        $otpService = new OTPService($this->pdo);
        if ($otpService->verify($email, $otpCode, 'registration') !== OTPResult::Valid) {
            Response::error('Invalid or expired OTP', 'OTP_INVALID', 400);
        }

        $data = $pendingSvc->consume($token);
        if (!$data) {
            Response::error('Session consumed or expired', 'SESSION_EXPIRED', 400);
        }

        try {
            $this->pdo->beginTransaction();

            $userPublicId = UlidGenerator::generate();
            $studentPublicId = UlidGenerator::generate();
            
            $emailHash = EncryptionService::hash($data['email']);
            $encryptedEmail = EncryptionService::encrypt($data['email']);
            
            $phoneHash = $data['phone'] ? EncryptionService::hash($data['phone']) : null;
            $encryptedPhone = $data['phone'] ? EncryptionService::encrypt($data['phone']) : null;

            // Insert User
            $userStmt = $this->pdo->prepare(
                'INSERT INTO users (public_id, email, email_lookup_hash, phone, phone_lookup_hash, password_hash, user_type, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $userStmt->execute([
                $userPublicId,
                $encryptedEmail,
                $emailHash,
                $encryptedPhone,
                $phoneHash,
                $data['password_hash'],
                'student',
                'active'
            ]);

            $userId = (int)$this->pdo->lastInsertId();

            $encryptedPassport = !empty($data['passport_number']) ? EncryptionService::encrypt($data['passport_number']) : null;
            $encryptedProfilePhone = !empty($data['phone']) ? EncryptionService::encrypt($data['phone']) : null;

            // Insert Student
            $studentStmt = $this->pdo->prepare(
                'INSERT INTO students (public_id, user_id, agent_id, full_name, date_of_birth, nationality, passport_number, passport_expiry, phone_in_profile, lead_source, referral_agent_code, registered_by_type, registered_by_id, agent_lock_status, profile_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $studentStmt->execute([
                $studentPublicId,
                $userId,
                $data['agent_id'] ?: null,
                $data['full_name'],
                $data['date_of_birth'],
                $data['nationality'],
                $encryptedPassport,
                $data['passport_expiry'] ?: null,
                $encryptedProfilePhone,
                $data['lead_source'],
                $data['referral_agent_code'] ?: null,
                $data['registered_by_type'],
                $data['registered_by_id'] ?: null,
                'open',
                'registered'
            ]);
            $studentId = (int)$this->pdo->lastInsertId();

            // Insert Agent Student Mapping if agent exists
            // But wait, there is no agent_students table? 
            // In the students table migration, it has agent_id. 
            // Ah! Let me check if agent_students table exists.
            
            // For now, I'll just skip agent_students since agent_id is in students table.
            
            // Insert Preferences
            $prefStmt = $this->pdo->prepare('INSERT INTO user_preferences (user_id) VALUES (?)');
            $prefStmt->execute([$userId]);

            $this->pdo->commit();

            $ip = RateLimitMiddleware::getIpAddress();
            $this->pdo->prepare("INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('registration_completed', ?, ?, NOW())")->execute([$emailHash, $ip]);

            // Issue JWT
            ActivityLogger::log('student.registered', 'student', $studentId, $userId);
            \TGA\CRM\Services\NotificationService::fire('student.registered', ['name' => $data['full_name']], [$userId]);
            $tokens = JWTService::issueTokenPair($userId, $userPublicId, 'student', []);

            // Save Session
            $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
            $this->pdo->prepare(
                'INSERT INTO user_sessions (public_id, user_id, refresh_token_hash, jti_hash, ip_address, user_agent, expires_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                UlidGenerator::generate(),
                $userId,
                hash('sha256', $tokens['refresh_token']),
                hash('sha256', $tokens['jti']),
                $ip,
                $ua,
                $tokens['refresh_expires_at']
            ]);

            // Set secure HttpOnly cookie for refresh token
            $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
            setcookie(
                'refresh_token',
                $tokens['refresh_token'],
                [
                    'expires' => strtotime($tokens['refresh_expires_at']),
                    'path' => '/crm-api',
                    'domain' => '',
                    'secure' => $secure,
                    'httponly' => true,
                    'samesite' => $secure ? 'None' : 'Lax'
                ]
            );

            Response::json([
                'success' => true,
                'message' => 'Registration completed successfully',
                'accessToken' => $tokens['access_token'],
                'access_token' => $tokens['access_token'],
                'user' => [
                    'id' => $userPublicId,
                    'name' => $data['full_name'],
                    'user_type' => 'student'
                ]
            ], 201);

        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function initiateAgent(): void
    {
        $ip = RateLimitMiddleware::getIpAddress();
        RateLimitMiddleware::assertAllowed("init_agent_ip_{$ip}", 'initiate_agent', 3, 3600);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $agencyName = trim($input['agency_name'] ?? '');
        $country = trim($input['country'] ?? '');
        $partnershipScope = trim($input['partnership_scope'] ?? '');
        $fullName = trim($input['full_name'] ?? '');
        $email = trim($input['email'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $businessRegNumber = trim($input['business_registration_number'] ?? '');
        $recruitmentDescription = trim($input['recruitment_description'] ?? '');
        $password = $input['password'] ?? '';
        $referralCode = trim($input['referral_code'] ?? '');

        if (!$agencyName || !$country || !$partnershipScope || !$fullName || !$email || !$phone || !$password) {
            Response::error('Missing required fields', 'VALIDATION_ERROR', 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email format', 'VALIDATION_ERROR', 400);
        }

        $pwdValidation = PasswordValidator::validate($password);
        if (!$pwdValidation['valid']) {
            Response::error(implode(', ', $pwdValidation['errors']), 'VALIDATION_ERROR', 400);
        }

        $emailHash = EncryptionService::hash(strtolower($email));
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM users WHERE email_lookup_hash = ? AND deleted_at IS NULL');
        $stmt->execute([$emailHash]);
        if ((int)$stmt->fetchColumn() > 0) {
            Response::error('Email already registered', 'EMAIL_ALREADY_REGISTERED', 409);
        }

        $ip = \TGA\CRM\Middleware\RateLimitMiddleware::getIpAddress();

        try {
            $code = OTPService::generateAndSend(
                $email,
                'registration',
                'agent.registration_otp',
                ['agent_name' => $fullName],
                $ip
            );
        } catch (\RuntimeException $e) {
            if (str_starts_with($e->getMessage(), 'OTP_RATE_LIMITED:')) {
                $retryAfter = (int) explode(':', $e->getMessage())[1];
                header('Retry-After: ' . $retryAfter);
                Response::json([
                    'success' => false,
                    'error'   => 'RATE_LIMITED',
                    'message' => 'Too many attempts. Please wait before trying again.',
                ], 429);
            }
            Response::json([
                'success' => false,
                'error'   => 'EMAIL_DELIVERY_FAILED',
                'message' => 'We could not send your verification code. Please try again.',
            ], 502);
        }

        $pendingData = [
            'agency_name' => $agencyName,
            'country' => $country,
            'partnership_scope' => $partnershipScope,
            'full_name' => $fullName,
            'email' => strtolower($email),
            'phone' => $phone,
            'business_registration_number' => $businessRegNumber,
            'recruitment_description' => $recruitmentDescription,
            'referral_code' => $referralCode,
            'password_hash' => password_hash($password, PASSWORD_ARGON2ID, [
                'memory_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_MEMORY_COST', '19456'),
                'time_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_TIME_COST', '2'),
                'threads' => 1,
            ])
        ];

        $pendingSvc = new PendingRegistrationService($this->pdo);
        $token = $pendingSvc->store('agent', $email, $pendingData);

        $this->pdo->prepare("INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('registration_initiated', ?, ?, NOW())")->execute([$emailHash, $ip]);

        $devOtp = (\TGA\CRM\Config\Environment::get('APP_ENV') === 'development') ? ['otp_code_preview' => $code] : [];
        Response::json(array_merge([
            'success' => true,
            'session_token' => $token,
            'expires_in_minutes' => 15
        ], $devOtp), 202);
    }

    public function verifyAgentOtp(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $token = trim($input['session_token'] ?? '');
        $otpCode = trim($input['otp_code'] ?? '');

        if (!$token || !$otpCode) {
            Response::error('Session token and OTP code required', 'VALIDATION_ERROR', 400);
        }

        $pendingSvc = new PendingRegistrationService($this->pdo);
        $data = $pendingSvc->retrieve($token);

        if (!$data || ($data['reg_type'] ?? 'agent') !== 'agent') {
            Response::error('Session expired or invalid', 'SESSION_EXPIRED', 400);
        }

        $email = $data['email'];
        $otpService = new OTPService($this->pdo);
        if ($otpService->verify($email, $otpCode, 'registration') !== OTPResult::Valid) {
            Response::error('Invalid or expired OTP', 'OTP_INVALID', 400);
        }

        $data = $pendingSvc->consume($token);
        if (!$data) {
            Response::error('Session consumed or expired', 'SESSION_EXPIRED', 400);
        }

        try {
            $this->pdo->beginTransaction();

            $userPublicId = UlidGenerator::generate();
            $agentPublicId = UlidGenerator::generate();

            $emailHash = EncryptionService::hash($data['email']);
            $encryptedEmail = EncryptionService::encrypt($data['email']);
            $phoneHash = EncryptionService::hash($data['phone']);
            $encryptedPhone = EncryptionService::encrypt($data['phone']);

            // Insert User
            $userStmt = $this->pdo->prepare(
                "INSERT INTO users (public_id, email, email_lookup_hash, phone, phone_lookup_hash, password_hash, user_type, status)
                 VALUES (?, ?, ?, ?, ?, ?, 'agent', 'active')"
            );
            $userStmt->execute([
                $userPublicId,
                $encryptedEmail,
                $emailHash,
                $encryptedPhone,
                $phoneHash,
                $data['password_hash']
            ]);

            $userId = (int)$this->pdo->lastInsertId();

            $referralCode = $data['referral_code'] ?? null;
            $parentAgentId = null;
            $rootAgentId = null;
            $tier = 1;

            if ($referralCode) {
                $agentStmt = $this->pdo->prepare("SELECT id, root_agent_id, tier FROM agents WHERE referral_code = ? AND status = 'approved' LIMIT 1");
                $agentStmt->execute([$referralCode]);
                $parentAgent = $agentStmt->fetch(PDO::FETCH_ASSOC);

                if ($parentAgent) {
                    $parentAgentId = $parentAgent['id'];
                    $rootAgentId = $parentAgent['root_agent_id'] ?: $parentAgent['id'];
                    $tier = $parentAgent['tier'] + 1;
                    if ($tier > 3) {
                         throw new \Exception("Maximum sub-agent tier depth reached", 400);
                    }
                }
            }

            // Insert Agent
            $agentStmt = $this->pdo->prepare(
                "INSERT INTO agents (public_id, user_id, tier, parent_agent_id, root_agent_id, full_name, agency_name, country, business_reg_number, partnership_scope, referral_code, status, terms_accepted_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', NOW())"
            );
            $agentStmt->execute([
                $agentPublicId,
                $userId,
                $tier,
                $parentAgentId,
                $rootAgentId,
                $data['full_name'],
                $data['agency_name'],
                $data['country'],
                $data['business_registration_number'] ?: null,
                $data['partnership_scope']
            ]);
            $agentId = (int)$this->pdo->lastInsertId();

            if (!$rootAgentId) {
                // Update root_agent_id for top-level agent
                $updateRoot = $this->pdo->prepare("UPDATE agents SET root_agent_id = ? WHERE id = ?");
                $updateRoot->execute([$agentId, $agentId]);
            }

            // Insert Preferences
            $prefStmt = $this->pdo->prepare('INSERT INTO user_preferences (user_id) VALUES (?)');
            $prefStmt->execute([$userId]);

            $this->pdo->commit();

            $ip = RateLimitMiddleware::getIpAddress();
            $this->pdo->prepare("INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('registration_completed', ?, ?, NOW())")->execute([$emailHash, $ip]);

            // Note: Phase 6 notification service will handle `agent.onboarding_submitted` here

            // No JWT is issued for pending agents.
            ActivityLogger::log('agent.registration_submitted', 'agent', $agentId, $userId);
            \TGA\CRM\Services\NotificationService::fire('agent.onboarding_submitted', ['agency_name' => $data['agency_name']], [$userId]);

            Response::json([
                'success' => true,
                'status' => 'pending_approval',
                'message' => 'Agent registration submitted successfully. Awaiting admin approval.'
            ], 201);

        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function registerAdmin(): void
    {
        // 1. Authenticate & Authorize Super Admin
        $user = AuthMiddleware::user();
        if (($user['user_type'] ?? '') !== 'admin') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $superAdminStmt = $this->pdo->prepare("SELECT id, is_super_admin FROM admins WHERE user_id = ? AND is_super_admin = 1 LIMIT 1");
        $superAdminStmt->execute([$user['sub']]);
        $superAdmin = $superAdminStmt->fetch(PDO::FETCH_ASSOC);

        if (!$superAdmin) {
            Response::error('Only super admins can create other admins', 'FORBIDDEN', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $firstName = trim($input['first_name'] ?? '');
        $lastName = trim($input['last_name'] ?? '');
        $email = trim($input['email'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $password = $input['password'] ?? '';
        $roleId = isset($input['role_id']) ? (int)$input['role_id'] : null;

        if (!$firstName || !$lastName || !$email || !$password) {
            Response::error('Missing required fields', 'VALIDATION_ERROR', 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email format', 'VALIDATION_ERROR', 400);
        }

        $pwdValidation = PasswordValidator::validate($password);
        if (!$pwdValidation['valid']) {
            Response::error(implode(', ', $pwdValidation['errors']), 'VALIDATION_ERROR', 400);
        }

        $emailHash = EncryptionService::hash(strtolower($email));
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM users WHERE email_lookup_hash = ? AND deleted_at IS NULL');
        $stmt->execute([$emailHash]);
        if ((int)$stmt->fetchColumn() > 0) {
            Response::error('Email already registered', 'EMAIL_ALREADY_REGISTERED', 409);
        }

        try {
            $this->pdo->beginTransaction();

            $userPublicId = UlidGenerator::generate();
            $adminPublicId = UlidGenerator::generate();

            $encryptedEmail = EncryptionService::encrypt(strtolower($email));
            $phoneHash = $phone ? EncryptionService::hash($phone) : null;
            $encryptedPhone = $phone ? EncryptionService::encrypt($phone) : null;

            // Insert User
            $userStmt = $this->pdo->prepare(
                "INSERT INTO users (public_id, email, email_lookup_hash, phone, phone_lookup_hash, password_hash, user_type, status, registered_by_type, registered_by_id)
                 VALUES (?, ?, ?, ?, ?, ?, 'admin', 'active', 'admin', ?)"
            );
            $userStmt->execute([
                $userPublicId,
                $encryptedEmail,
                $emailHash,
                $encryptedPhone,
                $phoneHash,
                password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_MEMORY_COST', '19456'),
            'time_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_TIME_COST', '2'),
            'threads' => 1,
        ]),
                $user['sub']
            ]);

            $userId = (int)$this->pdo->lastInsertId();

            // Insert Admin
            $adminStmt = $this->pdo->prepare(
                "INSERT INTO admins (public_id, user_id, role_id, is_super_admin, full_name, created_by)
                 VALUES (?, ?, ?, 0, ?, ?)"
            );
            $adminStmt->execute([
                $adminPublicId,
                $userId,
                $roleId,
                $firstName . ' ' . $lastName,
                $superAdmin['id']
            ]);

            // Insert Preferences
            $prefStmt = $this->pdo->prepare('INSERT INTO user_preferences (user_id) VALUES (?)');
            $prefStmt->execute([$userId]);

            $this->pdo->commit();

            $ip = RateLimitMiddleware::getIpAddress();
            $this->pdo->prepare("INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('registration_completed', ?, ?, NOW())")->execute([$emailHash, $ip]);

            Response::json([
                'success' => true,
                'message' => 'Admin created successfully',
                'admin' => [
                    'id' => $userPublicId,
                    'name' => $firstName . ' ' . $lastName,
                    'role_id' => $roleId
                ]
            ], 201);

        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
