<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\LeadsController;

final class PublicRoutes
{
    public static function register(): void
    {
        $leads = new LeadsController();

        // ── Public Leads ──────────────────────────────────────────────────────
        RouteRegistry::post('public', 'leads', [$leads, 'publicCreate']);
        RouteRegistry::options('public', 'leads', [$leads, 'publicCreate']); // For CORS preflight
    }
}
