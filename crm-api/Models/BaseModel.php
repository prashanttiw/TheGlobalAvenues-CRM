<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;
use TGA\CRM\Config\Database;

abstract class BaseModel
{
    protected PDO $connection;

    public function __construct()
    {
        $this->connection = Database::getConnection();
    }
}
