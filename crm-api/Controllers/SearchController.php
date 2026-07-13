<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RateLimitMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Services\EncryptionService;

class SearchController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    /**
     * Resolve the searching agent's own tier-scoped subtree condition — same rule as
     * AgentController's tier scoping (Tier 3: own students only; Tier 2: own + direct
     * sub-agents' students; Tier 1: entire root subtree). Returns [sqlFragment, bindParams]
     * for use against a query that has already joined `agents a ON a.id = s.agent_id`.
     *
     * @return array{0: string, 1: array<int, int>}
     */
    private function resolveAgentSearchScope(int $userId): array
    {
        $stmt = $this->pdo->prepare("SELECT id, tier, root_agent_id FROM agents WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$userId]);
        $agent = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$agent) {
            // No agent profile resolved — match nothing rather than leaking an unscoped result set.
            return ['1 = 0', []];
        }

        $agentId = (int) $agent['id'];
        $tier = (int) $agent['tier'];

        if ($tier === 3) {
            return ['s.agent_id = ?', [$agentId]];
        }

        if ($tier === 2) {
            return ['(s.agent_id = ? OR a.parent_agent_id = ?)', [$agentId, $agentId]];
        }

        return ['a.root_agent_id = ?', [(int) $agent['root_agent_id']]];
    }

    public function search(): void
    {
        $user = AuthMiddleware::user();
        RateLimitMiddleware::enforce('global_search_' . $user['id'], 20, 60);

        $q = trim($_GET['q'] ?? '');
        
        if (mb_strlen($q) < 3) {
            Response::json(['data' => []]);
            return;
        }

        $requestedTypes = explode(',', $_GET['types'] ?? 'students,applications,universities,courses,agents,leads');

        $queries = [];
        $params = [];

        // 1. Students — scoped by role. Students never search other students (privacy) — this
        // block is skipped entirely for that role.
        if (in_array('students', $requestedTypes, true) && $user['utype'] !== 'student'
            && ($user['utype'] !== 'admin' || RBACMiddleware::hasPermission($user, 'students', 'view'))
        ) {
            // Email/phone are XSalsa20-encrypted — LIKE on ciphertext is meaningless, so match
            // by exact lookup-hash equality plus fixed-length prefix-hash equality for a
            // "starts with" match (same pattern as AdminStudentController::listAll()).
            $studentMatchOr = ['MATCH(s.full_name) AGAINST(? IN BOOLEAN MODE)', 'u.email_lookup_hash = ?', 'u.phone_lookup_hash = ?'];
            $studentMatchParams = [$q . '*', EncryptionService::hash($q), EncryptionService::hash($q)];
            foreach ([4, 6, 8] as $len) {
                $prefixHash = EncryptionService::hashPrefix($q, $len);
                if ($prefixHash !== null) {
                    $studentMatchOr[] = "u.email_prefix{$len}_hash = ?";
                    $studentMatchParams[] = $prefixHash;
                }
            }
            foreach ([4, 6] as $len) {
                $phonePrefixHash = EncryptionService::hashPhonePrefix($q, $len);
                if ($phonePrefixHash !== null) {
                    $studentMatchOr[] = "u.phone_prefix{$len}_hash = ?";
                    $studentMatchParams[] = $phonePrefixHash;
                }
            }
            $studentMatchSql = '(' . implode(' OR ', $studentMatchOr) . ')';

            if ($user['utype'] === 'agent') {
                // SECURITY: must scope by the searcher's own tier, not blanket root_agent_id —
                // otherwise Tier 2/3 agents can search up students belonging to siblings/parents
                // in the same root subtree who they have no actual relationship with. Mirrors the
                // exact tier-scoping pattern used in AgentController (dashboardSummary/listStudents/etc).
                [$agentScopeSql, $agentScopeParams] = $this->resolveAgentSearchScope($user['id']);

                $qStr = "
                    SELECT 'student' AS type, s.public_id, s.full_name AS title, s.profile_status AS subtitle, s.nationality AS meta, 1 as sort_order
                    FROM students s
                    JOIN users u ON u.id = s.user_id
                    LEFT JOIN agents a ON a.id = s.agent_id
                    WHERE {$studentMatchSql} AND s.deleted_at IS NULL AND {$agentScopeSql}
                    LIMIT 5
                ";
                $queries[] = $qStr;
                array_push($params, ...$studentMatchParams);
                array_push($params, ...$agentScopeParams);
            } else {
                $qStr = "
                    SELECT 'student' AS type, s.public_id, s.full_name AS title, s.profile_status AS subtitle, s.nationality AS meta, 1 as sort_order
                    FROM students s
                    JOIN users u ON u.id = s.user_id
                    WHERE {$studentMatchSql} AND s.deleted_at IS NULL
                    LIMIT 5
                ";
                $queries[] = $qStr;
                array_push($params, ...$studentMatchParams);
            }
        }

        // 2. Applications — scoped by role
        if (in_array('applications', $requestedTypes, true)) {
            if ($user['utype'] === 'agent') {
                // SECURITY: same tier-scoping requirement as the students branch above.
                [$agentScopeSql, $agentScopeParams] = $this->resolveAgentSearchScope($user['id']);

                // Agents have no standalone application detail view — applications only ever
                // render nested inside the owning student's page — so this deliberately returns
                // the STUDENT's public_id (not the application's) for navigation purposes.
                $qStr = "
                    SELECT 'application' AS type, s.public_id, app.reference_number AS title, app.status AS subtitle, s.full_name AS meta, 2 as sort_order
                    FROM applications app
                    JOIN students s ON s.id = app.student_id
                    LEFT JOIN agents a ON a.id = s.agent_id
                    WHERE (MATCH(app.reference_number) AGAINST(? IN BOOLEAN MODE) OR app.reference_number LIKE ?)
                      AND app.deleted_at IS NULL AND {$agentScopeSql}
                    LIMIT 5
                ";
                $queries[] = $qStr;
                $params[] = $q . '*';
                $params[] = '%' . $q . '%';
                array_push($params, ...$agentScopeParams);
            } elseif ($user['utype'] === 'student') {
                // Students only ever see their own applications.
                $qStr = "
                    SELECT 'application' AS type, app.public_id, app.reference_number AS title, app.status AS subtitle, s.full_name AS meta, 2 as sort_order
                    FROM applications app
                    JOIN students s ON s.id = app.student_id
                    WHERE (MATCH(app.reference_number) AGAINST(? IN BOOLEAN MODE) OR app.reference_number LIKE ?)
                      AND app.deleted_at IS NULL AND s.user_id = ?
                    LIMIT 5
                ";
                $queries[] = $qStr;
                $params[] = $q . '*';
                $params[] = '%' . $q . '%';
                $params[] = $user['id'];
            } elseif ($user['utype'] !== 'admin' || RBACMiddleware::hasPermission($user, 'applications', 'view')) {
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

        // 3b. Courses (all authenticated users can search) — no FULLTEXT index exists on
        // courses.name (same situation as UniversityController's course-name search), so this
        // uses LIKE like every other course-name lookup in the codebase. There is no standalone
        // course detail page in the frontend (courses only ever render nested under their
        // university), so this deliberately returns the PARENT university's public_id — clicking
        // a course result opens the university page that lists it, same as a direct university
        // match would.
        if (in_array('courses', $requestedTypes, true)) {
            $queries[] = "
                SELECT 'course' AS type, un.public_id, c.name AS title, un.name AS subtitle, un.country AS meta, 3 as sort_order
                FROM courses c
                JOIN universities un ON un.id = c.university_id
                WHERE c.name LIKE ? AND c.deleted_at IS NULL AND un.deleted_at IS NULL
                LIMIT 5
            ";
            $params[] = '%' . $q . '%';
        }

        // 4. Agents (Admin only)
        if (in_array('agents', $requestedTypes, true) && $user['utype'] === 'admin'
            && RBACMiddleware::hasPermission($user, 'agents', 'view')
        ) {
            // No join to `users` needed (and users has no first_name/last_name column —
            // only agents/students/admins have their own full_name) — agents.full_name
            // already holds the agent's personal name. The FULLTEXT index on this table
            // (`ft_agents_name`) is a single composite index over (full_name, agency_name)
            // together — MATCH() must reference both columns in that exact combination or
            // MariaDB throws "Can't find FULLTEXT index matching the column list".
            $queries[] = "
                SELECT 'agent' AS type, a.public_id, a.agency_name AS title, a.status AS subtitle, a.full_name AS meta, 4 as sort_order
                FROM agents a
                WHERE MATCH(a.full_name, a.agency_name) AGAINST(? IN BOOLEAN MODE) AND a.deleted_at IS NULL
                LIMIT 5
            ";
            $params[] = $q . '*';
        }

        // 5. Leads (Admin only)
        if (in_array('leads', $requestedTypes, true) && $user['utype'] === 'admin'
            && RBACMiddleware::hasPermission($user, 'leads', 'view')
        ) {
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
            // Each branch has its own LIMIT, so it must be parenthesized — a bare
            // LIMIT is only valid on the final SELECT of a UNION (MariaDB
            // SQLSTATE[42000] syntax error otherwise).
            $wrappedQueries = array_map(static fn(string $qStr): string => "({$qStr})", $queries);
            $unionQuery = implode(' UNION ALL ', $wrappedQueries) . ' ORDER BY sort_order ASC';
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
