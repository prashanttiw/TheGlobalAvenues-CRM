<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use TGA\CRM\Config\Database;

final class AuditService
{
    public function log(
        ?int $userId,
        string $action,
        ?string $entityType,
        ?int $entityId,
        ?array $oldData,
        ?array $newData
    ): void {
        try {
            $statement = Database::getConnection()->prepare(
                'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent)
                 VALUES (:user_id, :action, :entity_type, :entity_id, :old_data, :new_data, :ip_address, :user_agent)'
            );

            $statement->execute([
                'user_id' => $userId,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'old_data' => $oldData !== null ? json_encode($oldData, JSON_UNESCAPED_SLASHES) : null,
                'new_data' => $newData !== null ? json_encode($newData, JSON_UNESCAPED_SLASHES) : null,
                'ip_address' => $this->ipAddress(),
                'user_agent' => $this->userAgent(),
            ]);
        } catch (\Throwable $exception) {
            error_log('[audit] ' . $exception->getMessage());
        }
    }

    private function ipAddress(): ?string
    {
        $value = $_SERVER['REMOTE_ADDR'] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }

    private function userAgent(): ?string
    {
        $value = $_SERVER['HTTP_USER_AGENT'] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }
}
