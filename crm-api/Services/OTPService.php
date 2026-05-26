<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

final class OTPService
{
    public function generate(string $email, string $purpose): string
    {
        unset($email, $purpose);

        return (string) random_int(100000, 999999);
    }

    public function verify(string $email, string $otp, string $purpose): bool
    {
        unset($email, $otp, $purpose);

        return false;
    }
}
