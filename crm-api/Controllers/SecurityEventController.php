<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Paginator;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\RBACMiddleware;

final class SecurityEventController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function adminList(): void
    {
        RBACMiddleware::requirePermission('security_events', 'view');

        $pager = Paginator::fromQuery($_GET, 50);
        $eventType = trim((string) ($_GET['event_type'] ?? ''));
        $dateFrom = trim((string) ($_GET['date_from'] ?? ''));
        $dateTo = trim((string) ($_GET['date_to'] ?? ''));

        $conditions = ['1=1'];
        $params = [];

        if ($eventType !== '') {
            $conditions[] = 'event_type = :event_type';
            $params['event_type'] = $eventType;
        }
        if ($dateFrom !== '') {
            $conditions[] = 'created_at >= :date_from';
            $params['date_from'] = $dateFrom . ' 00:00:00';
        }
        if ($dateTo !== '') {
            $conditions[] = 'created_at <= :date_to';
            $params['date_to'] = $dateTo . ' 23:59:59';
        }

        $where = implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM security_events WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->pdo->prepare("
            SELECT id, event_type, identifier, ip_address, user_agent, details, created_at
            FROM security_events
            WHERE {$where}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $pager['per_page'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pager['offset'], PDO::PARAM_INT);
        $stmt->execute();
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $events,
            'meta' => [
                'total' => $total,
                'page' => $pager['page'],
                'per_page' => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
                'has_next' => ($pager['page'] * $pager['per_page']) < $total,
            ],
        ]);
    }
}
