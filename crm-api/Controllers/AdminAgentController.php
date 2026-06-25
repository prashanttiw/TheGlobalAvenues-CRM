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

        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("SELECT id, user_id, status FROM agents WHERE public_id = ? AND deleted_at IS NULL FOR UPDATE");
            $stmt->execute([$publicId]);
            $agent = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$agent) {
                $this->pdo->rollBack();
                Response::error('Agent not found', 'NOT_FOUND', 404);
            }

            if ($agent['status'] === 'approved') {
                $this->pdo->rollBack();
                Response::error('Agent is already approved', 'INVALID_STATE', 400);
            }

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

        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("SELECT id, user_id, status FROM agents WHERE public_id = ? AND deleted_at IS NULL FOR UPDATE");
            $stmt->execute([$publicId]);
            $agent = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$agent) {
                $this->pdo->rollBack();
                Response::error('Agent not found', 'NOT_FOUND', 404);
            }

            if ($agent['status'] === 'approved') {
                $this->pdo->rollBack();
                Response::error('Cannot reject an already approved agent. Suspend them instead.', 'INVALID_STATE', 400);
            }

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

        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("SELECT id, user_id, status FROM agents WHERE public_id = ? AND deleted_at IS NULL FOR UPDATE");
            $stmt->execute([$publicId]);
            $agent = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$agent) {
                $this->pdo->rollBack();
                Response::error('Agent not found', 'NOT_FOUND', 404);
            }

            if ($agent['status'] === 'suspended') {
                $this->pdo->rollBack();
                Response::error('Agent is already suspended', 'INVALID_STATE', 400);
            }

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

    public function listAll(): void
    {
        RBACMiddleware::requirePermission('agents', 'view');

        $pager   = Paginator::fromQuery($_GET);
        $status  = trim($_GET['status']  ?? '');
        $tier    = trim($_GET['tier']    ?? '');
        $search  = trim($_GET['search']  ?? '');
        $country = trim($_GET['country'] ?? '');

        $conditions = ['a.deleted_at IS NULL'];
        $params     = [];

        if ($status !== '') {
            $conditions[] = "a.status = :status";
            $params['status'] = $status;
        }
        if ($tier !== '') {
            $conditions[] = "a.tier = :tier";
            $params['tier'] = (int) $tier;
        }
        if ($country !== '') {
            $conditions[] = "a.country = :country";
            $params['country'] = $country;
        }
        if ($search !== '') {
            $conditions[] = "(a.full_name LIKE :search OR a.agency_name LIKE :search OR a.referral_code LIKE :search)";
            $params['search'] = "%{$search}%";
        }

        $where = implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM agents a WHERE {$where}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dataStmt = $this->pdo->prepare(
            "SELECT a.id, a.public_id, a.parent_agent_id, a.root_agent_id, a.tier,
                    a.full_name, a.agency_name, a.country, a.referral_code, a.status,
                    a.created_at, u.email AS encrypted_email
             FROM agents a
             JOIN users u ON u.id = a.user_id
             WHERE {$where}
             ORDER BY a.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $k => $v) {
            $dataStmt->bindValue(":{$k}", $v);
        }
        $dataStmt->bindValue(':limit',  $pager['per_page'], PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $pager['offset'],   PDO::PARAM_INT);
        $dataStmt->execute();
        $agents = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($agents as &$agent) {
            $agent['email'] = null;
            if (!empty($agent['encrypted_email'])) {
                try {
                    $agent['email'] = \TGA\CRM\Services\EncryptionService::decrypt($agent['encrypted_email']);
                } catch (\Throwable $e) {
                    $agent['email'] = null;
                }
            }
            unset($agent['encrypted_email']);
            
            $agent['id'] = (int)$agent['id'];
            $agent['parent_agent_id'] = $agent['parent_agent_id'] ? (int)$agent['parent_agent_id'] : null;
            $agent['root_agent_id'] = $agent['root_agent_id'] ? (int)$agent['root_agent_id'] : null;
            $agent['tier'] = (int)$agent['tier'];
        }

        Response::json([
            'data' => $agents,
            'meta' => [
                'total'       => $total,
                'page'        => $pager['page'],
                'per_page'    => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
            ],
        ]);
    }

    public function getTree(string $pid): void
    {
        RBACMiddleware::requirePermission('agents', 'view');

        // Check if root agent exists
        $stmt = $this->pdo->prepare("SELECT id FROM agents WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$pid]);
        $rootId = $stmt->fetchColumn();

        if (!$rootId) {
            Response::error('Agent not found', 'NOT_FOUND', 404);
        }

        // Recursive CTE query to get entire subtree under root agent
        $sql = "WITH RECURSIVE agent_tree AS (
                    SELECT id, public_id, parent_agent_id, root_agent_id, tier, full_name, agency_name, country, referral_code, status, created_at, user_id
                    FROM agents
                    WHERE id = ? AND deleted_at IS NULL
                    
                    UNION ALL
                    
                    SELECT a.id, a.public_id, a.parent_agent_id, a.root_agent_id, a.tier, a.full_name, a.agency_name, a.country, a.referral_code, a.status, a.created_at, a.user_id
                    FROM agents a
                    JOIN agent_tree t ON a.parent_agent_id = t.id
                    WHERE a.deleted_at IS NULL
                )
                SELECT t.*, u.email AS encrypted_email
                FROM agent_tree t
                JOIN users u ON u.id = t.user_id";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$rootId]);
        $flatAgents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($flatAgents as &$agent) {
            $agent['email'] = null;
            if (!empty($agent['encrypted_email'])) {
                try {
                    $agent['email'] = \TGA\CRM\Services\EncryptionService::decrypt($agent['encrypted_email']);
                } catch (\Throwable $e) {
                    $agent['email'] = null;
                }
            }
            unset($agent['encrypted_email']);

            $agent['id'] = (int)$agent['id'];
            $agent['parent_agent_id'] = $agent['parent_agent_id'] ? (int)$agent['parent_agent_id'] : null;
            $agent['root_agent_id'] = $agent['root_agent_id'] ? (int)$agent['root_agent_id'] : null;
            $agent['tier'] = (int)$agent['tier'];
        }

        $tree = $this->buildTree($flatAgents);

        Response::json([
            'data' => !empty($tree) ? $tree[0] : null
        ]);
    }

    private function buildTree(array $flatList): array
    {
        $map = [];
        $tree = [];

        foreach ($flatList as $item) {
            $id = (int) $item['id'];
            $map[$id] = $item;
            $map[$id]['children'] = [];
        }

        foreach ($flatList as $item) {
            $id = (int) $item['id'];
            $parentId = $item['parent_agent_id'] !== null ? (int)$item['parent_agent_id'] : null;

            if ($parentId !== null && isset($map[$parentId])) {
                $map[$parentId]['children'][] = &$map[$id];
            } else {
                $tree[] = &$map[$id];
            }
        }

        return $tree;
    }
}
