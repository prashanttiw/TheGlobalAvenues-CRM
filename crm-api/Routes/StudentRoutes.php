<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\StudentController;
use TGA\CRM\Controllers\ReassignmentController;
use TGA\CRM\Controllers\ActivityLogController;
use TGA\CRM\Controllers\NoticeController;
use TGA\CRM\Controllers\InternalNotesController;

final class StudentRoutes
{
    public static function register(): void
    {
        $controller = new StudentController();
        $reassignController = new ReassignmentController();
        $logs = new ActivityLogController();
        $notices = new NoticeController();

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

        $academicCtrl = new \TGA\CRM\Controllers\StudentAcademicController();
        RouteRegistry::get('student', 'academic-profile', [$academicCtrl, 'getProfile']);
        RouteRegistry::post('student', 'academic-profile/academics', [$academicCtrl, 'addAcademic']);
        RouteRegistry::delete('student', 'academic-profile/academics/:pid', [$academicCtrl, 'deleteAcademic']);
        RouteRegistry::post('student', 'academic-profile/test-scores', [$academicCtrl, 'addTestScore']);
        RouteRegistry::delete('student', 'academic-profile/test-scores/:pid', [$academicCtrl, 'deleteTestScore']);

        RouteRegistry::post('student', 'agent/reassignment-request', [$reassignController, 'studentRequest']);
        RouteRegistry::get('student', 'agent', [$reassignController, 'studentViewAgent']);

        // ── Activity Logs ────────────────────────────────────────────────────
        // ── Dashboard / Activity Logs ───────────────────────────────────────
        RouteRegistry::get('student', 'activity-logs', [$logs, 'studentList']);
        
        $feedCtrl = new \TGA\CRM\Controllers\ActivityFeedController();
        RouteRegistry::get('student', 'dashboard/activity-feed', [$feedCtrl, 'getFeed']);

        // ── Notices ──────────────────────────────────────────────────────────
        RouteRegistry::get('student', 'notices/feed', [$notices, 'studentFeed']);

        // ── Internal Notes ───────────────────────────────────────────────────
        $notesCtrl = new InternalNotesController();
        RouteRegistry::get('student', ':moduleName/:recordId/notes', [$notesCtrl, 'list']);
        RouteRegistry::post('student', ':moduleName/:recordId/notes', [$notesCtrl, 'create']);
    }
}

