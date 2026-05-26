<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\AgentController;

final class AgentRoutes
{
    public static function register(): void
    {
        $controller = new AgentController();

        RouteRegistry::add('GET', 'agent', 'get_dashboard', [$controller, 'getDashboard']);
        RouteRegistry::add('GET', 'agent', 'get_profile', [$controller, 'getProfile']);
        RouteRegistry::add('PUT', 'agent', 'update_profile', [$controller, 'updateProfile']);
        RouteRegistry::add('POST', 'agent', 'submit_lead', [$controller, 'submitLead']);
        RouteRegistry::add('GET', 'agent', 'get_leads', [$controller, 'getLeads']);
        RouteRegistry::add('PUT', 'agent', 'update_lead', [$controller, 'updateLead']);
        RouteRegistry::add('GET', 'agent', 'get_applications', [$controller, 'getApplications']);
        RouteRegistry::add('GET', 'agent', 'get_commissions', [$controller, 'getCommissions']);
        RouteRegistry::add('POST', 'agent', 'claim_commission', [$controller, 'claimCommission']);
        RouteRegistry::add('GET', 'agent', 'get_commission_statement', [$controller, 'getCommissionStatement']);
        RouteRegistry::add('GET', 'agent', 'get_resources', [$controller, 'getResources']);
        RouteRegistry::add('GET', 'agent', 'download_resource', [$controller, 'downloadResource']);
        RouteRegistry::add('GET', 'agent', 'get_sub_agents', [$controller, 'getSubAgents']);
        RouteRegistry::add('POST', 'agent', 'add_sub_agent', [$controller, 'addSubAgent']);
        RouteRegistry::add('PUT', 'agent', 'update_sub_agent', [$controller, 'updateSubAgent']);
        RouteRegistry::add('DELETE', 'agent', 'remove_sub_agent', [$controller, 'removeSubAgent']);
    }
}
