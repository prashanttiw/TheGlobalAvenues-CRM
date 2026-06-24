<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\RegistrationController;

final class RegistrationRoutes
{
    public static function register(): void
    {
        $controller = new RegistrationController();

        RouteRegistry::post('auth', 'register/student/validate-agent-code', [$controller, 'validateAgentCode']);
        RouteRegistry::post('auth', 'register/student/initiate', [$controller, 'initiateStudent']);
        RouteRegistry::post('auth', 'register/student/verify-otp', [$controller, 'verifyStudentOtp']);

        RouteRegistry::post('auth', 'register/agent/initiate', [$controller, 'initiateAgent']);
        RouteRegistry::post('auth', 'register/agent/verify-otp', [$controller, 'verifyAgentOtp']);
        
        RouteRegistry::post('auth', 'register/admin', [$controller, 'registerAdmin']);
    }
}
