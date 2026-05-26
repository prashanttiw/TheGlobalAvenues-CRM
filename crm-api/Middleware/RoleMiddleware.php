<?php

declare(strict_types=1);

namespace TGA\CRM\Middleware;

use TGA\CRM\Config\Constants;
use TGA\CRM\Helpers\Response;

final class RoleMiddleware
{
    public static function enforce(array $user, array $allowedRoles): void
    {
        if (!in_array($user['role'] ?? null, $allowedRoles, true)) {
            Response::error('You do not have permission to access this resource', Constants::AUTH_ERROR_CODES['role'], 403);
        }
    }
}
