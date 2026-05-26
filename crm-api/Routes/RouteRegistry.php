<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\AuthController;
use TGA\CRM\Helpers\Response;

final class RouteRegistry
{
    private static array $routes = [];

    public static function reset(): void
    {
        self::$routes = [];
    }

    public static function add(string $method, string $route, string $action, callable $handler): void
    {
        self::$routes[strtoupper($method) . ':' . $route . ':' . $action] = $handler;
    }

    public static function dispatch(string $method, string $route, string $action): void
    {
        $routeKey = strtoupper($method) . ':' . $route . ':' . $action;

        if (isset(self::$routes[$routeKey])) {
            self::$routes[$routeKey]();
            return;
        }

        if ($route === 'health' && $action === 'ping') {
            (new AuthController())->ping();
            return;
        }

        Response::error('Resource not found', 'RESOURCE_NOT_FOUND', 404);
    }
}
