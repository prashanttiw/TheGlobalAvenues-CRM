<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\DisabledEndpointResponder;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\JWTService;
use TGA\CRM\Services\OTPService;
use TGA\CRM\Services\SecurityEventLogger;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RateLimitMiddleware;

final class AuthController
{
    private PDO $pdo;
    
    private const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0ZHVtbXlzYWx0$dummyhashvalue';

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function login(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = trim((string) ($input['email'] ?? ''));
        $password = (string) ($input['password'] ?? '');
        $otpCode = isset($input['otp_code']) ? trim((string) $input['otp_code']) : null;
        $role = trim((string) ($input['role'] ?? ''));

        if ($email === '' || $password === '') {
            Response::error('Email and password required', 'VALIDATION_ERROR', 400);
        }

        $ip = RateLimitMiddleware::getIpAddress();
        RateLimitMiddleware::assertAllowed("login_ip_{$ip}", 'login', 10, 900);

        $emailHash = \TGA\CRM\Services\EncryptionService::hash(strtolower($email));
        RateLimitMiddleware::assertAllowed("login_email_{$emailHash}", 'login_email', 10, 900);

        // Same email can exist as separate accounts per portal (unique key is
        // email_hash + user_type). Without scoping by role, LIMIT 1 can return
        // the wrong portal's account when more than one exists for this email.
        if ($role !== '' && in_array($role, ['student', 'agent', 'admin'], true)) {
            $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email_lookup_hash = ? AND user_type = ? AND deleted_at IS NULL LIMIT 1');
            $stmt->execute([$emailHash, $role]);
        } else {
            $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email_lookup_hash = ? AND deleted_at IS NULL LIMIT 1');
            $stmt->execute([$emailHash]);
        }
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        $hashToVerify = $user ? $user['password_hash'] : self::DUMMY_HASH;
        $passwordValid = password_verify($password, $hashToVerify);

        if (!$user || !$passwordValid) {
            $this->pdo->prepare(
                "INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('login_failed', ?, ?, NOW())"
            )->execute([$emailHash, $ip]);
            Response::error('Invalid credentials', 'AUTH_FAILED', 401);
        }

        if (($user['status'] ?? '') !== 'active') {
            $this->pdo->prepare(
                "INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('login_blocked_suspended', ?, ?, NOW())"
            )->execute([(string) $user['id'], $ip]);
            Response::error('Account is inactive or suspended', 'ACCOUNT_INACTIVE', 403);
        }

        if ((int) ($user['two_factor_enabled'] ?? 0) === 1) {
            $preAuthToken = JWTService::issuePreAuthToken((int) $user['id'], (string) $user['user_type']);

            $name = 'User';
            if ($user['user_type'] === 'admin') {
                $adminStmt = $this->pdo->prepare('SELECT full_name FROM admins WHERE user_id = ? LIMIT 1');
                $adminStmt->execute([(int)$user['id']]);
                $name = $adminStmt->fetchColumn() ?: 'Admin';
            } elseif ($user['user_type'] === 'agent') {
                $agentStmt = $this->pdo->prepare('SELECT full_name FROM agents WHERE user_id = ? LIMIT 1');
                $agentStmt->execute([(int)$user['id']]);
                $name = $agentStmt->fetchColumn() ?: 'Agent';
            } elseif ($user['user_type'] === 'student') {
                $studentStmt = $this->pdo->prepare('SELECT full_name FROM students WHERE user_id = ? LIMIT 1');
                $studentStmt->execute([(int)$user['id']]);
                $name = $studentStmt->fetchColumn() ?: 'Student';
            }

            // Use admin-specific template for admins; generic login OTP template for other user types
            $twoFaEventKey = ($user['user_type'] === 'admin') ? 'admin.2fa_otp' : 'login.otp';
            try {
                $plainEmail = \TGA\CRM\Services\EncryptionService::decrypt($user['email']);
                OTPService::generateAndSend(
                    $plainEmail,
                    '2fa',
                    $twoFaEventKey,
                    ['user_name' => $name, 'full_name' => $name],
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
                    'message' => 'We could not send your 2FA verification code. Please try again.',
                ], 502);
            }

            Response::json([
                'success'        => true,
                'requires_2fa'   => true,
                'pre_auth_token' => $preAuthToken,
            ]);
        }

        // 'registered' / 'draft' / 'pending' / 'rejected' agents all get a real session —
        // RoleGuard on the frontend routes them to the right onboarding/status/resubmit
        // screen based on agentStatus. Only 'suspended' is blocked at login time.
        if (($user['user_type'] ?? '') === 'agent') {
            $agentStmt = $this->pdo->prepare('SELECT status FROM agents WHERE user_id = ? LIMIT 1');
            $agentStmt->execute([(int) $user['id']]);
            $agent = $agentStmt->fetch(PDO::FETCH_ASSOC);

            if ($agent && $agent['status'] === 'suspended') {
                $this->pdo->prepare(
                    "INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('login_blocked_suspended', ?, ?, NOW())"
                )->execute([(string) $user['id'], $ip]);
                Response::error('Account suspended. Contact support.', 'ACCOUNT_SUSPENDED', 403);
            }
        }

        $permissions = [];
        if (($user['user_type'] ?? '') === 'admin') {
            $permissions = RBACMiddleware::loadPermissionsForAdmin((int) $user['id'], $this->pdo);
        }

        $tokens = JWTService::issueTokenPair(
            (int) $user['id'],
            (string) $user['public_id'],
            (string) $user['user_type'],
            $permissions
        );

        $this->saveSession((int) $user['id'], $tokens['jti'], $tokens['refresh_token'], $tokens['refresh_expires_at']);
        $this->setRefreshCookie($tokens['refresh_token'], $tokens['refresh_expires_at']);

        $this->pdo->prepare("UPDATE users SET last_login_at = NOW() WHERE id = ?")->execute([(int) $user['id']]);

