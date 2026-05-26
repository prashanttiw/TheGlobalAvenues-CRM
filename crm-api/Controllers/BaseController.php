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
}
