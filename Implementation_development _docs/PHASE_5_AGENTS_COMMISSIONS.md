# PHASE 5 — Agent Hierarchy, Student Management & Commissions
## Complete Builder Specification — Gemini Implementation Guide

> **BUILDER DIRECTIVE**: This document is the complete implementation guide for Phase 5.
> Read this ENTIRE file before writing a single line of code.
> All architectural decisions, SQL, PHP code, and frontend wiring are specified below.
> Do NOT deviate from the patterns — follow the existing codebase conventions exactly.
> Reference: PHASE_5_APPEND.md for full research rationale behind each decision.

---

## STACK REMINDER
- **Backend**: PHP 8.x, PDO, MySQL 8.4 LTS
- **Auth**: JWT (`AuthMiddleware::user()` returns JWT payload)
- **Namespace**: `TGA\CRM\` prefix for all PHP classes
- **Response**: `Response::json()`, `Response::error()`, `Response::success()`
- **Pagination**: `Paginator::fromQuery($_GET)` → `['page', 'per_page', 'offset']`
- **ULID**: `UlidGenerator::generate()`
- **Activity**: `ActivityLogger::log($action, $targetType, $targetId, $userId, $before, $after)`
- **Notifications**: `NotificationService::fire($eventKey, $payload, [$userIds])`
- **RBAC**: `RBACMiddleware::requirePermission('module', 'action')`
- **Auth check**: `AuthMiddleware::requireAuth()` + `AuthMiddleware::user()`

---

## BUILDER RESEARCH NOTES (all resolved, do not re-research)
| Topic | Decision |
|---|---|
| MySQL recursive CTEs | Safe — max depth 3, `cte_max_recursion_depth = 1000` default is fine |
| root_agent_id fast path | Use for ALL auth checks — `WHERE root_agent_id = :x AND id = :y` |
| Recursive CTE | Use ONLY for admin tree rendering endpoint |
| Race condition | `SELECT ... FOR UPDATE` inside transaction on reassignment approval |
| O(n) buildTree | Use hash-map approach, not nested foreach |
| N+1 applied_count | Use LEFT JOIN aggregation subquery — not correlated subquery per row |
| Commission immutability | PHP guard is primary, DB trigger is secondary |
| Agent PII | Agents cannot see `passport_number`, `date_of_birth`, `phone` columns |
| NULLIF | `NULLIF(COUNT(*), 0)` in conversion rate — prevents division-by-zero |

---

## MILESTONE 5.1 — DATABASE MIGRATIONS

Run these in order. Files already created at `crm-api/Database/migrations/`:
- `053_commissions_enhancements.sql` ✅
- `054_commission_audit_log.sql` ✅
- `055_phase5_indexes.sql` ✅
- `056_agent_stats.sql` ✅
- `057_commission_immutability_trigger.sql` ✅

### 058_notification_templates_phase5.sql — CREATE THIS FILE:
```sql
-- 058: Phase 5 notification templates
-- All agent reassignment and commission event templates

INSERT INTO notification_templates (event_key, subject_template, body_template, channels, category) VALUES
('agent.reassignment_requested',
 'Agent Reassignment Request — Action Required',
 'Student {{student_name}} has requested an agent reassignment. Current agent: {{current_agent_name}}. Reason: {{reason}}. Review in admin panel.',
 'email,in_app', 'approvals'),

('agent.reassignment_approved',
 'Your Agent Reassignment Has Been Approved',
 'Hi {{student_name}}, your request to change agents has been approved. New agent: {{new_agent_name}}. The TGA Team.',
 'email,in_app', 'system'),

('agent.reassignment_denied',
 'Your Agent Reassignment Request Was Not Approved',
 'Hi {{student_name}}, after review your request to change agents could not be approved at this time. Reason: {{review_notes}}. Contact support if you have questions.',
 'email,in_app', 'system'),

('agent.reassignment_lost',
 'Student Reassigned to Another Agent',
 'Hi {{agent_name}}, student {{student_name}} has been reassigned to another agent. Your historical records for this student remain in your activity log.',
 'email,in_app', 'agent'),

('agent.reassignment_gained',
 'New Student Assigned to You',
 'Hi {{agent_name}}, student {{student_name}} has been assigned to your portfolio.',
 'email,in_app', 'agent'),

('commission.created',
 'Commission Record Created',
 'Hi {{agent_name}}, a commission of {{amount}} {{currency}} has been recorded for student {{student_name}}. Status: Pending.',
 'email,in_app', 'approvals'),

('commission.confirmed',
 'Commission Confirmed',
 'Hi {{agent_name}}, your commission of {{amount}} {{currency}} for student {{student_name}} has been confirmed by admin.',
 'email,in_app', 'approvals'),

('commission.paid',
 'Commission Paid',
 'Hi {{agent_name}}, your commission of {{amount}} {{currency}} for student {{student_name}} has been marked as paid.',
 'email,in_app', 'approvals');
```

### 059_reassignment_final_agent.sql — CREATE THIS FILE:
```sql
-- 059: Add final_agent_id to agent_reassignment_requests
-- Tracks which agent was ACTUALLY assigned (may differ from requested_agent_id if admin overrides)
-- Also adds missing indexes

ALTER TABLE agent_reassignment_requests
  ADD COLUMN final_agent_id INT UNSIGNED NULL
    COMMENT 'The agent actually assigned — may differ from requested_agent_id if admin overrides'
    AFTER requested_agent_id,
  ADD CONSTRAINT fk_arr_final FOREIGN KEY (final_agent_id) REFERENCES agents(id) ON DELETE SET NULL;

-- Indexes for admin queue queries
ALTER TABLE agent_reassignment_requests
  ADD INDEX idx_arr_student_status (student_id, status),
  ADD INDEX idx_arr_status_created (status, created_at);
```

---

## MILESTONE 5.2 — AGENT CONTROLLER (Full Rewrite)

### FILE: `crm-api/Controllers/AgentController.php`
**Action**: OVERWRITE the existing file completely.

```php
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
     * Assert that a given agent (by id) is within the requesting agent's subtree.
     * Uses O(1) root_agent_id check. Never use recursive query for this.
     */
    private function assertInSubtree(int $targetAgentId, int $myRootAgentId): void
    {
        $stmt = $this->pdo->prepare(
            "SELECT id FROM agents WHERE id = ? AND root_agent_id = ? AND deleted_at IS NULL"
        );
        $stmt->execute([$targetAgentId, $myRootAgentId]);
        if (!$stmt->fetchColumn()) {
            Response::error('Access denied.', 'FORBIDDEN', 403);
        }
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
            $stmt = $this->pdo->prepare(
                "SELECT id FROM agents WHERE public_id = ? AND root_agent_id = ? AND deleted_at IS NULL"
            );
            $stmt->execute([$agentPid, $root]);
            $filterAgentId = $stmt->fetchColumn();
            if (!$filterAgentId) {
                Response::error('Agent not found in your team.', 'NOT_FOUND', 404);
            }
        }

        $conditions = ["a.root_agent_id = :root", "s.deleted_at IS NULL"];
        $params     = ['root' => $root];

        if ($filterAgentId) {
            $conditions[] = "s.agent_id = :filter_agent_id";
            $params['filter_agent_id'] = $filterAgentId;
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

        // SECURITY: subtree check is mandatory — no PII columns exposed
        $stmt = $this->pdo->prepare(
            "SELECT s.public_id, s.full_name, s.nationality, s.profile_status,
                    s.agent_lock_status, s.created_at,
                    a.full_name AS agent_name, a.public_id AS agent_public_id, a.tier AS agent_tier
             FROM students s
             JOIN agents a ON a.id = s.agent_id
             WHERE s.public_id = ?
               AND a.root_agent_id = ?
               AND s.deleted_at IS NULL"
        );
        $stmt->execute([$pid, $root]);
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
             JOIN courses c ON c.id = i.course_id
             JOIN universities u ON u.id = c.university_id
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
             WHERE a.parent_agent_id = ? AND a.deleted_at IS NULL
             GROUP BY a.id
             ORDER BY a.created_at DESC
             LIMIT ? OFFSET ?"
        );
        $stmt->execute([$agent['id'], $pager['per_page'], $pager['offset']]);
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
        $targetStmt = $this->pdo->prepare(
            "SELECT id FROM agents WHERE public_id = ? AND root_agent_id = ? AND deleted_at IS NULL"
        );
        $targetStmt->execute([$pid, $root]);
        $targetId = $targetStmt->fetchColumn();

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

        $targetStmt = $this->pdo->prepare(
            "SELECT id FROM agents WHERE public_id = ? AND root_agent_id = ? AND deleted_at IS NULL"
        );
        $targetStmt->execute([$pid, $root]);
        $targetId = $targetStmt->fetchColumn();

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
             WHERE s.agent_id = ? AND s.deleted_at IS NULL
             ORDER BY s.created_at DESC
             LIMIT ? OFFSET ?"
        );
        $stmt->execute([$targetId, $pager['per_page'], $pager['offset']]);
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

        // Sub-agent breakdown — grouped per sub-agent, never merged with own
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
}
```

---

## MILESTONE 5.2 — ROUTE REGISTRATION (AgentRoutes.php)

### FILE: `crm-api/Routes/AgentRoutes.php`
**Action**: OVERWRITE completely.

```php
<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\AgentController;
use TGA\CRM\Controllers\SubAgentController;
use TGA\CRM\Controllers\ReassignmentController;

