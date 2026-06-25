<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\AdminAgentController;
use TGA\CRM\Controllers\RoleController;
use TGA\CRM\Controllers\ReassignmentController;
use TGA\CRM\Controllers\CommissionController;
use TGA\CRM\Controllers\AdminDashboardController;

final class AdminRoutes
{
    public static function register(): void
    {
        $agentController = new AdminAgentController();
        $roleController  = new RoleController();
        $reassignCtrl    = new ReassignmentController();
        $commCtrl        = new CommissionController();
        $dashCtrl        = new AdminDashboardController();

        // ── Dashboard ────────────────────────────────────────────────────────
        RouteRegistry::get('admin', 'dashboard/summary', [$dashCtrl, 'summary']);

        // ── Agent Approval Workflow ──────────────────────────────────────────────
        RouteRegistry::get('admin', 'agents/pending', [$agentController, 'getPending']);
        RouteRegistry::post('admin', 'agents/:publicId/approve', [$agentController, 'approve']);
        RouteRegistry::post('admin', 'agents/:publicId/reject', [$agentController, 'reject']);
        RouteRegistry::post('admin', 'agents/:publicId/suspend', [$agentController, 'suspend']);
        RouteRegistry::get('admin', 'agents', [$agentController, 'listAll']);
        RouteRegistry::get('admin', 'agents/:pid/tree', [$agentController, 'getTree']);

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

        // ── Role Management ──────────────────────────────────────────────────────
        RouteRegistry::get('admin', 'roles', [$roleController, 'list']);
        RouteRegistry::post('admin', 'roles', [$roleController, 'create']);
        RouteRegistry::put('admin', 'roles/:publicId', [$roleController, 'update']);
        RouteRegistry::delete('admin', 'roles/:publicId', [$roleController, 'delete']);
    }
}



