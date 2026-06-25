<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Models\ApplicationModel;
use TGA\CRM\Models\DocumentRequestModel;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\SLAService;
use TGA\CRM\Services\NotificationService;

class DocumentRequestController
{
    private PDO $pdo;
    private ApplicationModel $appModel;
    private DocumentRequestModel $docModel;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
        $this->appModel = new ApplicationModel($this->pdo);
        $this->docModel = new DocumentRequestModel($this->pdo);
    }

    public function createForApplication(string $appPid): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $application = $this->appModel->findByPublicId($appPid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $docLabel = trim($input['doc_label'] ?? '');
        
        if (!$docLabel) {
            Response::error('Document label is required', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM admins WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $adminId = $stmt->fetchColumn();

        if (!$adminId) {
            Response::error('Only admins can request documents', 'FORBIDDEN', 403);
        }

        try {
            $this->pdo->beginTransaction();

            $pid = UlidGenerator::generate();
            $docId = $this->docModel->insert([
                'public_id' => $pid,
                'student_id' => $application['student_id'],
                'application_id' => $application['id'],
                'doc_label' => $docLabel,
                'description' => trim($input['description'] ?? ''),
                'deadline' => $input['deadline'] ?? null,
                'status' => 'requested',
                'requested_by' => $adminId
            ]);

            $updatePid = UlidGenerator::generate();
            $content = "Document Requested: " . $docLabel;
            if (!empty($input['description'])) {
                $content .= "\n" . trim($input['description']);
            }

            $stmt = $this->pdo->prepare("
                INSERT INTO application_updates
                (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id, is_visible_to_agent)
                VALUES (?, ?, 'admin_to_student', 'document_request', ?, 'admin', ?, 1)
            ");
            $stmt->execute([
                $updatePid,
                $application['id'],
                $content,
                $user['id']
            ]);

            $this->pdo->commit();
            
            ActivityLogger::log('document_request.created', 'document_request', $docId, $user['id']);

            // Notify Student/Agent
            $userIds = [];
            $stmt = $this->pdo->prepare("SELECT user_id FROM students WHERE id = ?");
            $stmt->execute([$application['student_id']]);
            $sUid = $stmt->fetchColumn();
            if ($sUid) $userIds[] = (int)$sUid;

            if ($application['agent_id_at_submission']) {
                $stmt = $this->pdo->prepare("SELECT user_id FROM agents WHERE id = ?");
                $stmt->execute([$application['agent_id_at_submission']]);
                $aUid = $stmt->fetchColumn();
                if ($aUid) $userIds[] = (int)$aUid;
            }

            if (!empty($userIds)) {
                NotificationService::fire('document.requested', ['doc_label' => $docLabel, 'application_id' => $application['id']], $userIds);
            }

            $doc = $this->docModel->findById($docId);
            Response::json(['success' => true, 'document_request' => $doc], 201);
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function agentSubmit(string $pid): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $docRequest = $this->docModel->findByPublicId($pid);
        if (!$docRequest) {
            Response::error('Document request not found', 'NOT_FOUND', 404);
        }

        $application = $this->appModel->findById((int)$docRequest['application_id']);

        $stmt = $this->pdo->prepare("SELECT id FROM agents WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $agentId = $stmt->fetchColumn();

        if ($application['agent_id_at_submission'] && $application['agent_id_at_submission'] !== $agentId) {
             Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $filePid = $input['file_pid'] ?? '';

        if (!$filePid) {
            Response::error('File is required', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM files WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$filePid]);
        $fileId = $stmt->fetchColumn();

        if (!$fileId) {
            Response::error('Invalid file', 'NOT_FOUND', 404);
        }

        try {
            $this->pdo->beginTransaction();

            $this->docModel->update($docRequest['id'], [
                'status' => 'submitted',
                'submitted_file_id' => $fileId
            ]);

            $updatePid = UlidGenerator::generate();
            $content = "Document Submitted: " . $docRequest['doc_label'];

            $stmt = $this->pdo->prepare("
                INSERT INTO application_updates
                (public_id, application_id, direction, item_type, content, file_id, posted_by_type, posted_by_id, is_visible_to_agent)
                VALUES (?, ?, 'student_to_admin', 'file', ?, ?, 'agent', ?, 1)
            ");
            $stmt->execute([
                $updatePid,
                $application['id'],
                $content,
                $fileId,
                $user['id']
            ]);

            $this->pdo->commit();

            ActivityLogger::log('document_request.submitted', 'document_request', $docRequest['id'], $user['id']);

            // Start SLA for Admin Review
            SLAService::startEvent($this->pdo, 'document_request', 'submitted', $docRequest['id']);

            // Notify Admin
            NotificationService::fire('document.submitted', ['doc_label' => $docRequest['doc_label'], 'application_id' => $application['id']], [1]); // Assuming Admin 1 for now or skip specific routing if no assignment logic exists

            $updatedDoc = $this->docModel->findById($docRequest['id']);
            Response::json(['success' => true, 'document_request' => $updatedDoc]);
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function adminReview(string $pid): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $docRequest = $this->docModel->findByPublicId($pid);
        if (!$docRequest) {
            Response::error('Document request not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $status = $input['status'] ?? '';
        $rejectionReason = trim($input['rejection_reason'] ?? '');

        if (!in_array($status, ['approved', 'rejected'])) {
            Response::error('Invalid status. Must be approved or rejected.', 'VALIDATION_ERROR', 400);
        }

        if ($status === 'rejected' && !$rejectionReason) {
            Response::error('Rejection reason is required', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM admins WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $adminId = $stmt->fetchColumn();

        if (!$adminId) {
            Response::error('Only admins can review documents', 'FORBIDDEN', 403);
        }

        try {
            $this->pdo->beginTransaction();

            $updateData = [
                'status' => $status,
                'reviewed_by' => $adminId,
                'reviewed_at' => date('Y-m-d H:i:s'),
                'rejection_reason' => $status === 'rejected' ? $rejectionReason : null
            ];

            $this->docModel->update($docRequest['id'], $updateData);

            $updatePid = UlidGenerator::generate();
            $content = "Document " . ucfirst($status) . ": " . $docRequest['doc_label'];
            if ($status === 'rejected') {
                $content .= "\nReason: " . $rejectionReason;
            }

            $stmt = $this->pdo->prepare("
                INSERT INTO application_updates
                (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id, is_visible_to_agent)
                VALUES (?, ?, 'admin_to_student', 'note', ?, 'admin', ?, 1)
            ");
            $stmt->execute([
                $updatePid,
                $docRequest['application_id'],
                $content,
                $user['id']
            ]);

            $this->pdo->commit();

            ActivityLogger::log('document_request.reviewed', 'document_request', $docRequest['id'], $user['id'], [], ['status' => $status]);

            // Resolve SLA
            SLAService::resolveEvent($this->pdo, 'document_request', $docRequest['id']);

            // Notify Student/Agent
            $stmt = $this->pdo->prepare("SELECT student_id, agent_id_at_submission FROM applications WHERE id = ?");
            $stmt->execute([$docRequest['application_id']]);
            $appData = $stmt->fetch(PDO::FETCH_ASSOC);

            $userIds = [];
            if ($appData) {
                $stmt = $this->pdo->prepare("SELECT user_id FROM students WHERE id = ?");
                $stmt->execute([$appData['student_id']]);
                if ($sUid = $stmt->fetchColumn()) $userIds[] = (int)$sUid;

                if ($appData['agent_id_at_submission']) {
                    $stmt = $this->pdo->prepare("SELECT user_id FROM agents WHERE id = ?");
                    $stmt->execute([$appData['agent_id_at_submission']]);
                    if ($aUid = $stmt->fetchColumn()) $userIds[] = (int)$aUid;
                }
            }

            if (!empty($userIds)) {
                NotificationService::fire('document.reviewed', ['doc_label' => $docRequest['doc_label'], 'status' => $status], $userIds);
            }

            $updatedDoc = $this->docModel->findById($docRequest['id']);
            Response::json(['success' => true, 'document_request' => $updatedDoc]);
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function adminGet(string $pid): void
    {
        RBACMiddleware::requirePermission('applications', 'view');

        $docRequest = $this->docModel->findByPublicId($pid);
        if (!$docRequest) {
            Response::error('Document request not found', 'NOT_FOUND', 404);
        }

        if ($docRequest['submitted_file_id']) {
            $stmt = $this->pdo->prepare("SELECT public_id, display_filename, mime_type, file_size_bytes FROM files WHERE id = ?");
            $stmt->execute([$docRequest['submitted_file_id']]);
            $file = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($file) {
                $docRequest['submitted_file'] = $file;
            }
        }

        Response::json(['document_request' => $docRequest]);
    }

    public function adminCancel(string $pid): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $docRequest = $this->docModel->findByPublicId($pid);
        if (!$docRequest) {
            Response::error('Document request not found', 'NOT_FOUND', 404);
        }

        if (in_array($docRequest['status'], ['approved', 'cancelled'])) {
            Response::error('Cannot cancel a document request in this status', 'VALIDATION_ERROR', 400);
        }

        try {
            $this->pdo->beginTransaction();

            $this->docModel->update($docRequest['id'], [
                'status' => 'cancelled',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            $updatePid = UlidGenerator::generate();
            $content = "Document Request Cancelled: " . $docRequest['doc_label'];

            $stmt = $this->pdo->prepare("
                INSERT INTO application_updates
                (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id, is_visible_to_agent)
                VALUES (?, ?, 'admin_to_student', 'note', ?, 'admin', ?, 1)
            ");
            $stmt->execute([
                $updatePid,
                $docRequest['application_id'],
                $content,
                $user['id']
            ]);

            $this->pdo->commit();

            ActivityLogger::log('document_request.cancelled', 'document_request', $docRequest['id'], $user['id']);

            // Cancel SLA
            SLAService::cancelEvent($this->pdo, 'document_request', $docRequest['id']);

            // Notify Student/Agent
            $stmt = $this->pdo->prepare("SELECT student_id, agent_id_at_submission FROM applications WHERE id = ?");
            $stmt->execute([$docRequest['application_id']]);
            $appData = $stmt->fetch(PDO::FETCH_ASSOC);

            $userIds = [];
            if ($appData) {
                $stmt = $this->pdo->prepare("SELECT user_id FROM students WHERE id = ?");
                $stmt->execute([$appData['student_id']]);
                if ($sUid = $stmt->fetchColumn()) $userIds[] = (int)$sUid;

                if ($appData['agent_id_at_submission']) {
                    $stmt = $this->pdo->prepare("SELECT user_id FROM agents WHERE id = ?");
                    $stmt->execute([$appData['agent_id_at_submission']]);
                    if ($aUid = $stmt->fetchColumn()) $userIds[] = (int)$aUid;
                }
            }

            if (!empty($userIds)) {
                NotificationService::fire('document.cancelled', ['doc_label' => $docRequest['doc_label']], $userIds);
            }

            $updatedDoc = $this->docModel->findById($docRequest['id']);
            Response::json(['success' => true, 'document_request' => $updatedDoc]);
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function studentList(): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'student' && ($user['user_type'] ?? '') !== 'student') {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM students WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $studentId = $stmt->fetchColumn();

        if (!$studentId) {
            Response::error('Student profile not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("
            SELECT dr.public_id, dr.doc_label, dr.description, dr.deadline, dr.status, dr.rejection_reason,
                   f.public_id as file_public_id, f.display_filename as file_name
            FROM document_requests dr
            LEFT JOIN files f ON dr.submitted_file_id = f.id
            WHERE dr.student_id = ?
            ORDER BY dr.created_at DESC
        ");
        $stmt->execute([$studentId]);
        $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(['document_requests' => $requests]);
    }

    public function studentSubmit(string $pid): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'student' && ($user['user_type'] ?? '') !== 'student') {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $docRequest = $this->docModel->findByPublicId($pid);
        if (!$docRequest) {
            Response::error('Document request not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("SELECT id, full_name, public_id FROM students WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $student = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$student || $docRequest['student_id'] !== $student['id']) {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            Response::error('No file uploaded or upload error', 'VALIDATION_ERROR', 400);
        }

        try {
            $this->pdo->beginTransaction();

            $prevFileId = $docRequest['submitted_file_id'];
            $versionNumber = 1;
            if ($prevFileId) {
                $stmt = $this->pdo->prepare("SELECT version_number FROM files WHERE id = ?");
                $stmt->execute([$prevFileId]);
                $prevVersion = $stmt->fetchColumn();
                $versionNumber = $prevVersion ? (int)$prevVersion + 1 : 2;

                $stmt = $this->pdo->prepare("UPDATE files SET superseded_at = NOW() WHERE id = ?");
                $stmt->execute([$prevFileId]);
            }

            $cleanStudentName = preg_replace('/[^a-zA-Z0-9]/', '_', $student['full_name']);
            $cleanDocLabel = preg_replace('/[^a-zA-Z0-9]/', '_', $docRequest['doc_label']);
            $dateStr = date('Y-m-d');
            $origExt = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
            $displayFilename = "{$cleanStudentName}_{$cleanDocLabel}_{$dateStr}.{$origExt}";

            $fileService = new FileUploadService();
            $uploadResult = $fileService->upload(
                $this->pdo,
                $_FILES['file'],
                'other',
                'student',
                $student['id'],
                'student',
                $user['id'],
                $displayFilename,
                false,
                "students/{$student['public_id']}/documents",
                $versionNumber,
                $prevFileId ? (int)$prevFileId : null
            );

            $stmt = $this->pdo->prepare("SELECT id FROM files WHERE public_id = ?");
            $stmt->execute([$uploadResult['public_id']]);
            $fileId = $stmt->fetchColumn();

            $this->docModel->update($docRequest['id'], [
                'status' => 'submitted',
                'submitted_file_id' => $fileId
            ]);

            if ($docRequest['application_id']) {
                $updatePid = UlidGenerator::generate();
                $content = "Document Submitted: " . $docRequest['doc_label'];

                $stmt = $this->pdo->prepare("
                    INSERT INTO application_updates
                    (public_id, application_id, direction, item_type, content, file_id, posted_by_type, posted_by_id, is_visible_to_agent)
                    VALUES (?, ?, 'student_to_admin', 'file', ?, ?, 'student', ?, 1)
                ");
                $stmt->execute([
                    $updatePid,
                    $docRequest['application_id'],
                    $content,
                    $fileId,
                    $user['id']
                ]);
            }

            $this->pdo->commit();

            ActivityLogger::log('document_request.submitted', 'document_request', $docRequest['id'], $user['id']);

            SLAService::startEvent($this->pdo, 'document_request', 'submitted', $docRequest['id']);

            NotificationService::fire('document.submitted', ['doc_label' => $docRequest['doc_label']], [3]);

            $updatedDoc = $this->docModel->findById($docRequest['id']);
            Response::json(['success' => true, 'document_request' => $updatedDoc]);
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
