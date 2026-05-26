<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RoleMiddleware;
use TGA\CRM\Models\Application;

final class ApplicationController extends BaseController
{
    private Application $applications;

    public function __construct()
    {
        $this->applications = new Application();
    }

    public function create(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['student', 'agent', 'sub_agent', 'admin', 'super_admin']);

        $input = $this->getJsonInput();
        $errors = [];

        foreach (['program_id', 'university_id', 'intake_month', 'intake_year'] as $field) {
            if (($input[$field] ?? null) === null) {
                $errors[$field] = 'This field is required.';
            }
        }

        $studentUserId = in_array($user['role'], ['admin', 'super_admin', 'agent', 'sub_agent'], true)
            ? (int) ($input['student_user_id'] ?? 0)
            : (int) $user['sub'];

        if ($studentUserId <= 0) {
            $errors['student_user_id'] = 'A valid student user id is required.';
        }

        if ($errors !== []) {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, $errors);
        }

        if (!$this->applications->programExists((int) $input['program_id'])) {
            Response::error('Program not found', 'RESOURCE_NOT_FOUND', 404, [
                'program_id' => 'Program not found.',
            ]);
        }

        if (!$this->applications->universityExists((int) $input['university_id'])) {
            Response::error('University not found', 'RESOURCE_NOT_FOUND', 404, [
                'university_id' => 'University not found.',
            ]);
        }

        $application = $this->applications->create([
            'student_user_id' => $studentUserId,
            'program_id' => (int) $input['program_id'],
            'university_id' => (int) $input['university_id'],
            'intake_month' => (int) $input['intake_month'],
            'intake_year' => (int) $input['intake_year'],
            'source' => (string) ($input['source'] ?? 'direct'),
            'created_by' => (int) $user['sub'],
            'creator_role' => (string) $user['role'],
        ]);

        Response::success('Application submitted successfully', [
            'application' => $application,
        ], status: 201);
    }

    public function getDetail(): void
    {
        $user = AuthMiddleware::user();
        $applicationId = (int) $this->getQueryParam('id', 0);

        if ($applicationId <= 0) {
            Response::error('Application id is required', 'VALIDATION_FAILED', 422, [
                'id' => 'Application id is required.',
            ]);
        }

        $application = $this->applications->findDetail($applicationId);

        if ($application === null) {
            Response::error('Application not found', 'RESOURCE_NOT_FOUND', 404);
        }

        $this->applications->assertAccess($application, $user);

        Response::success('Application fetched successfully', [
            'application' => $application,
        ]);
    }

    public function getStatusHistory(): void
    {
        $user = AuthMiddleware::user();
        $applicationId = (int) $this->getQueryParam('id', 0);
        $application = $this->applications->findDetail($applicationId);

        if ($application === null) {
            Response::error('Application not found', 'RESOURCE_NOT_FOUND', 404);
        }

        $this->applications->assertAccess($application, $user);

        Response::success('Status history fetched successfully', [
            'history' => $this->applications->statusHistory($applicationId),
        ]);
    }

    public function updateStatus(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['counsellor', 'visa_officer', 'admin', 'super_admin']);

        $input = $this->getJsonInput();
        $applicationId = (int) ($input['application_id'] ?? 0);
        $newStatus = (string) ($input['new_status'] ?? '');

        if ($applicationId <= 0 || $newStatus === '') {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                'application_id' => 'Application id is required.',
                'new_status' => 'New status is required.',
            ]);
        }

        $updated = $this->applications->updateStatus(
            applicationId: $applicationId,
            newStatus: $newStatus,
            changedBy: (int) $user['sub'],
            note: (string) ($input['note'] ?? '')
        );

        Response::success('Application status updated successfully', [
            'application' => $updated,
        ]);
    }

    public function getDocuments(): void
    {
        $user = AuthMiddleware::user();
        $applicationId = (int) $this->getQueryParam('id', 0);
        $application = $this->applications->findDetail($applicationId);

        if ($application === null) {
            Response::error('Application not found', 'RESOURCE_NOT_FOUND', 404);
        }

        $this->applications->assertAccess($application, $user);

        Response::success('Documents fetched successfully', [
            'documents' => $this->applications->documents($applicationId),
        ]);
    }

    public function uploadDocument(): void
    {
        Response::error('Document upload service is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    public function deleteDocument(): void
    {
        Response::error('Document deletion flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    public function addNote(): void
    {
        Response::error('Application notes flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }

    public function getNotes(): void
    {
        Response::error('Application notes flow is scaffolded but not yet implemented', 'NOT_IMPLEMENTED', 501);
    }
}
