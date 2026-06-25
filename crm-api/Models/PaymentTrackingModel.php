<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

class PaymentTrackingModel extends BaseModel
{
    protected string $table = 'application_payments';
    protected bool $useSoftDeletes = false;
}
