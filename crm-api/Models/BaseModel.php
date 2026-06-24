<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Config\States;
use TGA\CRM\Helpers\UlidGenerator;

abstract class BaseModel
{
    protected PDO $pdo;
    protected string $table;
    protected bool $useSoftDeletes = true;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    protected function getBaseQuery(): string
    {
        $query = "SELECT * FROM `{$this->table}`";
        if ($this->useSoftDeletes) {
            $query .= " WHERE deleted_at IS NULL";
        } else {
            $query .= " WHERE 1=1";
        }
        return $query;
    }

    public function findByPublicId(string $publicId): ?array
    {
        $query = $this->getBaseQuery() . " AND public_id = ? LIMIT 1";
        $stmt = $this->pdo->prepare($query);
        $stmt->execute([$publicId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function findById(int $id): ?array
    {
        $query = $this->getBaseQuery() . " AND id = ? LIMIT 1";
        $stmt = $this->pdo->prepare($query);
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function softDelete(int $id): bool
    {
        if (!$this->useSoftDeletes) {
            throw new \LogicException("Table {$this->table} does not support soft deletes.");
        }
        $stmt = $this->pdo->prepare("UPDATE `{$this->table}` SET deleted_at = NOW() WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function paginate(int $page = 1, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;
        
        $whereClause = $this->useSoftDeletes ? "WHERE deleted_at IS NULL" : "";
        
        $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM `{$this->table}` {$whereClause}");
        $countStmt->execute();
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->pdo->prepare("SELECT * FROM `{$this->table}` {$whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->bindValue(1, $perPage, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'data' => $items,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage)
            ]
        ];
    }

    public function insert(array $data): int
    {
        $columns = array_keys($data);
        $placeholders = array_fill(0, count($data), '?');
        
        // Ensure column names are safely backticked to prevent SQL injection via array keys
        $safeColumns = array_map(fn($col) => "`" . str_replace("`", "", $col) . "`", $columns);
        
        $sql = sprintf(
            "INSERT INTO `%s` (%s) VALUES (%s)",
            $this->table,
            implode(', ', $safeColumns),
            implode(', ', $placeholders)
        );
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_values($data));
        
        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        if (empty($data)) {
            return true;
        }
        
        // Status enum validation
        if (isset($data['status']) && $this->table === 'applications') {
            if (!in_array($data['status'], States::APPLICATION, true)) {
                Response::error('Invalid application status', 'VALIDATION_ERROR', 400);
            }
        }
        if (isset($data['profile_status']) && $this->table === 'students') {
            if (!in_array($data['profile_status'], States::STUDENT_PROFILE, true)) {
                Response::error('Invalid student profile status', 'VALIDATION_ERROR', 400);
            }
        }

        $setClause = [];
        foreach (array_keys($data) as $column) {
            $safeCol = "`" . str_replace("`", "", $column) . "`";
            $setClause[] = "{$safeCol} = ?";
        }
        
        $sql = sprintf(
            "UPDATE `%s` SET %s WHERE id = ?",
            $this->table,
            implode(', ', $setClause)
        );
        
        $values = array_values($data);
        $values[] = $id; // For the WHERE id = ?
        
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($values);
    }
}
