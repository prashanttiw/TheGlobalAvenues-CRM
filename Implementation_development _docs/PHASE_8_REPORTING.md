# PHASE 8 — Reporting & Analytics
## Snapshot Engine · Dashboard KPIs · Funnel Analytics · Agent Performance · University Intelligence · Lead Source Analytics · Filterable Reports · Executive Dashboard

---

## BUILDER DIRECTIVE

**DO NOT TOUCH MARKETING WEBSITE FILES.**
```
src/pages/HomePage.tsx, DestinationsPage.tsx, CountryDetailPage.tsx,
CoursesPage.tsx, CourseCategoryPage.tsx, PartnersPage.tsx, AboutPage.tsx,
ContactPage.tsx, ServicesPage.tsx
src/components/home/*, src/components/layout/*, src/data/*
```

**AI MEMORY DIRECTIVE**: DO NOT make major changes to the frontend.
ONLY build the minimal frontend parts necessary to support backend integrations.

**Before writing any code — research:**
- Recharts v2 current API — `ResponsiveContainer`, `AreaChart`, `BarChart`,
  `LineChart`, `PieChart`, `FunnelChart` — confirm exact prop names and
  how to handle empty/loading states without crashing
- MySQL 8.4 window functions (`RANK()`, `SUM() OVER PARTITION BY`) —
  verify exact syntax and confirm they work in the context of GROUP BY queries
- PHP `fputcsv()` memory safety for large exports on shared hosting —
  research streaming to `php://output` vs building in memory
- PHP `set_time_limit()` on Bluehost shared hosting crons —
  the snapshot cron may process thousands of agents/universities.
  Research whether `set_time_limit(0)` works on crons vs web requests
- Date range filtering with MySQL 8.4 — indexed range scans on DATETIME columns,
  confirm that `DATE(created_at)` prevents index use (use range instead)
- React date picker library — research lightest option compatible with
  React 18 + Tailwind v4 (avoid heavy MUI DatePicker — bundle size)
- `useSearchParams` in React Router v7 — confirm API for persisting report
  filters in URL query string

---

## BUILDER RESEARCH NOTES
| Topic | Finding | Action |
|---|---|---|
| | | |

---

## CONTEXT — WHAT PHASES 1–7 DELIVERED

**All 7 phases must be fully audited before starting Phase 8.**

**Confirmed stack (critical — use these exactly):**
- **Tailwind v4.1.12** — CSS variables in `src/index.css` `@theme` block.
  NO `tailwind.config.ts`. Use `var(--color-brand-orange)` etc.
- **`motion/react` v12** — import from `'motion/react'`
- **TanStack Query v5** — `useQuery` has NO `onSuccess`/`onError`/`onSettled`.
  Side effects via `useEffect` watching `data`/`isError`.
  `useMutation` still has `onSuccess`/`onError` — fine to use.
- **React Router v7.15.0** — use `useSearchParams` for filter state in URL
- **Recharts** — already installed, confirm exact version in package.json
- **Accessible orange `#D96200`** for interactive elements
- **39 tables** — `report_snapshots` table exists and is empty (seeded Phase 1)
- All notification templates, crons, and infrastructure from Phase 6 are live

**`report_snapshots` table structure (from Phase 1 schema):**
```sql
report_snapshots (
  snapshot_date    DATE,
  metric_key       VARCHAR(100),   -- e.g. 'total_students', 'agent_enrollments'
  metric_value     DECIMAL(15,2),
  dimension_type   VARCHAR(50),    -- 'global', 'agent', 'university', 'country', 'lead_source'
  dimension_id     VARCHAR(255),   -- public_id of agent/university, or country name / source key
  UNIQUE KEY uk_snapshot (snapshot_date, metric_key, dimension_type, dimension_id)
)
```

**Key architecture principle for Phase 8:**
Dashboard reads FROM `report_snapshots` — never from live aggregation queries.
Snapshot cron pre-computes everything daily.
This keeps dashboards fast even at 50,000+ students.

---

## WHAT PHASE 8 BUILDS

1. **Snapshot cron** — daily midnight job that pre-computes all metrics
2. **Reports API** — endpoints reading from snapshots for fast response
3. **Funnel analytics** — Lead → Student → Application → Offer → Enrolled with drop-offs
4. **Agent performance** — conversion rates, rankings with MySQL 8.4 window functions
5. **University intelligence** — offer rates, enrollment rates per university
6. **Lead source analytics** — which channel converts best
7. **Trend data** — time-series for any metric over any date range
8. **CSV export** — streamed export for students, applications, agents
9. **Frontend** — wire all AdminReportsPage tabs with real Recharts charts
10. **Report filters** — date range, country, agent, university (URL-persisted)

---

## 8A. SNAPSHOT CRON (daily at midnight)

This is the most important job in Phase 8. Everything else reads what this produces.

