<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\UniversityController;
use TGA\CRM\Controllers\CourseController;
use TGA\CRM\Controllers\IntakeController;

final class UniversityRoutes
{
    public static function register(): void
    {
        $controller = new UniversityController();

        // Admin Endpoints
        RouteRegistry::get('admin', 'universities', [$controller, 'adminList']);
        RouteRegistry::post('admin', 'universities', [$controller, 'create']);
        RouteRegistry::get('admin', 'universities/:pid', [$controller, 'adminGet']);
        RouteRegistry::put('admin', 'universities/:pid', [$controller, 'update']);
        RouteRegistry::delete('admin', 'universities/:pid', [$controller, 'delete']);
        RouteRegistry::post('admin', 'universities/:pid/logo', [$controller, 'uploadLogo']);

        $courseController = new CourseController();
        RouteRegistry::get('admin', 'universities/:pid/courses', [$courseController, 'adminList']);
        RouteRegistry::post('admin', 'universities/:pid/courses', [$courseController, 'create']);
        RouteRegistry::get('admin', 'courses/:pid', [$courseController, 'adminGet']);
        RouteRegistry::put('admin', 'courses/:pid', [$courseController, 'update']);
        RouteRegistry::delete('admin', 'courses/:pid', [$courseController, 'delete']);

        $intakeController = new IntakeController();
        RouteRegistry::get('admin', 'courses/:pid/intakes', [$intakeController, 'adminList']);
        RouteRegistry::post('admin', 'courses/:pid/intakes', [$intakeController, 'create']);
        RouteRegistry::get('admin', 'intakes/:pid', [$intakeController, 'adminGet']);
        RouteRegistry::put('admin', 'intakes/:pid', [$intakeController, 'update']);
        RouteRegistry::delete('admin', 'intakes/:pid', [$intakeController, 'delete']);
        RouteRegistry::post('admin', 'intakes/:pid/clone', [$intakeController, 'cloneIntake']);
        RouteRegistry::put('admin', 'intakes/:pid/status', [$intakeController, 'updateStatus']);

        // Public Endpoints
        RouteRegistry::get('universities', 'ping', [$controller, 'publicList']);
        RouteRegistry::get('university', 'list', [$controller, 'publicList']);
        RouteRegistry::get('university', 'search', [$controller, 'search']);
        RouteRegistry::get('universities', ':pid', [$controller, 'publicGet']);
        RouteRegistry::get('universities', ':pid/courses', [$courseController, 'publicList']);
        RouteRegistry::get('courses', ':pid/intakes', [$intakeController, 'publicList']);
    }
}
