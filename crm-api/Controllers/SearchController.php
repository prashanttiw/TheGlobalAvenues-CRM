<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RateLimitMiddleware;

class SearchController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function search(): void
    {
        $user = AuthMiddleware::user();
        RateLimitMiddleware::enforce('global_search_' . $user['id'], 20, 60);

        $q = trim($_GET['q'] ?? '');
        
        if (mb_strlen($q) < 3) {
            Response::json(['data' => ['results' => [], 'query' => $q]]);
            return;
        }

        $requestedTypes = explode(',', $_GET['types'] ?? 'students,applications,universities,agents,leads');
        
        $queries = [];
        $params = [];

        // 1. Students — scoped by role
        if (in_array('students', $requestedTypes, true)) {
            $agentFilter = "''";
            if ($user['utype'] === 'agent') {
                $stmt = $this->pdo->prepare("SELECT root_agent_id FROM agents WHERE user_id = ?");
                $stmt->execute([$user['id']]);
                $rootAgentId = $stmt->fetchColumn() ?: $user['id'];
                
                $agentFilter = "a.root_agent_id = ?";
                $qStr = "
                    SELECT 'student' AS type, s.public_id, s.full_name AS title, s.profile_status AS subtitle, s.nationality AS meta, 1 as sort_order
                    FROM students s
                    LEFT JOIN agents a ON a.id = s.agent_id
                    WHERE MATCH(s.full_name) AGAINST(? IN BOOLEAN MODE) AND s.deleted_at IS NULL AND {$agentFilter}
                    LIMIT 5
                ";
                $queries[] = $qStr;
                $params[] = $q . '*';
                $params[] = $rootAgentId;
            } else {
                $qStr = "
                    SELECT 'student' AS type, s.public_id, s.full_name AS title, s.profile_status AS subtitle, s.nationality AS meta, 1 as sort_order
                    FROM students s
                    WHERE MATCH(s.full_name) AGAINST(? IN BOOLEAN MODE) AND s.deleted_at IS NULL
                    LIMIT 5
                ";
                $queries[] = $qStr;
                $params[] = $q . '*';
            }
        }

        // 2. Applications — scoped by role
        if (in_array('applications', $requestedTypes, true)) {
            if ($user['utype'] === 'agent') {
                $stmt = $this->pdo->prepare("SELECT root_agent_id FROM agents WHERE user_id = ?");
                $stmt->execute([$user['id']]);
                $rootAgentId = $stmt->fetchColumn() ?: $user['id'];
                
                $qStr = "
                    SELECT 'application' AS type, app.public_id, app.reference_number AS title, app.status AS subtitle, s.full_name AS meta, 2 as sort_order
                    FROM applications app
                    JOIN students s ON s.id = app.student_id
                    LEFT JOIN agents a ON a.id = s.agent_id
                    WHERE (MATCH(app.reference_number) AGAINST(? IN BOOLEAN MODE) OR app.reference_number LIKE ?) 
                      AND app.deleted_at IS NULL AND a.root_agent_id = ?
                    LIMIT 5
                ";
                $queries[] = $qStr;
                $params[] = $q . '*';
                $params[] = '%' . $q . '%';
                $params[] = $rootAgentId;
            } else {
                $qStr = "
                    SELECT 'application' AS type, app.public_id, app.reference_number AS title, app.status AS subtitle, s.full_name AS meta, 2 as sort_order
                    FROM applications app
                    JOIN students s ON s.id = app.student_id
                    WHERE (MATCH(app.reference_number) AGAINST(? IN BOOLEAN MODE) OR app.reference_number LIKE ?) 
                      AND app.deleted_at IS NULL
                    LIMIT 5
                ";
                $queries[] = $qStr;
                $params[] = $q . '*';
                $params[] = '%' . $q . '%';
            }
        }

        // 3. Universities (all authenticated users can search)
        if (in_array('universities', $requestedTypes, true)) {
            $queries[] = "
                SELECT 'university' AS type, public_id, name AS title, city AS subtitle, country AS meta, 3 as sort_order
                FROM universities
                WHERE MATCH(name, city, country) AGAINST(? IN BOOLEAN MODE) AND deleted_at IS NULL
                LIMIT 5
            ";
            $params[] = $q . '*';
        }

        // 4. Agents (Admin only)
        if (in_array('agents', $requestedTypes, true) && $user['utype'] === 'admin') {
            $queries[] = "
                SELECT 'agent' AS type, a.public_id, a.agency_name AS title, u.email AS subtitle, u.first_name AS meta, 4 as sort_order
                FROM agents a
                JOIN users u ON a.user_id = u.id
                WHERE (MATCH(a.agency_name) AGAINST(? IN BOOLEAN MODE) OR u.first_name LIKE ?) AND a.deleted_at IS NULL AND u.deleted_at IS NULL
                LIMIT 5
            ";
            $params[] = $q . '*';
            $params[] = $q . '%';
        }

        // 5. Leads (Admin only)
        if (in_array('leads', $requestedTypes, true) && $user['utype'] === 'admin') {
            $queries[] = "
                SELECT 'lead' AS type, public_id, full_name AS title, status AS subtitle, source AS meta, 5 as sort_order
                FROM leads
                WHERE MATCH(full_name) AGAINST(? IN BOOLEAN MODE) AND deleted_at IS NULL
                LIMIT 5
            ";
            $params[] = $q . '*';
        }

        $results = [];
        if (!empty($queries)) {
            $unionQuery = implode(' UNION ALL ', $queries) . ' ORDER BY sort_order ASC';
            $stmt = $this->pdo->prepare($unionQuery);
            $stmt->execute($params);
            $rawResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($rawResults as $row) {
                unset($row['sort_order']);
                $results[] = $row;
            }
        }

        Response::json(['data' => $results]);
    }
}
