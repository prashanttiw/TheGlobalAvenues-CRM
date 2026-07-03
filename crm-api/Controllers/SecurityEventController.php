<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Paginator;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
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

        // `security_events.view` is its own independent page grant (an admin can be given
        // ONLY the Security page, without Students/Agents/User Management). Resolving a
        // student/agent/admin's real name below must not leak identities that admin isn't
        // separately authorized to see — redact by role unless the viewer has that role's
        // own view permission (or is a super admin).
        $viewerPerms = (array) (AuthMiddleware::user()['perms'] ?? []);
        $isSuperViewer = in_array('*', $viewerPerms, true);
        $canSeeRole = [
            'student' => $isSuperViewer || in_array('students.view', $viewerPerms, true),
            'agent' => $isSuperViewer || in_array('agents.view', $viewerPerms, true),
            'admin' => $isSuperViewer || in_array('user_management.view', $viewerPerms, true),
        ];

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

        // Resolve user_id to a human name/role where known (login_success, password_changed, etc.).
        // Pre-auth events (failed logins, OTP/rate-limit abuse before identity is established)
        // have no user_id — those stay identified by their hashed identifier/IP only.
        $stmt = $this->pdo->prepare("
            SELECT
                se.id, se.event_type, se.identifier, se.ip_address, se.user_agent, se.details, se.created_at,
                se.user_id, u.user_type AS actor_role,
                COALESCE(a.full_name, ag.full_name, s.full_name) AS actor_name
            FROM security_events se
            LEFT JOIN users u ON u.id = se.user_id
            LEFT JOIN admins a ON a.user_id = se.user_id
            LEFT JOIN agents ag ON ag.user_id = se.user_id
            LEFT JOIN students s ON s.user_id = se.user_id
            WHERE {$where}
            ORDER BY se.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $pager['per_page'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pager['offset'], PDO::PARAM_INT);
        $stmt->execute();
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($events as &$event) {
            $role = $event['actor_role'] ?? null;
            if ($role !== null && empty($canSeeRole[$role])) {
                $event['actor_name'] = null;
            }
        }
        unset($event);

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
