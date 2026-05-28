<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\StudentController;

final class StudentRoutes
{
    public static function register(): void
    {
        $controller = new StudentController();

        RouteRegistry::add('GET', 'student', 'get_profile', [$controller, 'getProfile']);
        RouteRegistry::add('PUT', 'student', 'update_profile', [$controller, 'updateProfile']);
        RouteRegistry::add('GET', 'student', 'get_dashboard', [$controller, 'getDashboard']);
        RouteRegistry::add('GET', 'student', 'get_applications', [$controller, 'getApplications']);
        RouteRegistry::add('GET', 'student', 'get_notifications', [$controller, 'getNotifications']);
    }
}
