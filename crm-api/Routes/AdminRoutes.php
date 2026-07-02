<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\AdminAgentController;
use TGA\CRM\Controllers\AdminStudentController;
use TGA\CRM\Controllers\StudentCustomFieldController;
use TGA\CRM\Controllers\RoleController;
use TGA\CRM\Controllers\ReassignmentController;
use TGA\CRM\Controllers\CommissionController;
use TGA\CRM\Controllers\AdminDashboardController;
use TGA\CRM\Controllers\SystemSettingsController;
use TGA\CRM\Controllers\ActivityLogController;
use TGA\CRM\Controllers\NoticeController;
use TGA\CRM\Controllers\InternalNotesController;
use TGA\CRM\Controllers\LeadsController;
use TGA\CRM\Controllers\SearchController;
use TGA\CRM\Controllers\AdminReportsController;
use TGA\CRM\Controllers\ExportController;
use TGA\CRM\Controllers\SecurityEventController;

final class AdminRoutes
{
    public static function register(): void
    {
        $agentController = new AdminAgentController();
        $studentController = new AdminStudentController();
        $customFieldsCtrl = new StudentCustomFieldController();
        $roleController  = new RoleController();
        $reassignCtrl    = new ReassignmentController();
        $commCtrl        = new CommissionController();
        $dashCtrl        = new AdminDashboardController();
        $sysSettings     = new SystemSettingsController();
        $logs            = new ActivityLogController();
        $notices         = new NoticeController();
        $internalNotes   = new InternalNotesController();
        $leads           = new LeadsController();
        $search          = new SearchController();
        $securityEvents  = new SecurityEventController();
        $feedCtrl        = new \TGA\CRM\Controllers\ActivityFeedController();

        // ── Dashboard ────────────────────────────────────────────────────────
        RouteRegistry::get('admin', 'dashboard/summary', [$dashCtrl, 'summary']);
        RouteRegistry::get('admin', 'get_dashboard_stats', [$dashCtrl, 'summary']);
        RouteRegistry::get('admin', 'get_users', [$dashCtrl, 'getUsers']);
        RouteRegistry::get('admin', 'get_user_detail', [$dashCtrl, 'getUserDetail']);
        RouteRegistry::put('admin', 'update_user', [$dashCtrl, 'updateUser']);
        RouteRegistry::delete('admin', 'admins/:publicId', [$dashCtrl, 'deleteAdmin']);
        RouteRegistry::get('admin', 'available-pages', [$dashCtrl, 'availablePages']);
        
        $docControllerForAdmin = new \TGA\CRM\Controllers\DocumentRequestController();
        RouteRegistry::get('admin', 'get_document_queue', [$docControllerForAdmin, 'getDocumentQueue']);
        RouteRegistry::post('admin', 'review_document', [$docControllerForAdmin, 'adminReview']);
        
        RouteRegistry::get('admin', 'dashboard/activity-feed', [$feedCtrl, 'getFeed']);

        // ── Reports & Analytics ──────────────────────────────────────────────
        $reportsCtrl = new AdminReportsController();
        $exportCtrl  = new ExportController();
        
        RouteRegistry::get('admin', 'reports/overview',      [$reportsCtrl, 'overview']);
        RouteRegistry::get('admin', 'reports/funnel',        [$reportsCtrl, 'funnel']);
        RouteRegistry::get('admin', 'reports/agents',        [$reportsCtrl, 'agents']);
        RouteRegistry::get('admin', 'reports/universities',  [$reportsCtrl, 'universities']);
        RouteRegistry::get('admin', 'reports/lead-sources',  [$reportsCtrl, 'leadSources']);
        RouteRegistry::get('admin', 'reports/trends',        [$reportsCtrl, 'trends']);
        RouteRegistry::get('admin', 'reports/export',        [$exportCtrl, 'export']);

        // ── Agent Approval Workflow ──────────────────────────────────────────────
        RouteRegistry::get('admin', 'agents/pending', [$agentController, 'getPending']);
        RouteRegistry::get('admin', 'agents/registered', [$agentController, 'getRegistered']);
        RouteRegistry::get('admin', 'agents/drafts', [$agentController, 'getDrafts']);
        RouteRegistry::post('admin', 'agents/:publicId/approve', [$agentController, 'approve']);
        RouteRegistry::post('admin', 'agents/:publicId/reject', [$agentController, 'reject']);
        RouteRegistry::post('admin', 'agents/:publicId/suspend', [$agentController, 'suspend']);
        RouteRegistry::get('admin', 'agents', [$agentController, 'listAll']);
        RouteRegistry::get('admin', 'agents/:pid/tree', [$agentController, 'getTree']);
        RouteRegistry::get('admin', 'agents/:pid/detail', [$agentController, 'getDetail']);
        RouteRegistry::get('admin', 'students', [$studentController, 'listAll']);
        RouteRegistry::get('admin', 'students/:pid/readiness', [$studentController, 'adminGetReadiness']);
        RouteRegistry::get('admin', 'students/:pid/detail', [$studentController, 'adminGetDetail']);

        // ── Student Custom Fields (admin-defined data-collection fields) ────
        RouteRegistry::get('admin', 'student-custom-fields', [$customFieldsCtrl, 'adminListDefinitions']);
        RouteRegistry::post('admin', 'student-custom-fields', [$customFieldsCtrl, 'adminCreateDefinition']);
        RouteRegistry::post('admin', 'student-custom-fields/reorder', [$customFieldsCtrl, 'adminReorder']);
        RouteRegistry::put('admin', 'student-custom-fields/:pid', [$customFieldsCtrl, 'adminUpdateDefinition']);
        RouteRegistry::delete('admin', 'student-custom-fields/:pid', [$customFieldsCtrl, 'adminDeleteDefinition']);

        // ── Reassignment Requests ────────────────────────────────────────────
        RouteRegistry::get('admin', 'reassignment-requests',                   [$reassignCtrl, 'adminList']);
        RouteRegistry::get('admin', 'reassignment-requests/:pid',              [$reassignCtrl, 'adminGet']);
        RouteRegistry::put('admin', 'reassignment-requests/:pid/approve',      [$reassignCtrl, 'adminApprove']);
        RouteRegistry::put('admin', 'reassignment-requests/:pid/deny',         [$reassignCtrl, 'adminDeny']);
        RouteRegistry::get('admin', 'students/:pid/reassignment-history',      [$reassignCtrl, 'adminStudentHistory']);

        // ── Commissions ──────────────────────────────────────────────────────
        RouteRegistry::get('admin',    'commissions/summary',                 [$commCtrl, 'adminSummary']);
        RouteRegistry::get('admin',    'commissions',                         [$commCtrl, 'adminList']);
        RouteRegistry::put('admin',    'commissions/:pid',                    [$commCtrl, 'adminEdit']);
        RouteRegistry::put('admin',    'commissions/:pid/confirm',            [$commCtrl, 'adminConfirm']);
        RouteRegistry::put('admin',    'commissions/:pid/pay',                [$commCtrl, 'adminMarkPaid']);
        RouteRegistry::delete('admin', 'commissions/:pid',                    [$commCtrl, 'adminDelete']);

        // Application-scoped commission routes
        RouteRegistry::post('admin', 'applications/:pid/commissions',         [$commCtrl, 'adminCreate']);
        RouteRegistry::get('admin',  'applications/:pid/commissions',         [$commCtrl, 'adminListByApplication']);

        // ── Admin Management ──────────────────────────────────────────────────────
        RouteRegistry::get('admin', 'system-settings', [$sysSettings, 'index']);
        RouteRegistry::put('admin', 'system-settings', [$sysSettings, 'update']);
        RouteRegistry::get('admin', 'maintenance', [$sysSettings, 'getMaintenanceMode']);
        RouteRegistry::post('admin', 'maintenance/toggle', [$sysSettings, 'toggleMaintenanceMode']);

        // ── Activity Logs ────────────────────────────────────────────────────
        RouteRegistry::get('admin', 'activity-logs', [$logs, 'adminList']);
        RouteRegistry::get('admin', 'security-events', [$securityEvents, 'adminList']);

        // ── Notices ──────────────────────────────────────────────────────────
        RouteRegistry::get('admin',    'notices',            [$notices, 'adminList']);
        RouteRegistry::post('admin',   'notices',            [$notices, 'create']);
        RouteRegistry::get('admin',    'notices/feed',       [$notices, 'adminFeed']);
        RouteRegistry::get('admin',    'notices/:pid',       [$notices, 'adminGet']);
        RouteRegistry::put('admin',    'notices/:pid',       [$notices, 'update']);
        RouteRegistry::delete('admin', 'notices/:pid',       [$notices, 'delete']);
        RouteRegistry::put('admin',    'notices/:pid/publish', [$notices, 'publish']);
        RouteRegistry::post('admin',   'notices/:pid/attachment', [$notices, 'uploadAttachment']);

        // ── Internal Notes ───────────────────────────────────────────────────
        RouteRegistry::get('admin',    ':moduleName/:recordId/notes', [$internalNotes, 'list']);
        RouteRegistry::post('admin',   ':moduleName/:recordId/notes', [$internalNotes, 'create']);
        RouteRegistry::put('admin',    'notes/:pid',                  [$internalNotes, 'update']);
        RouteRegistry::delete('admin', 'notes/:pid',                  [$internalNotes, 'delete']);

        // ── Leads Pipeline ───────────────────────────────────────────────────
        RouteRegistry::get('admin',    'leads',                       [$leads, 'adminList']);
        RouteRegistry::post('admin',   'leads',                       [$leads, 'create']);
        RouteRegistry::get('admin',    'leads/:pid',                  [$leads, 'get']);
        RouteRegistry::put('admin',    'leads/:pid',                  [$leads, 'update']);
        RouteRegistry::delete('admin', 'leads/:pid',                  [$leads, 'delete']);
        RouteRegistry::put('admin',    'leads/:pid/status',           [$leads, 'updateStatus']);
        RouteRegistry::put('admin',    'leads/:pid/assign',           [$leads, 'assign']);
        RouteRegistry::post('admin',   'leads/:pid/convert',          [$leads, 'convertToStudent']);

        // ── Global Search ────────────────────────────────────────────────────
        RouteRegistry::get('admin',    'search',                      [$search, 'search']);

        // ── Role Management ──────────────────────────────────────────────────────
        RouteRegistry::get('admin', 'roles', [$roleController, 'list']);
        RouteRegistry::post('admin', 'roles', [$roleController, 'create']);
        RouteRegistry::put('admin', 'roles/:publicId', [$roleController, 'update']);
        RouteRegistry::delete('admin', 'roles/:publicId', [$roleController, 'delete']);
    }
}




