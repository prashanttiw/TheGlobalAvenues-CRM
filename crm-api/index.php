<?php

declare(strict_types=1);

use TGA\CRM\Config\Cors;
use TGA\CRM\Config\Environment;
use TGA\CRM\Routes\AgentRoutes;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Routes\ApplicationRoutes;
use TGA\CRM\Routes\AdminRoutes;
use TGA\CRM\Routes\AuthRoutes;
use TGA\CRM\Routes\RouteRegistry;
use TGA\CRM\Routes\StudentRoutes;
use TGA\CRM\Routes\UniversityRoutes;

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
AuthRoutes::register();
StudentRoutes::register();
ApplicationRoutes::register();
AgentRoutes::register();
UniversityRoutes::register();
AdminRoutes::register();

RouteRegistry::dispatch(
    method: $_SERVER['REQUEST_METHOD'] ?? 'GET',
    route: $_GET['route'] ?? 'health',
    action: $_GET['action'] ?? 'ping'
);
