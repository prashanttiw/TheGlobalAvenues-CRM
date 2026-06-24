<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\AdminAgentController;
use TGA\CRM\Controllers\RoleController;

final class AdminRoutes
{
    public static function register(): void
    {
        $agentController = new AdminAgentController();
        $roleController  = new RoleController();

        // ── Agent Approval Workflow ──────────────────────────────────────────────
        RouteRegistry::get('admin', 'agents/pending', [$agentController, 'getPending']);
        RouteRegistry::post('admin', 'agents/:publicId/approve', [$agentController, 'approve']);
        RouteRegistry::post('admin', 'agents/:publicId/reject', [$agentController, 'reject']);
        RouteRegistry::post('admin', 'agents/:publicId/suspend', [$agentController, 'suspend']);

        // ── Role Management ──────────────────────────────────────────────────────
        RouteRegistry::get('admin', 'roles', [$roleController, 'list']);
        RouteRegistry::post('admin', 'roles', [$roleController, 'create']);
        RouteRegistry::put('admin', 'roles/:publicId', [$roleController, 'update']);
        RouteRegistry::delete('admin', 'roles/:publicId', [$roleController, 'delete']);
    }
}

