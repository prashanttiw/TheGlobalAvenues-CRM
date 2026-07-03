<?php

declare(strict_types=1);

namespace TGA\CRM\Helpers;

use PDO;

final class AgentHierarchy
{
    /**
     * Resolves the set of users.id values a given agent (by users.id) is allowed to see,
     * per the 3-tier hierarchy: tier 1 (root) sees its whole subtree, tier 2 sees itself
     * plus its direct (tier 3) children, tier 3 sees only itself.
     *
     * Falls back to [$requestingUserId] if the requester has no agent profile.
     */
    public static function subtreeUserIds(PDO $pdo, int $requestingUserId): array
    {
        $stmt = $pdo->prepare("SELECT id, root_agent_id, tier, parent_agent_id FROM agents WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$requestingUserId]);
        $agent = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$agent) {
            return [$requestingUserId];
        }

        $agentIds = [(int) $agent['id']];
        $tier = (int) $agent['tier'];

        if ($tier === 1) {
            $subStmt = $pdo->prepare("SELECT id FROM agents WHERE root_agent_id = ? AND deleted_at IS NULL");
            $subStmt->execute([(int) $agent['root_agent_id']]);
            $agentIds = array_merge([(int) $agent['id']], $subStmt->fetchAll(PDO::FETCH_COLUMN));
        } elseif ($tier === 2) {
            $subStmt = $pdo->prepare("SELECT id FROM agents WHERE parent_agent_id = ? AND deleted_at IS NULL");
            $subStmt->execute([(int) $agent['id']]);
            $agentIds = array_merge($agentIds, $subStmt->fetchAll(PDO::FETCH_COLUMN));
        }

        $userIds = [];
        if (!empty($agentIds)) {
            $inClause = implode(',', array_fill(0, count($agentIds), '?'));
            $userStmt = $pdo->prepare("SELECT user_id FROM agents WHERE id IN ({$inClause}) AND user_id IS NOT NULL");
            $userStmt->execute($agentIds);
            $userIds = $userStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        return empty($userIds) ? [$requestingUserId] : $userIds;
    }
}
