<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use TGA\CRM\Config\Environment;

final class JWTService
{
    public static function issueTokenPair(
        int    $userId,
        string $publicId,
        string $userType,
        array  $permissions = []
    ): array {
        $accessExpiry = (int) Environment::get('JWT_ACCESS_EXPIRY', '900');
        $refreshExpiry = (int) Environment::get('JWT_REFRESH_EXPIRY', '604800');

        $jti = bin2hex(random_bytes(16)); // 32-char hex token ID

        $accessToken = self::encode([
            'sub'   => $userId,
            'pid'   => $publicId,
            'utype' => $userType,
            'user_type' => $userType,
            'perms' => $permissions,
            'jti'   => $jti,
            'type'  => 'access',
            'iat'   => time(),
            'exp'   => time() + $accessExpiry,
        ], Environment::getRequired('JWT_ACCESS_SECRET'));

        $refreshToken = self::encode([
            'sub'   => $userId,
            'pid'   => $publicId,
            'utype' => $userType,
            'user_type' => $userType,
            'type'  => 'refresh',
            'iat'   => time(),
            'exp'   => time() + $refreshExpiry,
        ], Environment::getRequired('JWT_REFRESH_SECRET'));

        return [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'jti' => $jti,
            'refresh_expires_at' => gmdate('Y-m-d H:i:s', time() + $refreshExpiry),
        ];
    }

    public static function verifyAccessToken(string $token): array|false
    {
        $payload = self::decode($token, Environment::getRequired('JWT_ACCESS_SECRET'));

        if ($payload === false || ($payload['type'] ?? '') !== 'access') {
            return false;
        }

        return $payload;
    }

    public static function verifyRefreshToken(string $token): array|false
    {
        $payload = self::decode($token, Environment::getRequired('JWT_REFRESH_SECRET'));

        if ($payload === false || ($payload['type'] ?? '') !== 'refresh') {
            return false;
        }

        return $payload;
    }

    private static function encode(array $payload, string $secret): string
    {
        $header = ['alg' => Environment::get('JWT_ALGORITHM', 'HS256'), 'typ' => 'JWT'];

        $headerEncoded = self::base64UrlEncode((string) json_encode($header, JSON_UNESCAPED_SLASHES));
        $payloadEncoded = self::base64UrlEncode((string) json_encode($payload, JSON_UNESCAPED_SLASHES));
        $signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $secret, true);

        return $headerEncoded . '.' . $payloadEncoded . '.' . self::base64UrlEncode($signature);
    }

    private static function decode(string $token, string $secret): array|false
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return false;
        }

        [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;
        $expectedSignature = self::base64UrlEncode(hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $secret, true));

        if (!hash_equals($expectedSignature, $signatureEncoded)) {
            return false;
        }

        $payload = json_decode(self::base64UrlDecode($payloadEncoded), true);

        if (!is_array($payload) || time() >= (int) ($payload['exp'] ?? 0)) {
            return false;
        }

        return $payload;
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        return (string) base64_decode(strtr($value, '-_', '+/'));
    }

    public static function issueResetToken(string $emailHash, string $pwdFragment): string
    {
        $expiry = 900; // 15 minutes
        $jti = bin2hex(random_bytes(16));

        return self::encode([
            'email_hash' => $emailHash,
            'pwd_h' => $pwdFragment,
            'type' => 'password-reset',
            'jti' => $jti,
            'iat' => time(),
            'exp' => time() + $expiry
        ], Environment::getRequired('JWT_RESET_SECRET'));
    }

    public static function verifyResetToken(string $token): array|false
    {
        $payload = self::decode($token, Environment::getRequired('JWT_RESET_SECRET'));

        if ($payload === false || ($payload['type'] ?? '') !== 'password-reset') {
            return false;
        }

        return $payload;
    }

    public static function issuePreAuthToken(int $userId, string $userType): string
    {
        $expiry = (int) SystemSettings::get('otp_expiry_minutes', '15') * 60;
        return self::encode([
            'sub'   => $userId,
            'utype' => $userType,
            'user_type' => $userType,
            'typ'   => 'pre-auth-2fa',
            'type'  => 'pre-auth-2fa',
            'jti'   => bin2hex(random_bytes(16)),
            'iat'   => time(),
            'exp'   => time() + $expiry,
        ], Environment::getRequired('JWT_ACCESS_SECRET'));
    }

    public static function verifyPreAuthToken(string $token): array|false
    {
        $payload = self::decode($token, Environment::getRequired('JWT_ACCESS_SECRET'));
        if ($payload === false || ($payload['type'] ?? $payload['typ'] ?? '') !== 'pre-auth-2fa') {
            return false;
        }
        return $payload;
    }
}
