<?php

declare(strict_types=1);

namespace TGA\CRM\Helpers;

final class DisabledEndpointResponder
{
    public static function legacyStub(string $endpoint, string $reason, array $context = []): void
    {
        Response::error(
            'This endpoint is disabled and not available for production use.',
            'ENDPOINT_DISABLED',
            501,
            array_merge(
                [
                    'endpoint' => $endpoint,
                    'reason' => $reason,
                ],
                $context
            )
        );
    }
}
