<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\AgentController;
use TGA\CRM\Controllers\SubAgentController;
use TGA\CRM\Controllers\ReassignmentController;
use TGA\CRM\Controllers\ActivityLogController;
use TGA\CRM\Controllers\NoticeController;
use TGA\CRM\Controllers\SearchController;
use TGA\CRM\Controllers\InternalNotesController;

final class AgentRoutes
{
    public static function register(): void
    {
        $agent       = new AgentController();
        $subAgent    = new SubAgentController();
        $reassign    = new ReassignmentController();
        $logs        = new ActivityLogController();
        $notices     = new NoticeController();
        $search      = new SearchController();

        // ── Sub-agent invite (existing) ──────────────────────────────────────
        RouteRegistry::post('agent', 'sub-agents/invite', [$subAgent, 'invite']);

        // ── Dashboard ────────────────────────────────────────────────────────
        RouteRegistry::get('agent', 'dashboard/summary', [$agent, 'dashboardSummary']);
        
        $feedCtrl = new \TGA\CRM\Controllers\ActivityFeedController();
        RouteRegistry::get('agent', 'dashboard/activity-feed', [$feedCtrl, 'getFeed']);

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
        RouteRegistry::get('agent', 'referral-links', [$agent, 'getReferralLinks']);

        // ── Legacy application routes ────────────────────────────────────────
        RouteRegistry::get('agent', 'applications',      [$agent, 'listApplications']);
        RouteRegistry::get('agent', 'applications/:pid', [$agent, 'getApplication']);

        // ── Activity Logs ────────────────────────────────────────────────────
        RouteRegistry::get('agent', 'activity-logs', [$logs, 'agentList']);

        // ── Notices ──────────────────────────────────────────────────────────
        RouteRegistry::get('agent', 'notices/feed', [$notices, 'agentFeed']);

        // ── Global Search ────────────────────────────────────────────────────
        RouteRegistry::get('agent', 'search',       [$search, 'search']);

        // ── Internal Notes ───────────────────────────────────────────────────
        $notes = new InternalNotesController();
        RouteRegistry::get('agent', ':moduleName/:recordId/notes', [$notes, 'list']);
        RouteRegistry::post('agent', ':moduleName/:recordId/notes', [$notes, 'create']);
        RouteRegistry::put('agent', 'notes/:pid',                  [$notes, 'update']);
        RouteRegistry::delete('agent', 'notes/:pid',               [$notes, 'delete']);
    }
}
