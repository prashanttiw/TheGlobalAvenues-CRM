<?php

declare(strict_types=1);

namespace TGA\CRM\Middleware;

use TGA\CRM\Config\Constants;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Services\JWTService;

final class AuthMiddleware
{
    private static ?array $cachedUser = null;

    public static function user(): array
    {
        if (self::$cachedUser !== null) {
            return self::$cachedUser;
        }

        $header = self::resolveAuthorizationHeader();
        $token = null;

        if (preg_match('/Bearer\s+(.*)$/i', $header, $matches) === 1) {
            $token = trim($matches[1]);
        }

        if ($token === null || $token === '') {
            Response::error('Authentication required', Constants::AUTH_ERROR_CODES['missing'], 401);
        }

        $parts = explode('.', $token);
        if (count($parts) === 3) {
            $payloadJson = base64_decode(strtr($parts[1], '-_', '+/'));
            $decodedPayload = json_decode($payloadJson, true);
            if (is_array($decodedPayload) && (($decodedPayload['typ'] ?? '') === 'pre-auth-2fa' || ($decodedPayload['type'] ?? '') === 'pre-auth-2fa')) {
                Response::error('Pre-auth token not allowed on this endpoint', 'UNAUTHORIZED', 401);
            }
        }

        $payload = JWTService::verifyAccessToken($token);

        if ($payload === false) {
            Response::error('Invalid or expired token', Constants::AUTH_ERROR_CODES['invalid'], 401);
        }

        // Fast global revocation check (JWT compromise recovery)
        $minIat = (int) \TGA\CRM\Services\SystemSettings::get('jwt_min_iat', '0');
        if (isset($payload['iat']) && (int) $payload['iat'] < $minIat) {
            Response::error('Session has been revoked due to security updates', 'SESSION_REVOKED', 401);
        }

        $pdo = \TGA\CRM\Config\Database::getConnection();

        // Validate JTI — strictly required to prevent token rollback attacks
        if (!isset($payload['jti'])) {
            Response::error('Invalid token structure', Constants::AUTH_ERROR_CODES['invalid'], 401);
        }

        $jtiHash = hash('sha256', $payload['jti']);
        $session = $pdo->prepare(
            'SELECT id, revoked_at FROM user_sessions WHERE jti_hash = ? LIMIT 1'
        );
        $session->execute([$jtiHash]);
        $sess = $session->fetch();
        
        if (!$sess || $sess['revoked_at'] !== null) {
            Response::error('Session has been revoked', 'SESSION_REVOKED', 401);
        }

        // Also check user.status = 'active'
        $userRow = $pdo->prepare("SELECT status FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1");
        $userRow->execute([$payload['sub']]);
        $u = $userRow->fetch();
        
        if (!$u || $u['status'] !== 'active') {
            Response::error('Account suspended or not found', 'ACCOUNT_INACTIVE', 401);
        }

        $payload['id'] = $payload['sub'];
        self::$cachedUser = $payload;
        return $payload;
    }

    public static function requireAuth(): array
    {
        return self::user();
    }

    public static function requireRole(string $role): array
    {
        $payload = self::user();
        if (($payload['utype'] ?? $payload['user_type'] ?? '') !== $role) {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }
        return $payload;
    }

    private static function resolveAuthorizationHeader(): string
    {
        $serverCandidates = [
            $_SERVER['HTTP_AUTHORIZATION'] ?? null,
            $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null,
        ];

        foreach ($serverCandidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            $candidate = $headers['Authorization'] ?? $headers['authorization'] ?? null;

            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return '';
    }
}
