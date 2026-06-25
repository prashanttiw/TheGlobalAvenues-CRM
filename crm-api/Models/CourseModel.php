<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;
use Exception;

class CourseModel extends BaseModel
{
    protected string $table = 'courses';
    protected bool $useSoftDeletes = true;

    public function softDeleteWithCascade(int $id): bool
    {
        try {
            $this->pdo->beginTransaction();
            
            // Delete course
            $this->softDelete($id);
            
            // Cascade to intakes (no deleted_at in intakes, so we just set status to closed)
            $stmt = $this->pdo->prepare("UPDATE intakes SET status = 'closed' WHERE course_id = ?");
            $stmt->execute([$id]);
            
            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
