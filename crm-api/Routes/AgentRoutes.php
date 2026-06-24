<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\SubAgentController;
use TGA\CRM\Middleware\AuthMiddleware;

final class AgentRoutes
{
    public static function register(): void
    {
        $subAgentController = new SubAgentController();

        RouteRegistry::post('agent', 'sub-agents/invite', [$subAgentController, 'invite']);
    }
}
