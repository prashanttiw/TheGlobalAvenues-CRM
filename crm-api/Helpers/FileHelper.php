<?php

declare(strict_types=1);

namespace TGA\CRM\Helpers;

final class FileHelper
{
    public static function ensureDirectory(string $path): void
    {
        if (!is_dir($path) && !mkdir($path, 0775, true) && !is_dir($path)) {
            throw new \RuntimeException(sprintf('Failed to create directory: %s', $path));
        }
    }

    public static function joinPaths(string ...$segments): string
    {
        $filtered = array_values(array_filter($segments, static fn (string $segment): bool => $segment !== ''));

        if ($filtered === []) {
            return '';
        }

        $path = array_shift($filtered);

        foreach ($filtered as $segment) {
            $path = rtrim($path, DIRECTORY_SEPARATOR . '/\\') . DIRECTORY_SEPARATOR . ltrim($segment, DIRECTORY_SEPARATOR . '/\\');
        }

        return $path;
    }

    public static function normalizeRelativePath(string $path): string
    {
        return str_replace('\\', '/', $path);
    }

    public static function deleteIfExists(string $path): void
    {
        if (is_file($path) && !unlink($path)) {
            throw new \RuntimeException(sprintf('Failed to delete file: %s', $path));
        }
    }
}
