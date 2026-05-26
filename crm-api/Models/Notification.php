<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;

final class Notification extends BaseModel
{
    public function listForUser(int $userId): array
    {
        $statement = $this->connection->prepare(
            'SELECT id, type, title, message, channel, read_at, sent_at, created_at
             FROM notifications
             WHERE user_id = :user_id
             ORDER BY created_at DESC
             LIMIT 50'
        );
        $statement->execute(['user_id' => $userId]);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function countUnread(int $userId): int
    {
        $statement = $this->connection->prepare(
            'SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND read_at IS NULL'
        );
        $statement->execute(['user_id' => $userId]);

        return (int) $statement->fetchColumn();
    }
}
