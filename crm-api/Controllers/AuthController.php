<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use TGA\CRM\Config\Constants;
use TGA\CRM\Config\Environment;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\Sanitizer;
use TGA\CRM\Helpers\Validator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RateLimitMiddleware;
use TGA\CRM\Middleware\ValidationMiddleware;
use TGA\CRM\Models\User;
use TGA\CRM\Services\JWTService;

final class AuthController extends BaseController
{
    private User $users;

    public function __construct()
    {
        $this->users = new User();
    }

    public function ping(): void
    {
        Response::success('API is healthy', [
            'app' => Environment::get('APP_NAME', 'TGA CRM API'),
            'version' => Environment::get('APP_VERSION', '1.0.0'),
        ]);
    }

    public function register(): void
    {
        $input = $this->getJsonInput();
        $errors = Validator::validateRegistration($input);

        if (!in_array($input['role'] ?? '', ['student', 'agent'], true)) {
            $errors['role'] = 'Role must be student or agent.';
        }

        ValidationMiddleware::assertValid($errors);

        if ($this->users->findByEmail((string) $input['email']) !== null) {
            Response::error('Email address is already registered', 'VALIDATION_FAILED', 409, [
                'email' => 'Email address is already registered',
            ]);
        }

        $userId = $this->users->createUser([
            'email' => (string) Sanitizer::email($input['email'] ?? null),
            'phone' => (string) ($input['phone'] ?? ''),
            'password_hash' => password_hash((string) $input['password'], PASSWORD_BCRYPT, ['cost' => 12]),
            'role' => (string) $input['role'],
            'status' => 'pending',
        ]);

        if (($input['role'] ?? '') === 'student') {
            $this->users->createStudentProfile($userId, [
                'first_name' => (string) $input['first_name'],
                'last_name' => (string) $input['last_name'],
            ]);
        }

        if (($input['role'] ?? '') === 'agent') {
            $this->users->createAgentProfile($userId, [
                'agency_name' => (string) ($input['agency_name'] ?? trim(($input['first_name'] ?? '') . ' ' . ($input['last_name'] ?? ''))),
                'agency_country' => (string) ($input['agency_country'] ?? 'India'),
            ]);
        }

        $tokens = JWTService::issueTokenPair($userId, (string) $input['role']);
        $this->users->storeRefreshToken($userId, $tokens['refresh_token'], $tokens['refresh_expires_at']);
        $this->setAuthCookies($tokens['access_token'], $tokens['refresh_token']);

        Response::success('Registration successful', [
            'userId' => $userId,
            'role' => $input['role'],
            'accessToken' => $tokens['access_token'],
        ], status: 201);
    }

    public function login(): void
    {
        $input = $this->getJsonInput();
        ValidationMiddleware::assertValid(Validator::validateLogin($input));

        $identifier = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        RateLimitMiddleware::assertAllowed(
            identifier: $identifier,
            action: 'auth_login',
            maxRequests: (int) Environment::get('RATE_LIMIT_AUTH_REQUESTS', '5'),
            windowSeconds: (int) Environment::get('RATE_LIMIT_AUTH_WINDOW', '60')
        );

        $user = $this->users->findByEmail((string) $input['email']);

        if ($user === null || !password_verify((string) $input['password'], (string) ($user['password_hash'] ?? ''))) {
            Response::error('Invalid email or password', Constants::AUTH_ERROR_CODES['invalid'], 401);
        }

        $this->users->updateLastLogin((int) $user['id'], (string) ($_SERVER['REMOTE_ADDR'] ?? ''));
        $tokens = JWTService::issueTokenPair((int) $user['id'], (string) $user['role']);
        $this->users->storeRefreshToken((int) $user['id'], $tokens['refresh_token'], $tokens['refresh_expires_at']);
        $this->setAuthCookies($tokens['access_token'], $tokens['refresh_token']);

        Response::success('Login successful', [
            'user' => $this->users->buildProfileSummary($user),
            'accessToken' => $tokens['access_token'],
        ]);
    }

    public function refreshToken(): void
    {
        $refreshToken = $_COOKIE['refresh_token'] ?? '';

        if (!is_string($refreshToken) || $refreshToken === '') {
            Response::error('Missing refresh token', Constants::AUTH_ERROR_CODES['invalid'], 401);
        }

        $tokenPair = $this->users->rotateRefreshToken($refreshToken);

        if ($tokenPair === null) {
            Response::error('Invalid refresh token', Constants::AUTH_ERROR_CODES['invalid'], 401);
        }

        $this->setAuthCookies($tokenPair['access_token'], $tokenPair['refresh_token']);

        Response::success('Token refreshed', [
            'accessToken' => $tokenPair['access_token'],
        ]);
    }

    public function logout(): void
    {
        $refreshToken = $_COOKIE['refresh_token'] ?? '';

        if (is_string($refreshToken) && $refreshToken !== '') {
            $this->users->revokeRefreshToken($refreshToken);
        }

        $this->clearAuthCookies();
        Response::success('Logout successful');
    }

    public function getMe(): void
    {
        $tokenUser = AuthMiddleware::user();
        $user = $this->users->findById((int) $tokenUser['sub']);

        if ($user === null) {
            Response::error('User not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('User fetched successfully', [
            'user' => $this->users->buildProfileSummary($user),
        ]);
    }

    public function verifyEmail(): void
    {
        Response::error('Email verification flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    public function resendOtp(): void
    {
        Response::error('OTP resend flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    public function forgotPassword(): void
    {
        Response::error('Forgot password flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    public function resetPassword(): void
    {
        Response::error('Reset password flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    public function changePassword(): void
    {
        Response::error('Change password flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    public function oauthCallback(): void
    {
        Response::error('OAuth callback flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    private function setAuthCookies(string $accessToken, string $refreshToken): void
    {
        $cookieOptions = [
            'expires' => time() + (int) Environment::get('JWT_ACCESS_EXPIRY', '900'),
            'path' => '/crm-api/',
            'secure' => Environment::get('APP_ENV', 'development') !== 'development',
            'httponly' => true,
            'samesite' => 'Strict',
        ];

        setcookie('access_token', $accessToken, $cookieOptions);

        $cookieOptions['expires'] = time() + (int) Environment::get('JWT_REFRESH_EXPIRY', '604800');
        setcookie('refresh_token', $refreshToken, $cookieOptions);
    }

    private function clearAuthCookies(): void
    {
        $expiredCookie = [
            'expires' => time() - 3600,
            'path' => '/crm-api/',
            'secure' => Environment::get('APP_ENV', 'development') !== 'development',
            'httponly' => true,
            'samesite' => 'Strict',
        ];

        setcookie('access_token', '', $expiredCookie);
        setcookie('refresh_token', '', $expiredCookie);
    }
}
