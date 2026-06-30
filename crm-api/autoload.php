<?php

declare(strict_types=1);

// Load Composer vendor autoloader (PHPMailer, DomPDF, OpenSpout, etc.)
if (is_file(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}

spl_autoload_register(static function (string $class): void {
    $prefix = 'TGA\\CRM\\';

    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }

    $relativeClass = substr($class, strlen($prefix));
    $filePath = __DIR__ . DIRECTORY_SEPARATOR . str_replace('\\', DIRECTORY_SEPARATOR, $relativeClass) . '.php';

    if (is_file($filePath)) {
        require_once $filePath;
    }
});
