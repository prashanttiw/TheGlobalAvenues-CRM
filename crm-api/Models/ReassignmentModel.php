<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;

final class ReassignmentModel
{
    /**
     * Find a pending reassignment request for a student.
     * Used to prevent duplicate submissions.
     */
    public static function findPendingByStudentId(int $studentId, PDO $pdo): ?array
    {
        $stmt = $pdo->prepare(
            "SELECT id, public_id, status FROM agent_reassignment_requests
             WHERE student_id = ? AND status = 'pending'"
        );
        $stmt->execute([$studentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Resolve a request by its public_id WITH a row lock (FOR UPDATE).
     * Must be called inside an active transaction.
     */
    public static function findForUpdate(string $publicId, PDO $pdo): ?array
    {
        $stmt = $pdo->prepare(
            "SELECT id, public_id, status, student_id, current_agent_id,
                    requested_agent_id, final_agent_id, reason
             FROM agent_reassignment_requests
             WHERE public_id = ? FOR UPDATE"
        );
        $stmt->execute([$publicId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Get all reassignment history for a student (admin view).
     */
    public static function historyByStudentId(int $studentId, PDO $pdo): array
    {
        $stmt = $pdo->prepare(
            "SELECT arr.public_id, arr.status, arr.reason, arr.review_notes,
                    arr.created_at, arr.reviewed_at,
                    ca.full_name AS current_agent_name,
                    ra.full_name AS requested_agent_name,
                    fa.full_name AS final_agent_name
             FROM agent_reassignment_requests arr
             LEFT JOIN agents ca ON ca.id = arr.current_agent_id
             LEFT JOIN agents ra ON ra.id = arr.requested_agent_id
             LEFT JOIN agents fa ON fa.id = arr.final_agent_id
             WHERE arr.student_id = ?
             ORDER BY arr.created_at DESC"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
