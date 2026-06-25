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
}
