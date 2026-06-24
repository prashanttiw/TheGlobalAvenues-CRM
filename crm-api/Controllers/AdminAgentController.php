<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use Exception;
use RuntimeException;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\NotificationService;
use TGA\CRM\Services\SecurityEventLogger;

final class AdminAgentController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function getPending(): void
    {
        RBACMiddleware::requirePermission('agents', 'approve');

        $stmt = $this->pdo->prepare(
            "SELECT public_id, full_name, agency_name, country, created_at 
             FROM agents 
             WHERE status = 'pending' AND deleted_at IS NULL
             ORDER BY created_at ASC"
        );
        $stmt->execute();
        $agents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(['agents' => $agents]);
    }

    public function approve(string $publicId): void
    {
        RBACMiddleware::requirePermission('agents', 'approve');
        $user = AuthMiddleware::user();

        $stmt = $this->pdo->prepare("SELECT id, user_id, status FROM agents WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$publicId]);
        $agent = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$agent) {
            Response::error('Agent not found', 'NOT_FOUND', 404);
        }

        if ($agent['status'] === 'approved') {
            Response::error('Agent is already approved', 'INVALID_STATE', 400);
        }

        try {
            $this->pdo->beginTransaction();

            $iterations = 0;
            $maxIterations = 10;
            $code = '';

            do {
                if ($iterations >= $maxIterations) {
                    throw new RuntimeException('Failed to generate unique referral code after 10 attempts');
                }
                $iterations++;
                
                $code = 'TGA-' . strtoupper(substr(str_shuffle('ABCDEFGHJKMNPQRSTVWXYZ'), 0, 3))
                               . str_pad((string)random_int(0, 999), 3, '0', STR_PAD_LEFT);
                
                $checkStmt = $this->pdo->prepare("SELECT COUNT(*) FROM agents WHERE referral_code = ?");
                $checkStmt->execute([$code]);
                $exists = (int)$checkStmt->fetchColumn() > 0;
            } while ($exists);

            $updateAgent = $this->pdo->prepare(
                "UPDATE agents SET status = 'approved', referral_code = ?, approved_by = ?, approved_at = NOW() WHERE id = ?"
            );
            $updateAgent->execute([$code, $user['sub'], $agent['id']]);

            $updateUser = $this->pdo->prepare("UPDATE users SET status = 'active' WHERE id = ?");
            $updateUser->execute([$agent['user_id']]);

            $this->pdo->commit();

            ActivityLogger::log('agent.approved', 'agent', (int)$agent['id'], null, [], ['status' => 'approved', 'referral_code' => $code]);
            NotificationService::fire('agent.approved', ['referral_code' => $code], [$agent['user_id']]);

            Response::json([
                'success' => true,
                'message' => 'Agent approved successfully',
                'referral_code' => $code
            ]);

        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function reject(string $publicId): void
    {
        RBACMiddleware::requirePermission('agents', 'approve');

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $reason = trim($input['reason'] ?? '');

        if (!$reason) {
            Response::error('Rejection reason is required', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare("SELECT id, user_id, status FROM agents WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$publicId]);
        $agent = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$agent) {
            Response::error('Agent not found', 'NOT_FOUND', 404);
        }

        if ($agent['status'] === 'approved') {
            Response::error('Cannot reject an already approved agent. Suspend them instead.', 'INVALID_STATE', 400);
        }

        try {
            $this->pdo->beginTransaction();

            $updateAgent = $this->pdo->prepare(
                "UPDATE agents SET status = 'rejected', rejected_reason = ? WHERE id = ?"
            );
            $updateAgent->execute([$reason, $agent['id']]);

            $updateUser = $this->pdo->prepare("UPDATE users SET status = 'pending' WHERE id = ?");
            $updateUser->execute([$agent['user_id']]);

            $this->pdo->commit();

            ActivityLogger::log('agent.rejected', 'agent', (int)$agent['id'], null, [], ['status' => 'rejected', 'reason' => $reason]);
            NotificationService::fire('agent.rejected', ['rejection_reason' => $reason], [$agent['user_id']]);

            Response::json([
                'success' => true,
                'message' => 'Agent rejected successfully'
            ]);

        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function suspend(string $publicId): void
    {
        RBACMiddleware::requirePermission('agents', 'delete');

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $reason = trim($input['reason'] ?? '');

        if (!$reason) {
            Response::error('Suspension reason is required', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare("SELECT id, user_id, status FROM agents WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$publicId]);
        $agent = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$agent) {
            Response::error('Agent not found', 'NOT_FOUND', 404);
        }

        if ($agent['status'] === 'suspended') {
            Response::error('Agent is already suspended', 'INVALID_STATE', 400);
        }

        try {
            $this->pdo->beginTransaction();

            $updateAgent = $this->pdo->prepare(
                "UPDATE agents SET status = 'suspended', suspension_reason = ? WHERE id = ?"
            );
            $updateAgent->execute([$reason, $agent['id']]);

            $updateUser = $this->pdo->prepare("UPDATE users SET status = 'suspended' WHERE id = ?");
            $updateUser->execute([$agent['user_id']]);

            // Revoke active sessions instantly
            $revokeStmt = $this->pdo->prepare(
                "UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL"
            );
            $revokeStmt->execute([$agent['user_id']]);

            $this->pdo->commit();

            SecurityEventLogger::log('account_suspended', $agent['user_id']);

            ActivityLogger::log('agent.suspended', 'agent', (int)$agent['id'], null, [], ['status' => 'suspended', 'reason' => $reason]);
            NotificationService::fire('agent.suspended', ['suspension_reason' => $reason], [$agent['user_id']]);

            Response::json([
                'success' => true,
                'message' => 'Agent suspended successfully'
            ]);

        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
