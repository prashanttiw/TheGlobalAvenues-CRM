<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\AdminController;

final class AdminRoutes
{
    public static function register(): void
    {
        $controller = new AdminController();

        RouteRegistry::add('GET', 'admin', 'get_dashboard_stats', [$controller, 'getDashboardStats']);
        RouteRegistry::add('GET', 'admin', 'get_pipeline', [$controller, 'getPipeline']);
        RouteRegistry::add('GET', 'admin', 'get_application_detail', [$controller, 'getApplicationDetail']);
        RouteRegistry::add('PUT', 'admin', 'update_application', [$controller, 'updateApplication']);
        RouteRegistry::add('GET', 'admin', 'get_document_queue', [$controller, 'getDocumentQueue']);
        RouteRegistry::add('PUT', 'admin', 'review_document', [$controller, 'reviewDocument']);
        RouteRegistry::add('GET', 'admin', 'get_users', [$controller, 'getUsers']);
        RouteRegistry::add('GET', 'admin', 'get_user_detail', [$controller, 'getUserDetail']);
        RouteRegistry::add('PUT', 'admin', 'update_user', [$controller, 'updateUser']);
        RouteRegistry::add('GET', 'admin', 'get_agents', [$controller, 'getAgents']);
        RouteRegistry::add('POST', 'admin', 'approve_agent', [$controller, 'approveAgent']);
        RouteRegistry::add('GET', 'admin', 'get_universities', [$controller, 'getUniversities']);
        RouteRegistry::add('POST', 'admin', 'create_university', [$controller, 'createUniversity']);
        RouteRegistry::add('PUT', 'admin', 'update_university', [$controller, 'updateUniversity']);
        RouteRegistry::add('DELETE', 'admin', 'delete_university', [$controller, 'deleteUniversity']);
        RouteRegistry::add('GET', 'admin', 'get_programs', [$controller, 'getPrograms']);
        RouteRegistry::add('POST', 'admin', 'create_program', [$controller, 'createProgram']);
        RouteRegistry::add('PUT', 'admin', 'update_program', [$controller, 'updateProgram']);
        RouteRegistry::add('DELETE', 'admin', 'delete_program', [$controller, 'deleteProgram']);
        RouteRegistry::add('GET', 'admin', 'get_audit_log', [$controller, 'getAuditLog']);
    }
}
