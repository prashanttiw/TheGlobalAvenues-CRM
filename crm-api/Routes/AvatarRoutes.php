<?php

declare(strict_types=1);

namespace TGA\CRM\Routes;

use TGA\CRM\Controllers\AvatarController;

/**
 * Registered once (not per-portal) — avatar management is identical for any
 * authenticated student/agent/admin managing their own avatar.
 */
final class AvatarRoutes
{
    public static function register(): void
    {
        $avatar = new AvatarController();

        RouteRegistry::post('avatar', 'upload', [$avatar, 'upload']);
        RouteRegistry::post('avatar', 'select-preset', [$avatar, 'selectPreset']);
        RouteRegistry::delete('avatar', 'remove', [$avatar, 'remove']);
    }
}
