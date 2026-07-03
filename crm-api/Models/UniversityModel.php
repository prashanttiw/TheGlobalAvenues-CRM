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
}
