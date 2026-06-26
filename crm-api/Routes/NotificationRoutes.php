<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\NotificationController;

final class NotificationRoutes
{
    public static function register(): void
    {
        $controller = new NotificationController();

        // Index route (action becomes 'ping' when the path has no trailing segments)
        RouteRegistry::get('notifications', 'ping', [$controller, 'index']);
        
        RouteRegistry::get('notifications', 'unread-count', [$controller, 'unreadCount']);
        RouteRegistry::put('notifications', ':publicId/read', [$controller, 'markRead']);
        RouteRegistry::put('notifications', 'read-all', [$controller, 'markReadAll']);
    }
}