final class AgentRoutes
{
    public static function register(): void
    {
        $agent       = new AgentController();
        $subAgent    = new SubAgentController();
        $reassign    = new ReassignmentController();

        // ── Sub-agent invite (existing) ──────────────────────────────────────
        RouteRegistry::post('agent', 'sub-agents/invite', [$subAgent, 'invite']);

        // ── Dashboard ────────────────────────────────────────────────────────
        RouteRegistry::get('agent', 'dashboard/summary', [$agent, 'dashboardSummary']);

        // ── Students ─────────────────────────────────────────────────────────
        RouteRegistry::get('agent', 'students',              [$agent, 'listStudents']);
        RouteRegistry::get('agent', 'students/:pid',         [$agent, 'getStudent']);

        // ── Team ─────────────────────────────────────────────────────────────
        RouteRegistry::get('agent', 'team',                            [$agent, 'listTeam']);
        RouteRegistry::get('agent', 'team/:pid/students',              [$agent, 'listSubAgentStudents']);
        RouteRegistry::get('agent', 'team/:pid/sub-agents',            [$agent, 'listSubAgentChildren']);

        // ── Commissions (own) ────────────────────────────────────────────────
        RouteRegistry::get('agent', 'commissions/summary', [$agent, 'commissionSummary']);
        RouteRegistry::get('agent', 'commissions',         [$agent, 'listCommissions']);

        // ── Profile ──────────────────────────────────────────────────────────
        RouteRegistry::get('agent', 'profile', [$agent, 'getProfile']);
        RouteRegistry::put('agent', 'profile', [$agent, 'updateProfile']);

        // ── Legacy application routes ────────────────────────────────────────
        RouteRegistry::get('agent', 'applications',      [$agent, 'listApplications']);
        RouteRegistry::get('agent', 'applications/:pid', [$agent, 'getApplication']);
    }
}
```

---

## MILESTONE 5.3 — REASSIGNMENT WORKFLOW

### FILE: `crm-api/Models/ReassignmentModel.php`
**Action**: CREATE new file.

```php
<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;