```php
// cron/generate-snapshots.php
<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../crm-api/Config/bootstrap.php';

use TGA\CRM\Services\CronHealth;
use TGA\CRM\Config\Database;

CronHealth::start('generate_snapshots');

// Allow longer execution for large datasets
set_time_limit(300); // 5 minutes max

$pdo  = Database::connect();
$date = date('Y-m-d', strtotime('yesterday'));

$batch = [];
$snap = function(string $metric, float $value,
                 string $dimType = 'global', ?string $dimId = null)
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
    // ── GLOBAL METRICS ──────────────────────────────────────────────────────

    $g = $pdo->query("
        SELECT
          COUNT(DISTINCT s.id)                                           AS total_students,
          SUM(CASE WHEN DATE(s.created_at) = '{$date}' THEN 1 ELSE 0 END) AS new_students,
          COUNT(DISTINCT a.id)                                           AS total_applications,
          -- CRITICAL BI FIX: Offers must include applications that moved past offer stage
          SUM(CASE WHEN a.status IN ('offer_received', 'waitlisted', 'enrolled') THEN 1 ELSE 0 END)  AS total_offers,
          SUM(CASE WHEN a.status = 'enrolled'       THEN 1 ELSE 0 END)  AS total_enrollments
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
    // Process in chunks to avoid memory issues with many agents
    $agentStmt = $pdo->query("
        SELECT
          ag.id, ag.public_id,
          COUNT(DISTINCT s.id)                                           AS students,
          SUM(CASE WHEN s.profile_status = 'enrolled' THEN 1 ELSE 0 END) AS enrolled,
          COALESCE(SUM(CASE WHEN c.status = 'paid' AND c.currency = 'INR'
            THEN c.amount ELSE 0 END), 0)                               AS commissions_paid
        FROM agents ag
        LEFT JOIN students s  ON s.agent_id = ag.id  AND s.deleted_at IS NULL
        LEFT JOIN commissions c ON c.agent_id = ag.id
        WHERE ag.deleted_at IS NULL AND ag.status = 'approved'
        GROUP BY ag.id
    ");

    while ($row = $agentStmt->fetch(PDO::FETCH_ASSOC)) {
        $pid  = $row['public_id'];
        $rate = $row['students'] > 0
            ? round($row['enrolled'] / $row['students'] * 100, 1) : 0;

        $snap('agent_students',          (float)$row['students'],         'agent', $pid);
        $snap('agent_enrollments',       (float)$row['enrolled'],         'agent', $pid);
        $snap('agent_commissions_paid',  (float)$row['commissions_paid'], 'agent', $pid);
        
        if (count($batch) >= 500) flushBatch($pdo, $batch);
    }

    // ── PER COUNTRY METRICS ─────────────────────────────────────────────────
    $countryStmt = $pdo->query("
        SELECT nationality AS country,
          COUNT(*) AS students,
          SUM(CASE WHEN profile_status = 'enrolled' THEN 1 ELSE 0 END) AS enrolled
        FROM students
        WHERE deleted_at IS NULL AND nationality IS NOT NULL
        GROUP BY nationality
    ");
    while ($row = $countryStmt->fetch(PDO::FETCH_ASSOC)) {
        $snap('country_students',   (float)$row['students'], 'country', $row['country']);
        $snap('country_enrollments',(float)$row['enrolled'], 'country', $row['country']);
    }

    // ── PER LEAD SOURCE ─────────────────────────────────────────────────────
    $sourceStmt = $pdo->query("
        SELECT lead_source,
          COUNT(*) AS students,
          SUM(CASE WHEN profile_status = 'enrolled' THEN 1 ELSE 0 END) AS enrolled
        FROM students
        WHERE deleted_at IS NULL AND lead_source IS NOT NULL
        GROUP BY lead_source
    ");
    while ($row = $sourceStmt->fetch(PDO::FETCH_ASSOC)) {
        $rate = $row['students'] > 0
            ? round($row['enrolled'] / $row['students'] * 100, 1) : 0;
        $snap('source_students',         (float)$row['students'], 'lead_source', $row['lead_source']);
        $snap('source_enrollments',      (float)$row['enrolled'], 'lead_source', $row['lead_source']);
        $snap('source_conversion_rate',  $rate,                   'lead_source', $row['lead_source']);
    }

    // ── PER UNIVERSITY ──────────────────────────────────────────────────────
    $uniStmt = $pdo->query("
        SELECT
          u.public_id,
          COUNT(DISTINCT a.id)                                           AS applications,
          -- CRITICAL BI FIX: Cumulative stages
          SUM(CASE WHEN a.status IN ('offer_received','waitlisted','enrolled') THEN 1 ELSE 0 END)  AS offers,
          SUM(CASE WHEN a.status = 'enrolled'       THEN 1 ELSE 0 END)  AS enrollments
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
    }
    flushBatch($pdo, $batch); // Flush remaining unis

    $ms = (int)((microtime(true) - $startTime) * 1000);
    CronHealth::success('generate_snapshots', $ms, "Snapshot date: {$date}");

} catch (\Throwable $e) {
    CronHealth::failure('generate_snapshots', $e->getMessage());
    exit(1);
}
```

---

## 8B. REPORTS API

All report endpoints read from `report_snapshots`. Never live aggregation.

```
GET /api/v1/admin/reports/overview       ModuleGuard: reports.view
GET /api/v1/admin/reports/funnel         ModuleGuard: reports.view
GET /api/v1/admin/reports/agents         ModuleGuard: reports.view
GET /api/v1/admin/reports/universities   ModuleGuard: reports.view
GET /api/v1/admin/reports/lead-sources   ModuleGuard: reports.view
GET /api/v1/admin/reports/trends         ModuleGuard: reports.view
GET /api/v1/admin/reports/export         ModuleGuard: reports.view
```

### Overview endpoint:
```php
// GET /api/v1/admin/reports/overview
// Returns last 30 days of global metrics from report_snapshots
// Plus period-over-period comparison (current 30d vs previous 30d)

function getGlobalMetric(PDO $pdo, string $metric): float {
    return (float)$pdo->prepare("
        SELECT metric_value FROM report_snapshots
        WHERE metric_key = ? AND dimension_type = 'global'
        ORDER BY snapshot_date DESC LIMIT 1
    ")->execute([$metric])->fetchColumn();
}

function getPrevPeriodMetric(PDO $pdo, string $metric, int $daysAgo): float {
    $date = date('Y-m-d', strtotime("-{$daysAgo} days"));
    return (float)$pdo->prepare("
        SELECT metric_value FROM report_snapshots
        WHERE metric_key = ? AND dimension_type = 'global'
          AND snapshot_date <= ?
        ORDER BY snapshot_date DESC LIMIT 1
    ")->execute([$metric, $date])->fetchColumn();
}

$metrics = ['total_students','total_applications','total_offers','total_enrollments','total_leads'];
$result = [];
foreach ($metrics as $m) {
    $current = getGlobalMetric($pdo, $m);
    $prev    = getPrevPeriodMetric($pdo, $m, 30);
    $change  = $prev > 0 ? round(($current - $prev) / $prev * 100, 1) : null;
    $result[$m] = [
        'value'      => $current,
        'prev_value' => $prev,
        'change_pct' => $change,
        'trend'      => $change > 0 ? 'up' : ($change < 0 ? 'down' : 'flat'),
    ];
}

// Also return last 30 days of new_students for the trend line chart
$trendStmt = $pdo->prepare("
    SELECT snapshot_date, metric_value
    FROM report_snapshots
    WHERE metric_key = 'new_students'
      AND dimension_type = 'global'
      AND snapshot_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    ORDER BY snapshot_date ASC
");
$trendStmt->execute();
$result['trend_new_students'] = $trendStmt->fetchAll(PDO::FETCH_ASSOC);

return Response::success($result);
```

