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

        $requireStudent = function (callable $handler) {
            return function (...$args) use ($handler) {
                \TGA\CRM\Middleware\AuthMiddleware::requireRole('student');
                return $handler(...$args);
            };
        };

        RouteRegistry::get('student', 'applications', $requireStudent([$controller, 'listApplications']));
        RouteRegistry::get('student', 'applications/:pid', $requireStudent([$controller, 'getApplication']));
        RouteRegistry::get('student', 'profile', $requireStudent([$controller, 'getProfile']));
        RouteRegistry::get('student', 'dashboard', $requireStudent([$controller, 'getDashboard']));
        
        $appController = new \TGA\CRM\Controllers\ApplicationController();
        RouteRegistry::put('student', 'applications/:pid/withdraw', $requireStudent([$appController, 'withdraw']));
        RouteRegistry::put('student', 'applications/:pid/submit', $requireStudent([$appController, 'studentSubmit']));

        $timelineController = new \TGA\CRM\Controllers\TimelineController();
        RouteRegistry::get('student', 'applications/:pid/timeline', $requireStudent([$timelineController, 'studentList']));

        $docController = new \TGA\CRM\Controllers\DocumentRequestController();
        RouteRegistry::get('student', 'document-requests', $requireStudent([$docController, 'studentList']));
        RouteRegistry::post('student', 'document-requests/:pid/submit', $requireStudent([$docController, 'studentSubmit']));

        $paymentController = new \TGA\CRM\Controllers\PaymentTrackingController();
        RouteRegistry::put('student', 'payments/:pid/mark-paid', $requireStudent([$paymentController, 'studentSubmit']));

        $academicCtrl = new \TGA\CRM\Controllers\StudentAcademicController();
        RouteRegistry::get('student', 'academic-profile', $requireStudent([$academicCtrl, 'getProfile']));
        RouteRegistry::post('student', 'academic-profile/academics', $requireStudent([$academicCtrl, 'addAcademic']));
        RouteRegistry::delete('student', 'academic-profile/academics/:pid', $requireStudent([$academicCtrl, 'deleteAcademic']));
        RouteRegistry::post('student', 'academic-profile/test-scores', $requireStudent([$academicCtrl, 'addTestScore']));
        RouteRegistry::delete('student', 'academic-profile/test-scores/:pid', $requireStudent([$academicCtrl, 'deleteTestScore']));

        RouteRegistry::post('student', 'agent/reassignment-request', $requireStudent([$reassignController, 'studentRequest']));
        RouteRegistry::get('student', 'agent', $requireStudent([$reassignController, 'studentViewAgent']));

        // ── Activity Logs ────────────────────────────────────────────────────
        // ── Dashboard / Activity Logs ───────────────────────────────────────
        RouteRegistry::get('student', 'activity-logs', $requireStudent([$logs, 'studentList']));
        
        $feedCtrl = new \TGA\CRM\Controllers\ActivityFeedController();
        RouteRegistry::get('student', 'dashboard/activity-feed', $requireStudent([$feedCtrl, 'getFeed']));

        // ── Notices ──────────────────────────────────────────────────────────
        RouteRegistry::get('student', 'notices/feed', $requireStudent([$notices, 'studentFeed']));

        // ── Internal Notes ───────────────────────────────────────────────────
        $notesCtrl = new InternalNotesController();
        RouteRegistry::get('student', ':moduleName/:recordId/notes', $requireStudent([$notesCtrl, 'list']));
        RouteRegistry::post('student', ':moduleName/:recordId/notes', $requireStudent([$notesCtrl, 'create']));
    }
}

