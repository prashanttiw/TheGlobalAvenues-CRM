<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RoleMiddleware;
use TGA\CRM\Models\Agent;

final class AgentController extends BaseController
{
    private Agent $agents;

    public function __construct()
    {
        $this->agents = new Agent();
    }

    public function getDashboard(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['agent', 'sub_agent']);

        $dashboard = $this->agents->dashboardForUser((int) $user['sub'], (string) $user['role']);

        if ($dashboard === null) {
            Response::error('Agent profile not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('Agent dashboard fetched successfully', $dashboard);
    }

    public function getProfile(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['agent', 'sub_agent']);

        $profile = $this->agents->profileForUser((int) $user['sub'], (string) $user['role']);

        if ($profile === null) {
            Response::error('Agent profile not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('Agent profile fetched successfully', [
            'profile' => $profile,
        ]);
    }

    public function updateProfile(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['agent']);

        $profile = $this->agents->updateProfile((int) $user['sub'], $this->getJsonInput());

        Response::success('Agent profile updated successfully', [
            'profile' => $profile,
        ]);
    }

    public function submitLead(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['agent', 'sub_agent']);

        $input = $this->getJsonInput();
        $lead = $this->agents->createLead((int) $user['sub'], (string) $user['role'], $input);

        Response::success('Lead submitted successfully', [
            'lead' => $lead,
        ], status: 201);
    }

    public function getLeads(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['agent', 'sub_agent']);

        Response::success('Leads fetched successfully', [
            'leads' => $this->agents->listLeads((int) $user['sub'], (string) $user['role'], (string) $this->getQueryParam('status', '')),
        ]);
    }

    public function updateLead(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['agent', 'sub_agent']);

        $input = $this->getJsonInput();
        $leadId = (int) ($input['lead_id'] ?? 0);
        $status = (string) ($input['status'] ?? '');

        if ($leadId <= 0 || $status === '') {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                'lead_id' => 'Lead id is required.',
                'status' => 'Lead status is required.',
            ]);
        }

        Response::success('Lead updated successfully', [
            'lead' => $this->agents->updateLead((int) $user['sub'], (string) $user['role'], $leadId, $input),
        ]);
    }

    public function getApplications(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['agent', 'sub_agent']);

        Response::success('Applications fetched successfully', [
            'applications' => $this->agents->listApplications((int) $user['sub'], (string) $user['role']),
        ]);
    }

    public function getCommissions(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['agent']);

        Response::success('Commissions fetched successfully', [
            'commissions' => $this->agents->listCommissions((int) $user['sub']),
        ]);
    }

    public function getResources(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['agent', 'sub_agent']);

        Response::success('Resources fetched successfully', [
            'resources' => $this->agents->listResources((string) $user['role']),
        ]);
    }

    public function getSubAgents(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['agent']);

        Response::success('Sub-agents fetched successfully', [
            'subAgents' => $this->agents->listSubAgents((int) $user['sub']),
        ]);
    }

    public function claimCommission(): void
    {
        Response::error('Commission claim flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    public function getCommissionStatement(): void
    {
        Response::error('Commission statement flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    public function downloadResource(): void
    {
        Response::error('Resource download flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    public function addSubAgent(): void
    {
        Response::error('Sub-agent invite flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    public function updateSubAgent(): void
    {
        Response::error('Sub-agent update flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    public function removeSubAgent(): void
    {
        Response::error('Sub-agent removal flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }
}
