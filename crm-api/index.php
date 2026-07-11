<?php

declare(strict_types=1);

use TGA\CRM\Config\Cors;
use TGA\CRM\Config\Environment;
// use TGA\CRM\Routes\AgentRoutes;
// use TGA\CRM\Routes\AdminRoutes;
use TGA\CRM\Routes\StudentRoutes;
use TGA\CRM\Routes\ApplicationRoutes;
use TGA\CRM\Routes\UniversityRoutes;
use TGA\CRM\Routes\FileRoutes;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Routes\AuthRoutes;
use TGA\CRM\Routes\RegistrationRoutes;
use TGA\CRM\Routes\AgentRoutes;
use TGA\CRM\Routes\AdminRoutes;
use TGA\CRM\Routes\RouteRegistry;
use TGA\CRM\Routes\NotificationRoutes;
use TGA\CRM\Routes\PublicRoutes;
use TGA\CRM\Routes\AvatarRoutes;
use TGA\CRM\Controllers\HealthController;

require_once __DIR__ . '/autoload.php';

Environment::load(__DIR__ . '/.env');
Cors::handle();
\TGA\CRM\Middleware\MaintenanceMiddleware::handle();

// Global Rate Limiting (200 requests per IP per minute, bypassed for health checks)
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$isHealthCheck = (str_contains($requestUri, '/health') || str_contains($requestUri, '/ping'));
if (!$isHealthCheck) {
    \TGA\CRM\Middleware\RateLimitMiddleware::enforce(
        'global_ip_' . \TGA\CRM\Middleware\RateLimitMiddleware::getIpAddress(), 
        200, 
        60
    );
}

if (Environment::get('APP_ENV') === 'production') {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);
    ini_set('log_errors', '1');
    ini_set('error_log', __DIR__ . '/logs/php_errors.log');
} else {
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
}

set_exception_handler(static function (Throwable $exception): void {
    error_log(sprintf(
        '[%s] %s in %s:%d',
        date(DATE_ATOM),
        $exception->getMessage(),
        $exception->getFile(),
        $exception->getLine()
    ));

    if (Environment::get('APP_ENV') === 'production') {
        Response::error('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    } else {
        Response::error($exception->getMessage(), 'INTERNAL_SERVER_ERROR', 500, [
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString()
        ]);
    }
});

set_error_handler(static function (int $level, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $level)) {
        return false;
    }
    throw new \ErrorException($message, 0, $level, $file, $line);
});

register_shutdown_function(static function (): void {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE, E_USER_ERROR], true)) {
        if (ob_get_level() > 0) {
            ob_clean();
        }
        
        error_log(sprintf(
            '[%s] Fatal Error: %s in %s:%d',
            date(DATE_ATOM),
            $error['message'],
            $error['file'],
            $error['line']
        ));
        
        http_response_code(500);
        header('Content-Type: application/json');
        
        if (Environment::get('APP_ENV') === 'production') {
            echo json_encode([
                'success' => false,
                'error' => [
                    'message' => 'Internal server error',
                    'code' => 'INTERNAL_SERVER_ERROR'
                ]
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => [
                    'message' => $error['message'],
                    'code' => 'FATAL_ERROR',
                    'details' => [
                        'file' => $error['file'],
                        'line' => $error['line']
                    ]
                ]
            ]);
        }
    }
});

RouteRegistry::reset();
RouteRegistry::get('health', 'ping', [new HealthController(), 'ping']);
AuthRoutes::register();
RegistrationRoutes::register();
AgentRoutes::register();
AdminRoutes::register();
StudentRoutes::register();
ApplicationRoutes::register();
UniversityRoutes::register();
FileRoutes::register();
NotificationRoutes::register();
PublicRoutes::register();
AvatarRoutes::register();
// AdminRoutes::register();

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
$queryRoute = isset($_GET['route']) ? trim((string) $_GET['route']) : '';
$queryAction = isset($_GET['action']) ? trim((string) $_GET['action']) : '';

if ($queryRoute !== '' && $queryAction !== '') {
    $route = trim($queryRoute, '/');
    $action = trim($queryAction, '/');
} else {
    $path = preg_replace('#^/api(/v1)?/#', '', $uri);
    $parts = explode('/', trim($path, '/'));

    $route = $parts[0] ?: 'health';
    array_shift($parts);
    $action = count($parts) > 0 ? implode('/', $parts) : 'ping';
}

RouteRegistry::dispatch(
    method: $_SERVER['REQUEST_METHOD'] ?? 'GET',
    route: $route,
    action: $action
);
