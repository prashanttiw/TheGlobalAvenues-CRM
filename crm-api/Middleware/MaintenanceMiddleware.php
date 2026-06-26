<?php

declare(strict_types=1);

namespace TGA\CRM\Middleware;

use TGA\CRM\Helpers\Response;
use TGA\CRM\Services\JWTService;

final class MaintenanceMiddleware
{
    public static function handle(): void
    {
        $maintenanceFile = __DIR__ . '/../../.maintenance';
        
        if (!file_exists($maintenanceFile)) {
            return;
        }

        // Allow CORS preflight requests to pass through
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            return;
        }

        // Check if the user is an admin
        $token = self::extractToken();
        
        if ($token) {
            $payload = JWTService::verifyAccessToken($token);
            if ($payload && ($payload['utype'] ?? $payload['user_type'] ?? '') === 'admin') {
                return; // Let admins through
            }
        }

        // Maintenance Mode active
        $message = 'System is currently undergoing maintenance. Please try again later.';
        
        // Read custom message if available
        $content = trim(file_get_contents($maintenanceFile) ?: '');
        if ($content) {
            $data = json_decode($content, true);
            if (is_array($data) && !empty($data['message'])) {
                $message = $data['message'];
            }
        }

        http_response_code(503);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => 'MAINTENANCE_MODE'
            ]
        ]);
        exit;
    }

    private static function extractToken(): ?string
    {
        $token = $_COOKIE['access_token'] ?? null;
        if (!$token && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            if (preg_match('/Bearer\s+(.*)$/i', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
                $token = trim($matches[1]);
            }
        }
        return $token;
    }
}
