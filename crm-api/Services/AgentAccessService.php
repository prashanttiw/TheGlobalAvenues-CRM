<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use TGA\CRM\Helpers\Response;

/**
 * Tier-scoped agent → student access checks, extracted from the pattern already
 * proven in AgentController (resolveAgent()/resolveTargetAgent(), used for
 * sub-agent subtree checks). This generalizes the same subtree logic for
 * *student* targets so new agent-facing endpoints (readiness, academic profile,
 * application creation) don't each re-implement the tier check.
 */
final class AgentAccessService
{
    /**
     * @return array{id:int, public_id:string, root_agent_id:int, parent_agent_id:?int, tier:int, full_name:string, status:string}
     */
    public static function resolveAgent(PDO $pdo, int $userId): array
    {
        $stmt = $pdo->prepare(
            "SELECT id, public_id, root_agent_id, parent_agent_id, tier, full_name, status
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
     * Mirrors the tier-scoped subtree check already used by AgentController::getStudent()/listStudents():
     * tier 3 → only their own directly-assigned students; tier 2 → own + direct sub-agent's students;
     * tier 1 (root) → anyone under root_agent_id. Aborts the request with 403 if out of scope.
     */
    public static function assertCanAccessStudent(PDO $pdo, array $agent, int $studentId): void
    {
        $tier = (int) $agent['tier'];
        $myId = (int) $agent['id'];

        if ($tier === 3) {
            $sql = "SELECT 1 FROM students WHERE id = ? AND agent_id = ? AND deleted_at IS NULL";
            $params = [$studentId, $myId];
        } elseif ($tier === 2) {
            $sql = "SELECT 1 FROM students s JOIN agents a ON a.id = s.agent_id
                    WHERE s.id = ? AND (s.agent_id = ? OR a.parent_agent_id = ?) AND s.deleted_at IS NULL";
            $params = [$studentId, $myId, $myId];
        } else {
            $root = (int) $agent['root_agent_id'];
            $sql = "SELECT 1 FROM students s JOIN agents a ON a.id = s.agent_id
                    WHERE s.id = ? AND a.root_agent_id = ? AND s.deleted_at IS NULL";
            $params = [$studentId, $root];
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        if (!$stmt->fetchColumn()) {
            Response::error('Student not found in your network.', 'FORBIDDEN', 403);
        }
    }
}
