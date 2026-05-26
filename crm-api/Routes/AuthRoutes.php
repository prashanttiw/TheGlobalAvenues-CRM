<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\AuthController;

final class AuthRoutes
{
    public static function register(): void
    {
        $controller = new AuthController();

        RouteRegistry::add('POST', 'auth', 'register', [$controller, 'register']);
        RouteRegistry::add('POST', 'auth', 'verify_email', [$controller, 'verifyEmail']);
        RouteRegistry::add('POST', 'auth', 'resend_otp', [$controller, 'resendOtp']);
        RouteRegistry::add('POST', 'auth', 'login', [$controller, 'login']);
        RouteRegistry::add('POST', 'auth', 'oauth_callback', [$controller, 'oauthCallback']);
        RouteRegistry::add('POST', 'auth', 'refresh_token', [$controller, 'refreshToken']);
        RouteRegistry::add('POST', 'auth', 'logout', [$controller, 'logout']);
        RouteRegistry::add('POST', 'auth', 'forgot_password', [$controller, 'forgotPassword']);
        RouteRegistry::add('POST', 'auth', 'reset_password', [$controller, 'resetPassword']);
        RouteRegistry::add('PUT', 'auth', 'change_password', [$controller, 'changePassword']);
        RouteRegistry::add('GET', 'auth', 'get_me', [$controller, 'getMe']);
    }
}
