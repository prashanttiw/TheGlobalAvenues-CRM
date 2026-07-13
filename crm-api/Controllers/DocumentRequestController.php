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
use TGA\CRM\Services\FileUploadService;
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

        $stmt = $this->pdo->prepare("SELECT id FROM admins WHERE user_id = ?");
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
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'agent') {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $docRequest = $this->docModel->findByPublicId($pid);
        if (!$docRequest) {
            Response::error('Document request not found', 'NOT_FOUND', 404);
        }

        $application = $this->appModel->findById((int)$docRequest['application_id']);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM agents WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $agentId = $stmt->fetchColumn();

        if (!$agentId) {
            Response::error('Agent not found', 'NOT_FOUND', 404);
        }

        if ($application['agent_id_at_submission'] && (int)$application['agent_id_at_submission'] !== (int)$agentId) {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        // Same guard as studentSubmit(): once approved, no silent resubmission.
        if ($docRequest['status'] === 'approved') {
            Response::error('This document has already been approved and cannot be resubmitted.', 'ALREADY_APPROVED', 409);
        }

        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            Response::error('No file uploaded or upload error', 'VALIDATION_ERROR', 400);
        }

        $stStmt = $this->pdo->prepare("SELECT public_id, full_name FROM students WHERE id = ? AND deleted_at IS NULL");
        $stStmt->execute([$docRequest['student_id']]);
        $student = $stStmt->fetch(PDO::FETCH_ASSOC);

        if (!$student) {
            Response::error('Student not found', 'NOT_FOUND', 404);
        }

        try {
            $this->pdo->beginTransaction();

            $prevFileId = $docRequest['submitted_file_id'];
            $versionNumber = 1;
            if ($prevFileId) {
                $vStmt = $this->pdo->prepare("SELECT version_number FROM files WHERE id = ?");
                $vStmt->execute([$prevFileId]);
                $prevVersion = $vStmt->fetchColumn();
                $versionNumber = $prevVersion ? (int)$prevVersion + 1 : 2;

                $supStmt = $this->pdo->prepare("UPDATE files SET superseded_at = NOW() WHERE id = ?");
                $supStmt->execute([$prevFileId]);
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
                (int)$docRequest['student_id'],
                'agent',
                (int)$user['id'],
                $displayFilename,
                false,
                "students/{$student['public_id']}/documents",
                $versionNumber,
                $prevFileId ? (int)$prevFileId : null
            );

            $fileStmt = $this->pdo->prepare("SELECT id FROM files WHERE public_id = ?");
            $fileStmt->execute([$uploadResult['public_id']]);
            $fileId = $fileStmt->fetchColumn();

            $this->docModel->update($docRequest['id'], [
                'status' => 'submitted',
                'submitted_file_id' => $fileId
            ]);

            $updatePid = UlidGenerator::generate();
            $content = "Document Submitted: " . $docRequest['doc_label'];

            $insertStmt = $this->pdo->prepare("
                INSERT INTO application_updates
                (public_id, application_id, direction, item_type, content, file_id, posted_by_type, posted_by_id, is_visible_to_agent)
                VALUES (?, ?, 'student_to_admin', 'file', ?, ?, 'agent', ?, 1)
            ");
            $insertStmt->execute([
                $updatePid,
                $application['id'],
                $content,
                $fileId,
                $user['id']
            ]);

            $this->pdo->commit();

            ActivityLogger::log('document_request.submitted', 'document_request', $docRequest['id'], $user['id']);

            SLAService::startEvent($this->pdo, 'document_request', 'submitted', $docRequest['id']);

            $stmt = $this->pdo->prepare("SELECT user_id FROM admins WHERE id = ?");
            $stmt->execute([$docRequest['requested_by']]);
            $adminUid = $stmt->fetchColumn();

            if ($adminUid) {
                NotificationService::fire('document.submitted', ['doc_label' => $docRequest['doc_label'], 'application_id' => $application['id']], [(int)$adminUid]);
            }

            $updatedDoc = $this->docModel->findById($docRequest['id']);
            Response::json(['success' => true, 'document_request' => $updatedDoc]);
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function adminReview(?string $pid = null): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $documentId = $pid ?? $input['document_id'] ?? $input['pid'] ?? '';

        if (!$documentId) {
            Response::error('Document ID is required', 'VALIDATION_ERROR', 400);
        }

        $queryField = is_numeric($documentId) ? 'id' : 'public_id';
        $stmt = $this->pdo->prepare("SELECT * FROM document_requests WHERE {$queryField} = ?");
        $stmt->execute([$documentId]);
        $docRequest = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$docRequest) {
            Response::error('Document request not found', 'NOT_FOUND', 404);
        }

        $status = $input['status'] ?? '';
        if (!$status && isset($input['decision'])) {
            $status = ($input['decision'] === 'verified') ? 'approved' : 'rejected';
        }

        $rejectionReason = trim($input['rejection_reason'] ?? $input['reason'] ?? '');

        if (!in_array($status, ['approved', 'rejected'])) {
            Response::error('Invalid status. Must be approved or rejected.', 'VALIDATION_ERROR', 400);
        }

        if ($status === 'rejected' && !$rejectionReason) {
            Response::error('Rejection reason is required', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM admins WHERE user_id = ?");
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
                NotificationService::fire('document.reviewed', ['doc_label' => $docRequest['doc_label'], 'status' => ucfirst($status)], $userIds);
            }

            $updatedDoc = $this->docModel->findById($docRequest['id']);
            Response::json([
                'success' => true, 
                'document' => $updatedDoc,
                'document_request' => $updatedDoc
            ]);
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

        // Once admin has approved a submission, the review is done — without this guard a
        // student could silently swap the approved file for a different one at any later time
        // (status flips back to 'submitted' with no new request ever issued), and nothing
        // would prompt an admin to notice the file behind an already-approved document had
        // changed. 'requested' and 'rejected' both legitimately need a submission; resubmitting
        // while already 'submitted' (i.e. before the admin has looked at it) is still allowed —
        // that's just the student correcting a mistake before review, not bypassing one.
        if ($docRequest['status'] === 'approved') {
            Response::error('This document has already been approved and cannot be resubmitted.', 'ALREADY_APPROVED', 409);
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

            $stmt = $this->pdo->prepare("SELECT user_id FROM admins WHERE id = ?");
            $stmt->execute([$docRequest['requested_by']]);
            $adminUid = $stmt->fetchColumn();

            if ($adminUid) {
                NotificationService::fire('document.submitted', ['doc_label' => $docRequest['doc_label']], [(int)$adminUid]);
            }

            $updatedDoc = $this->docModel->findById($docRequest['id']);
            Response::json(['success' => true, 'document_request' => $updatedDoc]);
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Fetch all submitted/pending documents for review queue
     */
    public function getDocumentQueue(): void
    {
        // Dashboard-only endpoint — every admin sees this queue regardless of their individual
        // page grants (only the Approve/Reject buttons are gated on 'applications.edit', client-side).
        // See CLIENT_SYSTEM_DOCUMENTATION.md §5.1: "Every admin sees the dashboard's action queues
        // regardless of their individual page grants."
        AuthMiddleware::requireRole('admin');

        $stmt = $this->pdo->query("
            SELECT dr.public_id, dr.doc_label, dr.description, dr.deadline, dr.status, dr.created_at,
                   app.public_id as application_pid, app.reference_number as application_reference,
                   u.email as student_email, s.full_name as student_name,
                   f.public_id as file_public_id, f.display_filename as file_name
            FROM document_requests dr
            JOIN applications app ON dr.application_id = app.id
            JOIN students s ON app.student_id = s.id
            JOIN users u ON s.user_id = u.id
            LEFT JOIN files f ON dr.submitted_file_id = f.id
            WHERE dr.status = 'submitted'
            ORDER BY dr.created_at ASC
        ");
        Response::json(['queue' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
}
