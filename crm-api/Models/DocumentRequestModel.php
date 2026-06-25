<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

class DocumentRequestModel extends BaseModel
{
    protected string $table = 'document_requests';
    protected bool $useSoftDeletes = false;
}
