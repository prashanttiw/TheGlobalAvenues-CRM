<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\StudentController;
use TGA\CRM\Controllers\ReassignmentController;

final class StudentRoutes
{
    public static function register(): void
    {
        $controller = new StudentController();
        $reassignController = new ReassignmentController();

        RouteRegistry::get('student', 'applications', [$controller, 'listApplications']);
        RouteRegistry::get('student', 'applications/:pid', [$controller, 'getApplication']);
        
        $appController = new \TGA\CRM\Controllers\ApplicationController();
        RouteRegistry::put('student', 'applications/:pid/withdraw', [$appController, 'withdraw']);
        RouteRegistry::put('student', 'applications/:pid/submit', [$appController, 'studentSubmit']);

        $timelineController = new \TGA\CRM\Controllers\TimelineController();
        RouteRegistry::get('student', 'applications/:pid/timeline', [$timelineController, 'studentList']);

        $docController = new \TGA\CRM\Controllers\DocumentRequestController();
        RouteRegistry::get('student', 'document-requests', [$docController, 'studentList']);
        RouteRegistry::post('student', 'document-requests/:pid/submit', [$docController, 'studentSubmit']);

        $paymentController = new \TGA\CRM\Controllers\PaymentTrackingController();
        RouteRegistry::put('student', 'payments/:pid/mark-paid', [$paymentController, 'studentSubmit']);

        RouteRegistry::post('student', 'agent/reassignment-request', [$reassignController, 'studentRequest']);
        RouteRegistry::get('student', 'agent', [$reassignController, 'studentViewAgent']);
    }
}