### Funnel endpoint:
```php
// GET /api/v1/admin/reports/funnel
// Always reads latest snapshot values

function latestSnap(PDO $pdo, string $metric): float {
    return (float)$pdo->prepare("
        SELECT metric_value FROM report_snapshots
        WHERE metric_key = ? AND dimension_type = 'global'
        ORDER BY snapshot_date DESC LIMIT 1
    ")->execute([$metric])->fetchColumn();
}

$leads       = latestSnap($pdo, 'total_leads');
$students    = latestSnap($pdo, 'total_students');
$applications= latestSnap($pdo, 'total_applications');
$offers      = latestSnap($pdo, 'total_offers');
$enrollments = latestSnap($pdo, 'total_enrollments');

$dropOff = fn($from, $to): ?float =>
    ($from > 0) ? round((1 - $to / $from) * 100, 1) : null;

return Response::success([
    ['stage' => 'Leads',        'count' => (int)$leads,        'drop_off_pct' => null],
    ['stage' => 'Students',     'count' => (int)$students,     'drop_off_pct' => $dropOff($leads, $students)],
    ['stage' => 'Applications', 'count' => (int)$applications, 'drop_off_pct' => $dropOff($students, $applications)],
    ['stage' => 'Offers',       'count' => (int)$offers,       'drop_off_pct' => $dropOff($applications, $offers)],
    ['stage' => 'Enrollments',  'count' => (int)$enrollments,  'drop_off_pct' => $dropOff($offers, $enrollments)],
]);
```

### Agent performance endpoint (MySQL 8.4 window functions):
```php
// GET /api/v1/admin/reports/agents?sort_by=conversion_rate&order=desc

// Reads latest agent snapshots, joins with agent names
// Uses MySQL 8.4 RANK() window function for leaderboard position

$sort  = in_array($input['sort_by'] ?? '', ['students','enrollments','conversion_rate','commissions_paid'])
    ? $input['sort_by'] : 'conversion_rate';
$order = strtoupper($input['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

$latestDate = $pdo->query("
    SELECT MAX(snapshot_date) FROM report_snapshots
    WHERE dimension_type = 'agent'
")->fetchColumn();

if (!$latestDate) {
    return Response::success(['data' => [], 'snapshot_date' => null]);
}

$agents = $pdo->query("
    WITH agent_metrics AS (
        SELECT
          rs.dimension_id AS agent_public_id,
          MAX(CASE WHEN rs.metric_key = 'agent_students'
              THEN rs.metric_value ELSE 0 END) AS students,
          MAX(CASE WHEN rs.metric_key = 'agent_enrollments'
              THEN rs.metric_value ELSE 0 END) AS enrollments,
          MAX(CASE WHEN rs.metric_key = 'agent_conversion_rate'
              THEN rs.metric_value ELSE 0 END) AS conversion_rate,
          MAX(CASE WHEN rs.metric_key = 'agent_commissions_paid'
              THEN rs.metric_value ELSE 0 END) AS commissions_paid
        FROM report_snapshots rs
        WHERE rs.dimension_type = 'agent'
          AND rs.snapshot_date = '{$latestDate}'
        GROUP BY rs.dimension_id
    )
    SELECT
      am.*,
      ag.full_name, ag.agency_name, ag.tier, ag.status,
      RANK() OVER (ORDER BY am.{$sort} {$order}) AS rank_position
    FROM agent_metrics am
    JOIN agents ag ON ag.public_id = am.agent_public_id
    WHERE ag.deleted_at IS NULL
      -- CRITICAL BI FIX: Minimum threshold for statistical significance
      -- Prevents an agent with 1 student (100% conversion) ranking higher than 100/105 (95%)
      AND am.students >= 5
    ORDER BY am.{$sort} {$order}
    LIMIT 100
")->fetchAll(PDO::FETCH_ASSOC);

return Response::success([
    'data'          => $agents,
    'snapshot_date' => $latestDate,
]);
```

### University intelligence endpoint:
```php
// GET /api/v1/admin/reports/universities?sort_by=offer_rate
$latestDate = $pdo->query("
    SELECT MAX(snapshot_date) FROM report_snapshots WHERE dimension_type='university'
")->fetchColumn();

$unis = $pdo->query("
    WITH uni_metrics AS (
        SELECT dimension_id AS uni_public_id,
          MAX(CASE WHEN metric_key='uni_applications'   THEN metric_value ELSE 0 END) AS applications,
          MAX(CASE WHEN metric_key='uni_offers'         THEN metric_value ELSE 0 END) AS offers,
          MAX(CASE WHEN metric_key='uni_enrollments'    THEN metric_value ELSE 0 END) AS enrollments,
          MAX(CASE WHEN metric_key='uni_offer_rate'     THEN metric_value ELSE 0 END) AS offer_rate,
          MAX(CASE WHEN metric_key='uni_enrollment_rate'THEN metric_value ELSE 0 END) AS enrollment_rate
        FROM report_snapshots
        WHERE dimension_type = 'university' AND snapshot_date = '{$latestDate}'
        GROUP BY dimension_id
    )
    SELECT um.*, u.name, u.country, u.city
    FROM uni_metrics um
    JOIN universities u ON u.public_id = um.uni_public_id
    WHERE u.deleted_at IS NULL
    ORDER BY um.offer_rate DESC
")->fetchAll(PDO::FETCH_ASSOC);

return Response::success(['data' => $unis, 'snapshot_date' => $latestDate]);
```

