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
}
