<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

class IntakeModel extends BaseModel
{
    protected string $table = 'intakes';
    protected bool $useSoftDeletes = false;

    /**
     * Intakes have no deleted_at column (hard-delete only, see 016_create_intakes_table.sql),
     * so BaseModel::softDelete() doesn't apply here — and BaseModel has no hard-delete method
     * at all, so IntakeController::delete() was calling a method that never existed.
     */
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM `{$this->table}` WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