### Lead source endpoint:
```php
// GET /api/v1/admin/reports/lead-sources
$latestDate = $pdo->query("
    SELECT MAX(snapshot_date) FROM report_snapshots WHERE dimension_type='lead_source'
")->fetchColumn();

$sources = $pdo->query("
    SELECT
      dimension_id AS source,
      MAX(CASE WHEN metric_key='source_students'        THEN metric_value ELSE 0 END) AS students,
      MAX(CASE WHEN metric_key='source_enrollments'     THEN metric_value ELSE 0 END) AS enrollments,
      MAX(CASE WHEN metric_key='source_conversion_rate' THEN metric_value ELSE 0 END) AS conversion_rate
    FROM report_snapshots
    WHERE dimension_type = 'lead_source' AND snapshot_date = '{$latestDate}'
    GROUP BY dimension_id
    ORDER BY conversion_rate DESC
")->fetchAll(PDO::FETCH_ASSOC);

return Response::success(['data' => $sources, 'snapshot_date' => $latestDate]);
```

### Trends endpoint (time-series):
```php
// GET /api/v1/admin/reports/trends
// Params: metric (required), dimension_type (default: global),
//         dimension_id (required if not global),
//         date_from, date_to (default: last 30 days)

$metric    = $input['metric']    ?? 'total_students';
$dimType   = $input['dim_type']  ?? 'global';
$dimId     = $input['dim_id']    ?? null;
$dateFrom  = $input['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
$dateTo    = $input['date_to']   ?? date('Y-m-d');

// Validate date range: max 365 days
$diff = (strtotime($dateTo) - strtotime($dateFrom)) / 86400;
if ($diff > 365) {
    return Response::error('DATE_RANGE_TOO_LARGE', 'Maximum date range is 365 days', [], 422);
}

// Use date range scan (not DATE() function) to allow index use
$stmt = $pdo->prepare("
    SELECT snapshot_date, metric_value
    FROM report_snapshots
    WHERE metric_key = ?
      AND dimension_type = ?
      AND dimension_id <=> ?
      AND snapshot_date >= ? AND snapshot_date <= ?
    ORDER BY snapshot_date ASC
");
// <=> is NULL-safe equals — handles NULL dimension_id for 'global'
$stmt->execute([$metric, $dimType, $dimId, $dateFrom, $dateTo]);

return Response::success([
    'metric'    => $metric,
    'dim_type'  => $dimType,
    'dim_id'    => $dimId,
    'date_from' => $dateFrom,
    'date_to'   => $dateTo,
    'data'      => $stmt->fetchAll(PDO::FETCH_ASSOC),
]);
```

---

## 8C. CSV EXPORT

Stream directly to browser — never load full dataset into PHP memory.

```php
// GET /api/v1/admin/reports/export?type=students&format=csv
// ModuleGuard: reports.view

$type = $input['type'] ?? 'students';

// Log export to activity_logs (PII exported — must be auditable)
ActivityLogger::log('report.exported', 'report', null, null,
    ['type' => $type, 'requested_by' => $admin['id']]);

header('Content-Type: text/csv; charset=UTF-8');
header('Content-Disposition: attachment; filename="tga_' . $type . '_' . date('Y-m-d') . '.csv"');
header('Cache-Control: no-cache');

// UTF-8 BOM for Excel compatibility
echo "\xEF\xBB\xBF";

$fp = fopen('php://output', 'w');

switch ($type) {
    case 'students':
        fputcsv($fp, ['Name','Nationality','Lead Source','Agent','Status','Registered']);
        $stmt = $pdo->query("
            SELECT s.full_name, s.nationality, s.lead_source,
                   ag.full_name AS agent_name, s.profile_status, s.created_at
            FROM students s
            LEFT JOIN agents ag ON ag.id = s.agent_id
            WHERE s.deleted_at IS NULL
            ORDER BY s.created_at DESC
            LIMIT 5000
        ");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            fputcsv($fp, array_values($row));
            // Note: email NOT included — PII. If needed, requires explicit consent flag.
        }
        break;

    case 'agents':
        fputcsv($fp, ['Full Name','Agency','Country','Tier','Status','Students','Enrolled','Referral Code','Joined']);
        $stmt = $pdo->query("
            SELECT ag.full_name, ag.agency_name, ag.country, ag.tier, ag.status,
                   COUNT(s.id) AS student_count,
                   SUM(CASE WHEN s.profile_status='enrolled' THEN 1 ELSE 0 END) AS enrolled,
                   ag.referral_code, ag.created_at
            FROM agents ag
            LEFT JOIN students s ON s.agent_id = ag.id AND s.deleted_at IS NULL
            WHERE ag.deleted_at IS NULL
            GROUP BY ag.id
            ORDER BY ag.created_at DESC
        ");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            fputcsv($fp, array_values($row));
        }
        break;

    case 'applications':
        fputcsv($fp, ['Reference','Student','University','Course','Intake','Status','Submitted']);
        $stmt = $pdo->query("
            SELECT a.reference_number, s.full_name, u.name AS university,
                   c.name AS course, i.name AS intake, a.status, a.submitted_at
            FROM applications a
            JOIN students s    ON s.id = a.student_id
            JOIN intakes i     ON i.id = a.intake_id
            JOIN courses c     ON c.id = i.course_id
            JOIN universities u ON u.id = c.university_id
            WHERE a.deleted_at IS NULL
            ORDER BY a.submitted_at DESC
            LIMIT 5000
        ");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            fputcsv($fp, array_values($row));
        }
        break;
}

fclose($fp);
exit;
```

