<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use TGA\CRM\Config\Database;

class SystemSettings
{
    private static array $runtimeCache = [];
    private static bool $loaded = false;

    private static function loadAll(): void
    {
        if (self::$loaded) {
            return;
        }

        $cacheFile = __DIR__ . '/../../storage/cache/settings.json';
        if (file_exists($cacheFile)) {
            $data = json_decode(file_get_contents($cacheFile), true);
            if (is_array($data)) {
                self::$runtimeCache = $data;
                self::$loaded = true;
                return;
            }
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->query("SELECT setting_key, setting_value FROM system_settings");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $row) {
                self::$runtimeCache[$row['setting_key']] = $row['setting_value'];
            }
            self::$loaded = true;

            @mkdir(dirname($cacheFile), 0777, true);
            @file_put_contents($cacheFile, json_encode(self::$runtimeCache));
        } catch (\Throwable $e) {
            // Failsafe if DB is down
        }
    }

    /**
     * Gets a system setting, returns default if not found.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        self::loadAll();
        return self::$runtimeCache[$key] ?? $default;
    }

    /**
     * Gets all settings as a key-value array.
     */
    public static function getAll(): array
    {
        self::loadAll();
        return self::$runtimeCache;
    }

    /**
     * Invalidates the settings cache.
     */
    public static function clearCache(): void
    {
        self::$loaded = false;
        self::$runtimeCache = [];
        $cacheFile = __DIR__ . '/../../storage/cache/settings.json';
        if (file_exists($cacheFile)) {
            @unlink($cacheFile);
        }
    }
}
