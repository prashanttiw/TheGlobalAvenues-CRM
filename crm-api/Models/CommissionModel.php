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
        // Recursively traverse from the student's direct agent up to the root
        $stmt = $pdo->prepare(
            "WITH RECURSIVE agent_chain AS (
                 SELECT id, parent_agent_id
                 FROM agents
                 WHERE id = (SELECT agent_id FROM students WHERE id = ? AND deleted_at IS NULL)
                 
                 UNION ALL
                 
                 SELECT a.id, a.parent_agent_id
                 FROM agents a
                 JOIN agent_chain ac ON a.id = ac.parent_agent_id
             )
             SELECT 1 FROM agent_chain WHERE id = ?"
        );
        $stmt->execute([$studentId, $agentId]);
        return (bool) $stmt->fetchColumn();
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
