<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Paginator;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;

final class ActivityLogController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function adminList(): void
    {
        AuthMiddleware::requireAuth();
        RBACMiddleware::requirePermission('activity_logs', 'view');
        $user = AuthMiddleware::user();

        $pager = Paginator::fromQuery($_GET, 50);
        $actorType = trim($_GET['actor_type'] ?? '');
        $action = trim($_GET['action'] ?? '');
        $targetType = trim($_GET['target_type'] ?? '');
        $dateFrom = trim($_GET['date_from'] ?? '');
        $dateTo = trim($_GET['date_to'] ?? '');

        $conditions = ['1=1'];
        $params = [];

        // Sub-admin module restriction could be implemented here based on permissions
        // Assuming $user['permissions'] might exist in a full RBAC setup, but for now we rely on the middleware.

        if ($actorType) {
            $conditions[] = 'actor_user_type = :actor_type';
            $params['actor_type'] = $actorType;
        }
        if ($action) {
            $conditions[] = 'action = :action';
            $params['action'] = $action;
        }
        if ($targetType) {
            $conditions[] = 'target_type = :target_type';
            $params['target_type'] = $targetType;
        }
        if ($dateFrom) {
            $conditions[] = 'created_at >= :date_from';
            $params['date_from'] = $dateFrom . ' 00:00:00';
        }
        if ($dateTo) {
            $conditions[] = 'created_at <= :date_to';
            $params['date_to'] = $dateTo . ' 23:59:59';
        }

        $where = implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM activity_logs WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dataStmt = $this->pdo->prepare("
            SELECT id, actor_user_id, actor_user_type, actor_display_name, action, target_type, target_public_id, target_display, ip_address, user_agent, created_at
            FROM activity_logs
            WHERE {$where}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        foreach ($params as $k => $v) {
            $dataStmt->bindValue(":{$k}", $v);
        }
        $dataStmt->bindValue(':limit', $pager['per_page'], PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $pager['offset'], PDO::PARAM_INT);
        $dataStmt->execute();
        $logs = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $logs,
            'meta' => [
                'total' => $total,
                'page' => $pager['page'],
                'per_page' => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
            ],
        ]);
    }

    public function agentList(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();
        $agentId = (int) $user['id']; // We use user ID directly as actor_user_id stores the user ID

        $pager = Paginator::fromQuery($_GET, 50);

        // Fetch subtree user IDs
        // For agents, we need to map agent->user_id. Wait, actor_user_id = user_id of the agent user.
        // We need to resolve the agent's subtree and get all their user_ids.
        $stmt = $this->pdo->prepare("SELECT id, root_agent_id, tier, parent_agent_id FROM agents WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$agentId]);
        $agent = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$agent) {
            Response::error('Agent profile not found.', 'FORBIDDEN', 403);
        }

        $agentIds = [(int) $agent['id']];
        $tier = (int) $agent['tier'];

        if ($tier === 1) {
            $subStmt = $this->pdo->prepare("SELECT id FROM agents WHERE root_agent_id = ? AND deleted_at IS NULL");
            $subStmt->execute([(int) $agent['root_agent_id']]);
            $agentIds = array_merge([(int) $agent['id']], $subStmt->fetchAll(PDO::FETCH_COLUMN));
        } elseif ($tier === 2) {
            $subStmt = $this->pdo->prepare("SELECT id FROM agents WHERE parent_agent_id = ? AND deleted_at IS NULL");
            $subStmt->execute([(int) $agent['id']]);
            $agentIds = array_merge($agentIds, $subStmt->fetchAll(PDO::FETCH_COLUMN));
        }

        $userIds = [];
        if (!empty($agentIds)) {
            $inClause = implode(',', array_fill(0, count($agentIds), '?'));
            $userStmt = $this->pdo->prepare("SELECT user_id FROM agents WHERE id IN ({$inClause}) AND user_id IS NOT NULL");
            $userStmt->execute($agentIds);
            $userIds = $userStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        if (empty($userIds)) {
            $userIds = [$agentId];
        }

        $inUserClause = implode(',', array_fill(0, count($userIds), '?'));
        
        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM activity_logs WHERE actor_user_id IN ({$inUserClause})");
        $countStmt->execute($userIds);
        $total = (int) $countStmt->fetchColumn();

        $dataStmt = $this->pdo->prepare("
            SELECT id, actor_user_id, actor_user_type, actor_display_name, action, target_type, target_public_id, target_display, ip_address, user_agent, created_at
            FROM activity_logs
            WHERE actor_user_id IN ({$inUserClause})
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ");
        $params = $userIds;
        $params[] = $pager['per_page'];
        $params[] = $pager['offset'];
        $dataStmt->execute($params);
        $logs = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $logs,
            'meta' => [
                'total' => $total,
                'page' => $pager['page'],
                'per_page' => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
            ],
        ]);
    }

    public function studentList(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();
        $userId = (int) $user['id'];

        $pager = Paginator::fromQuery($_GET, 50);

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM activity_logs WHERE actor_user_id = ?");
        $countStmt->execute([$userId]);
        $total = (int) $countStmt->fetchColumn();

        $dataStmt = $this->pdo->prepare("
            SELECT id, actor_user_id, actor_user_type, actor_display_name, action, target_type, target_public_id, target_display, ip_address, user_agent, created_at
            FROM activity_logs
            WHERE actor_user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ");
        $dataStmt->execute([$userId, $pager['per_page'], $pager['offset']]);
        $logs = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $logs,
            'meta' => [
                'total' => $total,
                'page' => $pager['page'],
                'per_page' => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
            ],
        ]);
    }
}
