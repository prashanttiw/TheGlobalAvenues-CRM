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
use TGA\CRM\Models\PaymentTrackingModel;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\NotificationService;

class PaymentTrackingController
{
    private PDO $pdo;
    private ApplicationModel $appModel;
    private PaymentTrackingModel $paymentModel;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
        $this->appModel = new ApplicationModel($this->pdo);
        $this->paymentModel = new PaymentTrackingModel($this->pdo);
    }

    public function createRequest(string $appPid): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $application = $this->appModel->findByPublicId($appPid);
        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $label = trim($input['label'] ?? '');
        
        if (!$label) {
            Response::error('Payment label is required', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM admins WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $adminId = $stmt->fetchColumn();

        if (!$adminId) {
            Response::error('Only admins can request payments', 'FORBIDDEN', 403);
        }

        if (!empty($input['due_date'])) {
            $dueDate = new \DateTime($input['due_date']);
            $now = new \DateTime();
            if ($dueDate < $now) {
                // Soft warning log, but allow creation
                ActivityLogger::log('payment_request.warning', 'application', $application['id'], $user['id'], [], ['message' => 'Payment request created with a past due date.']);
            }
        }

        try {
            $this->pdo->beginTransaction();

            $pid = UlidGenerator::generate();
            $paymentId = $this->paymentModel->insert([
                'public_id' => $pid,
                'application_id' => $application['id'],
                'label' => $label,
                'amount' => $input['amount'] ?? null,
                'currency' => $input['currency'] ?? 'EUR',
                'payment_link' => $input['payment_link'] ?? null,
                'due_date' => $input['due_date'] ?? null,
                'status' => 'pending',
                'created_by' => $adminId
            ]);

            $updatePid = UlidGenerator::generate();
            $content = "Payment Requested: " . $label;
            if (!empty($input['amount'])) {
                $content .= " (" . ($input['amount']) . " " . ($input['currency'] ?? 'EUR') . ")";
            }

            $stmt = $this->pdo->prepare("
                INSERT INTO application_updates
                (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id, is_visible_to_agent)
                VALUES (?, ?, 'admin_to_student', 'payment_request', ?, 'admin', ?, 1)
            ");
            $stmt->execute([
                $updatePid,
                $application['id'],
                $content,
                $user['id']
            ]);

            $this->pdo->commit();
            
            ActivityLogger::log('payment_request.created', 'application_payment', $paymentId, $user['id']);

            // Get Student/Agent user IDs
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
                NotificationService::fire('payment.requested', ['label' => $label, 'amount' => $input['amount'] ?? null, 'currency' => $input['currency'] ?? 'EUR'], $userIds);
            }

            $payment = $this->paymentModel->findById($paymentId);
            Response::json(['success' => true, 'payment_request' => $payment], 201);
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function agentSubmit(string $pid): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $payment = $this->paymentModel->findByPublicId($pid);
        if (!$payment) {
            Response::error('Payment request not found', 'NOT_FOUND', 404);
        }

        $application = $this->appModel->findById((int)$payment['application_id']);

        $stmt = $this->pdo->prepare("SELECT id FROM agents WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $agentId = $stmt->fetchColumn();

        if ($application['agent_id_at_submission'] && $application['agent_id_at_submission'] !== $agentId) {
             Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $filePid = $input['file_pid'] ?? ''; 

        $fileId = null;
        if ($filePid) {
            $stmt = $this->pdo->prepare("SELECT id FROM files WHERE public_id = ? AND deleted_at IS NULL");
            $stmt->execute([$filePid]);
            $fileId = $stmt->fetchColumn();
            if (!$fileId) {
                Response::error('Invalid file', 'NOT_FOUND', 404);
            }
        }

        try {
            $this->pdo->beginTransaction();

            $this->paymentModel->update($payment['id'], [
                'status' => 'student_marked_paid',
                'marked_paid_at' => date('Y-m-d H:i:s')
            ]);

            $updatePid = UlidGenerator::generate();
            $content = "Payment Marked as Paid: " . $payment['label'];

            $stmt = $this->pdo->prepare("
                INSERT INTO application_updates
                (public_id, application_id, direction, item_type, content, file_id, posted_by_type, posted_by_id, is_visible_to_agent)
                VALUES (?, ?, 'student_to_admin', 'note', ?, ?, 'agent', ?, 1)
            ");
            $stmt->execute([
                $updatePid,
                $application['id'],
                $content,
                $fileId,
                $user['id']
            ]);

            $this->pdo->commit();

            ActivityLogger::log('payment_request.submitted', 'application_payment', $payment['id'], $user['id']);

            // Notify Admin
            NotificationService::fire('payment.submitted', ['label' => $payment['label'], 'application_id' => $application['id']], [1]);

            $updatedPayment = $this->paymentModel->findById($payment['id']);
            Response::json(['success' => true, 'payment_request' => $updatedPayment]);
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
            SELECT ap.public_id, ap.label, ap.amount, ap.currency, ap.due_date, ap.status, ap.payment_link,
                   app.public_id as application_pid, app.reference_number as application_reference,
                   u.name as university_name, c.name as program_name
            FROM application_payments ap
            JOIN applications app ON ap.application_id = app.id
            JOIN intakes i ON app.intake_id = i.id
            JOIN courses c ON i.course_id = c.id
            JOIN universities u ON c.university_id = u.id
            WHERE app.student_id = ? AND app.deleted_at IS NULL
                  AND ap.status IN ('pending', 'student_marked_paid', 'disputed')
            ORDER BY ap.due_date IS NULL, ap.due_date ASC
        ");
        $stmt->execute([$studentId]);

        Response::json(['payments' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    public function studentSubmit(string $pid): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? '') !== 'student' && ($user['user_type'] ?? '') !== 'student') {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $payment = $this->paymentModel->findByPublicId($pid);
        if (!$payment) {
            Response::error('Payment request not found', 'NOT_FOUND', 404);
        }

        $application = $this->appModel->findById((int)$payment['application_id']);

        $stmt = $this->pdo->prepare("SELECT id FROM students WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$user['id']]);
        $studentId = $stmt->fetchColumn();

        if (!$studentId || $application['student_id'] !== $studentId) {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $filePid = $input['file_pid'] ?? ''; 

        $fileId = null;
        if ($filePid) {
            $stmt = $this->pdo->prepare("SELECT id FROM files WHERE public_id = ? AND deleted_at IS NULL");
            $stmt->execute([$filePid]);
            $fileId = $stmt->fetchColumn();
            if (!$fileId) {
                Response::error('Invalid file', 'NOT_FOUND', 404);
            }
        }

        try {
            $this->pdo->beginTransaction();

            $this->paymentModel->update($payment['id'], [
                'status' => 'student_marked_paid',
                'marked_paid_at' => date('Y-m-d H:i:s')
            ]);

            $updatePid = UlidGenerator::generate();
            $content = "Payment Marked as Paid: " . $payment['label'];

            $stmt = $this->pdo->prepare("
                INSERT INTO application_updates
                (public_id, application_id, direction, item_type, content, file_id, posted_by_type, posted_by_id, is_visible_to_agent)
                VALUES (?, ?, 'student_to_admin', 'note', ?, ?, 'student', ?, 1)
            ");
            $stmt->execute([
                $updatePid,
                $application['id'],
                $content,
                $fileId,
                $user['id']
            ]);

            $this->pdo->commit();

            ActivityLogger::log('payment_request.submitted', 'application_payment', $payment['id'], $user['id']);

            // Notify Admin
            NotificationService::fire('payment.submitted', ['label' => $payment['label'], 'application_id' => $application['id']], [1]);

            $updatedPayment = $this->paymentModel->findById($payment['id']);
            Response::json(['success' => true, 'payment_request' => $updatedPayment]);
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function adminQueue(): void
    {
        // Dashboard-only endpoint — every admin sees this queue regardless of their individual
        // page grants (only the Confirm/Dispute buttons are gated on 'applications.edit', client-side).
        // See CLIENT_SYSTEM_DOCUMENTATION.md §5.1: "Every admin sees the dashboard's action queues
        // regardless of their individual page grants."
        AuthMiddleware::requireRole('admin');

        $stmt = $this->pdo->query("
            SELECT ap.public_id, ap.label, ap.amount, ap.currency, ap.due_date, ap.status, ap.marked_paid_at,
                   app.public_id as application_pid, app.reference_number as application_reference,
                   s.full_name as student_name
            FROM application_payments ap
            JOIN applications app ON ap.application_id = app.id
            JOIN students s ON app.student_id = s.id
            WHERE ap.status = 'student_marked_paid'
            ORDER BY ap.marked_paid_at ASC
        ");

        Response::json(['queue' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    public function adminVerify(string $pid): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $payment = $this->paymentModel->findByPublicId($pid);
        if (!$payment) {
            Response::error('Payment request not found', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $status = $input['status'] ?? '';

        if (!in_array($status, ['confirmed', 'disputed'])) {
            Response::error('Invalid status. Must be confirmed or disputed.', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM admins WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $adminId = $stmt->fetchColumn();

        if (!$adminId) {
            Response::error('Only admins can verify payments', 'FORBIDDEN', 403);
        }

        try {
            $this->pdo->beginTransaction();

            $updateData = [
                'status' => $status,
                'confirmed_by' => $adminId,
                'confirmed_at' => date('Y-m-d H:i:s')
            ];

            $this->paymentModel->update($payment['id'], $updateData);

            $updatePid = UlidGenerator::generate();
            $content = "Payment " . ucfirst($status) . ": " . $payment['label'];

            $stmt = $this->pdo->prepare("
                INSERT INTO application_updates
                (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id, is_visible_to_agent)
                VALUES (?, ?, 'admin_to_student', 'note', ?, 'admin', ?, 1)
            ");
            $stmt->execute([
                $updatePid,
                $payment['application_id'],
                $content,
                $user['id']
            ]);

            $this->pdo->commit();

            ActivityLogger::log('payment_request.verified', 'application_payment', $payment['id'], $user['id'], [], ['status' => $status]);

            // Notify Student/Agent
            $stmt = $this->pdo->prepare("SELECT student_id, agent_id_at_submission FROM applications WHERE id = ?");
            $stmt->execute([$payment['application_id']]);
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
                NotificationService::fire('payment.verified', ['label' => $payment['label'], 'status' => $status], $userIds);
            }

            $updatedPayment = $this->paymentModel->findById($payment['id']);
            Response::json(['success' => true, 'payment_request' => $updatedPayment]);
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function adminResolve(string $pid): void
    {
        RBACMiddleware::requirePermission('applications', 'edit');
        $user = AuthMiddleware::user();

        $payment = $this->paymentModel->findByPublicId($pid);
        if (!$payment) {
            Response::error('Payment request not found', 'NOT_FOUND', 404);
        }

        if ($payment['status'] !== 'disputed') {
            Response::error('Only disputed payments can be resolved', 'VALIDATION_ERROR', 400);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $resolution = $input['resolution'] ?? '';

        if (!in_array($resolution, ['confirmed', 'cancelled'])) {
            Response::error('Invalid resolution. Must be confirmed or cancelled.', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare("SELECT id FROM admins WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        $adminId = $stmt->fetchColumn();

        if (!$adminId) {
            Response::error('Only admins can resolve payments', 'FORBIDDEN', 403);
        }

        try {
            $this->pdo->beginTransaction();

            $updateData = [
                'status' => $resolution,
                'updated_at' => date('Y-m-d H:i:s')
            ];

            if ($resolution === 'confirmed') {
                $updateData['confirmed_by'] = $adminId;
                $updateData['confirmed_at'] = date('Y-m-d H:i:s');
            }

            $this->paymentModel->update($payment['id'], $updateData);

            $updatePid = UlidGenerator::generate();
            $content = "Payment Dispute Resolved (" . ucfirst($resolution) . "): " . $payment['label'];

            $stmt = $this->pdo->prepare("
                INSERT INTO application_updates
                (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id, is_visible_to_agent)
                VALUES (?, ?, 'admin_to_student', 'note', ?, 'admin', ?, 1)
            ");
            $stmt->execute([
                $updatePid,
                $payment['application_id'],
                $content,
                $user['id']
            ]);

            $this->pdo->commit();

            ActivityLogger::log('payment_request.resolved', 'application_payment', $payment['id'], $user['id'], [], ['resolution' => $resolution]);


            // Notify Student/Agent
            $stmt = $this->pdo->prepare("SELECT student_id, agent_id_at_submission FROM applications WHERE id = ?");
            $stmt->execute([$payment['application_id']]);
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
                NotificationService::fire('payment.resolved', ['label' => $payment['label'], 'resolution' => $resolution], $userIds);
            }

            $updatedPayment = $this->paymentModel->findById($payment['id']);
            Response::json(['success' => true, 'payment_request' => $updatedPayment]);
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
