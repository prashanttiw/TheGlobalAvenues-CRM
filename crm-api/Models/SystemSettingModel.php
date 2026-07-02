<?php

namespace TGA\CRM\Models;

use PDO;
use Exception;

class SystemSettingModel extends BaseModel {

    public static function findAllGrouped(PDO $pdo): array {
        $stmt = $pdo->query("SELECT * FROM system_settings ORDER BY group_name, setting_key");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $grouped = [];
        foreach ($rows as $row) {
            $group = $row['group_name'] ?? 'general';
            if (!isset($grouped[$group])) {
                $grouped[$group] = [];
            }
            $grouped[$group][] = $row;
        }

        return $grouped;
    }

    public static function findByKey(PDO $pdo, string $key): ?array {
        $stmt = $pdo->prepare("SELECT * FROM system_settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public static function updateByKey(PDO $pdo, string $key, string $value, int $adminId): bool {
        $stmt = $pdo->prepare("
            UPDATE system_settings
            SET setting_value = ?, updated_by = ?
            WHERE setting_key = ? AND is_editable = 1
        ");
        return $stmt->execute([$value, $adminId, $key]);
    }
}