        $profile = $this->buildUserResponse($user, $permissions);
        $this->pdo->prepare(
            "INSERT INTO security_events (event_type, user_id, identifier, ip_address, created_at) VALUES ('login_success', ?, ?, ?, NOW())"
        )->execute([(int) $user['id'], $emailHash, $ip]);

        Response::json([
            'success' => true,
            'message' => 'Login successful',
            'accessToken' => $tokens['access_token'],
            'access_token' => $tokens['access_token'],
            'user' => $profile,
        ]);
    }

    public function verify2fa(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $preAuthToken = trim((string) ($input['pre_auth_token'] ?? ''));
        $otpCode = trim((string) ($input['otp_code'] ?? ''));

        if ($preAuthToken === '' || $otpCode === '') {
            Response::error('Pre-auth token and OTP code required', 'VALIDATION_ERROR', 400);
        }

        $payload = JWTService::verifyPreAuthToken($preAuthToken);
        if (!$payload) {
            Response::error('Invalid or expired pre-authentication token. Please log in again.', 'AUTH_FAILED', 401);
        }

        $userId = (int) $payload['sub'];

        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || ($user['status'] ?? '') !== 'active') {
            Response::error('Account is inactive or suspended', 'ACCOUNT_INACTIVE', 403);
        }

        $plainEmail = \TGA\CRM\Services\EncryptionService::decrypt($user['email']);
        $otpService = new OTPService($this->pdo);

        $verifyResult = $otpService->verify($plainEmail, $otpCode, '2fa');

        if ($verifyResult !== \TGA\CRM\Services\OTPResult::Valid) {
            if ($verifyResult === \TGA\CRM\Services\OTPResult::BruteForced) {
                Response::error('Too many invalid attempts. Please request a new OTP or login again.', 'OTP_BRUTE_FORCED', 401);
            }
            if ($verifyResult === \TGA\CRM\Services\OTPResult::Expired) {
                Response::error('OTP has expired. Please request a new OTP.', 'OTP_EXPIRED', 401);
            }
            Response::error('Invalid or expired OTP', 'OTP_INVALID', 401);
        }

        $ip = RateLimitMiddleware::getIpAddress();
        if (($user['user_type'] ?? '') === 'agent') {
            $agentStmt = $this->pdo->prepare('SELECT status FROM agents WHERE user_id = ? LIMIT 1');
            $agentStmt->execute([$userId]);
            $agent = $agentStmt->fetch(PDO::FETCH_ASSOC);

            if ($agent && $agent['status'] === 'suspended') {
                $this->pdo->prepare(
                    "INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('login_blocked_suspended', ?, ?, NOW())"
                )->execute([(string) $user['id'], $ip]);
                Response::error('Account suspended. Contact support.', 'ACCOUNT_SUSPENDED', 403);
            }
        }

        $permissions = [];
        if (($user['user_type'] ?? '') === 'admin') {
            $permissions = RBACMiddleware::loadPermissionsForAdmin($userId, $this->pdo);
        }

        $tokens = JWTService::issueTokenPair(
            $userId,
            (string) $user['public_id'],
            (string) $user['user_type'],
            $permissions
        );

        $this->saveSession($userId, $tokens['jti'], $tokens['refresh_token'], $tokens['refresh_expires_at']);
        $this->setRefreshCookie($tokens['refresh_token'], $tokens['refresh_expires_at']);

        $this->pdo->prepare("UPDATE users SET last_login_at = NOW() WHERE id = ?")->execute([$userId]);

        $profile = $this->buildUserResponse($user, $permissions);

        $emailHash = \TGA\CRM\Services\EncryptionService::hash(strtolower($plainEmail));
        $this->pdo->prepare(
            "INSERT INTO security_events (event_type, user_id, identifier, ip_address, created_at) VALUES ('login_success', ?, ?, ?, NOW())"
        )->execute([$userId, $emailHash, $ip]);

        Response::json([
            'success' => true,
            'message' => 'Login successful',
            'accessToken' => $tokens['access_token'],
            'access_token' => $tokens['access_token'],
            'user' => $profile,
        ]);
    }

    public function resend2fa(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $preAuthToken = trim((string) ($input['pre_auth_token'] ?? ''));

        if ($preAuthToken === '') {
            Response::error('Pre-auth token required', 'VALIDATION_ERROR', 400);
        }

        $payload = JWTService::verifyPreAuthToken($preAuthToken);
        if (!$payload) {
            Response::error('Invalid or expired pre-authentication token. Please log in again.', 'AUTH_FAILED', 401);
        }

        $userId = (int) $payload['sub'];

        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || ($user['status'] ?? '') !== 'active') {
            Response::error('Account is inactive or suspended', 'ACCOUNT_INACTIVE', 403);
        }

        $plainEmail = \TGA\CRM\Services\EncryptionService::decrypt($user['email']);

        $name = 'User';
        if ($user['user_type'] === 'admin') {
            $adminStmt = $this->pdo->prepare('SELECT full_name FROM admins WHERE user_id = ? LIMIT 1');
            $adminStmt->execute([$userId]);
            $name = $adminStmt->fetchColumn() ?: 'Admin';
        } elseif ($user['user_type'] === 'agent') {
            $agentStmt = $this->pdo->prepare('SELECT full_name FROM agents WHERE user_id = ? LIMIT 1');
            $agentStmt->execute([$userId]);
            $name = $agentStmt->fetchColumn() ?: 'Agent';
        } elseif ($user['user_type'] === 'student') {
            $studentStmt = $this->pdo->prepare('SELECT full_name FROM students WHERE user_id = ? LIMIT 1');
            $studentStmt->execute([$userId]);
            $name = $studentStmt->fetchColumn() ?: 'Student';
        }

        // Use admin-specific template for admins; generic login OTP template for other user types
        $twoFaEventKey = ($user['user_type'] === 'admin') ? 'admin.2fa_otp' : 'login.otp';
        $ip = RateLimitMiddleware::getIpAddress();
        try {
            OTPService::generateAndSend(
                $plainEmail,
                '2fa',
                $twoFaEventKey,
                ['user_name' => $name, 'full_name' => $name],
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
                'message' => 'We could not send your 2FA verification code. Please try again.',
            ], 502);
        }

        Response::json([
            'success' => true,
            'message' => '2FA OTP resent successfully',
        ]);
    }

    public function logout(): void
    {
        $payload = AuthMiddleware::user();
        if (isset($payload['jti'])) {
            $jtiHash = hash('sha256', $payload['jti']);
            $stmt = $this->pdo->prepare('UPDATE user_sessions SET revoked_at = NOW() WHERE jti_hash = ?');
            $stmt->execute([$jtiHash]);
        }

        $this->clearRefreshCookie();
        Response::json(['success' => true, 'message' => 'Logged out successfully']);
    }

    public function refresh(): void
    {
        $refreshToken = $_COOKIE['refresh_token'] ?? '';
        if ($refreshToken === '') {
            Response::error('Refresh token missing', 'AUTH_FAILED', 401);
        }

        $payload = JWTService::verifyRefreshToken($refreshToken);
        if (!$payload) {
            Response::error('Invalid refresh token', 'AUTH_FAILED', 401);
        }

        $hash = hash('sha256', $refreshToken);
        $stmt = $this->pdo->prepare('SELECT id FROM user_sessions WHERE refresh_token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()');
        $stmt->execute([$hash]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$session) {
            Response::error('Session expired or revoked', 'AUTH_FAILED', 401);
        }

        $permissions = [];
        if (($payload['utype'] ?? '') === 'admin') {
            $permissions = RBACMiddleware::loadPermissionsForAdmin((int) $payload['sub'], $this->pdo);
        }

        $tokens = JWTService::issueTokenPair((int) $payload['sub'], (string) $payload['pid'], (string) $payload['utype'], $permissions);
        $this->pdo->prepare('UPDATE user_sessions SET revoked_at = NOW() WHERE id = ?')->execute([(int) $session['id']]);
        $this->saveSession((int) $payload['sub'], $tokens['jti'], $tokens['refresh_token'], $tokens['refresh_expires_at']);
        $this->setRefreshCookie($tokens['refresh_token'], $tokens['refresh_expires_at']);

        $user = $this->fetchAuthUser((int) $payload['sub']);
        $profile = $this->buildUserResponse($user, $permissions);

        Response::json([
            'success' => true,
            'message' => 'Session refreshed',
            'accessToken' => $tokens['access_token'],
            'access_token' => $tokens['access_token'],
            'user' => $profile,
        ]);
    }

    public function resetPassword(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = trim((string) ($input['email'] ?? ''));
        $role  = trim((string) ($input['role'] ?? ''));

        if ($email === '') {
            Response::error('Email required', 'VALIDATION_ERROR', 400);
        }
        if (!in_array($role, ['student', 'agent', 'admin'], true)) {
            Response::error('Please select your account type (student, agent, or admin).', 'VALIDATION_ERROR', 400);
        }

        $ip = RateLimitMiddleware::getIpAddress();
        RateLimitMiddleware::assertAllowed("forgot_password_ip_{$ip}", 'forgot_password_ip', 10, 3600);

        $emailHash = \TGA\CRM\Services\EncryptionService::hash(strtolower($email));
        RateLimitMiddleware::assertAllowed("forgot_password_email_{$emailHash}", 'forgot_password_email', 5, 3600);

        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email_lookup_hash = ? AND user_type = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$emailHash, $role]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        $this->pdo->prepare(
            "INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('password_reset_requested', ?, ?, NOW())"
        )->execute([$emailHash, $ip]);

        if (!$user) {
            $label = $role === 'admin' ? 'admin' : $role;
            Response::error("No {$label} account found with this email address.", 'USER_NOT_FOUND', 404);
        }

        if (($user['status'] ?? '') !== 'active') {
            Response::error('This account is inactive or suspended. Please contact support.', 'ACCOUNT_INACTIVE', 403);
        }

        $plaintextEmail = \TGA\CRM\Services\EncryptionService::decrypt($user['email']);

        $name = 'User';
        if ($role === 'admin') {
            $adminStmt = $this->pdo->prepare('SELECT full_name FROM admins WHERE user_id = ? LIMIT 1');
            $adminStmt->execute([(int) $user['id']]);
            $name = $adminStmt->fetchColumn() ?: 'Admin';
        } elseif ($role === 'agent') {
            $agentStmt = $this->pdo->prepare('SELECT full_name FROM agents WHERE user_id = ? LIMIT 1');
            $agentStmt->execute([(int) $user['id']]);
            $name = $agentStmt->fetchColumn() ?: 'Agent';
        } elseif ($role === 'student') {
            $studentStmt = $this->pdo->prepare('SELECT full_name FROM students WHERE user_id = ? LIMIT 1');
            $studentStmt->execute([(int) $user['id']]);
            $name = $studentStmt->fetchColumn() ?: 'Student';
        }

        try {
            OTPService::generateAndSend(
                $plaintextEmail,
                'password_reset',
                'password.reset_otp',
                ['user_name' => $name, 'full_name' => $name],
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
                'message' => 'We could not send your reset code. Please try again.',
            ], 502);
        }

        Response::json([
            'success' => true,
            'message' => 'A password reset OTP has been sent to your email address.',
        ]);
    }

    public function resetPasswordVerifyOtp(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = trim((string) ($input['email'] ?? ''));
        $otp   = trim((string) ($input['otp_code'] ?? ''));
        $role  = trim((string) ($input['role'] ?? ''));

        if ($email === '' || $otp === '') {
            Response::error('Missing fields', 'VALIDATION_ERROR', 400);
        }
        if (!in_array($role, ['student', 'agent', 'admin'], true)) {
            Response::error('Account type required', 'VALIDATION_ERROR', 400);
        }

        $emailHash = \TGA\CRM\Services\EncryptionService::hash(strtolower($email));
        RateLimitMiddleware::assertAllowed("forgot_password_verify_{$emailHash}", 'forgot_password_verify', 5, 900);

        $otpService = new OTPService($this->pdo);
        if ($otpService->verify($email, $otp, 'password_reset') !== \TGA\CRM\Services\OTPResult::Valid) {
            Response::error('Invalid or expired OTP', 'OTP_INVALID', 400);
        }

        $stmt = $this->pdo->prepare('SELECT password_hash FROM users WHERE email_lookup_hash = ? AND user_type = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$emailHash, $role]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Response::error('Invalid or expired OTP', 'OTP_INVALID', 400);
        }

        $pwdFragment = substr((string) $user['password_hash'], 0, 12);
        $resetToken = JWTService::issueResetToken($emailHash, $pwdFragment, $role);

        Response::json([
            'success'     => true,
            'reset_token' => $resetToken,
        ]);
    }

    public function resetPasswordConfirm(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $resetToken = trim((string) ($input['reset_token'] ?? ''));
        $newPassword = (string) ($input['new_password'] ?? '');
        $confirmPassword = (string) ($input['confirm_password'] ?? '');

        if ($resetToken === '' || $newPassword === '' || $confirmPassword === '') {
            Response::error('Missing fields', 'VALIDATION_ERROR', 400);
        }

        if ($newPassword !== $confirmPassword) {
            Response::error('Passwords do not match', 'VALIDATION_ERROR', 400);
        }

        $payload = JWTService::verifyResetToken($resetToken);
        if (!$payload) {
            Response::error('Invalid or expired reset token', 'AUTH_FAILED', 401);
        }

        $pwdValidation = \TGA\CRM\Services\PasswordValidator::validate($newPassword);
        if (!$pwdValidation['valid']) {
            Response::error(implode(', ', $pwdValidation['errors']), 'VALIDATION_ERROR', 400);
        }

        $emailHash = (string) $payload['email_hash'];
        $jtiHash = hash('sha256', (string) $payload['jti']);

        $usedStmt = $this->pdo->prepare(
            "SELECT id FROM otp_verifications WHERE identifier_hash = ? AND otp_hash = ? AND purpose = 'reset_jti' LIMIT 1"
        );
        $usedStmt->execute([$emailHash, $jtiHash]);
        if ($usedStmt->fetch()) {
            Response::error('Reset token already used', 'AUTH_FAILED', 401);
        }

        $userType = (string) ($payload['user_type'] ?? '');
        if ($userType !== '' && in_array($userType, ['student', 'agent', 'admin'], true)) {
            $stmt = $this->pdo->prepare('SELECT id, password_hash FROM users WHERE email_lookup_hash = ? AND user_type = ? AND deleted_at IS NULL LIMIT 1');
            $stmt->execute([$emailHash, $userType]);
        } else {
            $stmt = $this->pdo->prepare('SELECT id, password_hash FROM users WHERE email_lookup_hash = ? AND deleted_at IS NULL LIMIT 1');
            $stmt->execute([$emailHash]);
        }
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Response::error('User not found', 'NOT_FOUND', 404);
        }

        if (substr((string) $user['password_hash'], 0, 12) !== (string) $payload['pwd_h']) {
            Response::error('Password was changed recently. Token invalid.', 'AUTH_FAILED', 401);
        }

        $hash = password_hash($newPassword, PASSWORD_ARGON2ID, [
            'memory_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_MEMORY_COST', '19456'),
            'time_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_TIME_COST', '2'),
            'threads' => 1,
        ]);

        try {
            $this->pdo->beginTransaction();

            $this->pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$hash, (int) $user['id']]);
            $this->pdo->prepare('UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL')->execute([(int) $user['id']]);
            $this->pdo->prepare(
                "INSERT INTO otp_verifications (identifier_hash, otp_hash, purpose, expires_at, used_at, attempts, created_at) VALUES (?, ?, 'reset_jti', DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW(), 0, NOW())"
            )->execute([$emailHash, $jtiHash]);

            $this->pdo->commit();

            $ip = RateLimitMiddleware::getIpAddress();
            $this->pdo->prepare(
                "INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('password_reset_completed', ?, ?, NOW())"
            )->execute([(string) $user['id'], $ip]);

            \TGA\CRM\Services\ActivityLogger::log('user.password_reset', 'user', (int) $user['id'], (int) $user['id']);

            Response::json([
                'success' => true,
                'message' => 'Password updated. Please log in again.',
            ]);
        } catch (\Exception $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function me(): void
    {
        $payload = AuthMiddleware::user();
        $user = $this->fetchAuthUser((int) $payload['sub']);
        $permissions = [];

        if (($user['user_type'] ?? '') === 'admin') {
            $permissions = RBACMiddleware::loadPermissionsForAdmin((int) $user['id'], $this->pdo);
        }

        Response::json([
            'success' => true,
            'message' => 'Current user',
            'user' => $this->buildUserResponse($user, $permissions),
        ]);
    }

    private function saveSession(int $userId, string $jti, string $refreshToken, string $expiresAt): void
    {
        // Enforce max sessions per user (GAP-1)
        $limitStmt = $this->pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'session_max_per_user'");
        $limitStmt->execute();
        $maxSessions = (int)($limitStmt->fetchColumn() ?: 5);

        $countStmt = $this->pdo->prepare('SELECT COUNT(*) FROM user_sessions WHERE user_id = ? AND revoked_at IS NULL');
        $countStmt->execute([$userId]);
        $count = (int)$countStmt->fetchColumn();

        if ($count >= $maxSessions) {
            $oldestStmt = $this->pdo->prepare(
                'SELECT id FROM user_sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at ASC LIMIT 1'
            );
            $oldestStmt->execute([$userId]);
            $oldestId = $oldestStmt->fetchColumn();
            if ($oldestId) {
                $this->pdo->prepare('UPDATE user_sessions SET revoked_at = NOW() WHERE id = ?')->execute([$oldestId]);
            }
        }

        $ip = \TGA\CRM\Middleware\RateLimitMiddleware::getIpAddress();
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
        
        $stmt = $this->pdo->prepare(
            'INSERT INTO user_sessions (public_id, user_id, refresh_token_hash, jti_hash, ip_address, user_agent, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            \TGA\CRM\Helpers\UlidGenerator::generate(),
            $userId,
            hash('sha256', $refreshToken),
            hash('sha256', $jti),
            $ip,
            $ua,
            $expiresAt
        ]);
    }

    public function listSessions(): void
    {
        $payload = AuthMiddleware::user();
        $userId = (int)$payload['sub'];

        $stmt = $this->pdo->prepare(
            'SELECT public_id, device_label, ip_address, created_at, last_active_at, expires_at 
             FROM user_sessions 
             WHERE user_id = ? AND revoked_at IS NULL 
             ORDER BY created_at DESC'
        );
        $stmt->execute([$userId]);
        $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(['sessions' => $sessions]);
    }

    public function revokeSession(): void
    {
        $payload = AuthMiddleware::user();
        $userId = (int)$payload['sub'];

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $sessionPublicId = $input['session_public_id'] ?? '';

        if (!$sessionPublicId) {
            Response::error('Session ID required', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare(
            'UPDATE user_sessions SET revoked_at = NOW() WHERE public_id = ? AND user_id = ? AND revoked_at IS NULL'
        );
        $stmt->execute([$sessionPublicId, $userId]);

        Response::json(['message' => 'Session revoked']);
    }

    public function requestAdminOtpLogin(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = trim((string) ($input['email'] ?? ''));

        if ($email === '') {
            Response::error('Email required', 'VALIDATION_ERROR', 400);
        }

        $ip = RateLimitMiddleware::getIpAddress();
        RateLimitMiddleware::assertAllowed("admin_otp_login_ip_{$ip}", 'admin_otp_login_request', 10, 3600);

        $emailHash = \TGA\CRM\Services\EncryptionService::hash(strtolower($email));
        RateLimitMiddleware::assertAllowed("admin_otp_login_email_{$emailHash}", 'admin_otp_login_request_email', 5, 3600);

        $stmt = $this->pdo->prepare(
            "SELECT id, status, user_type FROM users WHERE email_lookup_hash = ? AND user_type = 'admin' AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute([$emailHash]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Response::error('No admin account found with this email address.', 'USER_NOT_FOUND', 404);
        }

        if (($user['status'] ?? '') !== 'active') {
            Response::error('Account is inactive or suspended. Please contact support.', 'ACCOUNT_INACTIVE', 403);
        }

        $adminStmt = $this->pdo->prepare('SELECT full_name FROM admins WHERE user_id = ? LIMIT 1');
        $adminStmt->execute([(int) $user['id']]);
        $name = $adminStmt->fetchColumn() ?: 'Admin';

        try {
            OTPService::generateAndSend(
                $email,
                'login',
                'admin.2fa_otp',
                ['user_name' => $name, 'full_name' => $name],
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
                'message' => 'We could not send your login code. Please try again.',
            ], 502);
        }

        Response::json([
            'success' => true,
            'message' => 'Verification code sent to your admin email.',
        ]);
    }

    public function verifyAdminOtpLogin(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = trim((string) ($input['email'] ?? ''));
        $otpCode = trim((string) ($input['otp_code'] ?? ''));

        if ($email === '' || $otpCode === '') {
            Response::error('Email and OTP code required', 'VALIDATION_ERROR', 400);
        }

        $emailHash = \TGA\CRM\Services\EncryptionService::hash(strtolower($email));
        RateLimitMiddleware::assertAllowed("admin_otp_login_verify_{$emailHash}", 'admin_otp_login_verify', 5, 900);

        $otpService = new OTPService($this->pdo);
        $verifyResult = $otpService->verify($email, $otpCode, 'login');

        if ($verifyResult !== \TGA\CRM\Services\OTPResult::Valid) {
            $ip = RateLimitMiddleware::getIpAddress();
            $this->pdo->prepare(
                "INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('login_failed', ?, ?, NOW())"
            )->execute([$emailHash, $ip]);

            if ($verifyResult === \TGA\CRM\Services\OTPResult::BruteForced) {
                Response::error('Too many invalid attempts. Please request a new OTP.', 'OTP_BRUTE_FORCED', 401);
            }
            if ($verifyResult === \TGA\CRM\Services\OTPResult::Expired) {
                Response::error('OTP has expired. Please request a new code.', 'OTP_EXPIRED', 401);
            }
            Response::error('Invalid or expired OTP', 'OTP_INVALID', 401);
        }

        $stmt = $this->pdo->prepare(
            "SELECT * FROM users WHERE email_lookup_hash = ? AND user_type = 'admin' AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute([$emailHash]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || ($user['status'] ?? '') !== 'active') {
            Response::error('Account is inactive or suspended', 'ACCOUNT_INACTIVE', 403);
        }

        $permissions = RBACMiddleware::loadPermissionsForAdmin((int) $user['id'], $this->pdo);

        $tokens = JWTService::issueTokenPair(
            (int) $user['id'],
            (string) $user['public_id'],
            (string) $user['user_type'],
            $permissions
        );

        $this->saveSession((int) $user['id'], $tokens['jti'], $tokens['refresh_token'], $tokens['refresh_expires_at']);
        $this->setRefreshCookie($tokens['refresh_token'], $tokens['refresh_expires_at']);

        $profile = $this->buildUserResponse($user, $permissions);
        $ip = RateLimitMiddleware::getIpAddress();
        $this->pdo->prepare(
            "INSERT INTO security_events (event_type, user_id, identifier, ip_address, created_at) VALUES ('login_success', ?, ?, ?, NOW())"
        )->execute([(int) $user['id'], $emailHash, $ip]);

        Response::json([
            'success'      => true,
            'message'      => 'Login successful',
            'accessToken'  => $tokens['access_token'],
            'access_token' => $tokens['access_token'],
            'user'         => $profile,
        ]);
    }

    public function verifyOtp(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = trim($input['email'] ?? '');
        $otp = $input['otp_code'] ?? '';
        $purpose = $input['purpose'] ?? '2fa_login';

        if (!$email || !$otp) {
            Response::error('Email and OTP code required', 'VALIDATION_ERROR', 400);
        }

        $otpService = new OTPService($this->pdo);
        if ($otpService->verify($email, $otp, $purpose) !== \TGA\CRM\Services\OTPResult::Valid) {
            Response::error('Invalid or expired OTP', 'OTP_INVALID', 400);
        }

        Response::json(['message' => 'OTP verified successfully']);
    }

    public function requestOtpLogin(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = trim((string) ($input['email'] ?? ''));
        $role = trim((string) ($input['role'] ?? ''));

        if ($email === '') {
            Response::error('Email required', 'VALIDATION_ERROR', 400);
        }
        if (!in_array($role, ['student', 'agent'], true)) {
            Response::error('Role must be student or agent', 'VALIDATION_ERROR', 400);
        }

        $ip = RateLimitMiddleware::getIpAddress();
        RateLimitMiddleware::assertAllowed("otp_login_ip_{$ip}", 'otp_login_request', 3, 3600);

        $emailHash = \TGA\CRM\Services\EncryptionService::hash(strtolower($email));
        RateLimitMiddleware::assertAllowed("otp_login_email_{$emailHash}", 'otp_login_request_email', 3, 3600);

        $stmt = $this->pdo->prepare('SELECT id, status, user_type FROM users WHERE email_lookup_hash = ? AND user_type = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$emailHash, $role]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            $portalLabel = $role === 'student' ? 'student' : 'agent';
            Response::error("No {$portalLabel} account found with this email. Please register first.", 'USER_NOT_FOUND', 404);
        }

        if (($user['status'] ?? '') !== 'active') {
            Response::error('Account is inactive or suspended. Please contact support.', 'ACCOUNT_INACTIVE', 403);
        }

        $name = 'User';
        if ($role === 'agent') {
            $agentStmt = $this->pdo->prepare('SELECT full_name FROM agents WHERE user_id = ? LIMIT 1');
            $agentStmt->execute([(int)$user['id']]);
            $name = $agentStmt->fetchColumn() ?: 'Agent';
        } elseif ($role === 'student') {
            $studentStmt = $this->pdo->prepare('SELECT full_name FROM students WHERE user_id = ? LIMIT 1');
            $studentStmt->execute([(int)$user['id']]);
            $name = $studentStmt->fetchColumn() ?: 'Student';
        }

        try {
            OTPService::generateAndSend(
                $email,
                'login',
                'login.otp',
                ['user_name' => $name, 'full_name' => $name],
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
                'message' => 'We could not send your login verification code. Please try again.',
            ], 502);
        }

        Response::json([
            'success' => true,
            'message' => 'Verification code sent to your email.',
        ]);
    }

    public function verifyOtpLogin(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = trim((string) ($input['email'] ?? ''));
        $otpCode = trim((string) ($input['otp_code'] ?? ''));
        $role = trim((string) ($input['role'] ?? ''));

        if ($email === '' || $otpCode === '') {
            Response::error('Email and OTP code required', 'VALIDATION_ERROR', 400);
        }
        if (!in_array($role, ['student', 'agent'], true)) {
            Response::error('Role must be student or agent', 'VALIDATION_ERROR', 400);
        }

        $emailHash = \TGA\CRM\Services\EncryptionService::hash(strtolower($email));
        RateLimitMiddleware::assertAllowed("otp_login_verify_{$emailHash}", 'otp_login_verify', 5, 900);

        $otpService = new OTPService($this->pdo);
        if ($otpService->verify($email, $otpCode, 'login') !== \TGA\CRM\Services\OTPResult::Valid) {
            $ip = RateLimitMiddleware::getIpAddress();
            $this->pdo->prepare(
                "INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('login_failed', ?, ?, NOW())"
            )->execute([$emailHash, $ip]);
            Response::error('Invalid or expired OTP', 'OTP_INVALID', 401);
        }

        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email_lookup_hash = ? AND user_type = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$emailHash, $role]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || ($user['status'] ?? '') !== 'active') {
            Response::error('Account is inactive or suspended', 'ACCOUNT_INACTIVE', 403);
        }

        if (($user['user_type'] ?? '') === 'agent') {
            $agentStmt = $this->pdo->prepare('SELECT status FROM agents WHERE user_id = ? LIMIT 1');
            $agentStmt->execute([(int) $user['id']]);
            $agent = $agentStmt->fetch(PDO::FETCH_ASSOC);

            if ($agent && $agent['status'] === 'suspended') {
                $ip = RateLimitMiddleware::getIpAddress();
                $this->pdo->prepare(
                    "INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('login_blocked_suspended', ?, ?, NOW())"
                )->execute([(string) $user['id'], $ip]);
                Response::error('Account suspended. Contact support.', 'ACCOUNT_SUSPENDED', 403);
            }
        }

        $permissions = [];
        if (($user['user_type'] ?? '') === 'admin') {
            $permissions = RBACMiddleware::loadPermissionsForAdmin((int) $user['id'], $this->pdo);
        }

        $tokens = JWTService::issueTokenPair(
            (int) $user['id'],
            (string) $user['public_id'],
            (string) $user['user_type'],
            $permissions
        );

        $this->saveSession((int) $user['id'], $tokens['jti'], $tokens['refresh_token'], $tokens['refresh_expires_at']);
        $this->setRefreshCookie($tokens['refresh_token'], $tokens['refresh_expires_at']);

        $profile = $this->buildUserResponse($user, $permissions);
        $ip = RateLimitMiddleware::getIpAddress();
        $emailHash2 = \TGA\CRM\Services\EncryptionService::hash(strtolower($email));
        $this->pdo->prepare(
            "INSERT INTO security_events (event_type, user_id, identifier, ip_address, created_at) VALUES ('login_success', ?, ?, ?, NOW())"
        )->execute([(int) $user['id'], $emailHash2, $ip]);

        Response::json([
            'success' => true,
            'message' => 'Login successful',
            'accessToken' => $tokens['access_token'],
            'access_token' => $tokens['access_token'],
            'user' => $profile,
        ]);
    }

    public function impersonate(): void
    {
        try {
            $payload = AuthMiddleware::user();
        } catch (\Throwable $e) {
            SecurityEventLogger::log('impersonation_denied', null, 'auth/impersonate', null, [
                'reason' => 'unauthenticated',
            ]);
            Response::error('Authentication required', 'AUTH_REQUIRED', 401);
        }

        $userId = (int) ($payload['id'] ?? $payload['sub'] ?? 0);
        $userType = (string) ($payload['user_type'] ?? $payload['utype'] ?? 'unknown');

        $adminStmt = $this->pdo->prepare(
            'SELECT id, public_id, is_super_admin FROM admins WHERE user_id = ? LIMIT 1'
        );
        $adminStmt->execute([$userId]);
        $admin = $adminStmt->fetch(PDO::FETCH_ASSOC);

        if (!$admin || (int) ($admin['is_super_admin'] ?? 0) !== 1) {
            SecurityEventLogger::log('impersonation_denied', $userId, 'auth/impersonate', null, [
                'reason' => 'super_admin_required',
                'user_type' => $userType,
            ]);
            Response::error('Super admin access required', 'FORBIDDEN', 403);
        }

        SecurityEventLogger::log('impersonation_disabled', $userId, (string) ($admin['public_id'] ?? 'auth/impersonate'), null, [
            'reason' => 'route_disabled',
            'user_type' => $userType,
        ]);
        ActivityLogger::log(
            'auth.impersonation_attempt_blocked',
            'admin',
            (int) $admin['id'],
            $userId,
            [],
            ['public_id' => (string) ($admin['public_id'] ?? ''), 'status' => 'disabled']
        );

        DisabledEndpointResponder::legacyStub(
            'auth.impersonate',
            'Impersonation is disabled until a fully-audited super-admin flow exists.',
            ['replacement' => 'Use normal authenticated admin sessions and role-based access controls.']
        );
    }

    public function changePassword(): void
    {
        $payload = AuthMiddleware::user();
        $userId = (int)$payload['sub'];
        $jti = $payload['jti'] ?? '';

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $currentPassword = $input['current_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';
        $confirmPassword = $input['confirm_password'] ?? '';

        if (!$currentPassword || !$newPassword || !$confirmPassword) {
            Response::error('Missing required fields', 'VALIDATION_ERROR', 400);
        }

        if ($newPassword !== $confirmPassword) {
            Response::error('New passwords do not match', 'VALIDATION_ERROR', 400);
        }

        if ($newPassword === $currentPassword) {
            Response::error('New password must be different from current password', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare('SELECT password_hash FROM users WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Response::error('User not found', 'NOT_FOUND', 404);
        }

        if (!password_verify($currentPassword, $user['password_hash'])) {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $this->pdo->prepare(
                "INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('login_failed', ?, ?, NOW())"
            )->execute([$userId, $ip]);
            Response::error('Incorrect current password', 'INCORRECT_CURRENT_PASSWORD', 400);
        }

        $pwdValidation = \TGA\CRM\Services\PasswordValidator::validate($newPassword);
        if (!$pwdValidation['valid']) {
            Response::error(implode(', ', $pwdValidation['errors']), 'VALIDATION_ERROR', 400);
        }

        $hash = password_hash($newPassword, PASSWORD_ARGON2ID, [
            'memory_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_MEMORY_COST', '19456'),
            'time_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_TIME_COST', '2'),
            'threads' => 1,
        ]);

        try {
            $this->pdo->beginTransaction();

            $updateStmt = $this->pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
            $updateStmt->execute([$hash, $userId]);

            // Revoke all OTHER sessions (keep current session active)
            $jtiHash = hash('sha256', $jti);
            $revokeStmt = $this->pdo->prepare(
                'UPDATE user_sessions SET revoked_at = NOW() 
                 WHERE user_id = ? AND jti_hash != ? AND revoked_at IS NULL'
            );
            $revokeStmt->execute([$userId, $jtiHash]);

            $this->pdo->commit();

            \TGA\CRM\Services\SecurityEventLogger::log('password_changed', $userId);

            \TGA\CRM\Services\ActivityLogger::log('user.password_changed', 'user', $userId);

            Response::json(['success' => true, 'message' => 'Password changed successfully']);

        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function toggle2FA(): void
    {
        $payload = AuthMiddleware::user();
        $userId = (int)$payload['sub'];

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $enable = isset($input['enable']) ? (bool)$input['enable'] : null;
        $password = (string)($input['password'] ?? '');

        if ($enable === null || $password === '') {
            Response::error('Missing enable boolean or password', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare('SELECT password_hash, two_factor_enabled FROM users WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Response::error('User not found', 'NOT_FOUND', 404);
        }

        if (!password_verify($password, $user['password_hash'])) {
            $ip = RateLimitMiddleware::getIpAddress();
            $this->pdo->prepare(
                "INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('2fa_toggle_failed', ?, ?, NOW())"
            )->execute([$userId, $ip]);
            Response::error('Incorrect password', 'INCORRECT_PASSWORD', 400);
        }

        $newStatus = $enable ? 1 : 0;
        
        if ((int)$user['two_factor_enabled'] === $newStatus) {
            Response::json(['success' => true, 'message' => '2FA is already in the requested state.']);
        }

        $updateStmt = $this->pdo->prepare('UPDATE users SET two_factor_enabled = ? WHERE id = ?');
        $updateStmt->execute([$newStatus, $userId]);

        $ip = RateLimitMiddleware::getIpAddress();
        $this->pdo->prepare(
            "INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES (?, ?, ?, NOW())"
        )->execute([$enable ? '2fa_enabled' : '2fa_disabled', $userId, $ip]);

        \TGA\CRM\Services\ActivityLogger::log($enable ? 'user.2fa_enabled' : 'user.2fa_disabled', 'user', $userId, $userId);

        Response::json(['success' => true, 'message' => $enable ? '2FA enabled successfully' : '2FA disabled successfully']);
    }
    private function fetchAuthUser(int $userId): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Response::error('User not found', 'NOT_FOUND', 404);
        }

        return $user;
    }

    private function buildUserResponse(array $user, array $permissions = []): array
    {
        $userType = (string) ($user['user_type'] ?? $user['utype'] ?? '');
        $fullName = $this->resolveFullName($userType, (int) $user['id']);
        [$firstName, $lastName] = $this->splitFullName($fullName);

        $isSuperAdmin = false;
        if ($userType === 'admin') {
            $admStmt = $this->pdo->prepare('SELECT is_super_admin FROM admins WHERE user_id = ? LIMIT 1');
            $admStmt->execute([(int) $user['id']]);
            $admRow = $admStmt->fetch(\PDO::FETCH_ASSOC);
            $isSuperAdmin = $admRow ? (int)($admRow['is_super_admin'] ?? 0) === 1 : false;
            // If is_super_admin is true in DB, ensure permissions reflect it
            if ($isSuperAdmin && !in_array('*', $permissions, true)) {
                $permissions = ['*'];
            }
        }

        return [
            'public_id' => (string) ($user['public_id'] ?? ''),
            'email' => $this->decryptMaybe($user['email'] ?? null),
            'phone' => $this->decryptMaybe($user['phone'] ?? null),
            'role' => $isSuperAdmin ? 'super_admin' : $userType,
            'user_type' => $userType,
            'utype' => $userType,
            'status' => (string) ($user['status'] ?? 'active'),
            'emailVerified' => !empty($user['email']),
            'phoneVerified' => !empty($user['phone']),
            'firstName' => $firstName,
            'lastName' => $lastName,
            'name' => $fullName,
            'permissions' => $permissions,
            'is_super_admin' => $isSuperAdmin,
            'account_status' => $this->resolveAccountStatus($userType, (int) $user['id'], (string) ($user['status'] ?? 'active')),
            'two_factor_enabled' => (bool) ($user['two_factor_enabled'] ?? false),
        ];
    }

    private function resolveFullName(string $userType, int $userId): string
    {
        $queryMap = [
            'student' => ['students', 'full_name'],
            'agent' => ['agents', 'full_name'],
            'admin' => ['admins', 'full_name'],
        ];

        if (!isset($queryMap[$userType])) {
            return '';
        }

        [$table, $column] = $queryMap[$userType];
        $stmt = $this->pdo->prepare(sprintf('SELECT %s FROM %s WHERE user_id = ? LIMIT 1', $column, $table));
        $stmt->execute([$userId]);
        $fullName = $stmt->fetchColumn();

        if (is_string($fullName) && trim($fullName) !== '') {
            return trim($fullName);
        }

        return '';
    }

    private function resolveAccountStatus(string $userType, int $userId, string $fallbackStatus): string
    {
        if ($userType !== 'agent') {
            return $fallbackStatus;
        }

        $stmt = $this->pdo->prepare('SELECT status FROM agents WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $status = $stmt->fetchColumn();

        return is_string($status) && $status !== '' ? $status : $fallbackStatus;
    }

    private function splitFullName(string $fullName): array
    {
        $trimmed = trim($fullName);
        if ($trimmed === '') {
            return ['', ''];
        }

        $parts = preg_split('/\s+/', $trimmed, 2) ?: [];
        $first = $parts[0] ?? '';
        $last = $parts[1] ?? '';

        return [$first, $last];
    }

    private function decryptMaybe(mixed $value): ?string
    {
        if (!is_string($value) || $value === '') {
            return null;
        }

        try {
            return \TGA\CRM\Services\EncryptionService::decrypt($value);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function setRefreshCookie(string $refreshToken, string $expiresAt): void
    {
        $expires = strtotime($expiresAt);
        if ($expires === false) {
            $expires = time() + 604800;
        }

        $secure = $this->isRequestSecure();
        $cookieOpts = [
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => $secure ? 'None' : 'Lax',
        ];

        // Clear any legacy cookie at the old SCRIPT_NAME-derived path
        $legacyPath = $this->resolveScriptBasePath();
        if ($legacyPath !== '/') {
            setcookie('refresh_token', '', ['expires' => time() - 3600, 'path' => $legacyPath] + $cookieOpts);
        }

        setcookie('refresh_token', $refreshToken, ['expires' => $expires, 'path' => '/'] + $cookieOpts);
    }

    private function clearRefreshCookie(): void
    {
        $secure = $this->isRequestSecure();
        $cookieOpts = [
            'expires' => time() - 3600,
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => $secure ? 'None' : 'Lax',
        ];

        setcookie('refresh_token', '', ['path' => '/'] + $cookieOpts);

        // Also clear any legacy cookie at the old path
        $legacyPath = $this->resolveScriptBasePath();
        if ($legacyPath !== '/') {
            setcookie('refresh_token', '', ['path' => $legacyPath] + $cookieOpts);
        }
    }

    private function isRequestSecure(): bool
    {
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    }

    private function resolveScriptBasePath(): string
    {
        $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/'));
        $basePath = str_replace('\\', '/', dirname($scriptName));

        if ($basePath === '' || $basePath === '.' || $basePath === '\\') {
            return '/';
        }

        return rtrim($basePath, '/');
    }

}