final class ReassignmentModel
{
    /**
     * Find a pending reassignment request for a student.
     * Used to prevent duplicate submissions.
     */
    public static function findPendingByStudentId(int $studentId, PDO $pdo): ?array
    {
        $stmt = $pdo->prepare(
            "SELECT id, public_id, status FROM agent_reassignment_requests
             WHERE student_id = ? AND status = 'pending'"
        );
        $stmt->execute([$studentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Resolve a request by its public_id WITH a row lock (FOR UPDATE).
     * Must be called inside an active transaction.
     */
    public static function findForUpdate(string $publicId, PDO $pdo): ?array
    {
        $stmt = $pdo->prepare(
            "SELECT id, public_id, status, student_id, current_agent_id,
                    requested_agent_id, final_agent_id, reason
             FROM agent_reassignment_requests
             WHERE public_id = ? FOR UPDATE"
        );
        $stmt->execute([$publicId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Get all reassignment history for a student (admin view).
     */
    public static function historyByStudentId(int $studentId, PDO $pdo): array
    {
        $stmt = $pdo->prepare(
            "SELECT arr.public_id, arr.status, arr.reason, arr.review_notes,
                    arr.created_at, arr.reviewed_at,
                    ca.full_name AS current_agent_name,
                    ra.full_name AS requested_agent_name,
                    fa.full_name AS final_agent_name
             FROM agent_reassignment_requests arr
             LEFT JOIN agents ca ON ca.id = arr.current_agent_id
             LEFT JOIN agents ra ON ra.id = arr.requested_agent_id
             LEFT JOIN agents fa ON fa.id = arr.final_agent_id
             WHERE arr.student_id = ?
             ORDER BY arr.created_at DESC"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
```

### FILE: `crm-api/Controllers/ReassignmentController.php`
**Action**: CREATE new file.

```php
<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Paginator;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Models\ReassignmentModel;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\NotificationService;

final class ReassignmentController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STUDENT: Submit reassignment request  POST /student/agent/reassignment-request
    // ─────────────────────────────────────────────────────────────────────────

    public function studentRequest(): void
    {
        AuthMiddleware::requireAuth();
        $user  = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $reason             = trim($input['reason']               ?? '');
        $requestedAgentCode = trim($input['requested_agent_code'] ?? '');

        if (strlen($reason) < 10) {
            Response::error('Please provide a reason of at least 10 characters.', 'VALIDATION_ERROR', 422);
        }

        // Resolve student record
        $stmt = $this->pdo->prepare(
            "SELECT s.id, s.agent_lock_status, a.id AS agent_id,
                    a.referral_code AS agent_referral_code, a.full_name AS agent_name,
                    a.user_id AS agent_user_id
             FROM students s
             JOIN agents a ON a.id = s.agent_id
             WHERE s.user_id = ? AND s.deleted_at IS NULL"
        );
        $stmt->execute([$user['id']]);
        $student = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$student) {
            Response::error('Student profile not found.', 'NOT_FOUND', 404);
        }

        // Guard: agent lock (enrolled students cannot reassign)
        if ($student['agent_lock_status'] === 'locked') {
            Response::error(
                'Agent reassignment is not available after university admission.',
                'REASSIGNMENT_LOCKED', 403
            );
        }

        // Guard: no duplicate pending request
        if (ReassignmentModel::findPendingByStudentId($student['id'], $this->pdo)) {
            Response::error(
                'You already have a pending reassignment request.',
                'REQUEST_ALREADY_PENDING', 409
            );
        }

        // Resolve requested agent (optional)
        $requestedAgentId = null;
        if ($requestedAgentCode) {
            // Guard: same agent check
            if ($requestedAgentCode === $student['agent_referral_code']) {
                Response::error(
                    'You are already assigned to this agent.',
                    'SAME_AGENT', 422
                );
            }

            // Guard: requested agent must be APPROVED
            $agentStmt = $this->pdo->prepare(
                "SELECT id FROM agents WHERE referral_code = ? AND status = 'approved' AND deleted_at IS NULL"
            );
            $agentStmt->execute([$requestedAgentCode]);
            $requestedAgentId = $agentStmt->fetchColumn();

            if (!$requestedAgentId) {
                Response::error(
                    'The requested agent code is invalid or the agent is not active.',
                    'AGENT_NOT_FOUND', 422
                );
            }
        }

        // INSERT reassignment request
        $this->pdo->prepare(
            "INSERT INTO agent_reassignment_requests
                 (public_id, student_id, current_agent_id, requested_agent_id, reason, status, created_at)
             VALUES (?, ?, ?, ?, ?, 'pending', NOW())"
        )->execute([
            UlidGenerator::generate(),
            $student['id'],
            $student['agent_id'],
            $requestedAgentId ?: null,
            $reason,
        ]);

        ActivityLogger::log('reassignment.requested', 'student', $student['id']);

        // Notify all admins — get admin user IDs
        $adminStmt = $this->pdo->prepare(
            "SELECT u.id FROM users u JOIN admins adm ON adm.user_id = u.id WHERE u.status = 'active'"
        );
        $adminStmt->execute();
        $adminUserIds = array_column($adminStmt->fetchAll(PDO::FETCH_ASSOC), 'id');

        NotificationService::fire('agent.reassignment_requested', [
            'student_name'        => $user['name'] ?? 'Student',
            'current_agent_name'  => $student['agent_name'],
            'reason'              => $reason,
        ], $adminUserIds);

        Response::json([
            'data' => ['message' => 'Your reassignment request has been submitted and is pending admin review.'],
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STUDENT: View current agent + pending request  GET /student/agent
    // ─────────────────────────────────────────────────────────────────────────

    public function studentViewAgent(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();

        $stmt = $this->pdo->prepare(
            "SELECT s.id, s.agent_lock_status,
                    a.public_id AS agent_public_id, a.full_name AS agent_name,
                    a.agency_name, a.tier, a.referral_code, a.country
             FROM students s
             JOIN agents a ON a.id = s.agent_id
             WHERE s.user_id = ? AND s.deleted_at IS NULL"
        );
        $stmt->execute([$user['id']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Response::error('Student profile not found.', 'NOT_FOUND', 404);
        }

        // Check for pending reassignment
        $pending = ReassignmentModel::findPendingByStudentId($row['id'], $this->pdo);
        $pendingData = null;
        if ($pending) {
            $detailStmt = $this->pdo->prepare(
                "SELECT arr.public_id, arr.status, arr.reason, arr.created_at,
                        ra.full_name AS requested_agent_name
                 FROM agent_reassignment_requests arr
                 LEFT JOIN agents ra ON ra.id = arr.requested_agent_id
                 WHERE arr.id = ?"
            );
            $detailStmt->execute([$pending['id']]);
            $pendingData = $detailStmt->fetch(PDO::FETCH_ASSOC);
        }

        Response::json([
            'data' => [
                'current_agent' => [
                    'public_id'    => $row['agent_public_id'],
                    'full_name'    => $row['agent_name'],
                    'agency_name'  => $row['agency_name'],
                    'tier'         => (int) $row['tier'],
                    'referral_code' => $row['referral_code'],
                    'country'      => $row['country'],
                ],
                'agent_lock_status'    => $row['agent_lock_status'],
                'can_request_reassignment' => $row['agent_lock_status'] !== 'locked' && !$pending,
                'pending_reassignment' => $pendingData,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: List all reassignment requests  GET /admin/reassignment-requests
    // Filters: status, student_search, page, per_page
    // ─────────────────────────────────────────────────────────────────────────

    public function adminList(): void
    {
        RBACMiddleware::requirePermission('students', 'approve');
        $pager  = Paginator::fromQuery($_GET);
        $status = trim($_GET['status']         ?? 'pending');
        $search = trim($_GET['student_search'] ?? '');

        $conditions = ['1=1'];
        $params     = [];

        if ($status) {
            $conditions[] = "arr.status = :status";
            $params['status'] = $status;
        }
        if ($search) {
            $conditions[] = "s.full_name LIKE :search";
            $params['search'] = "%{$search}%";
        }
        $where = implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM agent_reassignment_requests arr
             JOIN students s ON s.id = arr.student_id WHERE {$where}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dataStmt = $this->pdo->prepare(
            "SELECT arr.public_id, arr.status, arr.reason, arr.review_notes,
                    arr.created_at, arr.reviewed_at,
                    s.public_id AS student_public_id, s.full_name AS student_name, s.profile_status,
                    ca.full_name AS current_agent_name, ca.referral_code AS current_agent_code,
                    ra.full_name AS requested_agent_name, ra.referral_code AS requested_agent_code,
                    fa.full_name AS final_agent_name
             FROM agent_reassignment_requests arr
             JOIN students s ON s.id = arr.student_id
             LEFT JOIN agents ca ON ca.id = arr.current_agent_id
             LEFT JOIN agents ra ON ra.id = arr.requested_agent_id
             LEFT JOIN agents fa ON fa.id = arr.final_agent_id
             WHERE {$where}
             ORDER BY arr.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $k => $v) {
            $dataStmt->bindValue(":{$k}", $v);
        }
        $dataStmt->bindValue(':limit',  $pager['per_page'], PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $pager['offset'],   PDO::PARAM_INT);
        $dataStmt->execute();
        $requests = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'data' => $requests,
            'meta' => [
                'total'       => $total,
                'page'        => $pager['page'],
                'per_page'    => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Get single request  GET /admin/reassignment-requests/:pid
    // ─────────────────────────────────────────────────────────────────────────

    public function adminGet(string $pid): void
    {
        RBACMiddleware::requirePermission('students', 'approve');

        $stmt = $this->pdo->prepare(
            "SELECT arr.public_id, arr.status, arr.reason, arr.review_notes,
                    arr.created_at, arr.reviewed_at,
                    s.public_id AS student_public_id, s.full_name AS student_name,
                    s.profile_status, s.agent_lock_status,
                    ca.public_id AS current_agent_pid, ca.full_name AS current_agent_name,
                    ca.referral_code AS current_agent_code,
                    ra.public_id AS requested_agent_pid, ra.full_name AS requested_agent_name,
                    ra.referral_code AS requested_agent_code, ra.status AS requested_agent_status,
                    fa.full_name AS final_agent_name
             FROM agent_reassignment_requests arr
             JOIN students s ON s.id = arr.student_id
             LEFT JOIN agents ca ON ca.id = arr.current_agent_id
             LEFT JOIN agents ra ON ra.id = arr.requested_agent_id
             LEFT JOIN agents fa ON fa.id = arr.final_agent_id
             WHERE arr.public_id = ?"
        );
        $stmt->execute([$pid]);
        $request = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$request) {
            Response::error('Request not found.', 'NOT_FOUND', 404);
        }

        Response::json(['data' => $request]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Approve request  PUT /admin/reassignment-requests/:pid/approve
    // Input: { "new_agent_code": "TGA-XXX999" (optional override), "notes": "..." }
    // USES SELECT FOR UPDATE — race-condition safe
    // ─────────────────────────────────────────────────────────────────────────

    public function adminApprove(string $pid): void
    {
        RBACMiddleware::requirePermission('students', 'approve');
        $user  = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $overrideAgentCode = trim($input['new_agent_code'] ?? '');
        $notes             = trim($input['notes']          ?? '');

        try {
            $this->pdo->beginTransaction();

            // CRITICAL: Lock the row to prevent concurrent approval race condition
            $request = ReassignmentModel::findForUpdate($pid, $this->pdo);

            if (!$request) {
                $this->pdo->rollBack();
                Response::error('Request not found.', 'NOT_FOUND', 404);
            }

            if ($request['status'] !== 'pending') {
                $this->pdo->rollBack();
                Response::error(
                    'This request has already been processed.',
                    'ALREADY_PROCESSED', 409
                );
            }

            // Resolve final agent: override code takes priority, then requested agent
            $newAgentId   = null;
            $newAgentData = null;

            if ($overrideAgentCode) {
                $agentStmt = $this->pdo->prepare(
                    "SELECT id, full_name, user_id FROM agents
                     WHERE referral_code = ? AND status = 'approved' AND deleted_at IS NULL"
                );
                $agentStmt->execute([$overrideAgentCode]);
                $newAgentData = $agentStmt->fetch(PDO::FETCH_ASSOC);

                if (!$newAgentData) {
                    $this->pdo->rollBack();
                    Response::error(
                        'The provided agent code is invalid or the agent is not approved.',
                        'AGENT_NOT_FOUND', 422
                    );
                }
                $newAgentId = (int) $newAgentData['id'];
            } elseif ($request['requested_agent_id']) {
                $agentStmt = $this->pdo->prepare(
                    "SELECT id, full_name, user_id FROM agents WHERE id = ? AND status = 'approved'"
                );
                $agentStmt->execute([$request['requested_agent_id']]);
                $newAgentData = $agentStmt->fetch(PDO::FETCH_ASSOC);

                if (!$newAgentData) {
                    $this->pdo->rollBack();
                    Response::error(
                        'The requested agent is no longer available. Provide a new_agent_code.',
                        'AGENT_NOT_FOUND', 422
                    );
                }
                $newAgentId = (int) $newAgentData['id'];
            } else {
                $this->pdo->rollBack();
                Response::error(
                    'No target agent specified. Provide new_agent_code in the request body.',
                    'AGENT_REQUIRED', 422
                );
            }

            // Fetch student + old agent info for notifications
            $studentStmt = $this->pdo->prepare(
                "SELECT s.id AS student_id, s.user_id AS student_user_id, s.full_name AS student_name,
                        a.id AS old_agent_id, a.user_id AS old_agent_user_id, a.full_name AS old_agent_name
                 FROM students s JOIN agents a ON a.id = s.agent_id
                 WHERE s.id = ?"
            );
            $studentStmt->execute([$request['student_id']]);
            $studentData = $studentStmt->fetch(PDO::FETCH_ASSOC);

            // UPDATE student agent assignment
            $this->pdo->prepare(
                "UPDATE students SET agent_id = ?, updated_at = NOW() WHERE id = ?"
            )->execute([$newAgentId, $request['student_id']]);

            // UPDATE request record
            $this->pdo->prepare(
                "UPDATE agent_reassignment_requests
                 SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(),
                     review_notes = ?, final_agent_id = ?
                 WHERE id = ?"
            )->execute([
                $user['sub'],
                $notes ?: null,
                $newAgentId,
                $request['id'],
            ]);

            $this->pdo->commit();

            // Activity log
            ActivityLogger::log(
                'student.agent_reassigned',
                'student',
                $request['student_id'],
                null,
                ['agent_id' => $studentData['old_agent_id']],
                ['agent_id' => $newAgentId]
            );

            // Notifications
            NotificationService::fire('agent.reassignment_approved', [
                'student_name'   => $studentData['student_name'],
                'new_agent_name' => $newAgentData['full_name'],
            ], [$studentData['student_user_id']]);

            NotificationService::fire('agent.reassignment_lost', [
                'agent_name'   => $studentData['old_agent_name'],
                'student_name' => $studentData['student_name'],
            ], [$studentData['old_agent_user_id']]);

            NotificationService::fire('agent.reassignment_gained', [
                'agent_name'   => $newAgentData['full_name'],
                'student_name' => $studentData['student_name'],
            ], [$newAgentData['user_id']]);

            Response::json([
                'data' => [
                    'success'         => true,
                    'new_agent_name'  => $newAgentData['full_name'],
                    'student_name'    => $studentData['student_name'],
                ],
            ]);

        } catch (\Exception $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Deny request  PUT /admin/reassignment-requests/:pid/deny
    // Input: { "notes": "..." }
    // ─────────────────────────────────────────────────────────────────────────

    public function adminDeny(string $pid): void
    {
        RBACMiddleware::requirePermission('students', 'approve');
        $user  = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $notes = trim($input['notes'] ?? '');

        try {
            $this->pdo->beginTransaction();

            $request = ReassignmentModel::findForUpdate($pid, $this->pdo);

            if (!$request) {
                $this->pdo->rollBack();
                Response::error('Request not found.', 'NOT_FOUND', 404);
            }

            if ($request['status'] !== 'pending') {
                $this->pdo->rollBack();
                Response::error('This request has already been processed.', 'ALREADY_PROCESSED', 409);
            }

            $this->pdo->prepare(
                "UPDATE agent_reassignment_requests
                 SET status = 'denied', reviewed_by = ?, reviewed_at = NOW(), review_notes = ?
                 WHERE id = ?"
            )->execute([$user['sub'], $notes ?: null, $request['id']]);

            // Get student user_id for notification
            $studentStmt = $this->pdo->prepare(
                "SELECT u.id AS user_id, s.full_name FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = ?"
            );
            $studentStmt->execute([$request['student_id']]);
            $studentInfo = $studentStmt->fetch(PDO::FETCH_ASSOC);

            $this->pdo->commit();

            ActivityLogger::log('reassignment.denied', 'student', $request['student_id']);

            NotificationService::fire('agent.reassignment_denied', [
                'student_name' => $studentInfo['full_name'] ?? 'Student',
                'review_notes' => $notes ?: 'No reason provided.',
            ], [$studentInfo['user_id']]);

            Response::json(['data' => ['message' => 'Reassignment request denied.']]);

        } catch (\Exception $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Reassignment history for a student  GET /admin/students/:pid/reassignment-history
    // ─────────────────────────────────────────────────────────────────────────

    public function adminStudentHistory(string $studentPid): void
    {
        RBACMiddleware::requirePermission('students', 'view');

        $stmt = $this->pdo->prepare(
            "SELECT id FROM students WHERE public_id = ? AND deleted_at IS NULL"
        );
        $stmt->execute([$studentPid]);
        $studentId = $stmt->fetchColumn();

        if (!$studentId) {
            Response::error('Student not found.', 'NOT_FOUND', 404);
        }

        $history = ReassignmentModel::historyByStudentId((int) $studentId, $this->pdo);
        Response::json(['data' => $history]);
    }
}
```

---

## MILESTONE 5.3 — StudentRoutes.php UPDATE

### FILE: `crm-api/Routes/StudentRoutes.php`
**Action**: ADD these two lines inside `register()`. Do NOT remove existing routes.

```php
// Add these imports at the top of the file:
use TGA\CRM\Controllers\ReassignmentController;

// Add inside register() method:
$reassignController = new ReassignmentController();
RouteRegistry::post('student', 'agent/reassignment-request', [$reassignController, 'studentRequest']);
RouteRegistry::get('student', 'agent', [$reassignController, 'studentViewAgent']);
```

---

## MILESTONE 5.4 — COMMISSION SERVICE

### FILE: `crm-api/Services/CommissionService.php`
**Action**: CREATE new file.

```php
<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use TGA\CRM\Helpers\UlidGenerator;

final class CommissionService
{
    /**
     * Insert a row into commission_audit_log.
     * Called before every status transition.
     */
    public static function auditLog(
        int    $commissionId,
        string $commissionPublicId,
        string $oldStatus,
        string $newStatus,
        string $action,
        int    $actorUserId,
        string $actorName,
        PDO    $pdo,
        ?float $oldAmount = null,
        ?float $newAmount = null,
        ?string $notes = null
    ): void {
        $pdo->prepare(
            "INSERT INTO commission_audit_log
                 (public_id, commission_id, commission_public_id,
                  old_status, new_status, old_amount, new_amount,
                  action, changed_by_user_id, changed_by_name, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
        )->execute([
            UlidGenerator::generate(),
            $commissionId,
            $commissionPublicId,
            $oldStatus,
            $newStatus,
            $oldAmount,
            $newAmount,
            $action,
            $actorUserId,
            $actorName,
            $notes,
        ]);
    }

    /**
     * Confirm a pending commission. Throws on state violation.
     */
    public static function confirm(
        string $publicId,
        int    $reviewerUserId,
        string $reviewerName,
        string $reviewNotes,
        PDO    $pdo
    ): array {
        $commission = self::fetchForWrite($publicId, $pdo);

        if ($commission['status'] !== 'pending') {
            throw new \RuntimeException('Only pending commissions can be confirmed.');
        }

        self::auditLog(
            (int) $commission['id'],
            $commission['public_id'],
            'pending', 'confirmed',
            'confirmed',
            $reviewerUserId, $reviewerName,
            $pdo, null, null, $reviewNotes
        );

        $pdo->prepare(
            "UPDATE commissions
             SET status = 'confirmed', decided_by = ?, decided_at = NOW(), updated_at = NOW()
             WHERE id = ?"
        )->execute([$reviewerUserId, $commission['id']]);

        return $commission;
    }

    /**
     * Mark a confirmed commission as paid.
     */
    public static function markPaid(
        string $publicId,
        int    $payerUserId,
        string $payerName,
        PDO    $pdo
    ): array {
        $commission = self::fetchForWrite($publicId, $pdo);

        if ($commission['status'] !== 'confirmed') {
            throw new \RuntimeException('Commission must be confirmed before marking as paid.');
        }

        self::auditLog(
            (int) $commission['id'],
            $commission['public_id'],
            'confirmed', 'paid',
            'paid',
            $payerUserId, $payerName,
            $pdo
        );

        $pdo->prepare(
            "UPDATE commissions
             SET status = 'paid', paid_at = NOW(),
                 paid_by_user_id = ?, paid_by_name = ?, updated_at = NOW()
             WHERE id = ?"
        )->execute([$payerUserId, $payerName, $commission['id']]);

        return $commission;
    }

    /**
     * Soft-delete a pending commission.
     */
    public static function softDelete(
        string $publicId,
        int    $actorUserId,
        string $actorName,
        PDO    $pdo
    ): void {
        $commission = self::fetchForWrite($publicId, $pdo);

        if ($commission['status'] !== 'pending') {
            throw new \RuntimeException('Only pending commissions can be deleted.');
        }

        self::auditLog(
            (int) $commission['id'],
            $commission['public_id'],
            'pending', 'pending',
            'deleted',
            $actorUserId, $actorName,
            $pdo
        );

        $pdo->prepare(
            "UPDATE commissions SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?"
        )->execute([$commission['id']]);
    }

    private static function fetchForWrite(string $publicId, PDO $pdo): array
    {
        $stmt = $pdo->prepare(
            "SELECT id, public_id, status, amount, agent_id, application_id
             FROM commissions WHERE public_id = ? AND deleted_at IS NULL"
        );
        $stmt->execute([$publicId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            throw new \RuntimeException('Commission record not found.');
        }

        return $row;
    }
}
```

### FILE: `crm-api/Models/CommissionModel.php`
**Action**: CREATE new file.

```php
<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;
use TGA\CRM\Helpers\UlidGenerator;

final class CommissionModel
{
    /**
     * Validate that the given agent is in the student's agent chain.
     * Returns true if:
     *   - agent IS the student's current agent, OR
     *   - agent is root_agent_id of the student's current agent's tree
     */
    public static function validateAgentChain(int $agentId, int $studentId, PDO $pdo): bool
    {
        $stmt = $pdo->prepare(
            "SELECT a.root_agent_id, s.agent_id AS student_agent_id
             FROM students s
             JOIN agents a ON a.id = s.agent_id
             WHERE s.id = ? AND s.deleted_at IS NULL"
        );
        $stmt->execute([$studentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return false;
        }

        // Direct agent OR root of the tree
        return (int) $row['student_agent_id'] === $agentId
            || (int) $row['root_agent_id'] === $agentId;
    }

    /**
     * Create a new commission record.
     * Assumes all validation has already been done by the controller.
     */
    public static function create(
        int    $applicationId,
        int    $agentId,
        float  $amount,
        ?float $percentage,
        string $currency,
        ?string $notes,
        int    $createdByUserId,
        string $createdByName,
        PDO    $pdo
    ): string {
        $publicId = UlidGenerator::generate();

        $pdo->prepare(
            "INSERT INTO commissions
                 (public_id, application_id, agent_id, amount, percentage, currency,
                  status, notes, created_by_user_id, created_by_name, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW(), NOW())"
        )->execute([
            $publicId,
            $applicationId,
            $agentId,
            $amount,
            $percentage,
            $currency,
            $notes,
            $createdByUserId,
            $createdByName,
        ]);

        return $publicId;
    }
}
```

### FILE: `crm-api/Controllers/CommissionController.php`
**Action**: CREATE new file.

```php
<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Paginator;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Models\CommissionModel;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\CommissionService;
use TGA\CRM\Services\NotificationService;

final class CommissionController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: List all commissions  GET /admin/commissions
    // Filters: agent_pid, status, from, to, page, per_page
    // ─────────────────────────────────────────────────────────────────────────

    public function adminList(): void
    {
        RBACMiddleware::requirePermission('commissions', 'view');
        $pager = Paginator::fromQuery($_GET);

        $agentPid = trim($_GET['agent_pid'] ?? '');
        $status   = trim($_GET['status']    ?? '');
        $from     = trim($_GET['from']      ?? '');
        $to       = trim($_GET['to']        ?? '');

        $conditions = ['c.deleted_at IS NULL'];
        $params     = [];

        if ($agentPid) {
            $conditions[] = "a.public_id = :agent_pid";
            $params['agent_pid'] = $agentPid;
        }
        if ($status) {
            $conditions[] = "c.status = :status";
            $params['status'] = $status;
        }
        if ($from) {
            $conditions[] = "DATE(c.created_at) >= :from";
            $params['from'] = $from;
        }
        if ($to) {
            $conditions[] = "DATE(c.created_at) <= :to";
            $params['to'] = $to;
        }
        $where = implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM commissions c
             JOIN agents a ON a.id = c.agent_id WHERE {$where}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dataStmt = $this->pdo->prepare(
            "SELECT c.public_id, c.amount, c.percentage, c.currency, c.status,
                    c.notes, c.created_at, c.decided_at, c.paid_at,
                    c.created_by_name, c.paid_by_name,
                    a.public_id AS agent_public_id, a.full_name AS agent_name, a.tier AS agent_tier,
                    s.full_name AS student_name, s.public_id AS student_public_id,
                    app.public_id AS application_public_id, app.reference_number
             FROM commissions c
             JOIN agents a ON a.id = c.agent_id
             JOIN applications app ON app.id = c.application_id
             JOIN students s ON s.id = app.student_id
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

        foreach ($commissions as &$c) {
            $c['amount'] = (float) $c['amount'];
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
    // ADMIN: Commission summary  GET /admin/commissions/summary
    // ─────────────────────────────────────────────────────────────────────────

    public function adminSummary(): void
    {
        RBACMiddleware::requirePermission('commissions', 'view');

        $stmt = $this->pdo->prepare(
            "SELECT
                SUM(CASE WHEN status = 'pending'   AND deleted_at IS NULL THEN amount ELSE 0 END) AS pending_total,
                SUM(CASE WHEN status = 'confirmed' AND deleted_at IS NULL THEN amount ELSE 0 END) AS confirmed_total,
                SUM(CASE WHEN status = 'paid'      AND deleted_at IS NULL THEN amount ELSE 0 END) AS paid_total,
                COUNT(CASE WHEN status = 'pending' AND deleted_at IS NULL THEN 1 END)             AS pending_count,
                COUNT(CASE WHEN status = 'confirmed' AND deleted_at IS NULL THEN 1 END)           AS confirmed_count,
                COUNT(CASE WHEN status = 'paid' AND deleted_at IS NULL THEN 1 END)               AS paid_count
             FROM commissions"
        );
        $stmt->execute();
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        Response::json([
            'data' => [
                'pending_total_inr'   => (float) ($summary['pending_total']   ?? 0),
                'confirmed_total_inr' => (float) ($summary['confirmed_total'] ?? 0),
                'paid_total_inr'      => (float) ($summary['paid_total']      ?? 0),
                'pending_count'       => (int)   ($summary['pending_count']   ?? 0),
                'confirmed_count'     => (int)   ($summary['confirmed_count'] ?? 0),
                'paid_count'          => (int)   ($summary['paid_count']      ?? 0),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Create commission  POST /admin/applications/:pid/commissions
    // Input: { agent_public_id, amount, percentage (opt), currency (opt), notes (opt) }
    // ─────────────────────────────────────────────────────────────────────────

    public function adminCreate(string $appPid): void
    {
        RBACMiddleware::requirePermission('commissions', 'create');
        $user  = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $agentPublicId = trim($input['agent_public_id'] ?? '');
        $amount        = (float) ($input['amount']     ?? 0);
        $percentage    = isset($input['percentage']) ? (float) $input['percentage'] : null;
        $currency      = strtoupper(trim($input['currency'] ?? 'INR'));
        $notes         = trim($input['notes'] ?? '');

        // Validate
        if (!$agentPublicId) {
            Response::error('agent_public_id is required.', 'VALIDATION_ERROR', 422);
        }
        if ($amount <= 0) {
            Response::error('Amount must be greater than 0.', 'VALIDATION_ERROR', 422);
        }
        if ($percentage !== null && ($percentage < 0 || $percentage > 100)) {
            Response::error('Percentage must be between 0 and 100.', 'VALIDATION_ERROR', 422);
        }

        // Resolve application
        $appStmt = $this->pdo->prepare(
            "SELECT id, student_id FROM applications WHERE public_id = ? AND deleted_at IS NULL"
        );
        $appStmt->execute([$appPid]);
        $application = $appStmt->fetch(PDO::FETCH_ASSOC);

        if (!$application) {
            Response::error('Application not found.', 'NOT_FOUND', 404);
        }

        // Resolve agent
        $agentStmt = $this->pdo->prepare(
            "SELECT id, full_name, user_id, status FROM agents WHERE public_id = ? AND deleted_at IS NULL"
        );
        $agentStmt->execute([$agentPublicId]);
        $agent = $agentStmt->fetch(PDO::FETCH_ASSOC);

        if (!$agent || $agent['status'] !== 'approved') {
            Response::error('Agent not found or is not an approved agent.', 'AGENT_NOT_FOUND', 422);
        }

        // SECURITY: Validate agent is in student's agent chain
        if (!CommissionModel::validateAgentChain((int) $agent['id'], (int) $application['student_id'], $this->pdo)) {
            Response::error(
                'The specified agent is not in this student\'s agent chain.',
                'AGENT_NOT_IN_STUDENT_CHAIN', 422
            );
        }

        // Get student name for notification
        $stuStmt = $this->pdo->prepare("SELECT full_name FROM students WHERE id = ?");
        $stuStmt->execute([$application['student_id']]);
        $studentName = $stuStmt->fetchColumn();

        $publicId = CommissionModel::create(
            (int) $application['id'],
            (int) $agent['id'],
            $amount,
            $percentage,
            $currency,
            $notes ?: null,
            (int) $user['sub'],
            (string) ($user['name'] ?? 'Admin'),
            $this->pdo
        );

        // Audit log creation
        $commStmt = $this->pdo->prepare("SELECT id FROM commissions WHERE public_id = ?");
        $commStmt->execute([$publicId]);
        $commId = (int) $commStmt->fetchColumn();

        CommissionService::auditLog(
            $commId, $publicId,
            '', 'pending',
            'created',
            (int) $user['sub'], (string) ($user['name'] ?? 'Admin'),
            $this->pdo,
            null, $amount, $notes ?: null
        );

        ActivityLogger::log('commission.created', 'commission', $commId);

        NotificationService::fire('commission.created', [
            'agent_name'   => $agent['full_name'],
            'amount'       => number_format($amount, 2),
            'currency'     => $currency,
            'student_name' => $studentName,
        ], [$agent['user_id']]);

        Response::json(['data' => ['public_id' => $publicId, 'message' => 'Commission record created.']], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: List commissions for an application  GET /admin/applications/:pid/commissions
    // ─────────────────────────────────────────────────────────────────────────

    public function adminListByApplication(string $appPid): void
    {
        RBACMiddleware::requirePermission('commissions', 'view');

        $appStmt = $this->pdo->prepare("SELECT id FROM applications WHERE public_id = ? AND deleted_at IS NULL");
        $appStmt->execute([$appPid]);
        $appId = $appStmt->fetchColumn();

        if (!$appId) {
            Response::error('Application not found.', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare(
            "SELECT c.public_id, c.amount, c.percentage, c.currency, c.status,
                    c.notes, c.created_at, c.decided_at, c.paid_at, c.created_by_name,
                    a.full_name AS agent_name, a.public_id AS agent_public_id
             FROM commissions c
             JOIN agents a ON a.id = c.agent_id
             WHERE c.application_id = ? AND c.deleted_at IS NULL
             ORDER BY c.created_at ASC"
        );
        $stmt->execute([$appId]);
        $commissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($commissions as &$c) {
            $c['amount'] = (float) $c['amount'];
        }
        unset($c);

        Response::json(['data' => $commissions]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Edit pending commission  PUT /admin/commissions/:pid
    // Input: { amount (opt), percentage (opt), notes (opt) }
    // ONLY pending commissions can be edited
    // ─────────────────────────────────────────────────────────────────────────

    public function adminEdit(string $pid): void
    {
        RBACMiddleware::requirePermission('commissions', 'edit');
        $user  = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $stmt = $this->pdo->prepare(
            "SELECT id, public_id, status, amount, percentage, notes FROM commissions
             WHERE public_id = ? AND deleted_at IS NULL"
        );
        $stmt->execute([$pid]);
        $commission = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$commission) {
            Response::error('Commission not found.', 'NOT_FOUND', 404);
        }

        // PHP immutability guard
        if ($commission['status'] !== 'pending') {
            Response::error(
                'Only pending commissions can be edited.',
                'COMMISSION_LOCKED', 422
            );
        }

        $newAmount     = isset($input['amount'])     ? (float) $input['amount']     : (float) $commission['amount'];
        $newPercentage = isset($input['percentage']) ? (float) $input['percentage'] : ($commission['percentage'] ? (float) $commission['percentage'] : null);
        $newNotes      = isset($input['notes'])      ? trim($input['notes'])        : $commission['notes'];

        if ($newAmount <= 0) {
            Response::error('Amount must be greater than 0.', 'VALIDATION_ERROR', 422);
        }

        CommissionService::auditLog(
            (int) $commission['id'],
            $commission['public_id'],
            'pending', 'pending',
            'edited',
            (int) $user['sub'], (string) ($user['name'] ?? 'Admin'),
            $this->pdo,
            (float) $commission['amount'],
            $newAmount
        );

        $this->pdo->prepare(
            "UPDATE commissions SET amount = ?, percentage = ?, notes = ?, updated_at = NOW() WHERE id = ?"
        )->execute([$newAmount, $newPercentage, $newNotes, $commission['id']]);

        Response::json(['data' => ['message' => 'Commission updated successfully.']]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Confirm commission  PUT /admin/commissions/:pid/confirm
    // ─────────────────────────────────────────────────────────────────────────

    public function adminConfirm(string $pid): void
    {
        RBACMiddleware::requirePermission('commissions', 'approve');
        $user  = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $notes = trim($input['notes'] ?? '');

        try {
            $commission = CommissionService::confirm(
                $pid,
                (int) $user['sub'],
                (string) ($user['name'] ?? 'Admin'),
                $notes,
                $this->pdo
            );

            // Get agent user_id for notification
            $agentStmt = $this->pdo->prepare(
                "SELECT a.user_id, a.full_name, s.full_name AS student_name
                 FROM commissions c
                 JOIN agents a ON a.id = c.agent_id
                 JOIN applications app ON app.id = c.application_id
                 JOIN students s ON s.id = app.student_id
                 WHERE c.public_id = ?"
            );
            $agentStmt->execute([$pid]);
            $notifData = $agentStmt->fetch(PDO::FETCH_ASSOC);

            ActivityLogger::log('commission.confirmed', 'commission', (int) $commission['id']);

            if ($notifData) {
                NotificationService::fire('commission.confirmed', [
                    'agent_name'   => $notifData['full_name'],
                    'amount'       => number_format((float) $commission['amount'], 2),
                    'currency'     => 'INR',
                    'student_name' => $notifData['student_name'],
                ], [$notifData['user_id']]);
            }

            Response::json(['data' => ['message' => 'Commission confirmed successfully.']]);

        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 'INVALID_TRANSITION', 422);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Mark paid  PUT /admin/commissions/:pid/pay
    // ─────────────────────────────────────────────────────────────────────────

    public function adminMarkPaid(string $pid): void
    {
        RBACMiddleware::requirePermission('commissions', 'approve');
        $user = AuthMiddleware::user();

        try {
            $commission = CommissionService::markPaid(
                $pid,
                (int) $user['sub'],
                (string) ($user['name'] ?? 'Admin'),
                $this->pdo
            );

            $agentStmt = $this->pdo->prepare(
                "SELECT a.user_id, a.full_name, s.full_name AS student_name
                 FROM commissions c
                 JOIN agents a ON a.id = c.agent_id
                 JOIN applications app ON app.id = c.application_id
                 JOIN students s ON s.id = app.student_id
                 WHERE c.public_id = ?"
            );
            $agentStmt->execute([$pid]);
            $notifData = $agentStmt->fetch(PDO::FETCH_ASSOC);

            ActivityLogger::log('commission.paid', 'commission', (int) $commission['id']);

            if ($notifData) {
                NotificationService::fire('commission.paid', [
                    'agent_name'   => $notifData['full_name'],
                    'amount'       => number_format((float) $commission['amount'], 2),
                    'currency'     => 'INR',
                    'student_name' => $notifData['student_name'],
                ], [$notifData['user_id']]);
            }

            Response::json(['data' => ['message' => 'Commission marked as paid.']]);

        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 'MUST_BE_CONFIRMED', 422);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Soft delete pending commission  DELETE /admin/commissions/:pid
    // ─────────────────────────────────────────────────────────────────────────

    public function adminDelete(string $pid): void
    {
        RBACMiddleware::requirePermission('commissions', 'edit');
        $user = AuthMiddleware::user();

        try {
            CommissionService::softDelete(
                $pid,
                (int) $user['sub'],
                (string) ($user['name'] ?? 'Admin'),
                $this->pdo
            );
            Response::json(['data' => ['message' => 'Commission record deleted.']]);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 'COMMISSION_LOCKED', 422);
        }
    }
}
```

---

## MILESTONE 5.5 — ADMIN AGENT TREE VIEW

### FILE: `crm-api/Controllers/AdminAgentController.php`
**Action**: APPEND these methods to the existing `AdminAgentController` class (do NOT remove existing methods).

```php
// ─── Add these methods INSIDE the existing AdminAgentController class ────────

public function listAll(): void
{
    RBACMiddleware::requirePermission('agents', 'view');
    $pager  = Paginator::fromQuery($_GET);
    $status = trim($_GET['status'] ?? '');
    $tier   = trim($_GET['tier']   ?? '');
    $search = trim($_GET['search'] ?? '');

    $conditions = ['a.deleted_at IS NULL'];
    $params     = [];

    if ($status) { $conditions[] = "a.status = :status"; $params['status'] = $status; }
    if ($tier)   { $conditions[] = "a.tier = :tier";     $params['tier']   = (int) $tier; }
    if ($search) { $conditions[] = "a.full_name LIKE :search"; $params['search'] = "%{$search}%"; }

    $where = implode(' AND ', $conditions);

    $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM agents a WHERE {$where}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $dataStmt = $this->pdo->prepare(
        "SELECT a.public_id, a.full_name, a.agency_name, a.tier, a.status,
                a.referral_code, a.country, a.created_at,
                COUNT(s.id) AS student_count
         FROM agents a
         LEFT JOIN students s ON s.agent_id = a.id AND s.deleted_at IS NULL
         WHERE {$where}
         GROUP BY a.id
         ORDER BY a.created_at DESC
         LIMIT :limit OFFSET :offset"
    );
    foreach ($params as $k => $v) { $dataStmt->bindValue(":{$k}", $v); }
    $dataStmt->bindValue(':limit',  $pager['per_page'], PDO::PARAM_INT);
    $dataStmt->bindValue(':offset', $pager['offset'],   PDO::PARAM_INT);
    $dataStmt->execute();

    Response::json([
        'data' => $dataStmt->fetchAll(PDO::FETCH_ASSOC),
        'meta' => [
            'total'       => $total,
            'page'        => $pager['page'],
            'per_page'    => $pager['per_page'],
            'total_pages' => (int) ceil($total / $pager['per_page']),
        ],
    ]);
}

public function getTree(string $publicId): void
{
    RBACMiddleware::requirePermission('agents', 'view');

    // Fetch root agent
    $rootStmt = $this->pdo->prepare(
        "SELECT id, root_agent_id FROM agents WHERE public_id = ? AND deleted_at IS NULL"
    );
    $rootStmt->execute([$publicId]);
    $rootAgent = $rootStmt->fetch(PDO::FETCH_ASSOC);

    if (!$rootAgent) {
        Response::error('Agent not found.', 'NOT_FOUND', 404);
    }

    $rootId = (int) $rootAgent['root_agent_id'] ?: (int) $rootAgent['id'];

    // Recursive CTE to get full tree (flat result)
    $stmt = $this->pdo->prepare(
        "WITH RECURSIVE agent_tree AS (
            SELECT id, public_id, full_name, agency_name, tier, status,
                   parent_agent_id, root_agent_id, referral_code, 0 AS depth
            FROM agents
            WHERE id = :root_id AND deleted_at IS NULL

            UNION ALL

            SELECT a.id, a.public_id, a.full_name, a.agency_name, a.tier, a.status,
                   a.parent_agent_id, a.root_agent_id, a.referral_code, at.depth + 1
            FROM agents a
            INNER JOIN agent_tree at ON a.parent_agent_id = at.id
            WHERE a.deleted_at IS NULL
        )
        SELECT at.*,
               COUNT(s.id)                                                     AS student_count,
               SUM(CASE WHEN s.profile_status = 'enrolled' THEN 1 ELSE 0 END) AS enrolled_count
        FROM agent_tree at
        LEFT JOIN students s ON s.agent_id = at.id AND s.deleted_at IS NULL
        GROUP BY at.id, at.public_id, at.full_name, at.agency_name, at.tier,
                 at.status, at.parent_agent_id, at.root_agent_id, at.referral_code, at.depth
        ORDER BY at.depth, at.full_name"
    );
    $stmt->execute(['root_id' => $rootId]);
    $flat = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // O(n) hash-map buildTree — not O(n²) nested foreach
    $map  = [];
    $tree = [];

    foreach ($flat as &$row) {
        $row['student_count']  = (int) $row['student_count'];
        $row['enrolled_count'] = (int) $row['enrolled_count'];
        $row['children']       = [];
        $map[$row['id']]       = &$row;
    }
    unset($row);

    foreach ($flat as &$row) {
        if ($row['parent_agent_id'] && isset($map[$row['parent_agent_id']])) {
            $map[$row['parent_agent_id']]['children'][] = &$row;
        } else {
            $tree[] = &$row;
        }
    }
    unset($row);

    Response::json(['data' => $tree]);
}
```

> **IMPORTANT**: Also add these two `use` statements to the imports of `AdminAgentController.php`
> if they are not already present:
> ```php
> use TGA\CRM\Helpers\Paginator;
> ```

---

## MILESTONE 5.6 — ADMIN DASHBOARD CONTROLLER

### FILE: `crm-api/Controllers/AdminDashboardController.php`
**Action**: CREATE new file.

```php
<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;

final class AdminDashboardController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function summary(): void
    {
        RBACMiddleware::requirePermission('students', 'view');
        AuthMiddleware::requireAuth();

        // Student totals
        $stuStmt = $this->pdo->prepare(
            "SELECT
                COUNT(*)                                                                  AS total,
                SUM(CASE WHEN profile_status = 'registered' AND
                         created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS new_this_month,
                SUM(CASE WHEN profile_status NOT IN ('registered','enrolled') THEN 1 ELSE 0 END) AS in_progress,
                SUM(CASE WHEN profile_status = 'enrolled'  THEN 1 ELSE 0 END)           AS enrolled
             FROM students WHERE deleted_at IS NULL"
        );
        $stuStmt->execute();
        $students = $stuStmt->fetch(PDO::FETCH_ASSOC);

        // Agent totals
        $agentStmt = $this->pdo->prepare(
            "SELECT
                SUM(CASE WHEN status = 'approved'  THEN 1 ELSE 0 END) AS total_approved,
                SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) AS pending_approval,
                SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) AS suspended
             FROM agents WHERE deleted_at IS NULL"
        );
        $agentStmt->execute();
        $agents = $agentStmt->fetch(PDO::FETCH_ASSOC);

        // Commission totals
        $commStmt = $this->pdo->prepare(
            "SELECT
                SUM(CASE WHEN status = 'pending'   AND deleted_at IS NULL THEN amount ELSE 0 END) AS pending_total,
                SUM(CASE WHEN status = 'confirmed' AND deleted_at IS NULL THEN amount ELSE 0 END) AS confirmed_total,
                SUM(CASE WHEN status = 'paid'      AND deleted_at IS NULL
                         AND YEAR(paid_at) = YEAR(NOW())            THEN amount ELSE 0 END) AS paid_ytd
             FROM commissions"
        );
        $commStmt->execute();
        $commissions = $commStmt->fetch(PDO::FETCH_ASSOC);

        // Actions required
        $pendingReassign = (int) $this->pdo->query(
            "SELECT COUNT(*) FROM agent_reassignment_requests WHERE status = 'pending'"
        )->fetchColumn();

        $pendingDocReview = (int) $this->pdo->query(
            "SELECT COUNT(*) FROM document_requests WHERE status = 'submitted' AND deleted_at IS NULL"
        )->fetchColumn();

        Response::json([
            'data' => [
                'students' => [
                    'total'          => (int) $students['total'],
                    'new_this_month' => (int) $students['new_this_month'],
                    'in_progress'    => (int) $students['in_progress'],
                    'enrolled'       => (int) $students['enrolled'],
                ],
                'agents' => [
                    'total_approved'  => (int) $agents['total_approved'],
                    'pending_approval' => (int) $agents['pending_approval'],
                    'suspended'       => (int) $agents['suspended'],
                ],
                'commissions' => [
                    'pending_total_inr'   => (float) ($commissions['pending_total']   ?? 0),
                    'confirmed_total_inr' => (float) ($commissions['confirmed_total'] ?? 0),
                    'paid_ytd_inr'        => (float) ($commissions['paid_ytd']        ?? 0),
                ],
                'actions_required' => [
                    'reassignment_requests'   => $pendingReassign,
                    'document_reviews_pending' => $pendingDocReview,
                ],
            ],
        ]);
    }
}
```

---

## MILESTONE 5.6 — AdminRoutes.php UPDATE

### FILE: `crm-api/Routes/AdminRoutes.php`
**Action**: OVERWRITE with the following complete file:

```php
<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\AdminAgentController;
use TGA\CRM\Controllers\AdminDashboardController;
use TGA\CRM\Controllers\CommissionController;
use TGA\CRM\Controllers\ReassignmentController;
use TGA\CRM\Controllers\RoleController;

final class AdminRoutes
{
    public static function register(): void
    {
        $agentCtrl     = new AdminAgentController();
        $roleCtrl      = new RoleController();
        $dashCtrl      = new AdminDashboardController();
        $commCtrl      = new CommissionController();
        $reassignCtrl  = new ReassignmentController();

        // ── Dashboard ────────────────────────────────────────────────────────
        RouteRegistry::get('admin', 'dashboard/summary', [$dashCtrl, 'summary']);

        // ── Agent Management ─────────────────────────────────────────────────
        RouteRegistry::get('admin', 'agents',                     [$agentCtrl, 'listAll']);
        RouteRegistry::get('admin', 'agents/pending',             [$agentCtrl, 'getPending']);
        RouteRegistry::get('admin', 'agents/:publicId/tree',      [$agentCtrl, 'getTree']);
        RouteRegistry::post('admin', 'agents/:publicId/approve',  [$agentCtrl, 'approve']);
        RouteRegistry::post('admin', 'agents/:publicId/reject',   [$agentCtrl, 'reject']);
        RouteRegistry::post('admin', 'agents/:publicId/suspend',  [$agentCtrl, 'suspend']);

        // ── Reassignment Requests ────────────────────────────────────────────
        RouteRegistry::get('admin', 'reassignment-requests',                   [$reassignCtrl, 'adminList']);
        RouteRegistry::get('admin', 'reassignment-requests/:pid',              [$reassignCtrl, 'adminGet']);
        RouteRegistry::put('admin', 'reassignment-requests/:pid/approve',      [$reassignCtrl, 'adminApprove']);
        RouteRegistry::put('admin', 'reassignment-requests/:pid/deny',         [$reassignCtrl, 'adminDeny']);
        RouteRegistry::get('admin', 'students/:pid/reassignment-history',      [$reassignCtrl, 'adminStudentHistory']);

        // ── Commissions ──────────────────────────────────────────────────────
        RouteRegistry::get('admin',    'commissions/summary',                 [$commCtrl, 'adminSummary']);
        RouteRegistry::get('admin',    'commissions',                         [$commCtrl, 'adminList']);
        RouteRegistry::put('admin',    'commissions/:pid',                    [$commCtrl, 'adminEdit']);
        RouteRegistry::put('admin',    'commissions/:pid/confirm',            [$commCtrl, 'adminConfirm']);
        RouteRegistry::put('admin',    'commissions/:pid/pay',                [$commCtrl, 'adminMarkPaid']);
        RouteRegistry::delete('admin', 'commissions/:pid',                    [$commCtrl, 'adminDelete']);

        // Application-scoped commission routes
        RouteRegistry::post('admin', 'applications/:pid/commissions',         [$commCtrl, 'adminCreate']);
        RouteRegistry::get('admin',  'applications/:pid/commissions',         [$commCtrl, 'adminListByApplication']);

        // ── Role Management ──────────────────────────────────────────────────
        RouteRegistry::get('admin',    'roles',           [$roleCtrl, 'list']);
        RouteRegistry::post('admin',   'roles',           [$roleCtrl, 'create']);
        RouteRegistry::put('admin',    'roles/:publicId', [$roleCtrl, 'update']);
        RouteRegistry::delete('admin', 'roles/:publicId', [$roleCtrl, 'delete']);
    }
}
```

---

## MILESTONE 5.7 — FRONTEND DATA WIRING

> All existing shell pages are at `src/pages/`. Wire them to live APIs using TanStack Query v5.
> Follow existing patterns from Phase 4 frontend files. Do NOT redesign the UI.

### Pattern reference (use this hook structure for all Phase 5 queries):
```ts
// Standard query hook
const { data, isLoading, error } = useQuery({
  queryKey: ['agent', 'dashboard', 'summary'],
  queryFn: () => apiClient.get('/agent/dashboard/summary').then(r => r.data.data),
  staleTime: 30_000,
});

// Lazy-load on expand (for team sub-agents)
const { data: subAgents } = useQuery({
  queryKey: ['agent', 'team', agentPid, 'sub-agents'],
  queryFn: () => apiClient.get(`/agent/team/${agentPid}/sub-agents`).then(r => r.data.data),
  enabled: isExpanded,     // ← only fetches when user expands
  staleTime: 120_000,
});

// Mutation (for profile update)
const mutation = useMutation({
  mutationFn: (data) => apiClient.put('/agent/profile', data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent', 'profile'] }),
});
```

### staleTime values for Phase 5:
| Query | staleTime |
|---|---|
| Agent dashboard summary | 30_000 |
| Agent student list | 30_000 |
| Agent commissions | 60_000 |
| Agent team (direct) | 120_000 |
| Agent sub-agents (lazy) | 120_000 |
| Admin commission summary | 30_000 |
| Admin reassignment queue | 15_000 |
| Admin agent tree | 60_000 |
| Student agent view | 30_000 |

### Files to wire (update each file's existing shell):

#### `src/pages/agent/AgentDashboard.tsx`
- Query: `GET /agent/dashboard/summary`
- Render: student counts (total, new, in_progress, enrolled), conversion_rate_pct, commission totals (own only), team counts
- Do NOT show `actions_required` here — that is admin-only

#### `src/pages/agent/AgentStudents.tsx` (or equivalent path)
- Query: `GET /agent/students?page=1&per_page=20&status=&search=&agent_pid=`
- Render: paginated table with full_name, nationality, profile_status, agent_name, applied_count
- Filters: status dropdown, search input, agent_pid dropdown (from team list)
- Pagination: standard prev/next using `meta.has_next` / `meta.has_prev`

#### `src/pages/agent/AgentTeam.tsx`
- Query: `GET /agent/team`
- Render: list of sub-agents with student_count, enrolled_count, sub_agent_count
- For each sub-agent with sub_agent_count > 0: show expand button
- On expand: lazy `GET /agent/team/:pid/sub-agents` (`enabled: isExpanded`)
- On click "View Students": route to students list filtered by `agent_pid`

#### `src/pages/agent/AgentCommissions.tsx`
- Two sections: "My Commissions" + "Team Breakdown" (rendered separately — never merged)
- My Commissions: `GET /agent/commissions?status=&page=1`
- Summary: `GET /agent/commissions/summary`
- Team breakdown: from `summary.sub_agents` array
- Show `is_student_reassigned` badge where true
- Status badge colors: pending=amber, confirmed=blue, paid=green

#### `src/pages/student/StudentAgentPage.tsx`
- Query: `GET /student/agent`
- Show current agent card (name, agency, tier, referral_code)
- If `pending_reassignment` exists: show pending request status card
- If `agent_lock_status === 'locked'`: show "Reassignment not available after enrollment" message
- If `can_request_reassignment`: show reassignment request form with reason textarea + optional agent code input
- On submit: `POST /student/agent/reassignment-request`

#### `src/components/agent/AgentTreeNode.tsx` — NEW component
```tsx
// Recursive component — no library dependency
// Props: node: { agent: AgentData, children: AgentNode[] }, depth: number

function AgentTreeNode({ node, depth = 0 }: { node: AgentNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  return (
    <div style={{ paddingLeft: depth * 24 }}>
      <div className="agent-tree-card">
        <span>{node.agent.full_name}</span>
        <span>{node.agent.tier === 1 ? 'L1' : node.agent.tier === 2 ? 'L2' : 'L3'}</span>
        <span>{node.agent.student_count} students</span>
        <span>{node.agent.enrolled_count} enrolled</span>
        {node.children.length > 0 && (
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? '▲' : '▼'}
          </button>
        )}
      </div>
      {expanded && node.children.map(child => (
        <AgentTreeNode key={child.agent.public_id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
```

#### `src/pages/admin/AdminAgentDetailPage.tsx`
- Query: `GET /admin/agents/:pid/tree`
- Render: `<AgentTreeNode node={treeData[0]} depth={0} />`
- staleTime: 60_000

#### `src/pages/admin/AdminCommissionsPage.tsx`
- Query: `GET /admin/commissions?status=&agent_pid=&from=&to=&page=1`
- Summary: `GET /admin/commissions/summary`
- Filters: status, agent dropdown, date range
- Actions per row:
  - pending: Edit (opens modal) + Confirm + Delete
  - confirmed: Mark Paid
  - paid: read-only
- Disable edit/confirm/delete buttons based on status (not just server-side guard)

---

## ROUTE CONFLICT NOTE — `commissions/summary` vs `commissions/:pid`

The `RouteRegistry` matches routes in registration order. Register `commissions/summary`
BEFORE `commissions/:pid` in `AdminRoutes.php` so that `summary` is not captured as a `:pid`.

This is already done correctly in the `AdminRoutes.php` specification above (summary listed first).
Apply the same principle to any nested routes with static segments before dynamic ones.

---

## PHASE 5 AUDIT CHECKLIST (for Gemini to verify after implementation)

### Agent Subtree:
- [ ] `GET /agent/students` scoped by `root_agent_id` — cross-subtree students not returned
- [ ] `GET /agent/students/:pid` returns 403 for students outside subtree
- [ ] No PII columns (passport, DOB, phone) in any agent response
- [ ] `applied_count` uses LEFT JOIN aggregation (no N+1 subqueries)
- [ ] NULLIF(COUNT(*),0) prevents division-by-zero in conversion_rate_pct
- [ ] `GET /agent/team` returns ONLY direct children (`parent_agent_id = my_id`)
- [ ] `GET /agent/team/:pid/sub-agents` correctly scoped + errors if not in tree

### Reassignment:
- [ ] Student with `agent_lock_status = 'locked'` → 403 REASSIGNMENT_LOCKED
- [ ] Duplicate pending request → 409 REQUEST_ALREADY_PENDING
- [ ] Student requests same agent → 422 SAME_AGENT
- [ ] Requested agent must be `status = 'approved'` — pending/suspended rejected
- [ ] `SELECT FOR UPDATE` used in approve/deny transactions
- [ ] Concurrent approve test: second request returns 409 ALREADY_PROCESSED
- [ ] After approval: `students.agent_id` updated to new agent
- [ ] After approval: old agent's subtree check returns 403 for the reassigned student
- [ ] 3 notifications fire on approval (student, old agent, new agent)
- [ ] 1 notification fires on denial (student `agent.reassignment_denied`)
- [ ] Admin can override requested agent with different `new_agent_code`

### Commissions:
- [ ] `created_by_user_id` + `created_by_name` populated on creation
- [ ] Agent-chain validation rejects commission for unrelated agent (422)
- [ ] Pending: editable (amount, notes, percentage)
- [ ] Confirmed: edit returns 422 COMMISSION_LOCKED
- [ ] Paid: edit returns 422 COMMISSION_LOCKED (PHP guard)
- [ ] Paid: edit via direct SQL rejected by DB trigger (SQLSTATE 45000)
- [ ] `commission_audit_log` row inserted for: created, edited, confirmed, paid, deleted
- [ ] DELETE only works for pending; confirmed/paid returns 422
- [ ] Agent sees ONLY own commissions — not sub-agents' records
- [ ] `is_student_reassigned` flag set correctly

### Admin Dashboard:
- [ ] `actions_required.reassignment_requests` reflects actual pending count
- [ ] `actions_required` NOT present in agent dashboard response

### Frontend:
- [ ] Commission edit form disabled for non-pending statuses
- [ ] Reassignment form hidden/disabled for locked students
- [ ] Sub-agent breakdown separated visually from own totals
- [ ] `AgentTreeNode` renders all 3 levels with correct nesting
