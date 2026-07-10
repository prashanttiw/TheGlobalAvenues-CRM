<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only'); }

require_once __DIR__ . '/../crm-api/autoload.php';
use TGA\CRM\Config\Environment;
Environment::load(__DIR__ . '/../crm-api/.env');

use TGA\CRM\Services\CronHealth;
use TGA\CRM\Config\Database;

CronHealth::start('generate_snapshots');

// Allow longer execution for large datasets
set_time_limit(300); // 5 minutes max
ini_set('memory_limit', '256M');

$date = date('Y-m-d', strtotime('yesterday'));

$startTime = microtime(true);

$batch = [];
$snap = function(string $metric, float $value,
                 string $dimType = 'global', string $dimId = '_global')
use (&$batch, $date): void {
    $batch[] = [$date, $metric, $value, $dimType, $dimId];
};

function flushBatch(PDO $pdo, array &$batch): void {
    if (empty($batch)) return;
    $values = [];
    $params = [];
    foreach ($batch as $row) {
        $values[] = '(?, ?, ?, ?, ?)';
        array_push($params, ...$row);
    }
    $sql = "INSERT INTO report_snapshots 
            (snapshot_date, metric_key, metric_value, dimension_type, dimension_id) 
            VALUES " . implode(', ', $values) . "
            ON DUPLICATE KEY UPDATE metric_value = VALUES(metric_value)";
    $pdo->prepare($sql)->execute($params);
    $batch = [];
}

