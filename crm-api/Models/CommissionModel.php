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
        // Bounded self-join instead of a recursive CTE — production MySQL is 5.7, which has no
        // CTE support at all (recursive or otherwise). Safe to bound at 2 parent hops because the
        // agent hierarchy is hard-capped at 3 tiers (tier 3 cannot create further sub-agents — see
        // SubAgentController), so root is at most 2 parent_agent_id hops from any agent.
        $stmt = $pdo->prepare(
            "SELECT a0.id AS l0, a1.id AS l1, a2.id AS l2
             FROM agents a0
             LEFT JOIN agents a1 ON a1.id = a0.parent_agent_id
             LEFT JOIN agents a2 ON a2.id = a1.parent_agent_id
             WHERE a0.id = (SELECT agent_id FROM students WHERE id = ? AND deleted_at IS NULL)"
        );
        $stmt->execute([$studentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return false;
        }
        foreach ([$row['l0'], $row['l1'], $row['l2']] as $chainId) {
            if ($chainId !== null && (int) $chainId === $agentId) {
                return true;
            }
        }
        return false;
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
