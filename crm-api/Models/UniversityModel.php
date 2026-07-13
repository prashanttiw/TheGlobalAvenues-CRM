<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;
use Exception;

class UniversityModel extends BaseModel
{
    protected string $table = 'universities';
    protected bool $useSoftDeletes = true;

    /**
     * Soft deletes the university and cascades soft delete to its courses and intakes.
     *
     * @param int $id The ID of the university to delete.
     * @return bool
     * @throws Exception
     */
    public function softDeleteWithCascade(int $id): bool
    {
        try {
            $this->pdo->beginTransaction();
            
            // Delete university
            $this->softDelete($id);
            
            // Cascade to courses
            $stmt = $this->pdo->prepare("UPDATE courses SET status = 'inactive', deleted_at = NOW() WHERE university_id = ? AND deleted_at IS NULL");
            $stmt->execute([$id]);
            
            // Cascade to intakes (no deleted_at in intakes, so we just set status to closed)
            $stmt = $this->pdo->prepare("
                UPDATE intakes i
                JOIN courses c ON c.id = i.course_id
                SET i.status = 'closed'
                WHERE c.university_id = ?
            ");
            $stmt->execute([$id]);
            
            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Other campuses of the same real-world institution (rows sharing this university's
     * campus_group_id). ORDER BY created_at ASC puts the original/primary campus first without
     * needing a separate is_primary column.
     */
    public function findSiblings(int $id): array
    {
        $stmt = $this->pdo->prepare("
            SELECT id, public_id, name, city, country FROM universities
            WHERE campus_group_id = (SELECT campus_group_id FROM universities WHERE id = ?)
              AND campus_group_id IS NOT NULL AND id != ? AND deleted_at IS NULL
            ORDER BY created_at ASC
        ");
        $stmt->execute([$id, $id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * All campus rows of the same institution as $id, INCLUDING itself — used by the
     * student/agent "pick a campus" step. A university with no campus_group_id (no siblings)
     * still returns its own single row, so callers never have to special-case "no group".
     * Each row carries its own active course_count so the campus-picker cards can show it
     * without a follow-up request per card.
     *
     * $activeOnly=true (the public/student/agent default) restricts to status='active' campuses.
     * Admin callers pass false so an inactive campus can still be found/managed via the catalog
     * filters, matching adminList()'s own behavior of never restricting by status.
     */
    public function findGroupMembers(int $id, bool $activeOnly = true): array
    {
        $statusClause = $activeOnly ? "AND u.status = 'active'" : '';
        $stmt = $this->pdo->prepare("
            SELECT u.id, u.public_id, u.name, u.city, u.country, u.logo_file_id, u.status,
                   (SELECT COUNT(*) FROM courses c WHERE c.university_id = u.id AND c.status = 'active' AND c.deleted_at IS NULL) as course_count
            FROM universities u
            WHERE u.deleted_at IS NULL {$statusClause}
              AND (
                (u.campus_group_id IS NOT NULL AND u.campus_group_id = (SELECT campus_group_id FROM universities WHERE id = ?))
                OR u.id = ?
              )
            ORDER BY u.created_at ASC
        ");
        $stmt->execute([$id, $id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