---

## 8D. FRONTEND — REPORTS PAGE

Phase 3 built the AdminReportsPage shell with 6 empty tabs.
Phase 8 wires real data with Recharts charts.

### Common patterns (Tailwind v4 + TanStack Query v5):

```tsx
// Filter state persisted in URL (React Router v7 useSearchParams):
import { useSearchParams } from 'react-router-dom';

const [searchParams, setSearchParams] = useSearchParams();
const dateFrom = searchParams.get('date_from') ?? getDefaultDateFrom();
const dateTo   = searchParams.get('date_to')   ?? today();

const updateFilter = (key: string, value: string) => {
  setSearchParams(prev => { prev.set(key, value); return prev; });
};

// TanStack Query v5 — useEffect for side effects:
const { data, isLoading, isError } = useQuery({
  queryKey: ['reports', 'overview', { dateFrom, dateTo }],
  queryFn: () => api.get('/admin/reports/overview', {
    params: { date_from: dateFrom, date_to: dateTo }
  }).then(r => r.data.data),
  staleTime: 5 * 60_000, // Reports are fine stale for 5 min
});

useEffect(() => {
  if (isError) toast.error('Failed to load report data');
}, [isError]);
```

### Overview tab:
```tsx
// 5 StatCards in a grid: Total Students | Applications | Offers | Enrollments | Leads
// Each shows: current value + change_pct with trend arrow + "vs last 30 days"

// Line chart: new students per day (last 30 days)
<ResponsiveContainer width="100%" height={200}>
  <AreaChart data={data?.trend_new_students}>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-warm)" />
    <XAxis dataKey="snapshot_date" tick={{ fontSize: 11 }} />
    <YAxis tick={{ fontSize: 11 }} />
    <Tooltip />
    <Area
      type="monotone"
      dataKey="metric_value"
      stroke="#D96200"
      fill="#D96200"
      fillOpacity={0.1}
      strokeWidth={2}
    />
  </AreaChart>
</ResponsiveContainer>
```

### Funnel tab:
```tsx
// Horizontal bar chart narrowing like a funnel
// Each stage: count + drop-off percentage badge

<ResponsiveContainer width="100%" height={300}>
  <BarChart data={funnelData} layout="vertical">
    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-warm)" />
    <XAxis type="number" tick={{ fontSize: 11 }} />
    <YAxis type="category" dataKey="stage" width={100} tick={{ fontSize: 12 }} />
    <Tooltip
      formatter={(value, name) => [value, 'Count']}
      labelFormatter={(label) => `Stage: ${label}`}
    />
    <Bar dataKey="count" fill="#D96200" radius={[0, 4, 4, 0]}>
      {funnelData?.map((entry, i) => (
        <Cell key={i}
          fill={`rgba(217, 98, 0, ${1 - i * 0.15})`}  // Fade with each stage
        />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>

// Below each bar: drop-off badge
// "↓ 35% drop-off from Applications → Offers"
```

### Agents tab:
```tsx
// DataTable: Rank | Agent | Agency | Tier | Students | Enrolled | Conversion % | Commissions
// Sortable columns — sort_by passed as query param

// Top 10 agents bar chart:
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={top10Agents}>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-warm)" />
    <XAxis dataKey="full_name" tick={{ fontSize: 10 }} />
    <YAxis tick={{ fontSize: 11 }} />
    <Tooltip />
    <Bar dataKey="enrollments" fill="#D96200" name="Enrollments" radius={[4,4,0,0]} />
    <Bar dataKey="conversion_rate" fill="#1E2A4A" name="Conversion %" radius={[4,4,0,0]} />
  </BarChart>
</ResponsiveContainer>
```

### Universities tab:
```tsx
// DataTable: University | Country | Applications | Offers | Enrolled | Offer Rate % | Enrollment Rate %
// Color code offer_rate: ≥80% green, 60–79% amber, <60% red

// Offer rate sorted bar chart:
<ResponsiveContainer width="100%" height={280}>
  <BarChart data={uniData?.slice(0, 15)} layout="vertical">
    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
    <Tooltip formatter={(v) => [`${v}%`, 'Offer Rate']} />
    <Bar dataKey="offer_rate" fill="#D96200" radius={[0,4,4,0]} />
  </BarChart>
</ResponsiveContainer>
```

### Lead Sources tab:
```tsx
// Pie chart + table

// Label source keys as human-readable:
const sourceLabels: Record<string, string> = {
  agent_referral: 'Agent Referral',
  website:        'Website',
  google:         'Google Search',
  social_media:   'Social Media',
  event:          'Event / Exhibition',
  walk_in:        'Walk-In',
  other:          'Other',
};

<ResponsiveContainer width="100%" height={280}>
  <PieChart>
    <Pie data={sourceData} dataKey="students" nameKey="source"
         cx="50%" cy="50%" outerRadius={100} label>
      {sourceData?.map((_, i) => (
        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
      ))}
    </Pie>
    <Tooltip formatter={(v, name) => [v, sourceLabels[name] ?? name]} />
    <Legend formatter={(name) => sourceLabels[name] ?? name} />
  </PieChart>
</ResponsiveContainer>

// Table below: Source | Students | Enrollments | Conversion Rate %
// Highlight highest conversion rate row
```

### Trends tab (filterable):
```tsx
// Metric selector dropdown: Students | Applications | Offers | Enrollments | Commissions
// Date range picker (from/to)
// Agent filter (optional — show trend for specific agent)

// Filters update URL params → useSearchParams triggers re-fetch
// AreaChart showing selected metric over selected date range

const trendQuery = useQuery({
  queryKey: ['reports', 'trends', { metric, dimType, dimId, dateFrom, dateTo }],
  queryFn: () => api.get('/admin/reports/trends', {
    params: { metric, dim_type: dimType, dim_id: dimId, date_from: dateFrom, date_to: dateTo }
  }).then(r => r.data.data),
  enabled: !!metric,
  staleTime: 5 * 60_000,
});
```

