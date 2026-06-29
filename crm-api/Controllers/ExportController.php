<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Services\ActivityLogger;
use OpenSpout\Writer\XLSX\Writer;
use OpenSpout\Writer\XLSX\Options;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\CellAlignment;
use Dompdf\Dompdf;
use Dompdf\Options as DompdfOptions;

final class ExportController
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
        
        $perms = (array) ($payload['perms'] ?? []);
        $isSuper = !empty($payload['is_super']) || in_array('*', $perms, true);
        if (!$isSuper && !in_array('reports.view', $perms, true)) {
            Response::error('Missing reports.view permission', 'FORBIDDEN', 403);
        }
    }

    public function export(): void
    {
        $this->enforceAuthAndPermissions();

        $type   = $_GET['type']   ?? 'students';
        $format = $_GET['format'] ?? 'xlsx'; // Default to Excel

        $allowedTypes = ['students', 'agents', 'applications', 'commissions'];
        if (!in_array($type, $allowedTypes, true)) {
            Response::error('INVALID_TYPE', 'Export type not supported', 422);
        }

        $allowedFormats = ['csv', 'xlsx', 'pdf'];
        if (!in_array($format, $allowedFormats, true)) {
            Response::error('INVALID_FORMAT', 'Export format not supported', 422);
        }

        ini_set('memory_limit', '256M');
        set_time_limit(120);

        switch ($format) {
            case 'xlsx':
                $this->exportExcel($type);
                break;
            case 'csv':
                $this->exportCsv($type);
                break;
            case 'pdf':
                $this->exportPdf($type);
                break;
        }
    }

    private function exportExcel(string $type): void
    {
        $options = new Options();
        $writer = new Writer($options);
        
        $filename = 'TGA_' . ucfirst($type) . '_' . date('Y-m-d') . '.xlsx';
        
        $payload = AuthMiddleware::user();
        $adminId = $payload['id'] ?? null;
        ActivityLogger::log('report.exported', 'report', null, null,
            ['type' => $type, 'format' => 'xlsx', 'requested_by' => $adminId]);
            
        $writer->openToBrowser($filename);
        $sheet = $writer->getCurrentSheet();
        $sheet->setName(ucfirst($type));

        $headerStyle = (new Style())
            ->setFontBold()
            ->setFontColor(Color::WHITE)
            ->setBackgroundColor('1E2A4A')
            ->setCellAlignment(CellAlignment::CENTER);

        switch ($type) {
            case 'students':
                $writer->addRow(Row::fromValues(['Name', 'Nationality', 'Lead Source', 'Agent', 'Status', 'Applications', 'Registered Date'], $headerStyle));
                $stmt = $this->pdo->query("
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
                $writer->addRow(Row::fromValues(['Full Name', 'Agency', 'Country', 'Tier', 'Status', 'Students', 'Enrolled', 'Conversion %', 'Referral Code', 'Joined'], $headerStyle));
                $stmt = $this->pdo->query("
                    SELECT ag.full_name, ag.agency_name, ag.country, ag.tier, ag.status,
                           COUNT(DISTINCT s.id) AS students,
                           COUNT(DISTINCT CASE WHEN a.status IN ('enrolled', 'cas_coe_issued', 'visa_applied', 'visa_approved', 'pre_departure', 'departed') THEN s.id END) AS enrolled,
                           ROUND(
                             COUNT(DISTINCT CASE WHEN a.status IN ('enrolled', 'cas_coe_issued', 'visa_applied', 'visa_approved', 'pre_departure', 'departed') THEN s.id END)
                             * 100.0 / NULLIF(COUNT(DISTINCT s.id), 0), 1
                           ) AS conversion_pct,
                           ag.referral_code, DATE(ag.created_at) AS joined
                    FROM agents ag
                    LEFT JOIN students s ON s.agent_id = ag.id AND s.deleted_at IS NULL
                    LEFT JOIN applications a ON a.student_id = s.id AND a.deleted_at IS NULL
                    WHERE ag.deleted_at IS NULL
                    GROUP BY ag.id
                    ORDER BY conversion_pct DESC
                ");
                while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $writer->addRow(Row::fromValues(array_values($r)));
                }
                break;
            case 'applications':
                $writer->addRow(Row::fromValues(['Reference', 'Student', 'University', 'Course', 'Intake', 'Status', 'Agent', 'Submitted Date'], $headerStyle));
                $stmt = $this->pdo->query("
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
                $writer->addRow(Row::fromValues(['Agent', 'Agency', 'Student', 'University', 'Amount', 'Currency', 'Status', 'Decided Date'], $headerStyle));
                $stmt = $this->pdo->query("
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

    private function exportCsv(string $type): void
    {
        $payload = AuthMiddleware::user();
        $adminId = $payload['id'] ?? null;
        ActivityLogger::log('report.exported', 'report', null, null,
            ['type' => $type, 'format' => 'csv', 'requested_by' => $adminId]);

        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="TGA_' . $type . '_' . date('Y-m-d') . '.csv"');
        header('Cache-Control: no-cache');
        echo "\xEF\xBB\xBF";
        $fp = fopen('php://output', 'w');

        // Reuse the logic from Excel export but using fputcsv
        switch ($type) {
            case 'students':
                fputcsv($fp, ['Name', 'Nationality', 'Lead Source', 'Agent', 'Status', 'Applications', 'Registered Date']);
                $stmt = $this->pdo->query("
                    SELECT s.full_name, s.nationality, s.lead_source, ag.full_name AS agent_name, s.profile_status, COUNT(a.id) AS app_count, DATE(s.created_at) AS registered
                    FROM students s
                    LEFT JOIN agents ag ON ag.id = s.agent_id
                    LEFT JOIN applications a ON a.student_id = s.id AND a.deleted_at IS NULL
                    WHERE s.deleted_at IS NULL GROUP BY s.id ORDER BY s.created_at DESC LIMIT 5000
                ");
                while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) fputcsv($fp, array_values($r));
                break;
            case 'agents':
                fputcsv($fp, ['Full Name', 'Agency', 'Country', 'Tier', 'Status', 'Students', 'Enrolled', 'Conversion %', 'Referral Code', 'Joined']);
                $stmt = $this->pdo->query("
                    SELECT ag.full_name, ag.agency_name, ag.country, ag.tier, ag.status,
                           COUNT(DISTINCT s.id) AS students,
                           COUNT(DISTINCT CASE WHEN a.status IN ('enrolled', 'cas_coe_issued', 'visa_applied', 'visa_approved', 'pre_departure', 'departed') THEN s.id END) AS enrolled,
                           ROUND(
                             COUNT(DISTINCT CASE WHEN a.status IN ('enrolled', 'cas_coe_issued', 'visa_applied', 'visa_approved', 'pre_departure', 'departed') THEN s.id END)
                             * 100.0 / NULLIF(COUNT(DISTINCT s.id), 0), 1
                           ) AS conversion_pct,
                           ag.referral_code, DATE(ag.created_at) AS joined
                    FROM agents ag
                    LEFT JOIN students s ON s.agent_id = ag.id AND s.deleted_at IS NULL
                    LEFT JOIN applications a ON a.student_id = s.id AND a.deleted_at IS NULL
                    WHERE ag.deleted_at IS NULL
                    GROUP BY ag.id
                    ORDER BY conversion_pct DESC
                ");
                while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) fputcsv($fp, array_values($r));
                break;
            case 'applications':
                fputcsv($fp, ['Reference', 'Student', 'University', 'Course', 'Intake', 'Status', 'Agent', 'Submitted Date']);
                $stmt = $this->pdo->query("
                    SELECT a.reference_number, s.full_name AS student, u.name AS university, c.name AS course, i.name AS intake, a.status, ag.full_name AS agent, DATE(a.submitted_at) AS submitted
                    FROM applications a JOIN students s ON s.id = a.student_id JOIN intakes i ON i.id = a.intake_id JOIN courses c ON c.id = i.course_id JOIN universities u ON u.id = c.university_id LEFT JOIN agents ag ON ag.id = a.agent_id_at_submission WHERE a.deleted_at IS NULL ORDER BY a.submitted_at DESC LIMIT 5000
                ");
                while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) fputcsv($fp, array_values($r));
                break;
            case 'commissions':
                fputcsv($fp, ['Agent', 'Agency', 'Student', 'University', 'Amount', 'Currency', 'Status', 'Decided Date']);
                $stmt = $this->pdo->query("
                    SELECT ag.full_name AS agent, ag.agency_name, s.full_name AS student, u.name AS university, c.amount, c.currency, c.status, DATE(c.decided_at) AS decided
                    FROM commissions c JOIN agents ag ON ag.id = c.agent_id JOIN applications a ON a.id = c.application_id JOIN students s ON s.id = a.student_id JOIN intakes i ON i.id = a.intake_id JOIN courses co ON co.id = i.course_id JOIN universities u ON u.id = co.university_id ORDER BY c.created_at DESC LIMIT 5000
                ");
                while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) fputcsv($fp, array_values($r));
                break;
        }

        fclose($fp);
        exit;
    }

    private function exportPdf(string $type): void
    {
        $payload = AuthMiddleware::user();
        $adminId = $payload['id'] ?? null;
        ActivityLogger::log('report.exported', 'report', null, null,
            ['type' => $type, 'format' => 'pdf', 'requested_by' => $adminId]);

        $options = new DompdfOptions();
        $options->set('defaultFont', 'sans-serif');
        $options->set('isRemoteEnabled', false);
        $dompdf = new Dompdf($options);

        // For simplicity, we just fetch summary/top data. 
        // A full 5000 row PDF would crash the DOMPDF engine.
        // Let's just limit to 100 rows for PDF.
        $data = [];
        switch ($type) {
            case 'students':
                $stmt = $this->pdo->query("SELECT s.full_name, s.nationality, s.lead_source, s.profile_status, DATE(s.created_at) AS registered FROM students s WHERE s.deleted_at IS NULL ORDER BY s.created_at DESC LIMIT 100");
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                break;
            case 'agents':
                $stmt = $this->pdo->query("SELECT ag.full_name, ag.country, ag.tier, ag.status, COUNT(s.id) AS students, DATE(ag.created_at) AS joined FROM agents ag LEFT JOIN students s ON s.agent_id = ag.id AND s.deleted_at IS NULL WHERE ag.deleted_at IS NULL GROUP BY ag.id ORDER BY students DESC LIMIT 100");
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                break;
            case 'applications':
                $stmt = $this->pdo->query("SELECT a.reference_number, s.full_name AS student, u.name AS university, a.status, DATE(a.submitted_at) AS submitted FROM applications a JOIN students s ON s.id = a.student_id JOIN intakes i ON i.id = a.intake_id JOIN courses c ON c.id = i.course_id JOIN universities u ON u.id = c.university_id WHERE a.deleted_at IS NULL ORDER BY a.submitted_at DESC LIMIT 100");
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                break;
            case 'commissions':
                $stmt = $this->pdo->query("SELECT ag.full_name AS agent, s.full_name AS student, c.amount, c.currency, c.status, DATE(c.decided_at) AS decided FROM commissions c JOIN agents ag ON ag.id = c.agent_id JOIN applications a ON a.id = c.application_id JOIN students s ON s.id = a.student_id ORDER BY c.created_at DESC LIMIT 100");
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                break;
        }

        $html = '
        <html>
        <head>
        <style>
          body { font-family: sans-serif; font-size: 12px; color: #1E2A4A; }
          h1   { color: #1E2A4A; font-size: 18px; border-bottom: 2px solid #D96200; padding-bottom: 8px; }
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
          <h1>The Global Avenues — ' . ucfirst($type) . ' Report (Top 100)</h1>
          <p class="meta">Generated: ' . date('d M Y H:i') . ' · Confidential</p>
        ';

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
        } else {
            $html .= '<p>No data found.</p>';
        }

        $html .= '
          <div class="footer">The Global Avenues CRM · Confidential · ' . date('Y') . '</div>
        </body></html>';

        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        $filename = 'TGA_' . ucfirst($type) . '_' . date('Y-m-d') . '.pdf';
        $dompdf->stream($filename, ['Attachment' => true]);
        exit;
    }
}
