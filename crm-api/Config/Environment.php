<?php

declare(strict_types=1);

namespace TGA\CRM\Config;

final class Environment
{
    private static bool $loaded = false;

    public static function load(string $filePath): void
    {
        if (self::$loaded || !is_file($filePath)) {
            self::$loaded = true;
            return;
        }

        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];

        foreach ($lines as $line) {
            $trimmedLine = trim($line);

            if ($trimmedLine === '' || str_starts_with($trimmedLine, '#')) {
                continue;
            }

            [$key, $value] = array_pad(explode('=', $trimmedLine, 2), 2, '');

            $key = trim($key);
            $value = trim($value, " \t\n\r\0\x0B\"'");

            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }

        self::$loaded = true;
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        return $_ENV[$key] ?? $_SERVER[$key] ?? $default;
    }

    public static function getRequired(string $key): string
    {
        $value = self::get($key);

        if ($value === null || $value === '') {
            throw new \RuntimeException(sprintf('Missing required environment value: %s', $key));
        }

        return $value;
    }
}
