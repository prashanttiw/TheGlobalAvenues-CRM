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
}
