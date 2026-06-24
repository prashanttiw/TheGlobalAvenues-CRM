<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

enum OTPResult: string
{
    case Valid = 'valid';
    case Invalid = 'invalid';
    case Expired = 'expired';
    case BruteForced = 'brute_forced';
    case NotFound = 'not_found';
}
