<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\RegistrationController;

final class RegistrationRoutes
{
    public static function register(): void
    {
        $controller = new RegistrationController();

        // Admin-only: create admin account (requires super_admin auth)
        RouteRegistry::post('auth', 'register/admin', [$controller, 'registerAdmin']);

        // Simplified 3-step registration: email → OTP → password only
        RouteRegistry::post('auth', 'register/send-otp', [$controller, 'sendRegistrationOtp']);
        RouteRegistry::post('auth', 'register/verify-otp', [$controller, 'verifyRegistrationOtp']);
        RouteRegistry::post('auth', 'register/complete-student', [$controller, 'completeStudentReg']);
        RouteRegistry::post('auth', 'register/complete-agent', [$controller, 'completeAgentReg']);
    }
}
