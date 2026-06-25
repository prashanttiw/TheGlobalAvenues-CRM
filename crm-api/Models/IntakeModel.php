<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

class IntakeModel extends BaseModel
{
    protected string $table = 'intakes';
    protected bool $useSoftDeletes = false;
}
