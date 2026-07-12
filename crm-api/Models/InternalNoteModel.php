<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;

final class InternalNoteModel extends BaseModel
{
    protected string $table = 'internal_notes';

    public function findVisibleNotes(string $entityType, int $entityId, array $user, int $limit = 50, int $offset = 0): array
    {
        $roleCond = '';
        $params = [$entityType, $entityId];

        if ($user['utype'] === 'admin') {
            $roleCond = "AND (n.visible_to_admin = 1 OR (n.author_type = 'admin' AND n.author_id = ?))";
            $params[] = $user['id'];
        } elseif ($user['utype'] === 'agent') {
            $roleCond = "AND n.visible_to_agent = 1";
        } elseif ($user['utype'] === 'student') {
            $roleCond = "AND n.visible_to_student = 1";
        } else {
            return [];
        }

        // users has no name columns (email/phone are the only PII, both encrypted) — display names
        // live on the role-specific profile tables. author_type is only ever 'admin' or 'agent'
        // (see 024_create_internal_notes_table.sql), so exactly one of these LEFT JOINs matches per row.
        $stmt = $this->pdo->prepare("
            SELECT n.*, u.user_type, COALESCE(adm.full_name, ag.full_name) AS author_full_name
            FROM internal_notes n
            JOIN users u ON n.author_id = u.id
            LEFT JOIN admins adm ON adm.user_id = u.id AND u.user_type = 'admin'
            LEFT JOIN agents ag ON ag.user_id = u.id AND u.user_type = 'agent'
            WHERE n.entity_type = ? AND n.entity_id = ? AND n.deleted_at IS NULL
            {$roleCond}
            ORDER BY n.is_pinned DESC, n.created_at DESC
            LIMIT ? OFFSET ?
        ");

        foreach ($params as $i => $val) {
            $stmt->bindValue($i + 1, $val);
        }
        $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(count($params) + 2, $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
