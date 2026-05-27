<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\UniversityController;

final class UniversityRoutes
{
    public static function register(): void
    {
        $controller = new UniversityController();

        RouteRegistry::add('GET', 'university', 'list', [$controller, 'list']);
        RouteRegistry::add('GET', 'university', 'search', [$controller, 'search']);
        RouteRegistry::add('GET', 'university', 'get_detail', [$controller, 'getDetail']);
        RouteRegistry::add('GET', 'university', 'get_programs', [$controller, 'getPrograms']);
        RouteRegistry::add('GET', 'university', 'compare', [$controller, 'compare']);
    }
}
