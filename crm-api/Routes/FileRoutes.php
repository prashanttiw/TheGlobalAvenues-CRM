<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\FileController;

final class FileRoutes
{
    public static function register(): void
    {
        $controller = new FileController();

        // This route bypasses standard module prefix guards because 
        // the controller manually handles AuthMiddleware based on the database record 'is_public' flag.
        RouteRegistry::get('files', ':pid/download', [$controller, 'download']);
    }
}
