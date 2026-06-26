<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use TGA\CRM\Config\Database;
use PDO;

final class NotificationTemplateModel extends BaseModel
{
    protected string $table = 'notification_templates';

    public static function findByEventKey(string $eventKey): ?array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM notification_templates WHERE event_key = ? LIMIT 1");
        $stmt->execute([$eventKey]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }
}
