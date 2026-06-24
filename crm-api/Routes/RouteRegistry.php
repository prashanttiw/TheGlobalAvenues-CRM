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
        if (!isset(self::$routes[$method])) {
            Response::error("Route '{$method} /?route={$route}&action={$action}' not found", 'NOT_FOUND', 404);
        }

        // Exact match
        $handler = self::$routes[$method][$route][$action] ?? null;
        if ($handler !== null) {
            $handler();
            exit;
        }

        // Parameterized match
        $routeParts = explode('/', $route);
        foreach (self::$routes[$method] as $registeredRoute => $actions) {
            if (!isset($actions[$action])) {
                continue;
            }

            $registeredParts = explode('/', $registeredRoute);
            if (count($routeParts) !== count($registeredParts)) {
                continue;
            }

            $params = [];
            $match = true;

            for ($i = 0; $i < count($registeredParts); $i++) {
                if (str_starts_with($registeredParts[$i], ':')) {
                    // Capture parameter
                    $params[] = $routeParts[$i];
                } elseif ($registeredParts[$i] !== $routeParts[$i]) {
                    $match = false;
                    break;
                }
            }

            if ($match) {
                $handler = $actions[$action];
                $handler(...$params);
                exit;
            }
        }

        Response::error("Route '{$method} /?route={$route}&action={$action}' not found", 'NOT_FOUND', 404);
    }
}
