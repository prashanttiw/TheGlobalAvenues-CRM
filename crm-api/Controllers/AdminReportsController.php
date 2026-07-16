<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;

final class AdminReportsController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }
    
    private function enforceAuthAndPermissions(): void
    {
        AuthMiddleware::requireAuth();
        
        $payload = AuthMiddleware::user();
        if (($payload['utype'] ?? '') !== 'admin' && ($payload['user_type'] ?? '') !== 'admin') {
            Response::error('Access denied.', 'FORBIDDEN', 403);
        }
        
        // Enforce ModuleGuard: reports.view
        $perms = (array) ($payload['perms'] ?? []);
        $isSuper = !empty($payload['is_super']) || in_array('*', $perms, true);
        if (!$isSuper && !in_array('reports.view', $perms, true)) {
            Response::error('Missing reports.view permission', 'FORBIDDEN', 403);
        }
    }

    private function getGlobalMetric(string $metric): float
    {
        return $this->fetchGlobal($metric);
    }
    
    private function fetchGlobal(string $metric): float {
        $stmt = $this->pdo->prepare("
            SELECT metric_value FROM report_snapshots
            WHERE metric_key = ? AND dimension_type = 'global' AND dimension_id = '_global'
            ORDER BY snapshot_date DESC LIMIT 1
        ");
        $stmt->execute([$metric]);
        return (float)$stmt->fetchColumn();
    }

    private function fetchPrevPeriodGlobal(string $metric, int $daysAgo): float {
        $date = date('Y-m-d', strtotime("-{$daysAgo} days"));
        $stmt = $this->pdo->prepare("
            SELECT metric_value FROM report_snapshots
            WHERE metric_key = ? AND dimension_type = 'global' AND dimension_id = '_global'
              AND snapshot_date <= ?
            ORDER BY snapshot_date DESC LIMIT 1
        ");
        $stmt->execute([$metric, $date]);
        return (float)$stmt->fetchColumn();
    }

    public function overview(): void
    {
        $this->enforceAuthAndPermissions();
        $metrics = ['total_students','total_applications','total_offers','total_enrollments','total_leads'];
        $result = [];
        foreach ($metrics as $m) {
            $current = $this->fetchGlobal($m);
            $prev    = $this->fetchPrevPeriodGlobal($m, 30);
            $change  = $prev > 0 ? round(($current - $prev) / $prev * 100, 1) : null;
            $result[$m] = [
                'value'      => $current,
                'prev_value' => $prev,
                'change_pct' => $change,
                'trend'      => $change > 0 ? 'up' : ($change < 0 ? 'down' : 'flat'),
            ];
        }

        $trendStmt = $this->pdo->prepare("
            SELECT snapshot_date, metric_value
            FROM report_snapshots
            WHERE metric_key = 'new_students'
              AND dimension_type = 'global' AND dimension_id = '_global'
              AND snapshot_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ORDER BY snapshot_date ASC
        ");
        $trendStmt->execute();
        $result['trend_new_students'] = $trendStmt->fetchAll(PDO::FETCH_ASSOC);

        Response::success('Overview data fetched', $result);
    }

    public function funnel(): void
    {
        $this->enforceAuthAndPermissions();
        $leads       = $this->fetchGlobal('total_leads');
        $students    = $this->fetchGlobal('total_students');
        $applications= $this->fetchGlobal('total_applications');
        $offers      = $this->fetchGlobal('total_offers');
        $enrollments = $this->fetchGlobal('total_enrollments');

        $dropOff = fn($from, $to): ?float =>
            ($from > 0) ? round((1 - $to / $from) * 100, 1) : null;

        Response::success('Funnel data fetched', [
            ['stage' => 'Leads',        'count' => (int)$leads,        'drop_off_pct' => null],
            ['stage' => 'Students',     'count' => (int)$students,     'drop_off_pct' => $dropOff($leads, $students)],
            ['stage' => 'Applications', 'count' => (int)$applications, 'drop_off_pct' => $dropOff($students, $applications)],
            ['stage' => 'Offers',       'count' => (int)$offers,       'drop_off_pct' => $dropOff($applications, $offers)],
            ['stage' => 'Enrollments',  'count' => (int)$enrollments,  'drop_off_pct' => $dropOff($offers, $enrollments)],
        ]);
    }

    public function agents(): void
    {
        $this->enforceAuthAndPermissions();
        $sort_by = $_GET['sort_by'] ?? 'conversion_rate';
        $order_param = $_GET['order'] ?? 'DESC';

        $sort  = in_array($sort_by, ['students','enrollments','conversion_rate','commissions_paid'])
            ? $sort_by : 'conversion_rate';
        $order = strtoupper($order_param) === 'ASC' ? 'ASC' : 'DESC';

        $latestDate = $this->pdo->query("
            SELECT MAX(snapshot_date) FROM report_snapshots
            WHERE dimension_type = 'agent'
        ")->fetchColumn();

        if (!$latestDate) {
            Response::success('Agents data fetched', ['data' => [], 'snapshot_date' => null]);
            return;
        }

        // No CTE, no window function — production MySQL is 5.7, which has neither. The CTE becomes
        // a plain derived subquery (functionally identical). RANK() OVER (...) becomes the classic
        // MySQL user-variable running-counter, but the counter only runs in the OUTER query against
        // an already-ORDER-BY'd-and-LIMIT'd derived table `x` — assigning it in the same query as
        // the ORDER BY is a known MySQL gotcha (the assignment can run before the sort is applied).
        $agents = $this->pdo->query("
            SELECT x.*, @tga_rank := @tga_rank + 1 AS rank_position
            FROM (
                SELECT
                  am.*,
                  ag.full_name, ag.agency_name, ag.tier, ag.status
                FROM (
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
                ) am
                JOIN agents ag ON ag.public_id = am.agent_public_id
                WHERE ag.deleted_at IS NULL
                  AND am.students >= 5
                ORDER BY am.{$sort} {$order}
                LIMIT 100
            ) x, (SELECT @tga_rank := 0) r
        ")->fetchAll(PDO::FETCH_ASSOC);

        Response::success('Agents data fetched', [
            'data'          => $agents,
            'snapshot_date' => $latestDate,
        ]);
    }

    public function universities(): void
    {
        $this->enforceAuthAndPermissions();
        $latestDate = $this->pdo->query("
            SELECT MAX(snapshot_date) FROM report_snapshots WHERE dimension_type='university'
        ")->fetchColumn();

        if (!$latestDate) {
            Response::success('Universities data fetched', ['data' => [], 'snapshot_date' => null]);
            return;
        }

        // CTE replaced with a plain derived subquery — production MySQL is 5.7, no CTE support.
        $unis = $this->pdo->query("
            SELECT um.*, u.name, u.country, u.city
            FROM (
                SELECT dimension_id AS uni_public_id,
                  MAX(CASE WHEN metric_key='uni_applications'   THEN metric_value ELSE 0 END) AS applications,
                  MAX(CASE WHEN metric_key='uni_offers'         THEN metric_value ELSE 0 END) AS offers,
                  MAX(CASE WHEN metric_key='uni_enrollments'    THEN metric_value ELSE 0 END) AS enrollments,
                  MAX(CASE WHEN metric_key='uni_offer_rate'     THEN metric_value ELSE 0 END) AS offer_rate,
                  MAX(CASE WHEN metric_key='uni_enrollment_rate'THEN metric_value ELSE 0 END) AS enrollment_rate
                FROM report_snapshots
                WHERE dimension_type = 'university' AND snapshot_date = '{$latestDate}'
                GROUP BY dimension_id
            ) um
            JOIN universities u ON u.public_id = um.uni_public_id
            WHERE u.deleted_at IS NULL
            ORDER BY um.offer_rate DESC
        ")->fetchAll(PDO::FETCH_ASSOC);

        Response::success('Universities data fetched', ['data' => $unis, 'snapshot_date' => $latestDate]);
    }

    public function leadSources(): void
    {
        $this->enforceAuthAndPermissions();
        $latestDate = $this->pdo->query("
            SELECT MAX(snapshot_date) FROM report_snapshots WHERE dimension_type='lead_source'
        ")->fetchColumn();

        if (!$latestDate) {
            Response::success('Lead sources fetched', ['data' => [], 'snapshot_date' => null]);
            return;
        }

        $sources = $this->pdo->query("
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

        Response::success('Lead sources fetched', ['data' => $sources, 'snapshot_date' => $latestDate]);
    }

    public function trends(): void
    {
        $this->enforceAuthAndPermissions();
        $metric    = $_GET['metric']    ?? 'total_students';
        $dimType   = $_GET['dim_type']  ?? 'global';
        $dimId     = $_GET['dim_id']    ?? ($dimType === 'global' ? '_global' : null);
        $dateFrom  = $_GET['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
        $dateTo    = $_GET['date_to']   ?? date('Y-m-d');

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
            Response::error('INVALID_DATE_FORMAT', 'Dates must be in YYYY-MM-DD format', 400);
        }

        $fromTime = strtotime($dateFrom);
        $toTime = strtotime($dateTo);
        if ($fromTime === false || $toTime === false) {
            Response::error('INVALID_DATE', 'Provided dates are invalid', 400);
        }

        $diff = ($toTime - $fromTime) / 86400;
        if ($diff > 365) {
            Response::error('DATE_RANGE_TOO_LARGE', 'Maximum date range is 365 days', 422);
        }
        if ($diff < 0) {
            Response::error('INVALID_DATE_RANGE', 'Start date must be before or equal to end date', 400);
        }

        $stmt = $this->pdo->prepare("
            SELECT snapshot_date, metric_value
            FROM report_snapshots
            WHERE metric_key = ?
              AND dimension_type = ?
              AND dimension_id <=> ?
              AND snapshot_date >= ? AND snapshot_date <= ?
            ORDER BY snapshot_date ASC
        ");
        $stmt->execute([$metric, $dimType, $dimId, $dateFrom, $dateTo]);

        Response::success('Trends data fetched', [
            'metric'    => $metric,
            'dim_type'  => $dimType,
            'dim_id'    => $dimId,
            'date_from' => $dateFrom,
            'date_to'   => $dateTo,
            'data'      => $stmt->fetchAll(PDO::FETCH_ASSOC),
        ]);
    }
}
