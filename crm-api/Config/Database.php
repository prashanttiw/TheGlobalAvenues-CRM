<?php

declare(strict_types=1);

namespace TGA\CRM\Config;

use PDO;
use PDOException;

final class Database
{
    private static ?PDO $connection = null;

    public static function getConnection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            Environment::getRequired('DB_HOST'),
            Environment::get('DB_PORT', '3306'),
            Environment::getRequired('DB_NAME'),
            Environment::get('DB_CHARSET', 'utf8mb4')
        );

        try {
            self::$connection = new PDO(
                $dsn,
                Environment::getRequired('DB_USER'),
                Environment::get('DB_PASS', ''),
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
        } catch (PDOException $exception) {
            error_log("[Database Connection Error] " . $exception->getMessage() . "\n" . $exception->getTraceAsString());
            throw new \RuntimeException('Database connection failed');
        }

        return self::$connection;
    }

    private static ?bool $supportsSkipLocked = null;

    public static function supportsSkipLocked(PDO $pdo): bool
    {
        if (self::$supportsSkipLocked !== null) {
            return self::$supportsSkipLocked;
        }

        try {
            $version = $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
            if (stripos($version, 'MariaDB') !== false) {
                // Handle MariaDB versions (e.g., "10.4.32-MariaDB" or "5.5.5-10.4.32-MariaDB")
                if (preg_match('/10\.([0-9]+)\.[0-9]+/', $version, $matches)) {
                    $minor = (int)$matches[1];
                    self::$supportsSkipLocked = ($minor >= 6);
                    return self::$supportsSkipLocked;
                }
                self::$supportsSkipLocked = false;
                return false;
            }
        } catch (\Throwable $e) {
            // Fallback to true if attribute check fails
        }

        self::$supportsSkipLocked = true;
        return true;
    }
}
