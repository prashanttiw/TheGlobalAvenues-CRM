<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\ApplicationController;
use TGA\CRM\Controllers\TimelineController;
use TGA\CRM\Controllers\DocumentRequestController;
use TGA\CRM\Controllers\PaymentTrackingController;

final class ApplicationRoutes
{
    public static function register(): void
    {
        $controller = new ApplicationController();
        $timelineController = new TimelineController();
        $docController = new DocumentRequestController();
        $paymentController = new PaymentTrackingController();

        // Agent Endpoints
        RouteRegistry::post('agent', 'applications', [$controller, 'createDraft']);
        RouteRegistry::get('agent', 'applications/:pid/timeline', [$timelineController, 'agentList']);
        RouteRegistry::post('agent', 'applications/:pid/timeline', [$timelineController, 'agentAddNote']);
        RouteRegistry::post('agent', 'document-requests/:pid/submit', [$docController, 'agentSubmit']);
        RouteRegistry::post('agent', 'payment-requests/:pid/submit', [$paymentController, 'agentSubmit']);
        RouteRegistry::put('agent', 'applications/:pid/withdraw', [$controller, 'agentWithdraw']);

        // Admin Endpoints
        RouteRegistry::get('admin', 'applications', [$controller, 'listApplications']);
        RouteRegistry::get('admin', 'applications/:pid', [$controller, 'getApplication']);
        RouteRegistry::post('admin', 'applications/:pid/status', [$controller, 'updateStatus']);
        RouteRegistry::put('admin', 'applications/:pid/withdraw', [$controller, 'adminWithdraw']);
        RouteRegistry::get('admin', 'applications/:pid/timeline', [$timelineController, 'adminList']);
        RouteRegistry::post('admin', 'applications/:pid/timeline', [$timelineController, 'adminAddNote']);
        RouteRegistry::delete('admin', 'applications/:pid/timeline/:notePid', [$timelineController, 'adminDeleteNote']);
        
        RouteRegistry::post('admin', 'applications/:pid/document-requests', [$docController, 'createForApplication']);
        RouteRegistry::get('admin', 'document-requests/:pid', [$docController, 'adminGet']);
        RouteRegistry::put('admin', 'document-requests/:pid/review', [$docController, 'adminReview']);
        RouteRegistry::put('admin', 'document-requests/:pid/cancel', [$docController, 'adminCancel']);

        RouteRegistry::post('admin', 'applications/:pid/payment-requests', [$paymentController, 'createRequest']);
        RouteRegistry::put('admin', 'payment-requests/:pid/verify', [$paymentController, 'adminVerify']);
        RouteRegistry::put('admin', 'payment-requests/:pid/resolve', [$paymentController, 'adminResolve']);
    }
}
