<?php

declare(strict_types=1);

namespace TGA\CRM\Helpers;

final class Paginator
{
    public static function fromQuery(array $query): array
    {
        $page = max(1, (int) ($query['page'] ?? 1));
        $perPage = min(100, max(1, (int) ($query['per_page'] ?? 20)));

        return [
            'page' => $page,
            'per_page' => $perPage,
            'offset' => ($page - 1) * $perPage,
        ];
    }
}