try {
    $pdo  = Database::getConnection();
    // ── GLOBAL METRICS ──────────────────────────────────────────────────────
    $g = $pdo->query("
        SELECT
          COUNT(DISTINCT s.id)                                           AS total_students,
          SUM(CASE WHEN DATE(s.created_at) = '{$date}' THEN 1 ELSE 0 END) AS new_students,
          COUNT(DISTINCT a.id)                                           AS total_applications,
          -- CRITICAL BI FIX: Offers must include applications that moved past offer stage
          SUM(CASE WHEN a.status IN ('offer_received', 'conditional_offer', 'unconditional_offer', 'waitlisted', 'enrolled', 'cas_coe_issued', 'visa_applied', 'visa_approved', 'pre_departure', 'departed') THEN 1 ELSE 0 END)  AS total_offers,
          SUM(CASE WHEN a.status IN ('enrolled', 'cas_coe_issued', 'visa_applied', 'visa_approved', 'pre_departure', 'departed') THEN 1 ELSE 0 END)  AS total_enrollments
        FROM students s
        LEFT JOIN applications a ON a.student_id = s.id AND a.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
    ")->fetch(PDO::FETCH_ASSOC);

    $snap('total_students',     (float)$g['total_students']);
    $snap('new_students',       (float)$g['new_students']);
    $snap('total_applications', (float)$g['total_applications']);
    $snap('total_offers',       (float)$g['total_offers']);
    $snap('total_enrollments',  (float)$g['total_enrollments']);

    // Leads
    $l = $pdo->query("
        SELECT COUNT(*) AS total,
          SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) AS converted
        FROM leads WHERE deleted_at IS NULL
    ")->fetch(PDO::FETCH_ASSOC);
    $snap('total_leads',     (float)$l['total']);
    $snap('leads_converted', (float)$l['converted']);

    // Commissions (INR only for summary)
    $c = $pdo->query("
        SELECT
          SUM(CASE WHEN status = 'pending'   THEN amount ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) AS confirmed,
          SUM(CASE WHEN status = 'paid'      THEN amount ELSE 0 END) AS paid
        FROM commissions WHERE currency = 'INR'
    ")->fetch(PDO::FETCH_ASSOC);
    $snap('commissions_pending_inr',  (float)($c['pending']  ?? 0));
    $snap('commissions_confirmed_inr',(float)($c['confirmed'] ?? 0));
    $snap('commissions_paid_inr',     (float)($c['paid']      ?? 0));

    // ── PER AGENT METRICS ───────────────────────────────────────────────────
    $agentStmt = $pdo->query("
        SELECT
          ag.id, ag.public_id,
          COALESCE(s_stats.students, 0) AS students,
          COALESCE(s_stats.enrolled, 0) AS enrolled,
          COALESCE(c_stats.commissions_paid, 0.00) AS commissions_paid
        FROM agents ag
        LEFT JOIN (
            SELECT 
                s.agent_id,
                COUNT(DISTINCT s.id) AS students,
                COUNT(DISTINCT CASE WHEN a.status IN ('enrolled', 'cas_coe_issued', 'visa_applied', 'visa_approved', 'pre_departure', 'departed') THEN s.id END) AS enrolled
            FROM students s
            LEFT JOIN applications a ON a.student_id = s.id AND a.deleted_at IS NULL
            WHERE s.deleted_at IS NULL
            GROUP BY s.agent_id
        ) s_stats ON s_stats.agent_id = ag.id
        LEFT JOIN (
            SELECT 
                c.agent_id,
                SUM(c.amount) AS commissions_paid
            FROM commissions c
            WHERE c.status = 'paid' AND c.currency = 'INR'
            GROUP BY c.agent_id
        ) c_stats ON c_stats.agent_id = ag.id
        WHERE ag.deleted_at IS NULL AND ag.status = 'approved'
    ");

    while ($row = $agentStmt->fetch(PDO::FETCH_ASSOC)) {
        $pid  = $row['public_id'];
        $rate = $row['students'] > 0
            ? round($row['enrolled'] / $row['students'] * 100, 1) : 0;

        $snap('agent_students',          (float)$row['students'],         'agent', $pid);
        $snap('agent_enrollments',       (float)$row['enrolled'],         'agent', $pid);
        $snap('agent_conversion_rate',   $rate,                           'agent', $pid);
        $snap('agent_commissions_paid',  (float)$row['commissions_paid'], 'agent', $pid);
        
        if (count($batch) >= 500) flushBatch($pdo, $batch);
    }

    // ── PER COUNTRY METRICS ─────────────────────────────────────────────────
    $countryStmt = $pdo->query("
        SELECT s.nationality AS country,
          COUNT(DISTINCT s.id) AS students,
          COUNT(DISTINCT CASE WHEN a.status IN ('enrolled', 'cas_coe_issued', 'visa_applied', 'visa_approved', 'pre_departure', 'departed') THEN s.id END) AS enrolled
        FROM students s
        LEFT JOIN applications a ON a.student_id = s.id AND a.deleted_at IS NULL
        WHERE s.deleted_at IS NULL AND s.nationality IS NOT NULL
        GROUP BY s.nationality
    ");
    while ($row = $countryStmt->fetch(PDO::FETCH_ASSOC)) {
        $snap('country_students',   (float)$row['students'], 'country', $row['country']);
        $snap('country_enrollments',(float)$row['enrolled'], 'country', $row['country']);
        if (count($batch) >= 500) flushBatch($pdo, $batch);
    }

    // ── PER LEAD SOURCE ─────────────────────────────────────────────────────
    $sourceStmt = $pdo->query("
        SELECT s.lead_source,
          COUNT(DISTINCT s.id) AS students,
          COUNT(DISTINCT CASE WHEN a.status IN ('enrolled', 'cas_coe_issued', 'visa_applied', 'visa_approved', 'pre_departure', 'departed') THEN s.id END) AS enrolled
        FROM students s
        LEFT JOIN applications a ON a.student_id = s.id AND a.deleted_at IS NULL
        WHERE s.deleted_at IS NULL AND s.lead_source IS NOT NULL
        GROUP BY s.lead_source
    ");
    while ($row = $sourceStmt->fetch(PDO::FETCH_ASSOC)) {
        $rate = $row['students'] > 0
            ? round($row['enrolled'] / $row['students'] * 100, 1) : 0;
        $snap('source_students',         (float)$row['students'], 'lead_source', $row['lead_source']);
        $snap('source_enrollments',      (float)$row['enrolled'], 'lead_source', $row['lead_source']);
        $snap('source_conversion_rate',  $rate,                   'lead_source', $row['lead_source']);
        if (count($batch) >= 500) flushBatch($pdo, $batch);
    }

    // ── PER UNIVERSITY ──────────────────────────────────────────────────────
    $uniStmt = $pdo->query("
        SELECT
          u.public_id,
          COUNT(DISTINCT a.id)                                           AS applications,
          -- CRITICAL BI FIX: Cumulative stages
          SUM(CASE WHEN a.status IN ('offer_received', 'conditional_offer', 'unconditional_offer', 'waitlisted', 'enrolled', 'cas_coe_issued', 'visa_applied', 'visa_approved', 'pre_departure', 'departed') THEN 1 ELSE 0 END)  AS offers,
          SUM(CASE WHEN a.status IN ('enrolled', 'cas_coe_issued', 'visa_applied', 'visa_approved', 'pre_departure', 'departed') THEN 1 ELSE 0 END)  AS enrollments
        FROM universities u
        LEFT JOIN courses c   ON c.university_id = u.id
        LEFT JOIN intakes i   ON i.course_id = c.id
        LEFT JOIN applications a ON a.intake_id = i.id AND a.deleted_at IS NULL
        WHERE u.deleted_at IS NULL
        GROUP BY u.id
    ");
    while ($row = $uniStmt->fetch(PDO::FETCH_ASSOC)) {
        $pid      = $row['public_id'];
        $offerRate = $row['applications'] > 0
            ? round($row['offers'] / $row['applications'] * 100, 1) : 0;
        $enrollRate = $row['offers'] > 0
            ? round($row['enrollments'] / $row['offers'] * 100, 1) : 0;

        $snap('uni_applications',   (float)$row['applications'], 'university', $pid);
        $snap('uni_offers',         (float)$row['offers'],       'university', $pid);
        $snap('uni_enrollments',    (float)$row['enrollments'],  'university', $pid);
        $snap('uni_offer_rate',     $offerRate,                  'university', $pid);
        $snap('uni_enrollment_rate',$enrollRate,                 'university', $pid);
        if (count($batch) >= 500) flushBatch($pdo, $batch);
    }
    flushBatch($pdo, $batch); // Flush remaining rows

    $ms = (int)((microtime(true) - $startTime) * 1000);
    CronHealth::success('generate_snapshots', $ms, "Snapshot date: {$date}");

} catch (\Throwable $e) {
    CronHealth::failure('generate_snapshots', $e->getMessage());
    exit(1);
}
