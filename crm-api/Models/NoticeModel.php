<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;

final class NoticeModel extends BaseModel
{
    protected string $table = 'notices';

    public function getFeedForStudent(int $studentUserId, int $limit = 50, int $offset = 0): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM notices 
            WHERE status = 'published' 
              AND visible_to_students = 1 
              AND (expires_at IS NULL OR expires_at > NOW())
              AND deleted_at IS NULL
            ORDER BY published_at DESC, created_at DESC 
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getFeedForAgent(int $agentUserId, int $limit = 50, int $offset = 0): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM notices 
            WHERE status = 'published' 
              AND visible_to_agents = 1 
              AND (expires_at IS NULL OR expires_at > NOW())
              AND deleted_at IS NULL
            ORDER BY published_at DESC, created_at DESC 
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getFeedForAdmin(int $limit = 50, int $offset = 0): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM notices 
            WHERE status = 'published' 
              AND visible_to_admins = 1 
              AND (expires_at IS NULL OR expires_at > NOW())
              AND deleted_at IS NULL
            ORDER BY published_at DESC, created_at DESC 
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
