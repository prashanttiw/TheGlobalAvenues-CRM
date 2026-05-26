<?php

declare(strict_types=1);

namespace TGA\CRM\Middleware;

use TGA\CRM\Config\Constants;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Services\JWTService;

final class AuthMiddleware
{
    public static function user(): array
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $cookieToken = $_COOKIE['access_token'] ?? null;
        $token = null;

        if (preg_match('/Bearer\s+(.*)$/i', $header, $matches) === 1) {
            $token = trim($matches[1]);
        } elseif (is_string($cookieToken) && $cookieToken !== '') {
            $token = $cookieToken;
        }

        if ($token === null || $token === '') {
            Response::error('Authentication required', Constants::AUTH_ERROR_CODES['invalid'], 401);
        }

        $payload = JWTService::verifyAccessToken($token);

        if ($payload === false) {
            Response::error('Invalid or expired token', Constants::AUTH_ERROR_CODES['invalid'], 401);
        }

        return $payload;
    }
}
