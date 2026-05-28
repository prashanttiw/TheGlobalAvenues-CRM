<?php

declare(strict_types=1);

namespace TGA\CRM\Middleware;

use TGA\CRM\Helpers\Response;

final class ValidationMiddleware
{
    public static function assertValid(array $errors): void
    {
        if ($errors !== []) {
            Response::error('Validation failed', 'VALIDATION_FAILED', 422, $errors);
        }
    }
}
