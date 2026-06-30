<?php

declare(strict_types=1);

namespace TGA\CRM\Helpers;

final class Response
{
    public static function success(string $message, array $data = [], array $meta = [], int $status = 200): void
    {
        self::json(
            [
                'success' => true,
                'message' => $message,
                'data' => $data,
                'meta' => array_merge(['timestamp' => gmdate(DATE_ATOM)], $meta),
            ],
            $status
        );
    }

    public static function error(string $message, string $code, int $status, array $errors = []): void
    {
        self::json(
            [
                'success' => false,
                'message' => $message,
                'errors' => $errors,
                'code' => $code,
            ],
            $status
        );
    }

    public static function json(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }
}