### Finance tab:
```tsx
// Commission summary cards: Pending | Confirmed | Paid (INR)
// With period-over-period change from snapshots

// Bar chart: top 10 agents by commissions paid
// DataTable: Agent | Applications | Amount | Status
// Export button → GET /admin/reports/export?type=commissions
```

### Export button (all tabs):
```tsx
// Simple anchor tag — browser handles download
const handleExport = (type: string) => {
  const url = `/api/v1/admin/reports/export?type=${type}&format=csv`;
  // Use fetch with Authorization header (not <a> tag — needs JWT)
  api.get(url, { responseType: 'blob' }).then(res => {
    const blob = new Blob([res.data], { type: 'text/csv' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `tga_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(href);
  });
};
```

---

## PHASE 8 AUDIT CHECKLIST

### Snapshot cron:
- [ ] Cron runs at midnight without PHP errors (check cron log)
- [ ] `report_snapshots` populated for yesterday's date
- [ ] Global metrics (total_students, total_enrollments etc.) match raw DB counts
- [ ] Agent dimension rows created for each approved agent
- [ ] Country dimension rows created for each nationality
- [ ] Lead source dimension rows created
- [ ] University dimension rows with offer_rate and enrollment_rate calculated correctly
- [ ] Division by zero handled (0 applications → 0% offer rate, not crash)
- [ ] `ON DUPLICATE KEY UPDATE` works correctly (re-running cron same day updates values)
- [ ] Cron completes within set_time_limit (no timeout on large dataset)

### Reports API:
- [ ] GET /reports/overview returns metrics with change_pct vs previous 30 days
- [ ] change_pct is NULL when previous period has 0 value (no division by zero)
- [ ] GET /reports/funnel returns 5 stages with correct drop_off_pct values
- [ ] GET /reports/agents returns RANK() ordered correctly by conversion_rate
- [ ] Window function RANK() gives equal agents the same rank
- [ ] GET /reports/universities returns offer_rate and enrollment_rate
- [ ] GET /reports/lead-sources shows correct conversion breakdown
- [ ] GET /reports/trends with date_from and date_to returns correct date range
- [ ] date range > 365 days returns 422 error
- [ ] NULL dimension_id handled by `<=>` (NULL-safe equals) for global metrics
- [ ] Snapshot not yet generated (empty table): API returns empty data gracefully

### CSV export:
- [ ] GET /reports/export?type=students returns valid CSV file
- [ ] CSV has UTF-8 BOM (opens correctly in Excel)
- [ ] Email column NOT included in student export
- [ ] Export logged to activity_logs with admin user id
- [ ] Large export streams correctly (no PHP memory error with 5000 rows)
- [ ] All 3 export types work: students, agents, applications

### Frontend charts (Recharts):
- [ ] All charts render without console errors
- [ ] AreaChart shows correct trend data with orange stroke (#D96200)
- [ ] FunnelChart (horizontal BarChart) shows narrowing with opacity per stage
- [ ] AgentsPage BarChart shows top 10 agents correctly
- [ ] PieChart shows lead source proportions
- [ ] ResponsiveContainer resizes correctly on window resize
- [ ] Loading skeleton shown while data fetches (no flash of empty chart)
- [ ] Empty data: chart shows empty state (no crash, no blank white area)

### Filters:
- [ ] Date range filter changes trigger re-fetch
- [ ] Filters persist in URL query params (survives page refresh)
- [ ] Agent filter on Trends tab scopes data to that agent's dimension
- [ ] "Reset filters" clears URL params back to defaults

### TanStack Query v5 compliance:
- [ ] No `onSuccess` callbacks on any `useQuery` calls in this phase
- [ ] Error toasts triggered via `useEffect` watching `isError`
- [ ] All queries have appropriate `staleTime` (not 0)

### Frontend compliance:
- [ ] `motion/react` used for any new animations (not framer-motion)
- [ ] Tailwind v4 CSS variable tokens used (no tailwind.config.ts created)
- [ ] Accessible orange `#D96200` used on chart strokes and fills
- [ ] Marketing website files completely untouched (git diff confirms)

---

## 8E. MULTI-FORMAT EXPORT (ADDITION)

### Research before implementing:
- **PhpSpreadsheet** — current version, Composer install, memory usage on shared hosting
  for 5,000 row sheets. Research chunked writing if needed.
- **DOMPDF or TCPDF** — which is lighter for PDF generation on shared hosting.
  PhpSpreadsheet handles Excel. Research best PDF option for tabular data.
- Confirm Bluehost shared hosting memory_limit (typically 256MB) —
  Excel files with 5,000 rows + formatting may approach this.

### Install OpenSpout (Memory-safe alternative to PhpSpreadsheet):
```bash
composer require openspout/openspout
```

Add to `composer.json`:
```json
"openspout/openspout": "^4.0"
```

### Updated export route:
```
GET /api/v1/admin/reports/export
Params: type (students|agents|applications|commissions),
        format (csv|xlsx|pdf),
        date_from, date_to (optional filters)
ModuleGuard: reports.view
```

