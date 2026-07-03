<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\ActivityLabelFormatter;
use TGA\CRM\Helpers\AgentHierarchy;
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
            // Tier-aware subtree: root sees everything under it, a sub-agent sees
            // itself + its own direct children, a sub-sub-agent sees only itself.
            $subtreeUserIds = AgentHierarchy::subtreeUserIds($this->pdo, (int) $user['id']);
            $placeholders = implode(',', array_fill(0, count($subtreeUserIds), '?'));
            $where = "WHERE al.actor_user_id IN ({$placeholders})";
            $params = $subtreeUserIds;
        } else {
            // Admin: own actions only, unless granted system-wide visibility
            // (activity_logs.view_all — same grant that gates the Super Activity Log page).
            $perms = (array) ($user['perms'] ?? []);
            $canViewAll = in_array('*', $perms, true) || in_array('activity_logs.view_all', $perms, true);

            if ($canViewAll) {
                $where = "WHERE 1=1";
                $params = [];
            } else {
                $where = "WHERE al.actor_user_id = ?";
                $params = [$user['id']];
            }
        }

        $feedStmt = $this->pdo->prepare("
            SELECT al.action, al.target_type, al.target_display,
                   al.actor_display_name, al.actor_user_type, al.created_at,
                   al.before_value, al.after_value
            FROM activity_logs al
            {$where}
            ORDER BY al.created_at DESC
            LIMIT {$limit}
        ");
        $feedStmt->execute($params);
        $rows = $feedStmt->fetchAll(PDO::FETCH_ASSOC);

        $formatted = array_map(function (array $row): array {
            return [
                'action'             => $row['action'],
                'target_type'        => $row['target_type'],
                'target_display'     => $row['target_display'],
                'actor_display_name' => $row['actor_display_name'],
                'actor_user_type'    => $row['actor_user_type'],
                'created_at'         => $row['created_at'],
                'after_value'        => $row['after_value'],
                'label'              => ActivityLabelFormatter::label($row),
                'time_ago'           => ActivityLabelFormatter::timeAgo($row['created_at']),
                'icon'               => ActivityLabelFormatter::icon($row['action']),
            ];
        }, $rows);

        Response::json(['data' => $formatted]);
    }
}
