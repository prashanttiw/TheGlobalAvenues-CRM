<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Paginator;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;

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

        if ($agent['status'] !== 'approved') {
            Response::error('Agent account is not active.', 'FORBIDDEN', 403);
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

        // Student counts — scoped to this agent's subtree based on tier
        $studentConditions = ["s.deleted_at IS NULL", "a.deleted_at IS NULL"];
        $studentParams = [];

        if ((int)$agent['tier'] === 3) {
            $studentConditions[] = "s.agent_id = :my_agent_id";
            $studentParams['my_agent_id'] = (int)$agent['id'];
        } elseif ((int)$agent['tier'] === 2) {
            $studentConditions[] = "(s.agent_id = :my_agent_id OR a.parent_agent_id = :my_agent_id)";
            $studentParams['my_agent_id'] = (int)$agent['id'];
        } else {
            $studentConditions[] = "a.root_agent_id = :root";
            $studentParams['root'] = $root;
        }

        $studentWhere = implode(' AND ', $studentConditions);

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
             WHERE {$studentWhere}"
        );
        $stmt->execute($studentParams);
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

        // Sub-agent count — scoped to this agent's subtree based on tier
        $team = ['total_sub_agents' => 0, 'pending_sub_agents' => 0];
        if ((int)$agent['tier'] === 2) {
            $stmt = $this->pdo->prepare(
                "SELECT
                    COUNT(*)                                                            AS total_sub_agents,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)               AS pending_sub_agents
                 FROM agents
                 WHERE parent_agent_id = ? AND deleted_at IS NULL"
            );
            $stmt->execute([$agent['id']]);
            $team = $stmt->fetch(PDO::FETCH_ASSOC);
        } elseif ((int)$agent['tier'] === 1) {
            $stmt = $this->pdo->prepare(
                "SELECT
                    COUNT(*)                                                            AS total_sub_agents,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)               AS pending_sub_agents
                 FROM agents
                 WHERE root_agent_id = ? AND id != ? AND deleted_at IS NULL"
            );
            $stmt->execute([$root, $agent['id']]);
            $team = $stmt->fetch(PDO::FETCH_ASSOC);
        }

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
                    'total_sub_agents'   => (int) ($team['total_sub_agents'] ?? 0),
                    'pending_sub_agents' => (int) ($team['pending_sub_agents'] ?? 0),
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

        // SECURITY: subtree check is mandatory — an agent may only view students within their own network
        $stmt = $this->pdo->prepare(
            "SELECT s.id, s.public_id, s.full_name, s.date_of_birth, s.gender, s.nationality,
                    s.passport_number, s.passport_expiry, s.phone_in_profile, s.alternate_mobile,
                    s.lead_source, s.how_heard_about_us, s.planning_phd,
                    s.agent_lock_status, s.profile_status, s.created_at, s.updated_at,
                    u.email AS encrypted_email, u.phone AS encrypted_phone,
                    a.full_name AS agent_name, a.public_id AS agent_public_id,
                    a.tier AS agent_tier, a.agency_name
             FROM students s
             JOIN agents a ON a.id = s.agent_id
             JOIN users u ON u.id = s.user_id
             WHERE s.public_id = :pid
               AND {$checkSql}
               AND s.deleted_at IS NULL"
        );
        $stmt->execute(array_merge(['pid' => $pid], $checkParams));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Response::error('Student not found or not in your network.', 'STUDENT_NOT_IN_SUBTREE', 403);
        }

        $studentId = (int) $row['id'];

        $academicsStmt = $this->pdo->prepare(
            "SELECT public_id, institution_name, degree_level, field_of_study, start_date, end_date,
                    score_type, score_value, is_highest_qualification
             FROM student_academics
             WHERE student_id = ? AND deleted_at IS NULL
             ORDER BY start_date DESC"
        );
        $academicsStmt->execute([$studentId]);

        $testScoresStmt = $this->pdo->prepare(
            "SELECT public_id, test_name, overall_score, reading_score, writing_score,
                    listening_score, speaking_score, test_date
             FROM student_test_scores
             WHERE student_id = ? AND deleted_at IS NULL
             ORDER BY test_date DESC"
        );
        $testScoresStmt->execute([$studentId]);

        $applicationsStmt = $this->pdo->prepare(
            "SELECT ap.public_id, ap.reference_number, ap.status, ap.created_at,
                    c.name AS course_name, un.name AS university_name
             FROM applications ap
             JOIN intakes i ON i.id = ap.intake_id
             JOIN courses c ON c.id = i.course_id
             JOIN universities un ON un.id = c.university_id
             WHERE ap.student_id = ? AND ap.deleted_at IS NULL
             ORDER BY ap.created_at DESC"
        );
        $applicationsStmt->execute([$studentId]);
        $applications = $applicationsStmt->fetchAll(PDO::FETCH_ASSOC);

        $studentController = new StudentController();
        $customFieldController = new StudentCustomFieldController();

        Response::json([
            'data' => [
                'student' => [
                    'public_id' => $row['public_id'],
                    'full_name' => $row['full_name'],
                    'email' => self::decryptOrNull($row['encrypted_email']),
                    'phone' => self::decryptOrNull($row['encrypted_phone']),
                    'phone_in_profile' => self::decryptOrNull($row['phone_in_profile']),
                    'alternate_mobile' => self::decryptOrNull($row['alternate_mobile']),
                    'date_of_birth' => $row['date_of_birth'],
                    'gender' => $row['gender'],
                    'nationality' => $row['nationality'],
                    'passport_number' => self::decryptOrNull($row['passport_number']),
                    'passport_expiry' => $row['passport_expiry'],
                    'lead_source' => $row['lead_source'],
                    'how_heard_about_us' => $row['how_heard_about_us'],
                    'planning_phd' => (bool) $row['planning_phd'],
                    'agent_lock_status' => $row['agent_lock_status'],
                    'profile_status' => $row['profile_status'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at'],
                    'agent' => [
                        'public_id' => $row['agent_public_id'],
                        'full_name' => $row['agent_name'],
                        'agency_name' => $row['agency_name'],
                    ],
                ],
                'academics' => $academicsStmt->fetchAll(PDO::FETCH_ASSOC),
                'test_scores' => $testScoresStmt->fetchAll(PDO::FETCH_ASSOC),
                'applications' => [
                    'count' => count($applications),
                    'items' => $applications,
                ],
                'readiness' => $studentController->buildReadinessSnapshotForAdmin($studentId),
                'custom_fields' => $customFieldController->buildCustomFieldsSnapshot($studentId),
            ],
        ]);
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
        AuthMiddleware::requireAuth();
        $user  = AuthMiddleware::user();
        $agent = $this->resolveAgent($user['id']);
        $root  = (int) $agent['root_agent_id'];
        $pager = Paginator::fromQuery($_GET);

        $status   = trim($_GET['status'] ?? '');
        $agentPid = trim($_GET['agent_pid'] ?? '');

        $conditions = ['a.deleted_at IS NULL', 's.deleted_at IS NULL'];
        $params = [];

        if ($agentPid) {
            if ($agentPid === $agent['public_id']) {
                $filterAgentId = (int) $agent['id'];
            } else {
                $filterAgentId = $this->resolveTargetAgent($agent, $agentPid);
            }

            if (!$filterAgentId) {
                Response::error('Agent not found in your team.', 'NOT_FOUND', 404);
            }

            $conditions[] = 's.agent_id = :filter_agent_id';
            $params['filter_agent_id'] = $filterAgentId;
        } else {
            if ((int) $agent['tier'] === 3) {
                $conditions[] = 's.agent_id = :my_agent_id';
                $params['my_agent_id'] = (int) $agent['id'];
            } elseif ((int) $agent['tier'] === 2) {
                $conditions[] = '(s.agent_id = :my_agent_id OR ag_owner.parent_agent_id = :my_agent_id)';
                $params['my_agent_id'] = (int) $agent['id'];
            } else {
                $conditions[] = 'ag_owner.root_agent_id = :root';
                $params['root'] = $root;
            }
        }

        if ($status !== '') {
            $conditions[] = 'a.status = :status';
            $params['status'] = $status;
        }

        $where = implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare(
            "SELECT COUNT(*)
             FROM applications a
             JOIN students s ON s.id = a.student_id
             JOIN agents ag_owner ON ag_owner.id = s.agent_id
             WHERE {$where}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dataStmt = $this->pdo->prepare(
            "SELECT a.public_id, a.reference_number, a.status, a.submitted_at, a.created_at,
                    i.public_id AS intake_pid, i.name AS intake_name, i.intake_month, i.intake_year,
                    c.name AS course_name, c.degree_level AS course_level,
                    u.name AS university_name,
                    s.full_name AS student_name, s.public_id AS student_pid,
                    ag_owner.public_id AS agent_public_id, ag_owner.full_name AS agent_name,
                    ag_owner.agency_name AS agent_agency, ag_owner.tier AS agent_tier
             FROM applications a
             JOIN students s ON s.id = a.student_id
             JOIN agents ag_owner ON ag_owner.id = s.agent_id
             JOIN intakes i ON i.id = a.intake_id
             JOIN courses c ON c.id = i.course_id
             JOIN universities u ON u.id = c.university_id
             WHERE {$where}
             ORDER BY COALESCE(a.submitted_at, a.created_at) DESC, a.created_at DESC
             LIMIT :limit OFFSET :offset"
        );

        foreach ($params as $key => $value) {
            $dataStmt->bindValue(':' . $key, $value);
        }
        $dataStmt->bindValue(':limit', $pager['per_page'], PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $pager['offset'], PDO::PARAM_INT);
        $dataStmt->execute();
        $applications = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $applications,
            'meta' => [
                'page' => $pager['page'],
                'per_page' => $pager['per_page'],
                'total' => $total,
                'total_pages' => (int) ceil($total / $pager['per_page']),
                'has_next' => ($pager['offset'] + $pager['per_page']) < $total,
                'has_prev' => $pager['page'] > 1,
            ],
        ]);
    }

    public function getApplication(string $pid): void
    {
        AuthMiddleware::requireAuth();
        $user  = AuthMiddleware::user();
        $agent = $this->resolveAgent($user['id']);
        $root  = (int) $agent['root_agent_id'];

        $scopeSql = '';
        $scopeParams = [];
        if ((int) $agent['tier'] === 3) {
            $scopeSql = 's.agent_id = :my_agent_id';
            $scopeParams['my_agent_id'] = (int) $agent['id'];
        } elseif ((int) $agent['tier'] === 2) {
            $scopeSql = '(s.agent_id = :my_agent_id OR ag_owner.parent_agent_id = :my_agent_id)';
            $scopeParams['my_agent_id'] = (int) $agent['id'];
        } else {
            $scopeSql = 'ag_owner.root_agent_id = :root';
            $scopeParams['root'] = $root;
        }

        $stmt = $this->pdo->prepare(
            "SELECT a.id, a.public_id, a.reference_number, a.status, a.submitted_at,
                    a.created_at, a.notes,
                    i.public_id AS intake_pid, i.name AS intake_name,
                    i.intake_month, i.intake_year, i.tuition_fee_amount, i.tuition_fee_currency,
                    c.name AS course_name, c.degree_level AS course_level,
                    u.name AS university_name,
                    s.full_name AS student_name, s.public_id AS student_pid,
                    ag_owner.public_id AS agent_public_id, ag_owner.full_name AS agent_name,
                    ag_owner.agency_name AS agent_agency, ag_owner.tier AS agent_tier
             FROM applications a
             JOIN students s ON s.id = a.student_id
             JOIN agents ag_owner ON ag_owner.id = s.agent_id
             JOIN intakes i ON i.id = a.intake_id
             JOIN courses c ON c.id = i.course_id
             JOIN universities u ON u.id = c.university_id
             WHERE a.public_id = :pid AND {$scopeSql} AND a.deleted_at IS NULL"
        );
        $stmt->execute(array_merge(['pid' => $pid], $scopeParams));
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

    // ─────────────────────────────────────────────────────────────────────────
    // ONBOARDING (registered / draft / pending / rejected agents — bypasses
    // resolveAgent()'s approved-only check)
    // ─────────────────────────────────────────────────────────────────────────

    private const ONBOARDING_DOC_TYPES = ['profile_photo', 'aadhar_card', 'cv_resume'];
    private const ONBOARDING_EDITABLE_STATUSES = ['registered', 'draft', 'rejected'];

    /**
     * Resolve the logged-in user's agent record for onboarding purposes.
     * Unlike resolveAgent(), does NOT require status = 'approved'.
     */
    private function resolveOnboardingAgent(int $userId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT id, public_id, full_name, first_name, last_name, agency_name, country,
                    address_line, city, state, mobile_number, alternate_mobile_number,
                    tier, status, rejected_reason, created_at, referral_code
             FROM agents WHERE user_id = ? AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute([$userId]);
        $agent = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$agent) {
            Response::error('Agent profile not found', 'NOT_FOUND', 404);
        }

        $agent['mobile_number'] = self::decryptOrNull($agent['mobile_number']);
        $agent['alternate_mobile_number'] = self::decryptOrNull($agent['alternate_mobile_number']);

        return $agent;
    }

    private static function decryptOrNull(?string $encrypted): ?string
    {
        if ($encrypted === null || $encrypted === '') {
            return null;
        }
        try {
            return \TGA\CRM\Services\EncryptionService::decrypt($encrypted);
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function getOnboardingStatus(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();

        if (($user['utype'] ?? '') !== 'agent') {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $agent = $this->resolveOnboardingAgent((int) $user['sub']);

        $docsStmt = $this->pdo->prepare(
            "SELECT public_id, document_type, display_filename, created_at
             FROM files
             WHERE owner_type = 'agent' AND owner_id = ? AND deleted_at IS NULL
               AND document_type IN ('profile_photo', 'aadhar_card', 'cv_resume')
             ORDER BY created_at DESC"
        );
        $docsStmt->execute([(int) $agent['id']]);
        $docs = $docsStmt->fetchAll(\PDO::FETCH_ASSOC);

        // ORDER BY created_at DESC means the first row seen per type is the newest.
        $uploaded = [];
        foreach ($docs as $doc) {
            if (!isset($uploaded[$doc['document_type']])) {
                $uploaded[$doc['document_type']] = [
                    'public_id'   => $doc['public_id'],
                    'filename'    => $doc['display_filename'],
                    'uploaded_at' => $doc['created_at'],
                ];
            }
        }

        Response::json([
            'success' => true,
            'data' => [
                'agent' => [
                    'public_id'               => $agent['public_id'],
                    'first_name'              => $agent['first_name'],
                    'last_name'               => $agent['last_name'],
                    'full_name'               => $agent['full_name'],
                    'agency_name'             => $agent['agency_name'],
                    'address_line'            => $agent['address_line'],
                    'city'                    => $agent['city'],
                    'state'                   => $agent['state'],
                    'mobile_number'           => $agent['mobile_number'],
                    'alternate_mobile_number' => $agent['alternate_mobile_number'],
                    'country'                 => $agent['country'],
                    'status'                  => $agent['status'],
                    'rejected_reason'         => $agent['rejected_reason'],
                    'created_at'              => $agent['created_at'],
                ],
                'documents' => $uploaded,
            ],
        ]);
    }

    public function uploadOnboardingDocument(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();

        if (($user['utype'] ?? '') !== 'agent') {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $agent = $this->resolveOnboardingAgent((int) $user['sub']);

        if (!in_array($agent['status'], self::ONBOARDING_EDITABLE_STATUSES, true)) {
            Response::error('Documents can only be uploaded while your application is editable.', 'BAD_REQUEST', 400);
        }

        $docType = trim($_POST['document_type'] ?? '');
        if (!in_array($docType, self::ONBOARDING_DOC_TYPES, true)) {
            Response::error(
                'Invalid document_type. Allowed: ' . implode(', ', self::ONBOARDING_DOC_TYPES),
                'VALIDATION_ERROR',
                400
            );
        }

        if (empty($_FILES['file'])) {
            Response::error('No file uploaded', 'VALIDATION_ERROR', 400);
        }

        $agentId    = (int) $agent['id'];
        $storagePath = "agents/{$agent['public_id']}/onboarding";

        $uploadSvc = new \TGA\CRM\Services\FileUploadService();
        try {
            $fileRecord = $uploadSvc->upload(
                $this->pdo,
                $_FILES['file'],
                $docType,
                'agent',
                $agentId,
                'agent',
                $agentId,
                null,
                false,
                $storagePath
            );
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', 422);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 'UPLOAD_FAILED', 500);
        }

        \TGA\CRM\Services\ActivityLogger::log('agent.onboarding_doc_uploaded', 'agent', $agentId, $agentId);

        Response::json([
            'success'  => true,
            'message'  => 'Document uploaded successfully',
            'data' => [
                'public_id'    => $fileRecord['public_id'],
                'document_type' => $docType,
                'filename'     => $fileRecord['display_filename'],
            ],
        ]);
    }

    public function saveOnboardingDraft(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();

        if (($user['utype'] ?? '') !== 'agent') {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $agent = $this->resolveOnboardingAgent((int) $user['sub']);

        if (!in_array($agent['status'], self::ONBOARDING_EDITABLE_STATUSES, true)) {
            Response::error('This application can no longer be edited.', 'BAD_REQUEST', 400);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        // first_name, last_name, and mobile_number are captured at registration and are
        // locked here — they can only change via the agent's own profile page. Any value
        // submitted for them in this request is ignored.
        $firstName   = trim((string) ($agent['first_name'] ?? ''));
        $lastName    = trim((string) ($agent['last_name'] ?? ''));
        $addressLine = trim((string) ($input['address_line'] ?? $agent['address_line'] ?? ''));
        $city        = trim((string) ($input['city'] ?? $agent['city'] ?? ''));
        $state       = trim((string) ($input['state'] ?? $agent['state'] ?? ''));
        $mobile      = trim((string) ($agent['mobile_number'] ?? ''));
        $altMobile   = trim((string) ($input['alternate_mobile_number'] ?? $agent['alternate_mobile_number'] ?? ''));
        $fullName    = trim($firstName . ' ' . $lastName);

        // A rejected application that's being edited again re-enters the draft state.
        $newStatus = $agent['status'] === 'registered' || $agent['status'] === 'rejected' ? 'draft' : $agent['status'];

        $this->pdo->prepare(
            "UPDATE agents
             SET first_name = ?, last_name = ?, full_name = ?, address_line = ?, city = ?, state = ?,
                 mobile_number = ?, alternate_mobile_number = ?, status = ?, draft_updated_at = NOW()
             WHERE id = ?"
        )->execute([
            $firstName ?: null,
            $lastName ?: null,
            $fullName !== '' ? $fullName : $agent['full_name'],
            $addressLine ?: null,
            $city ?: null,
            $state ?: null,
            $mobile !== '' ? \TGA\CRM\Services\EncryptionService::encrypt($mobile) : null,
            $altMobile !== '' ? \TGA\CRM\Services\EncryptionService::encrypt($altMobile) : null,
            $newStatus,
            $agent['id'],
        ]);

        Response::json(['success' => true, 'message' => 'Draft saved.', 'data' => ['status' => $newStatus]]);
    }

    public function submitOnboardingApplication(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();

        if (($user['utype'] ?? '') !== 'agent') {
            Response::error('Access denied', 'FORBIDDEN', 403);
        }

        $agent = $this->resolveOnboardingAgent((int) $user['sub']);

        if (!in_array($agent['status'], self::ONBOARDING_EDITABLE_STATUSES, true)) {
            Response::error('This application has already been submitted.', 'BAD_REQUEST', 400);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        // first_name, last_name, and mobile_number are captured at registration and are
        // locked here — they can only change via the agent's own profile page. Any value
        // submitted for them in this request is ignored.
        $firstName   = trim((string) ($agent['first_name'] ?? ''));
        $lastName    = trim((string) ($agent['last_name'] ?? ''));
        $addressLine = trim((string) ($input['address_line'] ?? $agent['address_line'] ?? ''));
        $city        = trim((string) ($input['city'] ?? $agent['city'] ?? ''));
        $state       = trim((string) ($input['state'] ?? $agent['state'] ?? ''));
        $mobile      = trim((string) ($agent['mobile_number'] ?? ''));
        $altMobile   = trim((string) ($input['alternate_mobile_number'] ?? $agent['alternate_mobile_number'] ?? ''));

        $missing = [];
        if ($firstName === '') $missing[] = 'first_name';
        if ($lastName === '') $missing[] = 'last_name';
        if ($addressLine === '') $missing[] = 'address_line';
        if ($city === '') $missing[] = 'city';
        if ($state === '') $missing[] = 'state';
        if ($mobile === '') $missing[] = 'mobile_number';

        $docsStmt = $this->pdo->prepare(
            "SELECT DISTINCT document_type FROM files
             WHERE owner_type = 'agent' AND owner_id = ? AND deleted_at IS NULL
               AND document_type IN ('profile_photo', 'aadhar_card', 'cv_resume')"
        );
        $docsStmt->execute([(int) $agent['id']]);
        $uploadedTypes = array_column($docsStmt->fetchAll(\PDO::FETCH_ASSOC), 'document_type');

        foreach (self::ONBOARDING_DOC_TYPES as $required) {
            if (!in_array($required, $uploadedTypes, true)) {
                $missing[] = $required;
            }
        }

        if (!empty($missing)) {
            Response::error(
                'Please complete all required fields and documents before submitting: ' . implode(', ', $missing),
                'VALIDATION_ERROR',
                422
            );
        }

        $fullName = trim($firstName . ' ' . $lastName);

        $this->pdo->prepare(
            "UPDATE agents
             SET first_name = ?, last_name = ?, full_name = ?, address_line = ?, city = ?, state = ?,
                 mobile_number = ?, alternate_mobile_number = ?, status = 'pending',
                 application_submitted_at = NOW()
             WHERE id = ?"
        )->execute([
            $firstName,
            $lastName,
            $fullName,
            $addressLine,
            $city,
            $state,
            \TGA\CRM\Services\EncryptionService::encrypt($mobile),
            $altMobile !== '' ? \TGA\CRM\Services\EncryptionService::encrypt($altMobile) : null,
            $agent['id'],
        ]);

        \TGA\CRM\Services\ActivityLogger::log('agent.application_submitted', 'agent', (int) $agent['id'], (int) $user['sub']);

        $adminStmt = $this->pdo->prepare(
            "SELECT u.id FROM users u JOIN admins adm ON adm.user_id = u.id WHERE u.status = 'active'"
        );
        $adminStmt->execute();
        $adminUserIds = array_column($adminStmt->fetchAll(\PDO::FETCH_ASSOC), 'id');

        \TGA\CRM\Services\NotificationService::fire('agent.onboarding_submitted', [
            'agency_name' => $agent['agency_name'] ?: $fullName,
            'full_name'   => $fullName,
            'country'     => $agent['country'] ?: 'India',
        ], $adminUserIds);

        Response::json([
            'success' => true,
            'message' => 'Your application has been submitted and is now awaiting admin review.',
            'data' => ['status' => 'pending'],
        ]);
    }
}