### Excel (.xlsx) export:
```php
// ExportController::exportExcel($type, $data)
// Uses OpenSpout to stream XLSX directly to the browser without loading data into memory

use OpenSpout\Writer\XLSX\Writer;
use OpenSpout\Writer\XLSX\Options;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\CellAlignment;

function exportExcel(string $type, PDO $pdo): void {
    $options = new Options();
    $writer = new Writer($options);
    
    $filename = 'TGA_' . ucfirst($type) . '_' . date('Y-m-d') . '.xlsx';
    
    // Log before sending headers
    ActivityLogger::log('report.exported', 'report', null, null,
        ['type' => $type, 'format' => 'xlsx']);
        
    $writer->openToBrowser($filename);
    $sheet = $writer->getCurrentSheet();
    $sheet->setName(ucfirst($type));

    // Header styling
    $headerStyle = (new Style())
        ->setFontBold()
        ->setFontColor(Color::WHITE)
        ->setBackgroundColor('1E2A4A') // Navy brand color
        ->setCellAlignment(CellAlignment::CENTER);

    switch ($type) {
        case 'students':
            $headers = ['Name', 'Nationality', 'Lead Source', 'Agent',
                        'Status', 'Applications', 'Registered Date'];
            $writer->addRow(Row::fromValues($headers, $headerStyle));

            $stmt = $pdo->query("
                SELECT s.full_name, s.nationality, s.lead_source,
                       ag.full_name AS agent_name, s.profile_status,
                       COUNT(a.id) AS app_count,
                       DATE(s.created_at) AS registered
                FROM students s
                LEFT JOIN agents ag ON ag.id = s.agent_id
                LEFT JOIN applications a ON a.student_id = s.id AND a.deleted_at IS NULL
                WHERE s.deleted_at IS NULL
                GROUP BY s.id
                ORDER BY s.created_at DESC
                LIMIT 5000
            ");
            while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $writer->addRow(Row::fromValues(array_values($r)));
            }
            break;

        case 'agents':
            $headers = ['Full Name', 'Agency', 'Country', 'Tier',
                        'Status', 'Students', 'Enrolled',
                        'Conversion %', 'Referral Code', 'Joined'];
            $writer->addRow(Row::fromValues($headers, $headerStyle));

            $stmt = $pdo->query("
                SELECT ag.full_name, ag.agency_name, ag.country, ag.tier, ag.status,
                       COUNT(s.id) AS students,
                       SUM(CASE WHEN s.profile_status='enrolled' THEN 1 ELSE 0 END) AS enrolled,
                       ROUND(
                         SUM(CASE WHEN s.profile_status='enrolled' THEN 1 ELSE 0 END)
                         * 100.0 / NULLIF(COUNT(s.id), 0), 1
                       ) AS conversion_pct,
                       ag.referral_code, DATE(ag.created_at) AS joined
                FROM agents ag
                LEFT JOIN students s ON s.agent_id = ag.id AND s.deleted_at IS NULL
                WHERE ag.deleted_at IS NULL
                GROUP BY ag.id
                ORDER BY conversion_pct DESC
            ");
            while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $writer->addRow(Row::fromValues(array_values($r)));
            }
            break;

        case 'applications':
            $headers = ['Reference', 'Student', 'University', 'Course',
                        'Intake', 'Status', 'Agent', 'Submitted Date'];
            $writer->addRow(Row::fromValues($headers, $headerStyle));

            $stmt = $pdo->query("
                SELECT a.reference_number, s.full_name AS student,
                       u.name AS university, c.name AS course,
                       i.name AS intake, a.status,
                       ag.full_name AS agent,
                       DATE(a.submitted_at) AS submitted
                FROM applications a
                JOIN students s     ON s.id = a.student_id
                JOIN intakes i      ON i.id = a.intake_id
                JOIN courses c      ON c.id = i.course_id
                JOIN universities u ON u.id = c.university_id
                LEFT JOIN agents ag ON ag.id = a.agent_id_at_submission
                WHERE a.deleted_at IS NULL
                ORDER BY a.submitted_at DESC
                LIMIT 5000
            ");
            while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $writer->addRow(Row::fromValues(array_values($r)));
            }
            break;

        case 'commissions':
            $headers = ['Agent', 'Agency', 'Student', 'University',
                        'Amount', 'Currency', 'Status', 'Decided Date'];
            $writer->addRow(Row::fromValues($headers, $headerStyle));

            $stmt = $pdo->query("
                SELECT ag.full_name AS agent, ag.agency_name,
                       s.full_name AS student, u.name AS university,
                       c.amount, c.currency, c.status,
                       DATE(c.decided_at) AS decided
                FROM commissions c
                JOIN agents ag ON ag.id = c.agent_id
                JOIN applications a ON a.id = c.application_id
                JOIN students s ON s.id = a.student_id
                JOIN intakes i ON i.id = a.intake_id
                JOIN courses co ON co.id = i.course_id
                JOIN universities u ON u.id = co.university_id
                ORDER BY c.created_at DESC
                LIMIT 5000
            ");
            while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $writer->addRow(Row::fromValues(array_values($r)));
            }
            break;
    }

    $writer->close();
    exit;
}
```

