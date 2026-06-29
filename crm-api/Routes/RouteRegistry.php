<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Helpers\Response;

final class RouteRegistry
{
    private static array $routes = [];

    public static function reset(): void
    {
        self::$routes = [];
    }

    public static function get(string $route, string $action, callable $handler): void
    {
        self::$routes['GET'][$route][$action] = $handler;
    }

    public static function post(string $route, string $action, callable $handler): void
    {
        self::$routes['POST'][$route][$action] = $handler;
    }

    public static function options(string $route, string $action, callable $handler): void
    {
        self::$routes['OPTIONS'][$route][$action] = $handler;
    }

    public static function put(string $route, string $action, callable $handler): void
    {
        self::$routes['PUT'][$route][$action] = $handler;
    }

    public static function delete(string $route, string $action, callable $handler): void
    {
        self::$routes['DELETE'][$route][$action] = $handler;
    }

    public static function dispatch(string $method, string $route, string $action): void
    {
        $requestPath = '/' . ltrim(trim($route . '/' . $action, '/'), '/');

        if (!isset(self::$routes[$method])) {
            Response::error("Endpoint '{$method} {$requestPath}' not found", 'NOT_FOUND', 404);
        }
        $requestParts = explode('/', ltrim($requestPath, '/'));

        foreach (self::$routes[$method] as $registeredRoute => $actions) {
            foreach ($actions as $registeredAction => $handler) {
                $registeredPath = trim($registeredRoute . '/' . $registeredAction, '/');
                $registeredParts = explode('/', $registeredPath);

                if (count($requestParts) !== count($registeredParts)) {
                    continue;
                }

                $params = [];
                $match = true;

                for ($i = 0; $i < count($registeredParts); $i++) {
                    if (str_starts_with($registeredParts[$i], ':')) {
                        $params[] = $requestParts[$i];
                    } elseif ($registeredParts[$i] !== $requestParts[$i]) {
                        $match = false;
                        break;
                    }
                }

                if ($match) {
                    $handler(...$params);
                    exit;
                }
            }
        }

        Response::error("Endpoint '{$method} /" . ltrim(trim($route . '/' . $action, '/'), '/') . "' not found", 'NOT_FOUND', 404);
    }
}
