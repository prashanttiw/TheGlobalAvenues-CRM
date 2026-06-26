<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use TGA\CRM\Config\Database;

class ReminderEngine
{
    private static array $eventKeys = [
        'deadline_3days'     => 'reminder.deadline_3days',
        'deadline_1day'      => 'reminder.deadline_1day',
        'overdue'            => 'reminder.overdue',
        'payment_overdue'    => 'reminder.payment_overdue',
        'commission_pending' => 'reminder.commission_pending',
        'intake_deadline'    => 'reminder.intake_deadline',
    ];

    public static function getEventKey(string $type): ?string
    {
        return self::$eventKeys[$type] ?? null;
    }

    public static function buildVars(string $entityType, int $entityId): array
    {
        $pdo = Database::getConnection();
        return match ($entityType) {
            'document_request' => self::buildDocRequestVars($pdo, $entityId),
            'application_payment' => self::buildPaymentVars($pdo, $entityId),
            'intake' => self::buildIntakeVars($pdo, $entityId),
            'commission' => self::buildCommissionVars($pdo, $entityId),
            default => [],
        };
    }

    private static function buildDocRequestVars(PDO $pdo, int $id): array
    {
        $r = $pdo->prepare("
            SELECT dr.doc_label, dr.deadline, s.full_name AS student_name
            FROM document_requests dr
            JOIN students s ON s.id = dr.student_id
            WHERE dr.id = ?
        ");
        $r->execute([$id]);
        $row = $r->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return [];
        }
        return [
            'item_label'     => $row['doc_label'],
            'recipient_name' => $row['student_name'],
            'deadline'       => $row['deadline'],
            'entity_type'    => 'document_request',
            'entity_id'      => $id,
        ];
    }

    private static function buildPaymentVars(PDO $pdo, int $id): array
    {
        $r = $pdo->prepare("
            SELECT ap.label, ap.amount, ap.currency, ap.due_date, s.full_name AS student_name
            FROM application_payments ap
            JOIN applications a ON a.id = ap.application_id
            JOIN students s ON s.id = a.student_id
            WHERE ap.id = ?
        ");
        $r->execute([$id]);
        $row = $r->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return [];
        }
        return [
            'item_label'     => $row['label'],
            'amount'         => $row['amount'] . ' ' . $row['currency'],
            'deadline'       => $row['due_date'],
            'recipient_name' => $row['student_name'],
        ];
    }

    private static function buildCommissionVars(PDO $pdo, int $id): array
    {
        $r = $pdo->prepare("
            SELECT c.amount, c.currency, c.created_at,
                   ag.full_name AS agent_name, s.full_name AS student_name
            FROM commissions c
            JOIN agents ag ON ag.id = c.agent_id
            JOIN applications a ON a.id = c.application_id
            JOIN students s ON s.id = a.student_id
            WHERE c.id = ?
        ");
        $r->execute([$id]);
        $row = $r->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return [];
        }
        $daysPending = (int) round((time() - strtotime($row['created_at'])) / 86400);
        return [
            'agent_name'   => $row['agent_name'],
            'student_name' => $row['student_name'],
            'amount'       => $row['amount'] . ' ' . $row['currency'],
            'days_pending' => $daysPending,
            'admin_url'    => ($_ENV['FRONTEND_URL'] ?? '') . '/admin/commissions',
        ];
    }

    private static function buildIntakeVars(PDO $pdo, int $id): array
    {
        $r = $pdo->prepare("
            SELECT i.name, c.name as course_name, u.name as university_name, i.application_deadline as deadline
            FROM intakes i
            JOIN courses c ON c.id = i.course_id
            JOIN universities u ON u.id = c.university_id
            WHERE i.id = ?
        ");
        $r->execute([$id]);
        $row = $r->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return [];
        }
        return [
            'item_label'     => "{$row['university_name']} - {$row['course_name']} ({$row['name']})",
            'deadline'       => $row['deadline'],
            'recipient_name' => 'Agent',
        ];
    }
}
