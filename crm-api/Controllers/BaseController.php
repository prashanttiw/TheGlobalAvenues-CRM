<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use TGA\CRM\Helpers\Sanitizer;

abstract class BaseController
{
    protected function getJsonInput(): array
    {
        $raw = file_get_contents('php://input');

        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? Sanitizer::array($decoded) : [];
    }

    protected function getQueryParam(string $key, mixed $default = null): mixed
    {
        return $_GET[$key] ?? $default;
    }

    protected function getFormInput(): array
    {
        return isset($_POST) && is_array($_POST) ? Sanitizer::array($_POST) : [];
    }

    protected function getUploadedFile(string $key): ?array
    {
        $file = $_FILES[$key] ?? null;

        return is_array($file) ? $file : null;
    }
}
