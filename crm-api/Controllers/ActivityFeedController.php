<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;

class ActivityFeedController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function getFeed(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();
        $limit = min((int)($_GET['limit'] ?? 10), 50);

        $where = "WHERE 1=1";
        $params = [];

        if ($user['utype'] === 'student') {
            $where = "WHERE al.actor_user_id = ?";
            $params = [$user['id']];
        } elseif ($user['utype'] === 'agent') {
            // All users in agent's subtree
            $stmt = $this->pdo->prepare("SELECT id, root_agent_id FROM agents WHERE user_id = ? AND deleted_at IS NULL");
            $stmt->execute([$user['id']]);
            $agent = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$agent) {
                Response::error('Agent not found', 'NOT_FOUND', 404);
            }

            // Get subtree agents
            $subStmt = $this->pdo->prepare("SELECT id FROM agents WHERE root_agent_id = ? AND deleted_at IS NULL");
            $subStmt->execute([$agent['root_agent_id']]);
            $subtreeAgentIds = array_merge([$agent['id']], $subStmt->fetchAll(PDO::FETCH_COLUMN));

            // Get their user_ids
            $inClause = implode(',', array_fill(0, count($subtreeAgentIds), '?'));
            $userStmt = $this->pdo->prepare("SELECT user_id FROM agents WHERE id IN ({$inClause}) AND user_id IS NOT NULL");
            $userStmt->execute($subtreeAgentIds);
            $subtreeUserIds = $userStmt->fetchAll(PDO::FETCH_COLUMN);

            if (empty($subtreeUserIds)) {
                $subtreeUserIds = [$user['id']];
            }

            $placeholders = implode(',', array_fill(0, count($subtreeUserIds), '?'));
            $where = "WHERE al.actor_user_id IN ({$placeholders})";
            $params = $subtreeUserIds;
        } else {
            // Admin: module-filtered for sub-admins
            // For now, assume full access if admin unless implementing fine-grained RBAC per spec
            $where = "WHERE 1=1";
            $params = [];
        }

        $feedStmt = $this->pdo->prepare("
            SELECT al.action, al.target_type, al.target_display,
                   al.actor_display_name, al.actor_user_type, al.created_at,
                   al.after_value
            FROM activity_logs al
            {$where}
            ORDER BY al.created_at DESC
            LIMIT {$limit}
        ");
        $feedStmt->execute($params);
        $rows = $feedStmt->fetchAll(PDO::FETCH_ASSOC);

        $formatted = array_map(function ($row) {
            return [
                'action'             => $row['action'],
                'target_type'        => $row['target_type'],
                'target_display'     => $row['target_display'],
                'actor_display_name' => $row['actor_display_name'],
                'actor_user_type'    => $row['actor_user_type'],
                'created_at'         => $row['created_at'],
                'after_value'        => $row['after_value'],
                'label'              => self::formatAction($row['action'], $row['target_display'], $row['actor_display_name'], clone (object)$row),
                'time_ago'           => self::timeAgo($row['created_at']),
                'icon'               => self::getIcon($row['action']),
            ];
        }, $rows);

        Response::json(['data' => $formatted]);
    }

    private static function formatAction(string $action, ?string $targetDisplay, ?string $actorDisplay, $row): string
    {
        $actor = $actorDisplay ?? 'System';
        $target = $targetDisplay ?? 'Record';
        $status = 'updated';

        if (!empty($row->after_value)) {
            $decoded = json_decode($row->after_value, true);
            if (is_array($decoded) && isset($decoded['status'])) {
                $status = $decoded['status'];
            }
        }

        return match ($action) {
            'student.registered'         => "{$actor} registered as a student",
            'application.status_changed' => "Application {$target} moved to {$status}",
            'document_request.approved'  => "Document {$target} approved",
            'document_request.rejected'  => "Document {$target} rejected - resubmit required",
            'agent.approved'             => "{$target} approved as a partner agent",
            'agent.suspended'            => "{$target} account suspended",
            'login'                      => "{$actor} logged in",
            'lead.assigned'              => "Lead {$target} was assigned to {$actor}",
            default                      => "{$actor} performed {$action} on {$target}"
        };
    }

    private static function getIcon(string $action): string
    {
        return match ($action) {
            'student.registered'         => 'UserPlus',
            'application.status_changed' => 'RefreshCw',
            'document_request.approved'  => 'CheckCircle2',
            'document_request.rejected'  => 'XCircle',
            'agent.approved'             => 'Briefcase',
            'agent.suspended'            => 'Ban',
            'login'                      => 'LogIn',
            'lead.assigned'              => 'UserCheck',
            default                      => 'Activity'
        };
    }

    private static function timeAgo(string $datetime): string
    {
        $time = strtotime($datetime);
        $diff = time() - $time;
        
        if ($diff < 60) return 'Just now';
        if ($diff < 3600) return floor($diff / 60) . 'm ago';
        if ($diff < 86400) return floor($diff / 3600) . 'h ago';
        return floor($diff / 86400) . 'd ago';
    }
}
