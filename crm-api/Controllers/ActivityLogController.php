<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\ActivityLabelFormatter;
use TGA\CRM\Helpers\AgentHierarchy;
use TGA\CRM\Helpers\Paginator;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;

final class ActivityLogController
{
    private PDO $pdo;

    private const LIST_COLUMNS = "id, actor_user_id, actor_user_type, actor_display_name, action, target_type, target_public_id, target_display, before_value, after_value, ip_address, user_agent, created_at";

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    /**
     * "Activity Log" — every admin's own actions only. No grant required beyond
     * being an authenticated admin.
     */
    public function adminList(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();

        $pager = Paginator::fromQuery($_GET, 50);
        [$where, $params] = $this->buildFilterClause([
            'actor_user_id = :self' => ['self' => (int) $user['id']],
        ]);

        $this->respondWithLogs($where, $params, $pager);
    }

    /**
     * "Super Activity Log" — system-wide, every actor type. Gated by
     * activity_logs.view_all (super admins bypass via RBACMiddleware).
     */
    public function superList(): void
    {
        AuthMiddleware::requireAuth();
        RBACMiddleware::requirePermission('activity_logs', 'view_all');

        $pager = Paginator::fromQuery($_GET, 50);
        [$where, $params] = $this->buildFilterClause([], includeActorType: true);

        $this->respondWithLogs($where, $params, $pager);
    }

    public function agentList(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();
        $userIds = AgentHierarchy::subtreeUserIds($this->pdo, (int) $user['id']);

        $inClause = implode(',', array_fill(0, count($userIds), '?'));
        $conditions = ["actor_user_id IN ({$inClause})"];
        $params = $userIds;

        // NOTE: the log's own "action" column is filtered via ?log_action=, not
        // ?action= — the latter is reserved by the /?route=X&action=Y routing
        // convention and is always present (equal to the route action name).
        $logAction = trim($_GET['log_action'] ?? '');
        $targetType = trim($_GET['target_type'] ?? '');
        $dateFrom = trim($_GET['date_from'] ?? '');
        $dateTo = trim($_GET['date_to'] ?? '');

        if ($logAction) {
            $conditions[] = 'action = ?';
            $params[] = $logAction;
        }
        if ($targetType) {
            $conditions[] = 'target_type = ?';
            $params[] = $targetType;
        }
        if ($dateFrom) {
            $conditions[] = 'created_at >= ?';
            $params[] = $dateFrom . ' 00:00:00';
        }
        if ($dateTo) {
            $conditions[] = 'created_at <= ?';
            $params[] = $dateTo . ' 23:59:59';
        }

        $where = implode(' AND ', $conditions);
        $pager = Paginator::fromQuery($_GET, 50);

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM activity_logs WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dataStmt = $this->pdo->prepare("
            SELECT " . self::LIST_COLUMNS . "
            FROM activity_logs
            WHERE {$where}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ");
        $dataParams = $params;
        $dataParams[] = $pager['per_page'];
        $dataParams[] = $pager['offset'];
        $dataStmt->execute($dataParams);
        $logs = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => self::enrichWithLabels($logs),
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
            'data' => self::enrichWithLabels($logs),
            'meta' => [
                'total' => $total,
                'page' => $pager['page'],
                'per_page' => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
            ],
        ]);
    }

    /**
     * Builds a WHERE clause + named params from the standard query filters
     * (log_action, target_type, date_from, date_to), plus any fixed conditions
     * passed in (e.g. actor_user_id = :self).
     *
     * NOTE: the log's own "action" column is filtered via ?log_action=, not
     * ?action= — the latter is reserved by the /?route=X&action=Y routing
     * convention and is always present (equal to the route action name).
     *
     * @param array<string, array<string, mixed>> $fixedConditions map of "SQL fragment" => named params it uses
     * @return array{0: string, 1: array<string, mixed>}
     */
    private function buildFilterClause(array $fixedConditions, bool $includeActorType = false): array
    {
        $conditions = ['1=1'];
        $params = [];

        foreach ($fixedConditions as $sql => $sqlParams) {
            $conditions[] = $sql;
            $params = array_merge($params, $sqlParams);
        }

        if ($includeActorType) {
            $actorType = trim($_GET['actor_type'] ?? '');
            if ($actorType) {
                $conditions[] = 'actor_user_type = :actor_type';
                $params['actor_type'] = $actorType;
            }
        }

        $logAction = trim($_GET['log_action'] ?? '');
        $targetType = trim($_GET['target_type'] ?? '');
        $dateFrom = trim($_GET['date_from'] ?? '');
        $dateTo = trim($_GET['date_to'] ?? '');

        if ($logAction) {
            $conditions[] = 'action = :log_action';
            $params['log_action'] = $logAction;
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

        return [implode(' AND ', $conditions), $params];
    }

    /**
     * @param array<string, mixed> $params
     * @param array{page: int, per_page: int, offset: int} $pager
     */
    private function respondWithLogs(string $where, array $params, array $pager): void
    {
        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM activity_logs WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dataStmt = $this->pdo->prepare("
            SELECT " . self::LIST_COLUMNS . "
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
            'data' => self::enrichWithLabels($logs),
            'meta' => [
                'total' => $total,
                'page' => $pager['page'],
                'per_page' => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
            ],
        ]);
    }

    /** @param array<int, array<string, mixed>> $logs */
    private static function enrichWithLabels(array $logs): array
    {
        return array_map(static function (array $row): array {
            $row['label'] = ActivityLabelFormatter::label($row);
            $row['icon'] = ActivityLabelFormatter::icon((string) $row['action']);
            $row['time_ago'] = ActivityLabelFormatter::timeAgo((string) $row['created_at']);
            return $row;
        }, $logs);
    }
}
