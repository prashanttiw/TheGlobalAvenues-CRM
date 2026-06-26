<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Paginator;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;

final class AgentController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolve the logged-in user's agent record.
     * Returns array with at minimum: id, public_id, root_agent_id, tier, referral_code, agent_lock_status
     */
    private function resolveAgent(int $userId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT id, public_id, root_agent_id, parent_agent_id, tier,
                    full_name, agency_name, referral_code, status, country, created_at
             FROM agents WHERE user_id = ? AND deleted_at IS NULL"
        );
        $stmt->execute([$userId]);
        $agent = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$agent) {
            Response::error('Agent profile not found.', 'FORBIDDEN', 403);
        }

        return $agent;
    }

    /**
     * Resolve target agent public_id to internal ID, enforcing strict tier subtree isolation.
     * Tier 3 agents cannot have sub-agents.
     * Tier 2 agents can only access direct sub-agents (parent_agent_id = tier 2 ID).
     * Tier 1 agents can access any descendant in their root subtree (root_agent_id = tier 1 ID).
     */
    private function resolveTargetAgent(array $myAgent, string $targetPid): ?int
    {
        $myId   = (int) $myAgent['id'];
        $myTier = (int) $myAgent['tier'];

        if ($myTier === 3) {
            return null; // L3 has no sub-agents
        }

        if ($myTier === 2) {
            $stmt = $this->pdo->prepare(
                "SELECT id FROM agents WHERE public_id = ? AND parent_agent_id = ? AND deleted_at IS NULL"
            );
            $stmt->execute([$targetPid, $myId]);
            $val = $stmt->fetchColumn();
            return $val ? (int)$val : null;
        }

        // Tier 1
        $stmt = $this->pdo->prepare(
            "SELECT id FROM agents WHERE public_id = ? AND root_agent_id = ? AND deleted_at IS NULL"
        );
        $stmt->execute([$targetPid, $myId]);
        $val = $stmt->fetchColumn();
        return $val ? (int)$val : null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DASHBOARD SUMMARY  GET /agent/dashboard/summary
    // ─────────────────────────────────────────────────────────────────────────

    public function dashboardSummary(): void
    {
        AuthMiddleware::requireAuth();
        $user  = AuthMiddleware::user();
        $agent = $this->resolveAgent($user['id']);
        $root  = (int) $agent['root_agent_id'];

        // Student counts — scoped to this agent's subtree via root_agent_id
        $stmt = $this->pdo->prepare(
            "SELECT
                COUNT(*)                                                              AS total_students,
                SUM(CASE WHEN s.profile_status = 'registered'   THEN 1 ELSE 0 END)  AS new_count,
                SUM(CASE WHEN s.profile_status = 'enrolled'     THEN 1 ELSE 0 END)  AS enrolled_count,
                SUM(CASE WHEN s.profile_status NOT IN ('registered','enrolled')
                              AND s.profile_status != 'rejected' THEN 1 ELSE 0 END) AS in_progress_count,
                ROUND(
                    SUM(CASE WHEN s.profile_status = 'enrolled' THEN 1 ELSE 0 END) * 100.0
                    / NULLIF(COUNT(*), 0), 1
                )                                                                     AS conversion_rate_pct
             FROM students s
             JOIN agents a ON a.id = s.agent_id
             WHERE a.root_agent_id = ? AND s.deleted_at IS NULL"
        );
        $stmt->execute([$root]);
        $students = $stmt->fetch(PDO::FETCH_ASSOC);

        // Own commission totals (DIRECT only — never subtree blended)
        $stmt = $this->pdo->prepare(
            "SELECT
                SUM(CASE WHEN c.status = 'pending'   THEN c.amount ELSE 0 END) AS pending_inr,
                SUM(CASE WHEN c.status = 'confirmed' THEN c.amount ELSE 0 END) AS confirmed_inr,
                SUM(CASE WHEN c.status = 'paid'      THEN c.amount ELSE 0 END) AS paid_inr
             FROM commissions c
             WHERE c.agent_id = ? AND c.currency = 'INR' AND c.deleted_at IS NULL"
        );
        $stmt->execute([$agent['id']]);
        $commissions = $stmt->fetch(PDO::FETCH_ASSOC);

        // Sub-agent count
        $stmt = $this->pdo->prepare(
            "SELECT
                COUNT(*)                                                            AS total_sub_agents,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)               AS pending_sub_agents
             FROM agents
             WHERE root_agent_id = ? AND id != ? AND deleted_at IS NULL"
        );
        $stmt->execute([$root, $agent['id']]);
        $team = $stmt->fetch(PDO::FETCH_ASSOC);

        Response::json([
            'data' => [
                'agent' => [
                    'public_id'      => $agent['public_id'],
                    'full_name'      => $agent['full_name'],
                    'agency_name'    => $agent['agency_name'],
                    'tier'           => (int) $agent['tier'],
                    'referral_code'  => $agent['referral_code'],
                    'status'         => $agent['status'],
                ],
                'students' => [
                    'total'               => (int) $students['total_students'],
                    'new'                 => (int) $students['new_count'],
                    'in_progress'         => (int) $students['in_progress_count'],
                    'enrolled'            => (int) $students['enrolled_count'],
                    'conversion_rate_pct' => (float) ($students['conversion_rate_pct'] ?? 0),
                ],
                'commissions' => [
                    'pending_inr'   => (float) ($commissions['pending_inr']   ?? 0),
                    'confirmed_inr' => (float) ($commissions['confirmed_inr'] ?? 0),
                    'paid_inr'      => (float) ($commissions['paid_inr']      ?? 0),
                ],
                'team' => [
                    'total_sub_agents'   => (int) $team['total_sub_agents'],
                    'pending_sub_agents' => (int) $team['pending_sub_agents'],
                ],
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STUDENT LIST  GET /agent/students
    // Query params: page, per_page, status, search, agent_pid
    // ─────────────────────────────────────────────────────────────────────────

    public function listStudents(): void
    {
        AuthMiddleware::requireAuth();
        RBACMiddleware::requirePermission('students', 'view');
        $user  = AuthMiddleware::user();
        $agent = $this->resolveAgent($user['id']);
        $root  = (int) $agent['root_agent_id'];
        $pager = Paginator::fromQuery($_GET);

        // Optional filters
        $status    = trim($_GET['status']    ?? '');
        $search    = trim($_GET['search']    ?? '');
        $agentPid  = trim($_GET['agent_pid'] ?? '');

        // Resolve optional agent_pid filter (must be in this agent's subtree)
        $filterAgentId = null;
        if ($agentPid) {
            if ($agentPid === $agent['public_id']) {
                $filterAgentId = (int)$agent['id'];
            } else {
                $filterAgentId = $this->resolveTargetAgent($agent, $agentPid);
                if (!$filterAgentId) {
                    Response::error('Agent not found in your team.', 'NOT_FOUND', 404);
                }
            }
        }

        $conditions = ["s.deleted_at IS NULL"];
        $params     = [];

        if ($filterAgentId) {
            $conditions[] = "s.agent_id = :filter_agent_id";
            $params['filter_agent_id'] = $filterAgentId;
        } else {
            // General scoping conditions based on tier
            if ((int)$agent['tier'] === 3) {
                $conditions[] = "s.agent_id = :my_agent_id";
                $params['my_agent_id'] = (int)$agent['id'];
            } elseif ((int)$agent['tier'] === 2) {
                $conditions[] = "(s.agent_id = :my_agent_id OR a.parent_agent_id = :my_agent_id)";
                $params['my_agent_id'] = (int)$agent['id'];
            } else {
                $conditions[] = "a.root_agent_id = :root";
                $params['root'] = $root;
            }
        }
        if ($status) {
            $conditions[] = "s.profile_status = :status";
            $params['status'] = $status;
        }
        if ($search) {
            $conditions[] = "s.full_name LIKE :search";
            $params['search'] = "%{$search}%";
        }

        $where = implode(' AND ', $conditions);

        // Count query
        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM students s JOIN agents a ON a.id = s.agent_id WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        // Data query — N+1-safe: LEFT JOIN aggregation for applied_count
        $dataStmt = $this->pdo->prepare(
            "SELECT s.public_id, s.full_name, s.nationality, s.profile_status, s.created_at,
                    a.full_name AS agent_name, a.public_id AS agent_public_id, a.tier AS agent_tier,
                    COALESCE(agg.applied_count, 0) AS applied_count
             FROM students s
             JOIN agents a ON a.id = s.agent_id
             LEFT JOIN (
                 SELECT student_id, COUNT(*) AS applied_count
                 FROM applications
                 WHERE deleted_at IS NULL
                 GROUP BY student_id
             ) agg ON agg.student_id = s.id
             WHERE {$where}
             ORDER BY s.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        // PDO requires named or positional; add limit/offset separately
        foreach ($params as $k => $v) {
            $dataStmt->bindValue(":{$k}", $v);
        }
        $dataStmt->bindValue(':limit',  $pager['per_page'], PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $pager['offset'],   PDO::PARAM_INT);
        $dataStmt->execute();
        $students = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $students,
            'meta' => [
                'total'       => $total,
                'page'        => $pager['page'],
                'per_page'    => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
                'has_next'    => ($pager['offset'] + $pager['per_page']) < $total,
                'has_prev'    => $pager['page'] > 1,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STUDENT DETAIL  GET /agent/students/:pid
    // SECURITY: Must verify subtree ownership — never skip this check
    // ─────────────────────────────────────────────────────────────────────────

    public function getStudent(string $pid): void
    {
        AuthMiddleware::requireAuth();
        RBACMiddleware::requirePermission('students', 'view');
        $user  = AuthMiddleware::user();
        $agent = $this->resolveAgent($user['id']);
        $root  = (int) $agent['root_agent_id'];

        $checkSql = '';
        $checkParams = [];
        if ((int)$agent['tier'] === 3) {
            $checkSql = "s.agent_id = :my_agent_id";
            $checkParams['my_agent_id'] = (int)$agent['id'];
        } elseif ((int)$agent['tier'] === 2) {
            $checkSql = "(s.agent_id = :my_agent_id OR a.parent_agent_id = :my_agent_id)";
            $checkParams['my_agent_id'] = (int)$agent['id'];
        } else {
            $checkSql = "a.root_agent_id = :root";
            $checkParams['root'] = $root;
        }

        // SECURITY: subtree check is mandatory — no PII columns exposed
        $stmt = $this->pdo->prepare(
            "SELECT s.public_id, s.full_name, s.nationality, s.profile_status,
                    s.agent_lock_status, s.created_at,
                    a.full_name AS agent_name, a.public_id AS agent_public_id, a.tier AS agent_tier
             FROM students s
             JOIN agents a ON a.id = s.agent_id
             WHERE s.public_id = :pid
               AND {$checkSql}
               AND s.deleted_at IS NULL"
        );
        $stmt->execute(array_merge(['pid' => $pid], $checkParams));
        $student = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$student) {
            Response::error('Student not found or not in your portfolio.', 'STUDENT_NOT_IN_SUBTREE', 403);
        }

        // Application summaries for this student
        $appStmt = $this->pdo->prepare(
            "SELECT a.public_id, a.reference_number, a.status, a.submitted_at,
                    c.name AS course_name, u.name AS university_name, i.name AS intake_name
             FROM applications a
             JOIN intakes i ON i.id = a.intake_id
             JOIN courses c ON i.course_id = c.id
             JOIN universities u ON c.university_id = u.id
             WHERE a.student_id = (SELECT id FROM students WHERE public_id = ? LIMIT 1)
               AND a.deleted_at IS NULL
             ORDER BY a.created_at DESC
             LIMIT 10"
        );
        $appStmt->execute([$pid]);
        $student['applications'] = $appStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(['data' => $student]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OWN PROFILE  GET /agent/profile
    // ─────────────────────────────────────────────────────────────────────────

    public function getProfile(): void
    {
        AuthMiddleware::requireAuth();
        $user  = AuthMiddleware::user();
        $agent = $this->resolveAgent($user['id']);

        // Pending reassignment request count for context
        $pendingStmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM agent_reassignment_requests
             WHERE requested_agent_id = ? AND status = 'pending'"
        );
        $pendingStmt->execute([$agent['id']]);
        $pendingRequests = (int) $pendingStmt->fetchColumn();

        Response::json([
            'data' => [
                'public_id'       => $agent['public_id'],
                'full_name'       => $agent['full_name'],
                'agency_name'     => $agent['agency_name'],
                'tier'            => (int) $agent['tier'],
                'referral_code'   => $agent['referral_code'],
                'status'          => $agent['status'],
                'country'         => $agent['country'],
                'created_at'      => $agent['created_at'],
                'pending_student_requests' => $pendingRequests,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE PROFILE  PUT /agent/profile
    // Editable: agency_name, country  (email/phone changes require OTP — Phase 6)
    // ─────────────────────────────────────────────────────────────────────────

    public function updateProfile(): void
    {
        AuthMiddleware::requireAuth();
        $user  = AuthMiddleware::user();
        $agent = $this->resolveAgent($user['id']);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $agencyName = trim($input['agency_name'] ?? $agent['agency_name']);
        $country    = trim($input['country']     ?? $agent['country']);

        if (strlen($agencyName) < 2 || strlen($agencyName) > 200) {
            Response::error('Agency name must be 2–200 characters.', 'VALIDATION_ERROR', 422);
        }

        $this->pdo->prepare(
            "UPDATE agents SET agency_name = ?, country = ?, updated_at = NOW() WHERE id = ?"
        )->execute([$agencyName, $country, $agent['id']]);

        Response::json(['data' => ['message' => 'Profile updated successfully.']]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEAM — DIRECT SUB-AGENTS  GET /agent/team
    // Returns only DIRECT children (parent_agent_id = my agent id)
    // ─────────────────────────────────────────────────────────────────────────

    public function listTeam(): void
    {
        AuthMiddleware::requireAuth();
        $user  = AuthMiddleware::user();
        $agent = $this->resolveAgent($user['id']);
        $pager = Paginator::fromQuery($_GET);

        $stmt = $this->pdo->prepare(
            "SELECT a.public_id, a.full_name, a.agency_name, a.tier, a.status,
                    a.referral_code, a.country, a.created_at,
                    COUNT(s.id)                                                             AS student_count,
                    SUM(CASE WHEN s.profile_status = 'enrolled' THEN 1 ELSE 0 END)         AS enrolled_count,
                    (SELECT COUNT(*) FROM agents ca WHERE ca.parent_agent_id = a.id
                     AND ca.deleted_at IS NULL)                                             AS sub_agent_count
             FROM agents a
             LEFT JOIN students s ON s.agent_id = a.id AND s.deleted_at IS NULL
             WHERE a.parent_agent_id = :parent_id AND a.deleted_at IS NULL
             GROUP BY a.id
             ORDER BY a.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue(':parent_id', (int) $agent['id'], PDO::PARAM_INT);
        $stmt->bindValue(':limit',     (int) $pager['per_page'], PDO::PARAM_INT);
        $stmt->bindValue(':offset',    (int) $pager['offset'],   PDO::PARAM_INT);
        $stmt->execute();
        $subAgents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(['data' => $subAgents]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEAM SUB-AGENTS  GET /agent/team/:pid/sub-agents
    // L1 uses this to expand L2's children (L3 agents)
    // ─────────────────────────────────────────────────────────────────────────

    public function listSubAgentChildren(string $pid): void
    {
        AuthMiddleware::requireAuth();
        $user  = AuthMiddleware::user();
        $agent = $this->resolveAgent($user['id']);
        $root  = (int) $agent['root_agent_id'];

        // Resolve target sub-agent — must be in our subtree
        $targetId = $this->resolveTargetAgent($agent, $pid);

        if (!$targetId) {
            Response::error('Sub-agent not found in your team.', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare(
            "SELECT a.public_id, a.full_name, a.agency_name, a.tier, a.status,
                    a.referral_code, a.created_at,
                    COUNT(s.id)                                                     AS student_count,
                    SUM(CASE WHEN s.profile_status = 'enrolled' THEN 1 ELSE 0 END) AS enrolled_count
             FROM agents a
             LEFT JOIN students s ON s.agent_id = a.id AND s.deleted_at IS NULL
             WHERE a.parent_agent_id = ? AND a.deleted_at IS NULL
             GROUP BY a.id
             ORDER BY a.created_at DESC"
        );
        $stmt->execute([$targetId]);
        $children = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(['data' => $children]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STUDENTS UNDER A SPECIFIC SUB-AGENT  GET /agent/team/:pid/students
    // ─────────────────────────────────────────────────────────────────────────

    public function listSubAgentStudents(string $pid): void
    {
        AuthMiddleware::requireAuth();
        RBACMiddleware::requirePermission('students', 'view');
        $user  = AuthMiddleware::user();
        $agent = $this->resolveAgent($user['id']);
        $root  = (int) $agent['root_agent_id'];
        $pager = Paginator::fromQuery($_GET);

        // Resolve target sub-agent — must be in our subtree
        $targetId = $this->resolveTargetAgent($agent, $pid);

        if (!$targetId) {
            Response::error('Sub-agent not found in your team.', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare(
            "SELECT s.public_id, s.full_name, s.nationality, s.profile_status, s.created_at,
                    COALESCE(agg.applied_count, 0) AS applied_count
             FROM students s
             LEFT JOIN (
                 SELECT student_id, COUNT(*) AS applied_count
                 FROM applications WHERE deleted_at IS NULL GROUP BY student_id
             ) agg ON agg.student_id = s.id
             WHERE s.agent_id = :agent_id AND s.deleted_at IS NULL
             ORDER BY s.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue(':agent_id', (int) $targetId, PDO::PARAM_INT);
        $stmt->bindValue(':limit',    (int) $pager['per_page'], PDO::PARAM_INT);
        $stmt->bindValue(':offset',   (int) $pager['offset'],   PDO::PARAM_INT);
        $stmt->execute();
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(['data' => $students]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AGENT COMMISSIONS  GET /agent/commissions
    // OWN DIRECT ONLY — never subtree blended
    // ─────────────────────────────────────────────────────────────────────────

    public function listCommissions(): void
    {
        AuthMiddleware::requireAuth();
        $user  = AuthMiddleware::user();
        $agent = $this->resolveAgent($user['id']);
        $pager = Paginator::fromQuery($_GET);
        $status = trim($_GET['status'] ?? '');

        $conditions = ['c.agent_id = :agent_id', 'c.deleted_at IS NULL'];
        $params = ['agent_id' => $agent['id']];

        if ($status) {
            $conditions[] = 'c.status = :status';
            $params['status'] = $status;
        }
        $where = implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM commissions c WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dataStmt = $this->pdo->prepare(
            "SELECT c.public_id, c.amount, c.percentage, c.currency, c.status,
                    c.notes, c.created_at, c.decided_at, c.paid_at,
                    s.full_name AS student_name, s.public_id AS student_public_id,
                    s.profile_status AS student_status,
                    a_current.id != c.agent_id AS is_student_reassigned
             FROM commissions c
             JOIN applications app ON app.id = c.application_id
             JOIN students s ON s.id = app.student_id
             JOIN agents a_current ON a_current.id = s.agent_id
             WHERE {$where}
             ORDER BY c.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $k => $v) {
            $dataStmt->bindValue(":{$k}", $v);
        }
        $dataStmt->bindValue(':limit',  $pager['per_page'], PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $pager['offset'],   PDO::PARAM_INT);
        $dataStmt->execute();
        $commissions = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        // Cast types
        foreach ($commissions as &$c) {
            $c['amount'] = (float) $c['amount'];
            $c['percentage'] = $c['percentage'] ? (float) $c['percentage'] : null;
            $c['is_student_reassigned'] = (bool) $c['is_student_reassigned'];
        }
        unset($c);

        Response::json([
            'data' => $commissions,
            'meta' => [
                'total'       => $total,
                'page'        => $pager['page'],
                'per_page'    => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COMMISSION SUMMARY  GET /agent/commissions/summary
    // Own totals + sub-agent breakdown (SEPARATED — never merged)
    // ─────────────────────────────────────────────────────────────────────────

    public function commissionSummary(): void
    {
        AuthMiddleware::requireAuth();
        $user  = AuthMiddleware::user();
        $agent = $this->resolveAgent($user['id']);
        $root  = (int) $agent['root_agent_id'];

        // Own totals
        $ownStmt = $this->pdo->prepare(
            "SELECT
                SUM(CASE WHEN status = 'pending'   THEN amount ELSE 0 END) AS pending_inr,
                SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) AS confirmed_inr,
                SUM(CASE WHEN status = 'paid'      THEN amount ELSE 0 END) AS paid_inr,
                COUNT(*)                                                    AS total_records
             FROM commissions
             WHERE agent_id = ? AND currency = 'INR' AND deleted_at IS NULL"
        );
        $ownStmt->execute([$agent['id']]);
        $own = $ownStmt->fetch(PDO::FETCH_ASSOC);

        // Sub-agent breakdown — grouped per sub-agent, never merged with own, restricted by tier
        $subAgents = [];
        if ((int)$agent['tier'] === 2) {
            // L2 can only see their direct L3 children
            $subStmt = $this->pdo->prepare(
                "SELECT a.public_id, a.full_name, a.agency_name, a.tier,
                        COALESCE(SUM(CASE WHEN c.status = 'pending'   THEN c.amount ELSE 0 END), 0) AS pending,
                        COALESCE(SUM(CASE WHEN c.status = 'confirmed' THEN c.amount ELSE 0 END), 0) AS confirmed,
                        COALESCE(SUM(CASE WHEN c.status = 'paid'      THEN c.amount ELSE 0 END), 0) AS paid,
                        COUNT(c.id)                                                                   AS total_records
                 FROM agents a
                 LEFT JOIN commissions c ON c.agent_id = a.id AND c.deleted_at IS NULL AND c.currency = 'INR'
                 WHERE a.parent_agent_id = ? AND a.deleted_at IS NULL
                 GROUP BY a.id
                 ORDER BY a.full_name"
            );
            $subStmt->execute([$agent['id']]);
            $subAgents = $subStmt->fetchAll(PDO::FETCH_ASSOC);
        } elseif ((int)$agent['tier'] === 1) {
            // L1 can see all descendants
            $subStmt = $this->pdo->prepare(
                "SELECT a.public_id, a.full_name, a.agency_name, a.tier,
                        COALESCE(SUM(CASE WHEN c.status = 'pending'   THEN c.amount ELSE 0 END), 0) AS pending,
                        COALESCE(SUM(CASE WHEN c.status = 'confirmed' THEN c.amount ELSE 0 END), 0) AS confirmed,
                        COALESCE(SUM(CASE WHEN c.status = 'paid'      THEN c.amount ELSE 0 END), 0) AS paid,
                        COUNT(c.id)                                                                   AS total_records
                 FROM agents a
                 LEFT JOIN commissions c ON c.agent_id = a.id AND c.deleted_at IS NULL AND c.currency = 'INR'
                 WHERE a.root_agent_id = ? AND a.id != ? AND a.deleted_at IS NULL
                 GROUP BY a.id
                 ORDER BY a.tier, a.full_name"
            );
            $subStmt->execute([$root, $agent['id']]);
            $subAgents = $subStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        Response::json([
            'data' => [
                'own' => [
                    'pending_inr'   => (float) ($own['pending_inr']   ?? 0),
                    'confirmed_inr' => (float) ($own['confirmed_inr'] ?? 0),
                    'paid_inr'      => (float) ($own['paid_inr']      ?? 0),
                    'total_records' => (int)   ($own['total_records'] ?? 0),
                ],
                'sub_agents' => $subAgents,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APPLICATION LIST (legacy — kept for backwards compat)
    // GET /agent/applications  — uses agent_id_at_submission not subtree
    // ─────────────────────────────────────────────────────────────────────────

    public function listApplications(): void
    {
        RBACMiddleware::requirePermission('applications', 'view');
        $user    = AuthMiddleware::user();
        $agentId = (int) $this->resolveAgent($user['id'])['id'];

        $stmt = $this->pdo->prepare(
            "SELECT a.public_id, a.reference_number, a.status, a.submitted_at, a.created_at,
                    i.public_id AS intake_pid, i.name AS intake_name, i.intake_month, i.intake_year,
                    c.name AS course_name, c.degree_level AS course_level,
                    u.name AS university_name,
                    s.full_name AS student_name, s.public_id AS student_pid
             FROM applications a
             JOIN students s ON a.student_id = s.id
             JOIN intakes i ON a.intake_id = i.id
             JOIN courses c ON i.course_id = c.id
             JOIN universities u ON c.university_id = u.id
             WHERE a.agent_id_at_submission = ? AND a.deleted_at IS NULL
             ORDER BY a.created_at DESC"
        );
        $stmt->execute([$agentId]);
        Response::json(['applications' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    public function getApplication(string $pid): void
    {
        RBACMiddleware::requirePermission('applications', 'view');
        $user    = AuthMiddleware::user();
        $agentId = (int) $this->resolveAgent($user['id'])['id'];

        $stmt = $this->pdo->prepare(
            "SELECT a.id, a.public_id, a.reference_number, a.status, a.submitted_at,
                    a.created_at, a.notes,
                    i.public_id AS intake_pid, i.name AS intake_name,
                    i.intake_month, i.intake_year, i.tuition_fee_amount, i.tuition_fee_currency,
                    c.name AS course_name, c.degree_level AS course_level,
                    u.name AS university_name,
                    s.full_name AS student_name, s.public_id AS student_pid
             FROM applications a
             JOIN students s ON a.student_id = s.id
             JOIN intakes i ON a.intake_id = i.id
             JOIN courses c ON i.course_id = c.id
             JOIN universities u ON c.university_id = u.id
             WHERE a.public_id = ? AND a.agent_id_at_submission = ? AND a.deleted_at IS NULL"
        );
        $stmt->execute([$pid, $agentId]);
        $application = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $appId = $application['id'];

        $timelineStmt = $this->pdo->prepare(
            "SELECT au.public_id, au.direction, au.item_type, au.content, au.created_at,
                    f.public_id AS file_public_id, f.display_filename AS file_name
             FROM application_updates au
             LEFT JOIN files f ON au.file_id = f.id
             WHERE au.application_id = ? AND au.is_visible_to_agent = 1
             ORDER BY au.created_at DESC"
        );
        $timelineStmt->execute([$appId]);
        $application['timeline'] = $timelineStmt->fetchAll(PDO::FETCH_ASSOC);

        $docStmt = $this->pdo->prepare(
            "SELECT dr.public_id, dr.doc_label, dr.description, dr.deadline, dr.status, dr.rejection_reason
             FROM document_requests dr WHERE dr.application_id = ? ORDER BY dr.created_at DESC"
        );
        $docStmt->execute([$appId]);
        $application['document_requests'] = $docStmt->fetchAll(PDO::FETCH_ASSOC);

        $payStmt = $this->pdo->prepare(
            "SELECT ap.public_id, ap.label, ap.amount, ap.currency, ap.payment_link, ap.due_date, ap.status
             FROM application_payments ap WHERE ap.application_id = ? ORDER BY ap.created_at DESC"
        );
        $payStmt->execute([$appId]);
        $application['payments'] = $payStmt->fetchAll(PDO::FETCH_ASSOC);

        unset($application['id']);
        Response::json(['application' => $application]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REFERRAL LINKS  GET /agent/referral-links
    // ─────────────────────────────────────────────────────────────────────────

    public function getReferralLinks(): void
    {
        AuthMiddleware::requireAuth();
        $user  = AuthMiddleware::user();
        $agent = $this->resolveAgent($user['id']);

        $code = $agent['referral_code'];

        if (!$code) {
            Response::error('Agent not approved or referral code not generated', 'BAD_REQUEST', 400);
        }

        $baseUrl = \TGA\CRM\Config\Environment::get('FRONTEND_URL', 'https://portal.theglobalavenues.com');
        
        Response::json([
            'data' => [
                'student_referral_link' => "{$baseUrl}/register/student?ref={$code}",
                'sub_agent_referral_link' => "{$baseUrl}/register/agent?ref={$code}"
            ]
        ]);
    }
}
