<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use TGA\CRM\Config\Constants;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RoleMiddleware;
use TGA\CRM\Models\Admin;

final class AdminController extends BaseController
{
    private Admin $admin;

    public function __construct()
    {
        $this->admin = new Admin();
    }

    public function getDashboardStats(): void
    {
        $user = $this->internalUser();

        Response::success('Admin dashboard fetched successfully', [
            'stats' => $this->admin->dashboardStats((string) $user['role']),
        ]);
    }

    public function getPipeline(): void
    {
        $this->internalUser();
        $result = $this->admin->pipeline($_GET);

        Response::success('Pipeline fetched successfully', [
            'applications' => $result['items'],
        ], $result['meta']);
    }

    public function getApplicationDetail(): void
    {
        $this->internalUser();
        $applicationId = (int) $this->getQueryParam('id', 0);

        if ($applicationId <= 0) {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                'id' => 'Application id is required.',
            ]);
        }

        $detail = $this->admin->applicationDetail($applicationId);

        if ($detail === null) {
            Response::error('Application not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('Application detail fetched successfully', [
            'application' => $detail,
        ]);
    }

    public function updateApplication(): void
    {
        $user = $this->internalUser();
        $input = $this->getJsonInput();
        $applicationId = (int) ($input['application_id'] ?? 0);

        if ($applicationId <= 0) {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                'application_id' => 'Application id is required.',
            ]);
        }

        try {
            $updated = $this->admin->updateApplication($applicationId, $input, $user);
        } catch (\RuntimeException $exception) {
            Response::error($exception->getMessage(), 'VALIDATION_FAILED', 422);
        }

        if ($updated === null) {
            Response::error('Application not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('Application updated successfully', [
            'application' => $updated,
        ]);
    }

    public function getDocumentQueue(): void
    {
        $this->internalUser();
        $result = $this->admin->documentQueue($_GET);

        Response::success('Document queue fetched successfully', [
            'documents' => $result['items'],
        ], $result['meta']);
    }

    public function reviewDocument(): void
    {
        $user = $this->internalUser();
        RoleMiddleware::enforce($user, Constants::DOCUMENT_REVIEW_ROLES);

        $input = $this->getJsonInput();
        $documentId = (int) ($input['document_id'] ?? 0);
        $decision = (string) ($input['decision'] ?? '');

        if ($documentId <= 0 || $decision === '') {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                'document_id' => 'Document id is required.',
                'decision' => 'Decision is required.',
            ]);
        }

        try {
            $document = $this->admin->reviewDocument($documentId, $decision, trim((string) ($input['reason'] ?? '')), $user);
        } catch (\RuntimeException $exception) {
            Response::error($exception->getMessage(), 'VALIDATION_FAILED', 422);
        }

        if ($document === null) {
            Response::error('Document not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('Document reviewed successfully', [
            'document' => $document,
        ]);
    }

    public function getUsers(): void
    {
        $this->internalUser();
        $result = $this->admin->users($_GET);

        Response::success('Users fetched successfully', [
            'users' => $result['items'],
        ], $result['meta']);
    }

    public function getUserDetail(): void
    {
        $this->internalUser();
        $userId = (int) $this->getQueryParam('id', 0);

        if ($userId <= 0) {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                'id' => 'User id is required.',
            ]);
        }

        $detail = $this->admin->userDetail($userId);

        if ($detail === null) {
            Response::error('User not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('User detail fetched successfully', [
            'user' => $detail,
        ]);
    }

    public function updateUser(): void
    {
        $user = $this->internalUser();
        RoleMiddleware::enforce($user, ['admin', 'super_admin']);

        $input = $this->getJsonInput();
        $userId = (int) ($input['user_id'] ?? 0);

        if ($userId <= 0) {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                'user_id' => 'User id is required.',
            ]);
        }

        try {
            $updated = $this->admin->updateUser($userId, $input, $user);
        } catch (\RuntimeException $exception) {
            Response::error($exception->getMessage(), 'VALIDATION_FAILED', 422);
        }

        if ($updated === null) {
            Response::error('User not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('User updated successfully', [
            'user' => $updated,
        ]);
    }

    public function getAgents(): void
    {
        $this->internalUser();
        $result = $this->admin->agents($_GET);

        Response::success('Agents fetched successfully', [
            'agents' => $result['items'],
        ], $result['meta']);
    }

    public function approveAgent(): void
    {
        $user = $this->internalUser();
        RoleMiddleware::enforce($user, ['admin', 'super_admin']);

        $input = $this->getJsonInput();
        $agentId = (int) ($input['agent_id'] ?? 0);
        $decision = (string) ($input['decision'] ?? '');

        if ($agentId <= 0 || $decision === '') {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                'agent_id' => 'Agent id is required.',
                'decision' => 'Decision is required.',
            ]);
        }

        try {
            $agent = $this->admin->approveAgent($agentId, $decision, trim((string) ($input['note'] ?? '')), $user);
        } catch (\RuntimeException $exception) {
            Response::error($exception->getMessage(), 'VALIDATION_FAILED', 422);
        }

        if ($agent === null) {
            Response::error('Agent not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('Agent review completed successfully', [
            'agent' => $agent,
        ]);
    }

    public function getUniversities(): void
    {
        $this->internalUser();
        $result = $this->admin->universities($_GET);

        Response::success('Universities fetched successfully', [
            'universities' => $result['items'],
        ], $result['meta']);
    }

    public function createUniversity(): void
    {
        $user = $this->internalUser();
        RoleMiddleware::enforce($user, ['admin', 'super_admin']);

        $input = $this->getJsonInput();
        $errors = [];

        if (trim((string) ($input['name'] ?? '')) === '') {
            $errors['name'] = 'University name is required.';
        }

        if (trim((string) ($input['country'] ?? '')) === '') {
            $errors['country'] = 'Country is required.';
        }

        if ($errors !== []) {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, $errors);
        }

        $university = $this->admin->createUniversity($input, $user);

        Response::success('University created successfully', [
            'university' => $university,
        ], status: 201);
    }

    public function updateUniversity(): void
    {
        $user = $this->internalUser();

        if ((string) $user['role'] === 'counsellor') {
            Response::error('Counsellors have read-only catalog access', 'AUTH_INSUFFICIENT_ROLE', 403);
        }

        RoleMiddleware::enforce($user, ['admin', 'super_admin']);

        $input = $this->getJsonInput();
        $id = (int) ($input['id'] ?? 0);

        if ($id <= 0) {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                'id' => 'University id is required.',
            ]);
        }

        $university = $this->admin->updateUniversity($id, $input, $user);

        if ($university === null) {
            Response::error('University not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('University updated successfully', [
            'university' => $university,
        ]);
    }

    public function deleteUniversity(): void
    {
        $user = $this->internalUser();
        RoleMiddleware::enforce($user, ['admin', 'super_admin']);

        $id = (int) ($this->getQueryParam('id', 0) ?: $this->getQueryParam('university_id', 0));

        if ($id <= 0) {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                'id' => 'University id is required.',
            ]);
        }

        $university = $this->admin->disableUniversity($id, $user);

        if ($university === null) {
            Response::error('University not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('University disabled successfully', [
            'university' => $university,
        ]);
    }

    public function getPrograms(): void
    {
        $this->internalUser();
        $result = $this->admin->programs($_GET);

        Response::success('Programs fetched successfully', [
            'programs' => $result['items'],
        ], $result['meta']);
    }

    public function createProgram(): void
    {
        $user = $this->internalUser();
        RoleMiddleware::enforce($user, ['admin', 'super_admin']);

        $input = $this->getJsonInput();
        $errors = [];

        if ((int) ($input['university_id'] ?? 0) <= 0) {
            $errors['university_id'] = 'University id is required.';
        }

        if (trim((string) ($input['name'] ?? '')) === '') {
            $errors['name'] = 'Program name is required.';
        }

        if (trim((string) ($input['degree_level'] ?? '')) === '') {
            $errors['degree_level'] = 'Degree level is required.';
        }

        if ($errors !== []) {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, $errors);
        }

        try {
            $program = $this->admin->createProgram($input, $user);
        } catch (\RuntimeException $exception) {
            Response::error($exception->getMessage(), 'VALIDATION_FAILED', 422);
        }

        Response::success('Program created successfully', [
            'program' => $program,
        ], status: 201);
    }

    public function updateProgram(): void
    {
        $user = $this->internalUser();
        RoleMiddleware::enforce($user, ['admin', 'super_admin']);

        $input = $this->getJsonInput();
        $id = (int) ($input['id'] ?? 0);

        if ($id <= 0) {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                'id' => 'Program id is required.',
            ]);
        }

        try {
            $program = $this->admin->updateProgram($id, $input, $user);
        } catch (\RuntimeException $exception) {
            Response::error($exception->getMessage(), 'VALIDATION_FAILED', 422);
        }

        if ($program === null) {
            Response::error('Program not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('Program updated successfully', [
            'program' => $program,
        ]);
    }

    public function deleteProgram(): void
    {
        $user = $this->internalUser();
        RoleMiddleware::enforce($user, ['admin', 'super_admin']);

        $id = (int) ($this->getQueryParam('id', 0) ?: $this->getQueryParam('program_id', 0));

        if ($id <= 0) {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                'id' => 'Program id is required.',
            ]);
        }

        $program = $this->admin->disableProgram($id, $user);

        if ($program === null) {
            Response::error('Program not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('Program disabled successfully', [
            'program' => $program,
        ]);
    }

    public function getAuditLog(): void
    {
        $user = $this->internalUser();
        RoleMiddleware::enforce($user, ['admin', 'super_admin']);

        $result = $this->admin->auditLog($_GET);

        Response::success('Audit log fetched successfully', [
            'entries' => $result['items'],
        ], $result['meta']);
    }

    private function internalUser(): array
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, Constants::ADMIN_PANEL_ROLES);

        return $user;
    }
}
