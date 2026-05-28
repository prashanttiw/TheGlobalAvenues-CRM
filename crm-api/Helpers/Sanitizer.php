<?php

declare(strict_types=1);

namespace TGA\CRM\Helpers;

final class Sanitizer
{
    public static function string(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return trim(filter_var($value, FILTER_UNSAFE_RAW, FILTER_FLAG_STRIP_LOW));
    }

    public static function email(?string $value): ?string
    {
        $sanitized = self::string($value);

        return $sanitized === null ? null : strtolower($sanitized);
    }

    public static function array(array $input): array
    {
        $sanitized = [];

        foreach ($input as $key => $value) {
            $cleanKey = is_string($key) ? trim($key) : $key;

            if (is_array($value)) {
                $sanitized[$cleanKey] = self::array($value);
                continue;
            }

            $sanitized[$cleanKey] = is_string($value) ? self::string($value) : $value;
        }

        return $sanitized;
    }
}
