<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\AuthController;

final class AuthRoutes
{
    public static function register(): void
    {
        $controller = new AuthController();

        RouteRegistry::post('auth', 'login', [$controller, 'login']);
        RouteRegistry::post('auth', 'logout', [$controller, 'logout']);
        RouteRegistry::post('auth', 'refresh', [$controller, 'refresh']);
        
        RouteRegistry::post('auth', 'forgot-password', [$controller, 'resetPassword']);
        RouteRegistry::post('auth', 'forgot-password/verify-otp', [$controller, 'resetPasswordVerifyOtp']);
        RouteRegistry::post('auth', 'forgot-password/reset', [$controller, 'resetPasswordConfirm']);

        RouteRegistry::post('auth', 'otp-login/request', [$controller, 'requestOtpLogin']);
        RouteRegistry::post('auth', 'otp-login/verify', [$controller, 'verifyOtpLogin']);

        RouteRegistry::post('auth', 'change-password', [$controller, 'changePassword']);
        RouteRegistry::post('auth', '2fa/toggle', [$controller, 'toggle2FA']);
        RouteRegistry::post('auth', 'verify-2fa', [$controller, 'verify2fa']);
        RouteRegistry::post('auth', 'resend-2fa', [$controller, 'resend2fa']);

        RouteRegistry::get('auth', 'me', [$controller, 'me']);
        RouteRegistry::get('auth', 'sessions', [$controller, 'listSessions']);
        RouteRegistry::post('auth', 'sessions/revoke', [$controller, 'revokeSession']);
        
        // Internal 2FA verification during standard login if required
        RouteRegistry::post('auth', 'verify-otp', [$controller, 'verifyOtp']);
    }
}
