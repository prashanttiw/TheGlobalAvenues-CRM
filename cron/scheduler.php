<?php
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

// Master Scheduler for TGA CRM Crons
// Add this single script to cPanel Cron Jobs to run every minute:
// * * * * * /usr/local/bin/php /home/username/public_html/cron/scheduler.php

require_once __DIR__ . '/../crm-api/autoload.php';

use TGA\CRM\Config\Environment;
use TGA\CRM\Services\CronHealth;

// scheduler.php runs checkStuckJobs() in-process (not via exec()), so unlike the
// individual job scripts it must load its own .env — without this, every call below
// silently fails inside CronHealth's try/catch (env vars never populated in this
// process), so stuck-job recovery has never actually run. Found 2026-07-08 testing locally.
Environment::load(__DIR__ . '/../crm-api/.env');

// 1. Recover stuck jobs
// Any job stuck in 'running' for more than 15 minutes is abruptly marked as 'failed'
CronHealth::checkStuckJobs(15);

// 2. Define the jobs and their frequency in minutes
$jobs = [
    'send-notifications.php' => 1,
    'check-sla-breaches.php' => 15,
    'generate-snapshots.php' => 1440,
    'monitor-disk.php' => 720,
    // archive-old-logs.php intentionally NOT scheduled — activity_logs must never be
    // deleted (product decision 2026-07-08), and this script's only other job
    // (pruning security_events) isn't worth running alone. Left in cron/ unused.
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
