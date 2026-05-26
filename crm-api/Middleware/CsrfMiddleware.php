<?php

declare(strict_types=1);

namespace TGA\CRM\Middleware;

final class CsrfMiddleware
{
    public static function validateCookieRequest(): void
    {
        // Reserved for cookie-based CSRF validation when state-changing browser requests are enabled.
    }
}
