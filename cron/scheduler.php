<?php
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

// Master Scheduler for TGA CRM Crons
// Add this single script to cPanel Cron Jobs to run every minute:
// * * * * * /usr/local/bin/php /home/username/public_html/cron/scheduler.php

require_once __DIR__ . '/../crm-api/autoload.php';

use TGA\CRM\Services\CronHealth;

// 1. Recover stuck jobs
// Any job stuck in 'running' for more than 15 minutes is abruptly marked as 'failed'
CronHealth::checkStuckJobs(15);

// 2. Define the jobs and their frequency in minutes
$jobs = [
    'send-notifications.php' => 1,
    'process-reminders.php' => 5,
    'check-sla-breaches.php' => 15,
    'sync-drive.php' => 60,
    'backup-db.php' => 1440, // 24 hours
    'verify-backups.php' => 1440,
    'generate-snapshots.php' => 1440,
    'monitor-disk.php' => 720,
    'archive-old-logs.php' => 10080 // 7 days
];

$lockFile = __DIR__ . '/scheduler.lock';
$stateFile = __DIR__ . '/scheduler_state.json';

// Ensure a previous run isn't still executing
$fp = fopen($lockFile, 'w+');
if (!flock($fp, LOCK_EX | LOCK_NB)) {
    echo "Scheduler is already running.\n";
    exit;
}

// Load state to track last run times
$state = [];
if (file_exists($stateFile)) {
    $state = json_decode(file_get_contents($stateFile), true) ?: [];
}

$now = time();

foreach ($jobs as $script => $frequencyMinutes) {
    $lastRun = $state[$script] ?? 0;
    
    // Check if enough time has passed based on frequency
    if ($now - $lastRun >= ($frequencyMinutes * 60)) {
        echo "[" . date('Y-m-d H:i:s') . "] Executing $script...\n";
        
        $scriptPath = __DIR__ . '/' . $script;
        if (file_exists($scriptPath)) {
            // Execute the script safely without overlapping outputs
            $cmd = '"' . PHP_BINARY . '" ' . escapeshellarg($scriptPath);
            exec($cmd, $output, $returnVar);
            
            if ($returnVar !== 0) {
                echo "Error executing $script (Exit code $returnVar)\n";
            }
        } else {
            echo "Script $script not found.\n";
        }
        
        // Update state
        $state[$script] = $now;
    }
}

// Save state
file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT));

flock($fp, LOCK_UN);
fclose($fp);

echo "[" . date('Y-m-d H:i:s') . "] Scheduler finished.\n";
