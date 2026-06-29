<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Paginator;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;

final class NotificationController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function index(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();
        $userId = (int) $user['id'];

        $query = $_GET;
        if (!isset($query['per_page']) && isset($query['limit'])) {
            $query['per_page'] = $query['limit'];
        }

        $pager = Paginator::fromQuery($query);
        $status = trim($_GET['status'] ?? 'all');
        $category = trim($_GET['category'] ?? '');

        $conditions = ["recipient_user_id = :user_id", "FIND_IN_SET('in_app', channel) > 0"];
        $params = ['user_id' => $userId];

        if ($status === 'unread') {
            $conditions[] = "read_at IS NULL";
        }

        if ($category !== '') {
            $conditions[] = "category = :category";
            $params['category'] = $category;
        }

        $where = implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM notifications WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dataStmt = $this->pdo->prepare(
            "SELECT public_id, event_key, category, subject, body, read_at,
                    related_entity_type, related_entity_id, created_at
             FROM notifications
             WHERE {$where}
             ORDER BY created_at DESC
             LIMIT :limit OFFSET :offset"
        );

        foreach ($params as $key => $value) {
            $dataStmt->bindValue(":{$key}", $value);
        }
        $dataStmt->bindValue(':limit', $pager['per_page'], PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $pager['offset'], PDO::PARAM_INT);
        $dataStmt->execute();
        $notifications = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $notifications,
            'meta' => [
                'total' => $total,
                'page' => $pager['page'],
                'per_page' => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
                'has_next' => ($pager['offset'] + $pager['per_page']) < $total,
                'has_prev' => $pager['page'] > 1,
            ],
        ]);
    }

    public function unreadCount(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();
        $userId = (int) $user['id'];

        $stmt = $this->pdo->prepare(
            "SELECT category, COUNT(*) AS cat_count
             FROM notifications
             WHERE recipient_user_id = ?
               AND FIND_IN_SET('in_app', channel) > 0
               AND read_at IS NULL
             GROUP BY category"
        );
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalCount = 0;
        $byCategory = [];
        foreach ($rows as $row) {
            $category = $row['category'] ?: 'general';
            $count = (int) $row['cat_count'];
            $byCategory[$category] = $count;
            $totalCount += $count;
        }

        Response::json([
            'data' => [
                'count' => $totalCount,
                'by_category' => $byCategory,
            ],
        ]);
    }

    public function markRead(string $publicId): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();
        $userId = (int) $user['id'];

        $stmt = $this->pdo->prepare(
            "UPDATE notifications
             SET read_at = NOW()
             WHERE public_id = ?
               AND recipient_user_id = ?
               AND FIND_IN_SET('in_app', channel) > 0
               AND read_at IS NULL"
        );
        $stmt->execute([$publicId, $userId]);

        Response::json(['data' => ['success' => true]]);
    }

    public function markReadAll(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();
        $userId = (int) $user['id'];

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $category = trim((string) ($input['category'] ?? $_GET['category'] ?? ''));

        $sql = "UPDATE notifications
                SET read_at = NOW()
                WHERE recipient_user_id = ?
                  AND FIND_IN_SET('in_app', channel) > 0
                  AND read_at IS NULL";
        $params = [$userId];

        if ($category !== '') {
            $sql .= " AND category = ?";
            $params[] = $category;
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        Response::json(['data' => ['success' => true]]);
    }
}
