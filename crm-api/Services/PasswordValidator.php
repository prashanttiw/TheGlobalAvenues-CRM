<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

final class PasswordValidator
{
    /**
     * @param string $password
     * @return array{valid: bool, errors: string[]}
     */
    public static function validate(string $password): array
    {
        $errors = [];

        if (strlen($password) < 8) {
            $errors[] = 'Password must be at least 8 characters long';
        }

        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter';
        }

        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one number';
        }

        if (!preg_match('/[^A-Za-z0-9]/', $password)) {
            $errors[] = 'Password must contain at least one symbol';
        }

        return [
            'valid' => count($errors) === 0,
            'errors' => $errors
        ];
    }
}
