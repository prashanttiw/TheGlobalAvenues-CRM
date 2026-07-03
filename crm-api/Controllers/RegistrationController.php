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
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\AdminPageAccessService;

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
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM users WHERE email_lookup_hash = ? AND user_type = 'student' AND deleted_at IS NULL");
        $stmt->execute([$emailHash]);
        if ((int)$stmt->fetchColumn() > 0) {
            Response::error('This email is already registered as a student. Please log in instead.', 'EMAIL_ALREADY_REGISTERED', 409);
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

        \TGA\CRM\Services\SecurityEventLogger::log('registration_initiated', null, $emailHash, $ip);

        Response::json([
            'success' => true,
            'session_token' => $token,
            'expires_in_minutes' => 15
        ], 202);
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
            $emailPrefix4 = EncryptionService::hashPrefix($data['email'], 4);
            $emailPrefix6 = EncryptionService::hashPrefix($data['email'], 6);
            $emailPrefix8 = EncryptionService::hashPrefix($data['email'], 8);

            $phoneHash = $data['phone'] ? EncryptionService::hash($data['phone']) : null;
            $encryptedPhone = $data['phone'] ? EncryptionService::encrypt($data['phone']) : null;
            $phonePrefix4 = $data['phone'] ? EncryptionService::hashPhonePrefix($data['phone'], 4) : null;
            $phonePrefix6 = $data['phone'] ? EncryptionService::hashPhonePrefix($data['phone'], 6) : null;

            // Insert User
            $userStmt = $this->pdo->prepare(
                'INSERT INTO users (public_id, email, email_lookup_hash, email_prefix4_hash, email_prefix6_hash, email_prefix8_hash,
                                     phone, phone_lookup_hash, phone_prefix4_hash, phone_prefix6_hash, password_hash, user_type, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $userStmt->execute([
                $userPublicId,
                $encryptedEmail,
                $emailHash,
                $emailPrefix4,
                $emailPrefix6,
                $emailPrefix8,
                $encryptedPhone,
                $phoneHash,
                $phonePrefix4,
                $phonePrefix6,
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
            \TGA\CRM\Services\SecurityEventLogger::log('registration_completed', null, $emailHash, $ip);

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
                    'path' => $this->resolveRefreshCookiePath(),
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
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM users WHERE email_lookup_hash = ? AND user_type = 'agent' AND deleted_at IS NULL");
        $stmt->execute([$emailHash]);
        if ((int)$stmt->fetchColumn() > 0) {
            Response::error('This email is already registered as an agent. Please log in instead.', 'EMAIL_ALREADY_REGISTERED', 409);
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

        \TGA\CRM\Services\SecurityEventLogger::log('registration_initiated', null, $emailHash, $ip);

        Response::json([
            'success' => true,
            'session_token' => $token,
            'expires_in_minutes' => 15
        ], 202);
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
            \TGA\CRM\Services\SecurityEventLogger::log('registration_completed', null, $emailHash, $ip);

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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Simplified 3-step registration (email ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ OTP ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ complete) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

    public function sendRegistrationOtp(): void
    {
        $ip = RateLimitMiddleware::getIpAddress();
        RateLimitMiddleware::assertAllowed("reg_otp_ip_{$ip}", 'registration_otp', 3, 3600);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = strtolower(trim($input['email'] ?? ''));
        $role = trim($input['role'] ?? '');
        $fullName = trim((string) ($input['full_name'] ?? ''));
        $phone = trim((string) ($input['phone'] ?? ''));

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Valid email required', 'VALIDATION_ERROR', 400);
        }
        if (!in_array($role, ['student', 'agent'], true)) {
            Response::error('Role must be student or agent', 'VALIDATION_ERROR', 400);
        }
        if ($fullName === '' || mb_strlen($fullName) < 2) {
            Response::error('Full name is required', 'VALIDATION_ERROR', 400);
        }
        if ($phone === '' || !preg_match('/^[0-9+\-\s()]{7,20}$/', $phone)) {
            Response::error('A valid mobile number is required', 'VALIDATION_ERROR', 400);
        }

        $emailHash = EncryptionService::hash($email);
        RateLimitMiddleware::assertAllowed("reg_otp_email_{$emailHash}", 'registration_otp_email', 3, 3600);

        $checkStmt = $this->pdo->prepare('SELECT COUNT(*) FROM users WHERE email_lookup_hash = ? AND user_type = ? AND deleted_at IS NULL');
        $checkStmt->execute([$emailHash, $role]);
        if ((int)$checkStmt->fetchColumn() > 0) {
            $portalLabel = $role === 'student' ? 'a student' : 'an agent';
            Response::error("This email is already registered as {$portalLabel}. Please log in instead.", 'EMAIL_ALREADY_REGISTERED', 409);
        }

        // Remove any prior pending registration for this email+role to prevent duplicates
        $pendingSvc = new PendingRegistrationService($this->pdo);
        $pendingSvc->invalidateByEmail($role, $email);

        $eventKey = $role === 'student' ? 'student.registration_otp' : 'agent.registration_otp';

        try {
            $code = OTPService::generateAndSend(
                $email,
                'registration',
                $eventKey,
                [],
                $ip
            );
        } catch (\RuntimeException $e) {
            if (str_starts_with($e->getMessage(), 'OTP_RATE_LIMITED:')) {
                $retryAfter = (int) explode(':', $e->getMessage())[1];
                header('Retry-After: ' . $retryAfter);
                Response::json(['success' => false, 'error' => 'RATE_LIMITED', 'message' => 'Too many attempts. Please wait before trying again.'], 429);
            }
            Response::json(['success' => false, 'error' => 'EMAIL_DELIVERY_FAILED', 'message' => 'Could not send verification code. Please try again.'], 502);
        }

        $token = $pendingSvc->store($role, $email, [
            'email' => $email,
            'role' => $role,
            'full_name' => $fullName,
            'phone' => $phone,
            'otp_verified' => false,
        ]);

        \TGA\CRM\Services\SecurityEventLogger::log('registration_initiated', null, $emailHash, $ip);

        Response::json(['success' => true, 'session_token' => $token, 'expires_in_minutes' => 15], 202);
    }

    public function verifyRegistrationOtp(): void
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
            Response::error('Session expired or invalid. Please start registration again.', 'SESSION_EXPIRED', 400);
        }

        if ($data['otp_verified'] ?? false) {
            Response::json(['success' => true, 'message' => 'Email already verified.']);
        }

        $email = $data['email'];
        $otpService = new OTPService($this->pdo);
        $result = $otpService->verify($email, $otpCode, 'registration');

        if ($result === OTPResult::BruteForced) {
            Response::error('Too many failed attempts. Please restart registration.', 'OTP_BRUTE_FORCED', 401);
        }
        if ($result === OTPResult::Expired) {
            Response::error('Verification code expired. Please request a new one.', 'OTP_EXPIRED', 401);
        }
        if ($result !== OTPResult::Valid) {
            Response::error('Invalid verification code.', 'OTP_INVALID', 400);
        }

        $data['otp_verified'] = true;
        $pendingSvc->update($token, $data);

        Response::json(['success' => true, 'message' => 'Email verified successfully.']);
    }

    public function completeStudentReg(): void
    {
        $ip = RateLimitMiddleware::getIpAddress();
        RateLimitMiddleware::assertAllowed("complete_student_ip_{$ip}", 'complete_student', 5, 3600);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $token = trim($input['session_token'] ?? '');
        $password = $input['password'] ?? '';

        if (!$token || !$password) {
            Response::error('Session token and password required', 'VALIDATION_ERROR', 400);
        }

        $pendingSvc = new PendingRegistrationService($this->pdo);
        $data = $pendingSvc->retrieve($token);

        if (!$data || ($data['role'] ?? '') !== 'student') {
            Response::error('Session expired or invalid. Please start registration again.', 'SESSION_EXPIRED', 400);
        }

        if (!($data['otp_verified'] ?? false)) {
            Response::error('Email not verified. Please verify your OTP first.', 'OTP_NOT_VERIFIED', 400);
        }

        $pwdValidation = PasswordValidator::validate($password);
        if (!$pwdValidation['valid']) {
            Response::error(implode(', ', $pwdValidation['errors']), 'VALIDATION_ERROR', 400);
        }

        $email = $data['email'];
        $emailHash = EncryptionService::hash($email);

        $data = $pendingSvc->consume($token);
        if (!$data) {
            Response::error('Session consumed or expired', 'SESSION_EXPIRED', 400);
        }

        try {
            $this->pdo->beginTransaction();

            $userPublicId = UlidGenerator::generate();
            $studentPublicId = UlidGenerator::generate();

            $encryptedEmail = EncryptionService::encrypt($email);
            // Name and phone are captured at registration (see sendRegistrationOtp) and
            // are locked everywhere else until changed from the student's profile page.
            $fullName = trim((string) ($data['full_name'] ?? ''));
            $phone = trim((string) ($data['phone'] ?? ''));
            $phoneHash = $phone !== '' ? EncryptionService::hash($phone) : null;
            $encryptedPhone = $phone !== '' ? EncryptionService::encrypt($phone) : null;
            $passwordHash = password_hash($password, PASSWORD_ARGON2ID, [
                'memory_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_MEMORY_COST', '19456'),
                'time_cost'   => (int) \TGA\CRM\Config\Environment::get('ARGON2_TIME_COST', '2'),
                'threads'     => 1,
            ]);

            $this->pdo->prepare(
                'INSERT INTO users (public_id, email, email_lookup_hash, phone, phone_lookup_hash, password_hash, user_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([$userPublicId, $encryptedEmail, $emailHash, $encryptedPhone, $phoneHash, $passwordHash, 'student', 'active']);

            $userId = (int)$this->pdo->lastInsertId();

            $this->pdo->prepare(
                'INSERT INTO students (public_id, user_id, agent_id, full_name, date_of_birth, nationality, phone_in_profile, lead_source, registered_by_type, registered_by_id, agent_lock_status, profile_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            )->execute([$studentPublicId, $userId, null, $fullName, null, null, $encryptedPhone, 'website', 'self', null, 'open', 'registered']);

            $studentId = (int)$this->pdo->lastInsertId();

            $this->pdo->prepare('INSERT INTO user_preferences (user_id) VALUES (?)')->execute([$userId]);

            $this->pdo->commit();

            \TGA\CRM\Services\SecurityEventLogger::log('registration_completed', null, $emailHash, $ip);

            ActivityLogger::log('student.registered', 'student', $studentId, $userId);
            \TGA\CRM\Services\NotificationService::fire('student.registered', ['name' => $fullName, 'student_name' => $fullName], [$userId]);

            $tokens = JWTService::issueTokenPair($userId, $userPublicId, 'student', []);

            $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
            $this->pdo->prepare(
                'INSERT INTO user_sessions (public_id, user_id, refresh_token_hash, jti_hash, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )->execute([UlidGenerator::generate(), $userId, hash('sha256', $tokens['refresh_token']), hash('sha256', $tokens['jti']), $ip, $ua, $tokens['refresh_expires_at']]);

            $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
            setcookie('refresh_token', $tokens['refresh_token'], ['expires' => strtotime($tokens['refresh_expires_at']), 'path' => $this->resolveRefreshCookiePath(), 'domain' => '', 'secure' => $secure, 'httponly' => true, 'samesite' => $secure ? 'None' : 'Lax']);

            Response::json([
                'success'      => true,
                'message'      => 'Registration completed successfully',
                'accessToken'  => $tokens['access_token'],
                'access_token' => $tokens['access_token'],
                'user'         => ['id' => $userPublicId, 'name' => $fullName, 'role' => 'student', 'user_type' => 'student'],
            ], 201);

        } catch (\Exception $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }

    public function completeAgentReg(): void
    {
        $ip = RateLimitMiddleware::getIpAddress();
        RateLimitMiddleware::assertAllowed("complete_agent_ip_{$ip}", 'complete_agent', 5, 3600);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $token = trim($input['session_token'] ?? '');
        $password = $input['password'] ?? '';

        if (!$token || !$password) {
            Response::error('Session token and password required', 'VALIDATION_ERROR', 400);
        }

        // Agency/business fields are NOT accepted at registration — they are collected
        // post-login via the onboarding flow. Name and mobile number ARE captured at
        // registration (see sendRegistrationOtp) and are locked in the onboarding form
        // until changed from the agent's profile page.
        $agencyName = '';
        $country = 'India';
        $partnershipScope = 'non_exclusive';
        $businessRegNumber = null;
        $referralCode = null;

        $pendingSvc = new PendingRegistrationService($this->pdo);
        $data = $pendingSvc->retrieve($token);

        if (!$data || ($data['role'] ?? '') !== 'agent') {
            Response::error('Session expired or invalid. Please start registration again.', 'SESSION_EXPIRED', 400);
        }

        if (!($data['otp_verified'] ?? false)) {
            Response::error('Email not verified. Please verify your OTP first.', 'OTP_NOT_VERIFIED', 400);
        }

        $pwdValidation = PasswordValidator::validate($password);
        if (!$pwdValidation['valid']) {
            Response::error(implode(', ', $pwdValidation['errors']), 'VALIDATION_ERROR', 400);
        }

        $email = $data['email'];
        $emailHash = EncryptionService::hash($email);

        $data = $pendingSvc->consume($token);
        if (!$data) {
            Response::error('Session consumed or expired', 'SESSION_EXPIRED', 400);
        }

        $fullName = trim((string) ($data['full_name'] ?? ''));
        $phone = trim((string) ($data['phone'] ?? ''));
        $nameParts = $fullName !== '' ? (preg_split('/\s+/', $fullName, 2) ?: []) : [];
        $firstName = $nameParts[0] ?? '';
        $lastName = $nameParts[1] ?? '';

        try {
            $this->pdo->beginTransaction();

            $userPublicId = UlidGenerator::generate();
            $agentPublicId = UlidGenerator::generate();

            $encryptedEmail = EncryptionService::encrypt($email);
            $phoneHash = $phone ? EncryptionService::hash($phone) : null;
            $encryptedPhone = $phone ? EncryptionService::encrypt($phone) : null;
            $encryptedMobile = $phone !== '' ? EncryptionService::encrypt($phone) : null;
            $passwordHash = password_hash($password, PASSWORD_ARGON2ID, [
                'memory_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_MEMORY_COST', '19456'),
                'time_cost'   => (int) \TGA\CRM\Config\Environment::get('ARGON2_TIME_COST', '2'),
                'threads'     => 1,
            ]);

            $this->pdo->prepare(
                "INSERT INTO users (public_id, email, email_lookup_hash, phone, phone_lookup_hash, password_hash, user_type, status) VALUES (?, ?, ?, ?, ?, ?, 'agent', 'active')"
            )->execute([$userPublicId, $encryptedEmail, $emailHash, $encryptedPhone, $phoneHash, $passwordHash]);

            $userId = (int)$this->pdo->lastInsertId();

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
                    $tier = min((int)$parentAgent['tier'] + 1, 3);
                }
            }

            $this->pdo->prepare(
                "INSERT INTO agents (public_id, user_id, tier, parent_agent_id, root_agent_id, full_name, first_name, last_name, agency_name, country, business_reg_number, partnership_scope, mobile_number, referral_code, status, terms_accepted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'registered', NOW())"
            )->execute([$agentPublicId, $userId, $tier, $parentAgentId, $rootAgentId, $fullName, $firstName ?: null, $lastName ?: null, $agencyName, $country, $businessRegNumber ?: null, $partnershipScope, $encryptedMobile]);

            $agentId = (int)$this->pdo->lastInsertId();

            if (!$rootAgentId) {
                $this->pdo->prepare("UPDATE agents SET root_agent_id = ? WHERE id = ?")->execute([$agentId, $agentId]);
            }

            $this->pdo->prepare('INSERT INTO user_preferences (user_id) VALUES (?)')->execute([$userId]);

            $this->pdo->commit();

            \TGA\CRM\Services\SecurityEventLogger::log('registration_completed', null, $emailHash, $ip);

            ActivityLogger::log('agent.registration_submitted', 'agent', $agentId, $userId);

            Response::json(['success' => true, 'status' => 'registered', 'message' => 'Account created. Please complete your partner application.'], 201);

        } catch (\Exception $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
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
        $isSuperAdmin = !empty($input['is_super_admin']);
        $pages = AdminPageAccessService::sanitizePageAccess($input['pages'] ?? []);

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
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM users WHERE email_lookup_hash = ? AND user_type = 'admin' AND deleted_at IS NULL");
        $stmt->execute([$emailHash]);
        if ((int)$stmt->fetchColumn() > 0) {
            Response::error('This email is already registered as an admin.', 'EMAIL_ALREADY_REGISTERED', 409);
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

            // Insert Admin (role_id set by applyAdminPages below; super admins get role_id = NULL)
            $adminStmt = $this->pdo->prepare(
                "INSERT INTO admins (public_id, user_id, role_id, is_super_admin, full_name, created_by)
                 VALUES (?, ?, ?, ?, ?, ?)"
            );
            $adminStmt->execute([
                $adminPublicId,
                $userId,
                null,
                $isSuperAdmin ? 1 : 0,
                $firstName . ' ' . $lastName,
                $superAdmin['id']
            ]);

            // Apply page-based permissions for non-super-admin accounts
            if (!$isSuperAdmin && !empty($pages)) {
                AdminPageAccessService::apply($this->pdo, $userId, $userPublicId, $pages);
            }

            // Insert Preferences
            $prefStmt = $this->pdo->prepare('INSERT INTO user_preferences (user_id) VALUES (?)');
            $prefStmt->execute([$userId]);

            $this->pdo->commit();

            $ip = RateLimitMiddleware::getIpAddress();
            \TGA\CRM\Services\SecurityEventLogger::log('registration_completed', null, $emailHash, $ip);

            // Queue welcome email — non-blocking. DB is already committed so this cannot
            // roll back the admin creation if it fails.
            try {
                $portalUrl = rtrim(\TGA\CRM\Config\Environment::get('APP_FRONTEND_URL', ''), '/') . '/portal/admin';
                \TGA\CRM\Services\NotificationService::fire('admin.created', [
                    'full_name'     => $firstName . ' ' . $lastName,
                    'portal_url'    => $portalUrl,
                    'pages_section' => AdminPageAccessService::buildEmailPageSection($isSuperAdmin, $pages),
                ], [$userId]);
            } catch (\Throwable $notifErr) {
                error_log('[AdminCreation] notification queue failed for user ' . $userPublicId . ': ' . $notifErr->getMessage());
            }

            Response::json([
                'success' => true,
                'message' => 'Admin created successfully',
                'admin' => [
                    'id' => $userPublicId,
                    'name' => $firstName . ' ' . $lastName,
                    'is_super_admin' => $isSuperAdmin,
                    'pages' => $pages,
                ]
            ], 201);

        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
    private function resolveRefreshCookiePath(): string
    {
        $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/'));
        $basePath = str_replace('\\', '/', dirname($scriptName));

        if ($basePath === '' || $basePath === '.' || $basePath === '\\') {
            return '/';
        }

        return rtrim($basePath, '/');
    }

}
