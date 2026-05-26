<?php

declare(strict_types=1);

namespace TGA\CRM\Helpers;

final class Validator
{
    public static function validateRegistration(array $input): array
    {
        $errors = [];

        foreach (['email', 'password', 'role', 'first_name', 'last_name'] as $field) {
            if (($input[$field] ?? '') === '') {
                $errors[$field] = 'This field is required.';
            }
        }

        if (($input['email'] ?? '') !== '' && filter_var($input['email'], FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'] = 'Enter a valid email address.';
        }

        if (($input['password'] ?? '') !== '' && !preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/', (string) $input['password'])) {
            $errors['password'] = 'Password must be at least 8 characters and include upper, lower, number, and special character.';
        }

        return $errors;
    }

    public static function validateLogin(array $input): array
    {
        $errors = [];

        foreach (['email', 'password'] as $field) {
            if (($input[$field] ?? '') === '') {
                $errors[$field] = 'This field is required.';
            }
        }

        return $errors;
    }
}
