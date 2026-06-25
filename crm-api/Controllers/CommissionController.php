<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Paginator;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Models\CommissionModel;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\CommissionService;
use TGA\CRM\Services\NotificationService;

final class CommissionController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: List all commissions  GET /admin/commissions
    // Filters: agent_pid, status, from, to, page, per_page
    // ─────────────────────────────────────────────────────────────────────────

    public function adminList(): void
    {
        RBACMiddleware::requirePermission('commissions', 'view');
        $pager = Paginator::fromQuery($_GET);

        $agentPid = trim($_GET['agent_pid'] ?? '');
        $status   = trim($_GET['status']    ?? '');
        $from     = trim($_GET['from']      ?? '');
        $to       = trim($_GET['to']        ?? '');

        $conditions = ['c.deleted_at IS NULL'];
        $params     = [];

        if ($agentPid) {
            $conditions[] = "a.public_id = :agent_pid";
            $params['agent_pid'] = $agentPid;
        }
        if ($status) {
            $conditions[] = "c.status = :status";
            $params['status'] = $status;
        }
        if ($from) {
            $conditions[] = "DATE(c.created_at) >= :from";
            $params['from'] = $from;
        }
        if ($to) {
            $conditions[] = "DATE(c.created_at) <= :to";
            $params['to'] = $to;
        }
        $where = implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM commissions c
             JOIN agents a ON a.id = c.agent_id WHERE {$where}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dataStmt = $this->pdo->prepare(
            "SELECT c.public_id, c.amount, c.percentage, c.currency, c.status,
                    c.notes, c.created_at, c.decided_at, c.paid_at,
                    c.created_by_name, c.paid_by_name,
                    a.public_id AS agent_public_id, a.full_name AS agent_name, a.tier AS agent_tier,
                    s.full_name AS student_name, s.public_id AS student_public_id,
                    app.public_id AS application_public_id, app.reference_number
             FROM commissions c
             JOIN agents a ON a.id = c.agent_id
             JOIN applications app ON app.id = c.application_id
             JOIN students s ON s.id = app.student_id
             WHERE {$where}
             ORDER BY c.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $k => $v) {
            $dataStmt->bindValue(":{$k}", $v);
        }
        $dataStmt->bindValue(':limit',  $pager['per_page'], PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $pager['offset'],   PDO::PARAM_INT);
        $dataStmt->execute();
        $commissions = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($commissions as &$c) {
            $c['amount'] = (float) $c['amount'];
        }
        unset($c);

        Response::json([
            'data' => $commissions,
            'meta' => [
                'total'       => $total,
                'page'        => $pager['page'],
                'per_page'    => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Commission summary  GET /admin/commissions/summary
    // ─────────────────────────────────────────────────────────────────────────

    public function adminSummary(): void
    {
        RBACMiddleware::requirePermission('commissions', 'view');

        $stmt = $this->pdo->prepare(
            "SELECT
                SUM(CASE WHEN status = 'pending'   AND deleted_at IS NULL THEN amount ELSE 0 END) AS pending_total,
                SUM(CASE WHEN status = 'confirmed' AND deleted_at IS NULL THEN amount ELSE 0 END) AS confirmed_total,
                SUM(CASE WHEN status = 'paid'      AND deleted_at IS NULL THEN amount ELSE 0 END) AS paid_total,
                COUNT(CASE WHEN status = 'pending' AND deleted_at IS NULL THEN 1 END)             AS pending_count,
                COUNT(CASE WHEN status = 'confirmed' AND deleted_at IS NULL THEN 1 END)           AS confirmed_count,
                COUNT(CASE WHEN status = 'paid' AND deleted_at IS NULL THEN 1 END)               AS paid_count
             FROM commissions"
        );
        $stmt->execute();
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        Response::json([
            'data' => [
                'pending_total_inr'   => (float) ($summary['pending_total']   ?? 0),
                'confirmed_total_inr' => (float) ($summary['confirmed_total'] ?? 0),
                'paid_total_inr'      => (float) ($summary['paid_total']      ?? 0),
                'pending_count'       => (int)   ($summary['pending_count']   ?? 0),
                'confirmed_count'     => (int)   ($summary['confirmed_count'] ?? 0),
                'paid_count'          => (int)   ($summary['paid_count']      ?? 0),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Create commission  POST /admin/applications/:pid/commissions
    // Input: { agent_public_id, amount, percentage (opt), currency (opt), notes (opt) }
    // ─────────────────────────────────────────────────────────────────────────

    public function adminCreate(string $appPid): void
    {
        RBACMiddleware::requirePermission('commissions', 'create');
        $user  = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $agentPublicId = trim($input['agent_public_id'] ?? '');
        $amount        = (float) ($input['amount']     ?? 0);
        $percentage    = isset($input['percentage']) ? (float) $input['percentage'] : null;
        $currency      = strtoupper(trim($input['currency'] ?? 'INR'));
        $notes         = trim($input['notes'] ?? '');

        // Validate
        if (!$agentPublicId) {
            Response::error('agent_public_id is required.', 'VALIDATION_ERROR', 422);
        }
        if ($amount <= 0) {
            Response::error('Amount must be greater than 0.', 'VALIDATION_ERROR', 422);
        }
        if ($percentage !== null && ($percentage < 0 || $percentage > 100)) {
            Response::error('Percentage must be between 0 and 100.', 'VALIDATION_ERROR', 422);
        }

        // Resolve application
        $appStmt = $this->pdo->prepare(
            "SELECT id, student_id FROM applications WHERE public_id = ? AND deleted_at IS NULL"
        );
        $appStmt->execute([$appPid]);
        $application = $appStmt->fetch(PDO::FETCH_ASSOC);

        if (!$application) {
            Response::error('Application not found.', 'NOT_FOUND', 404);
        }

        // Resolve agent
        $agentStmt = $this->pdo->prepare(
            "SELECT id, full_name, user_id, status FROM agents WHERE public_id = ? AND deleted_at IS NULL"
        );
        $agentStmt->execute([$agentPublicId]);
        $agent = $agentStmt->fetch(PDO::FETCH_ASSOC);

        if (!$agent || $agent['status'] !== 'approved') {
            Response::error('Agent not found or is not an approved agent.', 'AGENT_NOT_FOUND', 422);
        }

        // SECURITY: Validate agent is in student's agent chain
        if (!CommissionModel::validateAgentChain((int) $agent['id'], (int) $application['student_id'], $this->pdo)) {
            Response::error(
                'The specified agent is not in this student\'s agent chain.',
                'AGENT_NOT_IN_STUDENT_CHAIN', 422
            );
        }

        // Get student name for notification
        $stuStmt = $this->pdo->prepare("SELECT full_name FROM students WHERE id = ?");
        $stuStmt->execute([$application['student_id']]);
        $studentName = $stuStmt->fetchColumn();

        $publicId = CommissionModel::create(
            (int) $application['id'],
            (int) $agent['id'],
            $amount,
            $percentage,
            $currency,
            $notes ?: null,
            (int) $user['sub'],
            (string) ($user['name'] ?? 'Admin'),
            $this->pdo
        );

        // Audit log creation
        $commStmt = $this->pdo->prepare("SELECT id FROM commissions WHERE public_id = ?");
        $commStmt->execute([$publicId]);
        $commId = (int) $commStmt->fetchColumn();

        CommissionService::auditLog(
            $commId, $publicId,
            '', 'pending',
            'created',
            (int) $user['sub'], (string) ($user['name'] ?? 'Admin'),
            $this->pdo,
            null, $amount, $notes ?: null
        );

        ActivityLogger::log('commission.created', 'commission', $commId);

        NotificationService::fire('commission.created', [
            'agent_name'   => $agent['full_name'],
            'amount'       => number_format($amount, 2),
            'currency'     => $currency,
            'student_name' => $studentName,
        ], [$agent['user_id']]);

        Response::json(['data' => ['public_id' => $publicId, 'message' => 'Commission record created.']], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: List commissions for an application  GET /admin/applications/:pid/commissions
    // ─────────────────────────────────────────────────────────────────────────

    public function adminListByApplication(string $appPid): void
    {
        RBACMiddleware::requirePermission('commissions', 'view');

        $appStmt = $this->pdo->prepare("SELECT id FROM applications WHERE public_id = ? AND deleted_at IS NULL");
        $appStmt->execute([$appPid]);
        $appId = $appStmt->fetchColumn();

        if (!$appId) {
            Response::error('Application not found.', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare(
            "SELECT c.public_id, c.amount, c.percentage, c.currency, c.status,
                    c.notes, c.created_at, c.decided_at, c.paid_at, c.created_by_name,
                    a.full_name AS agent_name, a.public_id AS agent_public_id
             FROM commissions c
             JOIN agents a ON a.id = c.agent_id
             WHERE c.application_id = ? AND c.deleted_at IS NULL
             ORDER BY c.created_at ASC"
        );
        $stmt->execute([$appId]);
        $commissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($commissions as &$c) {
            $c['amount'] = (float) $c['amount'];
        }
        unset($c);

        Response::json(['data' => $commissions]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Edit pending commission  PUT /admin/commissions/:pid
    // Input: { amount (opt), percentage (opt), notes (opt) }
    // ONLY pending commissions can be edited
    // ─────────────────────────────────────────────────────────────────────────

    public function adminEdit(string $pid): void
    {
        RBACMiddleware::requirePermission('commissions', 'edit');
        $user  = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $stmt = $this->pdo->prepare(
            "SELECT id, public_id, status, amount, percentage, notes FROM commissions
             WHERE public_id = ? AND deleted_at IS NULL"
        );
        $stmt->execute([$pid]);
        $commission = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$commission) {
            Response::error('Commission not found.', 'NOT_FOUND', 404);
        }

        // PHP immutability guard
        if ($commission['status'] !== 'pending') {
            Response::error(
                'Only pending commissions can be edited.',
                'COMMISSION_LOCKED', 422
            );
        }

        $newAmount     = isset($input['amount'])     ? (float) $input['amount']     : (float) $commission['amount'];
        $newPercentage = isset($input['percentage']) ? (float) $input['percentage'] : ($commission['percentage'] ? (float) $commission['percentage'] : null);
        $newNotes      = isset($input['notes'])      ? trim($input['notes'])        : $commission['notes'];

        if ($newAmount <= 0) {
            Response::error('Amount must be greater than 0.', 'VALIDATION_ERROR', 422);
        }

        CommissionService::auditLog(
            (int) $commission['id'],
            $commission['public_id'],
            'pending', 'pending',
            'edited',
            (int) $user['sub'], (string) ($user['name'] ?? 'Admin'),
            $this->pdo,
            (float) $commission['amount'],
            $newAmount
        );

        $this->pdo->prepare(
            "UPDATE commissions SET amount = ?, percentage = ?, notes = ?, updated_at = NOW() WHERE id = ?"
        )->execute([$newAmount, $newPercentage, $newNotes, $commission['id']]);

        Response::json(['data' => ['message' => 'Commission updated successfully.']]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Confirm commission  PUT /admin/commissions/:pid/confirm
    // ─────────────────────────────────────────────────────────────────────────

    public function adminConfirm(string $pid): void
    {
        RBACMiddleware::requirePermission('commissions', 'approve');
        $user  = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $notes = trim($input['notes'] ?? '');

        try {
            $commission = CommissionService::confirm(
                $pid,
                (int) $user['sub'],
                (string) ($user['name'] ?? 'Admin'),
                $notes,
                $this->pdo
            );

            // Get agent user_id for notification
            $agentStmt = $this->pdo->prepare(
                "SELECT a.user_id, a.full_name, s.full_name AS student_name
                 FROM commissions c
                 JOIN agents a ON a.id = c.agent_id
                 JOIN applications app ON app.id = c.application_id
                 JOIN students s ON s.id = app.student_id
                 WHERE c.public_id = ?"
            );
            $agentStmt->execute([$pid]);
            $notifData = $agentStmt->fetch(PDO::FETCH_ASSOC);

            ActivityLogger::log('commission.confirmed', 'commission', (int) $commission['id']);

            if ($notifData) {
                NotificationService::fire('commission.confirmed', [
                    'agent_name'   => $notifData['full_name'],
                    'amount'       => number_format((float) $commission['amount'], 2),
                    'currency'     => 'INR',
                    'student_name' => $notifData['student_name'],
                ], [$notifData['user_id']]);
            }

            Response::json(['data' => ['message' => 'Commission confirmed successfully.']]);

        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 'INVALID_TRANSITION', 422);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Mark paid  PUT /admin/commissions/:pid/pay
    // ─────────────────────────────────────────────────────────────────────────

    public function adminMarkPaid(string $pid): void
    {
        RBACMiddleware::requirePermission('commissions', 'approve');
        $user = AuthMiddleware::user();

        try {
            $commission = CommissionService::markPaid(
                $pid,
                (int) $user['sub'],
                (string) ($user['name'] ?? 'Admin'),
                $this->pdo
            );

            $agentStmt = $this->pdo->prepare(
                "SELECT a.user_id, a.full_name, s.full_name AS student_name
                 FROM commissions c
                 JOIN agents a ON a.id = c.agent_id
                 JOIN applications app ON app.id = c.application_id
                 JOIN students s ON s.id = app.student_id
                 WHERE c.public_id = ?"
            );
            $agentStmt->execute([$pid]);
            $notifData = $agentStmt->fetch(PDO::FETCH_ASSOC);

            ActivityLogger::log('commission.paid', 'commission', (int) $commission['id']);

            if ($notifData) {
                NotificationService::fire('commission.paid', [
                    'agent_name'   => $notifData['full_name'],
                    'amount'       => number_format((float) $commission['amount'], 2),
                    'currency'     => 'INR',
                    'student_name' => $notifData['student_name'],
                ], [$notifData['user_id']]);
            }

            Response::json(['data' => ['message' => 'Commission marked as paid.']]);

        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 'MUST_BE_CONFIRMED', 422);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Soft delete pending commission  DELETE /admin/commissions/:pid
    // ─────────────────────────────────────────────────────────────────────────

    public function adminDelete(string $pid): void
    {
        RBACMiddleware::requirePermission('commissions', 'edit');
        $user = AuthMiddleware::user();

        try {
            CommissionService::softDelete(
                $pid,
                (int) $user['sub'],
                (string) ($user['name'] ?? 'Admin'),
                $this->pdo
            );
            Response::json(['data' => ['message' => 'Commission record deleted.']]);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 'COMMISSION_LOCKED', 422);
        }
    }
}
