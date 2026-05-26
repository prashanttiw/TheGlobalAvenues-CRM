<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\ApplicationController;

final class ApplicationRoutes
{
    public static function register(): void
    {
        $controller = new ApplicationController();

        RouteRegistry::add('POST', 'application', 'create', [$controller, 'create']);
        RouteRegistry::add('GET', 'application', 'get_detail', [$controller, 'getDetail']);
        RouteRegistry::add('GET', 'application', 'get_status_history', [$controller, 'getStatusHistory']);
        RouteRegistry::add('PUT', 'application', 'update_status', [$controller, 'updateStatus']);
        RouteRegistry::add('POST', 'application', 'upload_document', [$controller, 'uploadDocument']);
        RouteRegistry::add('GET', 'application', 'get_documents', [$controller, 'getDocuments']);
        RouteRegistry::add('DELETE', 'application', 'delete_document', [$controller, 'deleteDocument']);
        RouteRegistry::add('POST', 'application', 'add_note', [$controller, 'addNote']);
        RouteRegistry::add('GET', 'application', 'get_notes', [$controller, 'getNotes']);
    }
}