### PDF export (summary reports only — not row-level data):
```php
// PDF export for summary/overview reports (not full row-level exports)
// Research: DOMPDF vs TCPDF for Bluehost shared hosting
// Recommended: DOMPDF (simpler API, good HTML-to-PDF)

// composer require dompdf/dompdf

use Dompdf\Dompdf;
use Dompdf\Options;

function exportPdf(string $reportType, array $data): void {
    $options = new Options();
    $options->set('defaultFont', 'sans-serif');
    $options->set('isRemoteEnabled', false); // Security: no remote URLs

    $dompdf = new Dompdf($options);

    // Build HTML report using brand colors
    $html = '
    <html>
    <head>
    <style>
      body { font-family: sans-serif; font-size: 12px; color: #1E2A4A; }
      h1   { color: #1E2A4A; font-size: 18px; border-bottom: 2px solid #D96200; padding-bottom: 8px; }
      h2   { color: #D96200; font-size: 14px; margin-top: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th    { background: #1E2A4A; color: white; padding: 8px; text-align: left; font-size: 11px; }
      td    { padding: 6px 8px; border-bottom: 1px solid #E8E4DE; font-size: 11px; }
      tr:nth-child(even) td { background: #FAFAF8; }
      .meta { color: #6B7280; font-size: 10px; margin-top: 4px; }
      .footer { position: fixed; bottom: 0; width: 100%; text-align: center;
                font-size: 9px; color: #9CA3AF; border-top: 1px solid #E8E4DE; padding-top: 4px; }
    </style>
    </head>
    <body>
      <h1>The Global Avenues — ' . ucfirst($reportType) . ' Report</h1>
      <p class="meta">Generated: ' . date('d M Y H:i') . ' · Confidential</p>
    ';

    // Build table from data
    if (!empty($data)) {
        $html .= '<table><thead><tr>';
        foreach (array_keys($data[0]) as $col) {
            $html .= '<th>' . htmlspecialchars(ucwords(str_replace('_', ' ', $col))) . '</th>';
        }
        $html .= '</tr></thead><tbody>';
        foreach ($data as $row) {
            $html .= '<tr>';
            foreach ($row as $cell) {
                $html .= '<td>' . htmlspecialchars((string)$cell) . '</td>';
            }
            $html .= '</tr>';
        }
        $html .= '</tbody></table>';
    }

    $html .= '
      <div class="footer">The Global Avenues CRM · Confidential · ' . date('Y') . '</div>
    </body></html>';

    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'landscape');
    $dompdf->render();

    $filename = 'TGA_' . ucfirst($reportType) . '_' . date('Y-m-d') . '.pdf';
    ActivityLogger::log('report.exported', 'report', null, null,
        ['type' => $reportType, 'format' => 'pdf']);

    $dompdf->stream($filename, ['Attachment' => true]);
    exit;
}
```

### Updated export controller dispatch:
```php
// ExportController::export()
$type   = $input['type']   ?? 'students';
$format = $input['format'] ?? 'xlsx'; // Default to Excel

// Validate type
$allowedTypes = ['students', 'agents', 'applications', 'commissions'];
if (!in_array($type, $allowedTypes, true)) {
    return Response::error('INVALID_TYPE', 'Export type not supported', [], 422);
}

// Validate format
$allowedFormats = ['csv', 'xlsx', 'pdf'];
if (!in_array($format, $allowedFormats, true)) {
    return Response::error('INVALID_FORMAT', 'Export format not supported', [], 422);
}

// Memory limit warning for large exports
ini_set('memory_limit', '256M');
set_time_limit(120);

match($format) {
    'xlsx' => exportExcel($type, $pdo),
    'csv'  => exportCsv($type, $pdo),
    'pdf'  => exportPdf($type, $pdo),
};
```

### Frontend — Export dropdown:
```tsx
// ExportDropdown component — used on every report tab
// TanStack Query v5 + motion/react for dropdown animation

import { motion, AnimatePresence } from 'motion/react';

const formats = [
  { key: 'xlsx', label: 'Excel (.xlsx)',     icon: 'FileSpreadsheet' },
  { key: 'csv',  label: 'CSV (.csv)',        icon: 'FileText'        },
  { key: 'pdf',  label: 'PDF (.pdf)',        icon: 'FileDown'        },
];

function ExportDropdown({ reportType }: { reportType: string }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: string) => {
    setExporting(format);
    setOpen(false);
    try {
      const res = await api.get('/admin/reports/export', {
        params: { type: reportType, format },
        responseType: 'blob',
      });

      const extensions: Record<string, string> = {
        xlsx: 'xlsx', csv: 'csv', pdf: 'pdf'
      };
      const blob = new Blob([res.data]);
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `TGA_${reportType}_${new Date().toISOString().split('T')[0]}.${extensions[format]}`;
      link.click();
      URL.revokeObjectURL(href);
      toast.success(`${format.toUpperCase()} exported successfully`);
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={!!exporting}
        className="flex items-center gap-2 px-4 py-2 rounded-button
                   bg-[#D96200] text-white text-sm font-medium
                   hover:bg-[#c25700] disabled:opacity-50 transition-colors"
      >
        {exporting
          ? <><Spinner className="w-4 h-4" /> Exporting {exporting.toUpperCase()}...</>
          : <><Download className="w-4 h-4" /> Export<ChevronDown className="w-3 h-3" /></>
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-1 w-44 bg-surface-card rounded-card
                       shadow-card-hover border border-border-warm z-50"
          >
            {formats.map(f => (
              <button
                key={f.key}
                onClick={() => handleExport(f.key)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm
                           text-[var(--color-text-primary)]
                           hover:bg-[var(--color-surface-warm)]
                           first:rounded-t-card last:rounded-b-card"
              >
                <DynamicIcon name={f.icon} className="w-4 h-4 text-[var(--color-text-muted)]" />
                {f.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Usage on any report tab:
// <ExportDropdown reportType="students" />
// <ExportDropdown reportType="agents" />
// <ExportDropdown reportType="applications" />
// <ExportDropdown reportType="commissions" />
```

### Add to Phase 8 audit checklist:
- [ ] PhpSpreadsheet installed via Composer
- [ ] Excel export: file opens correctly in Microsoft Excel (not just Google Sheets)
- [ ] Excel export: header row is navy (#1E2A4A) background with white text
- [ ] Excel export: alternating row tinting (#FAFAF8) applied
- [ ] Excel export: columns auto-sized to fit content
- [ ] Excel export: "Export Info" metadata sheet included
- [ ] CSV export still works alongside Excel (format=csv param)
- [ ] PDF export generates valid PDF with brand colors
- [ ] PDF export: landscape A4, table fits without overflow
- [ ] PDF export: footer with company name and confidential label
- [ ] All 3 formats logged to activity_logs with format field
- [ ] Frontend ExportDropdown renders with 3 format options
- [ ] Each format triggers correct download with correct file extension
- [ ] Export button disabled while export is in progress
- [ ] Toast shows success/failure after download
- [ ] Memory limit sufficient for 5000-row Excel export (research Bluehost limit)
