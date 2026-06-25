<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\AgentController;
use TGA\CRM\Controllers\SubAgentController;
use TGA\CRM\Controllers\ReassignmentController;

final class AgentRoutes
{
    public static function register(): void
    {
        $agent       = new AgentController();
        $subAgent    = new SubAgentController();
        $reassign    = new ReassignmentController();

        // ── Sub-agent invite (existing) ──────────────────────────────────────
        RouteRegistry::post('agent', 'sub-agents/invite', [$subAgent, 'invite']);

        // ── Dashboard ────────────────────────────────────────────────────────
        RouteRegistry::get('agent', 'dashboard/summary', [$agent, 'dashboardSummary']);

        // ── Students ─────────────────────────────────────────────────────────
        RouteRegistry::get('agent', 'students',              [$agent, 'listStudents']);
        RouteRegistry::get('agent', 'students/:pid',         [$agent, 'getStudent']);

        // ── Team ─────────────────────────────────────────────────────────────
        RouteRegistry::get('agent', 'team',                            [$agent, 'listTeam']);
        RouteRegistry::get('agent', 'team/:pid/students',              [$agent, 'listSubAgentStudents']);
        RouteRegistry::get('agent', 'team/:pid/sub-agents',            [$agent, 'listSubAgentChildren']);

        // ── Commissions (own) ────────────────────────────────────────────────
        RouteRegistry::get('agent', 'commissions/summary', [$agent, 'commissionSummary']);
        RouteRegistry::get('agent', 'commissions',         [$agent, 'listCommissions']);

        // ── Profile ──────────────────────────────────────────────────────────
        RouteRegistry::get('agent', 'profile', [$agent, 'getProfile']);
        RouteRegistry::put('agent', 'profile', [$agent, 'updateProfile']);

        // ── Legacy application routes ────────────────────────────────────────
        RouteRegistry::get('agent', 'applications',      [$agent, 'listApplications']);
        RouteRegistry::get('agent', 'applications/:pid', [$agent, 'getApplication']);
    }
}
