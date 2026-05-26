<?php

declare(strict_types=1);

namespace TGA\CRM\Config;

final class Constants
{
    public const ROLES = [
        'student',
        'agent',
        'sub_agent',
        'counsellor',
        'visa_officer',
        'admin',
        'super_admin',
    ];

    public const AUTH_ERROR_CODES = [
        'expired' => 'AUTH_TOKEN_EXPIRED',
        'invalid' => 'AUTH_TOKEN_INVALID',
        'role' => 'AUTH_INSUFFICIENT_ROLE',
    ];
}
