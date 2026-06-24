<?php

declare(strict_types=1);

use TGA\CRM\Config\Cors;
use TGA\CRM\Config\Environment;
// use TGA\CRM\Routes\AgentRoutes;
// use TGA\CRM\Routes\ApplicationRoutes;
// use TGA\CRM\Routes\AdminRoutes;
// use TGA\CRM\Routes\StudentRoutes;
// use TGA\CRM\Routes\UniversityRoutes;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Routes\AuthRoutes;
use TGA\CRM\Routes\RegistrationRoutes;
use TGA\CRM\Routes\AgentRoutes;
use TGA\CRM\Routes\AdminRoutes;
use TGA\CRM\Routes\RouteRegistry;
use TGA\CRM\Controllers\HealthController;

require_once __DIR__ . '/autoload.php';

Environment::load(__DIR__ . '/.env');
Cors::handle();

set_exception_handler(static function (Throwable $exception): void {
    error_log(sprintf(
        '[%s] %s in %s:%d',
        date(DATE_ATOM),
        $exception->getMessage(),
        $exception->getFile(),
        $exception->getLine()
    ));

    Response::error('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
});

RouteRegistry::reset();
RouteRegistry::get('health', 'ping', [new HealthController(), 'ping']);
AuthRoutes::register();
RegistrationRoutes::register();
AgentRoutes::register();
AdminRoutes::register();
// StudentRoutes::register();
// ApplicationRoutes::register();
// UniversityRoutes::register();
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
