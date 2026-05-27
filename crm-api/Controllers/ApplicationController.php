<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RoleMiddleware;
use TGA\CRM\Models\Application;
use TGA\CRM\Services\FileUploadService;

final class ApplicationController extends BaseController
{
    private Application $applications;
    private FileUploadService $fileUploads;

    public function __construct()
    {
        $this->applications = new Application();
        $this->fileUploads = new FileUploadService();
    }

    public function create(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['student', 'agent', 'sub_agent', 'admin', 'super_admin']);

        $input = $this->getJsonInput();
        $errors = [];

        foreach (['program_id', 'intake_month', 'intake_year'] as $field) {
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

        $program = $this->applications->findProgramSnapshot((int) $input['program_id']);

        if ($program === null) {
            Response::error('Program not found', 'RESOURCE_NOT_FOUND', 404, [
                'program_id' => 'Program not found.',
            ]);
        }

        $resolvedUniversityId = (int) ($input['university_id'] ?? $program['university_id']);

        if ($resolvedUniversityId !== (int) $program['university_id']) {
            Response::error('University mismatch for selected program', 'VALIDATION_FAILED', 422, [
                'university_id' => 'Selected university does not match the program.',
            ]);
        }

        if (!$this->applications->universityExists($resolvedUniversityId)) {
            Response::error('University not found', 'RESOURCE_NOT_FOUND', 404, [
                'university_id' => 'University not found.',
            ]);
        }

        $application = $this->applications->create([
            'student_user_id' => $studentUserId,
            'program_id' => (int) $input['program_id'],
            'university_id' => $resolvedUniversityId,
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
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['student', 'agent', 'sub_agent', 'admin', 'super_admin', 'counsellor', 'visa_officer']);

        $input = $this->getFormInput();
        $applicationId = (int) ($input['application_id'] ?? 0);
        $documentType = (string) ($input['document_type'] ?? '');
        $file = $this->getUploadedFile('file');

        if ($applicationId <= 0 || $documentType === '' || $file === null) {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                'application_id' => 'Application id is required.',
                'document_type' => 'Document type is required.',
                'file' => 'A file upload is required.',
            ]);
        }

        $application = $this->applications->findDetail($applicationId);

        if ($application === null) {
            Response::error('Application not found', 'RESOURCE_NOT_FOUND', 404);
        }

        $this->applications->assertAccess($application, $user);

        $storedFile = null;

        try {
            $storedFile = $this->fileUploads->upload($file, $documentType, $applicationId);
            $document = $this->applications->createDocument($applicationId, (int) $user['sub'], $documentType, $storedFile);
        } catch (\RuntimeException $exception) {
            if (is_array($storedFile) && isset($storedFile['absolute_path'])) {
                try {
                    $this->fileUploads->delete((string) $storedFile['absolute_path']);
                } catch (\RuntimeException) {
                }
            }

            Response::error($exception->getMessage(), 'VALIDATION_FAILED', 422);
        }

        Response::success('Document uploaded successfully', [
            'document' => $document,
        ], status: 201);
    }

    public function deleteDocument(): void
    {
        $user = AuthMiddleware::user();
        RoleMiddleware::enforce($user, ['student', 'agent', 'sub_agent', 'admin', 'super_admin', 'counsellor', 'visa_officer']);

        $documentId = (int) ($this->getQueryParam('id', 0) ?: $this->getQueryParam('document_id', 0));

        if ($documentId <= 0) {
            Response::error('Document id is required', 'VALIDATION_FAILED', 422, [
                'id' => 'Document id is required.',
            ]);
        }

        $document = $this->applications->findDocument($documentId);

        if ($document === null) {
            Response::error('Document not found', 'RESOURCE_NOT_FOUND', 404);
        }

        $application = $this->applications->findDetail((int) $document['application_id']);

        if ($application === null) {
            Response::error('Application not found', 'RESOURCE_NOT_FOUND', 404);
        }

        $this->applications->assertAccess($application, $user);

        $status = (string) $document['status'];
        $role = (string) $user['role'];
        $isInternalRole = in_array($role, ['admin', 'super_admin', 'counsellor', 'visa_officer'], true);
        $isStudentOwner = $role === 'student' && (int) $application['student_user_id'] === (int) $user['sub'];
        $isAgentOwner = in_array($role, ['agent', 'sub_agent'], true);

        if (!$isInternalRole && !$isStudentOwner && !$isAgentOwner) {
            Response::error('You do not have permission to delete this document', 'AUTH_INSUFFICIENT_ROLE', 403);
        }

        if (!$isInternalRole && !in_array($status, ['pending', 'rejected'], true)) {
            Response::error('Only unverified documents can be deleted', 'VALIDATION_FAILED', 422, [
                'status' => 'Only pending or rejected documents can be deleted.',
            ]);
        }

        $absolutePath = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, (string) $document['file_path']);

        try {
            $this->fileUploads->delete($absolutePath);
            $this->applications->deleteDocument($documentId);
        } catch (\RuntimeException $exception) {
            Response::error($exception->getMessage(), 'INTERNAL_SERVER_ERROR', 500);
        }

        Response::success('Document deleted successfully');
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
