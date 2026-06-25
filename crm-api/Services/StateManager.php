<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use Exception;
use TGA\CRM\Helpers\UlidGenerator;

class StateManager
{
    private const GRAPH = [
        'draft' => ['submitted', 'withdrawn'],
        'submitted' => ['under_review', 'withdrawn'],
        'under_review' => ['offer_received', 'rejected', 'waitlisted', 'withdrawn'],
        'offer_received' => ['enrolled', 'rejected', 'withdrawn'], // Allow withdrawing/rejecting even after offer
        'waitlisted' => ['offer_received', 'rejected', 'withdrawn'],
        'rejected' => [],
        'enrolled' => [],
        'withdrawn' => []
    ];

    public static function transition(PDO $pdo, int $applicationId, string $newStatus, string $byUserType, int $byUserId): void
    {
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("SELECT status FROM applications WHERE id = ? FOR UPDATE");
            $stmt->execute([$applicationId]);
            $currentStatus = $stmt->fetchColumn();

            if (!$currentStatus) {
                throw new Exception("Application not found.", 404);
            }

            if ($currentStatus === $newStatus) {
                $pdo->rollBack();
                return;
            }

            $validTransitions = self::GRAPH[$currentStatus] ?? [];
            if (!in_array($newStatus, $validTransitions, true)) {
                throw new Exception("Invalid state transition from '$currentStatus' to '$newStatus'.", 400);
            }

            $updateSql = "UPDATE applications SET status = ?";
            $updateParams = [$newStatus];

            if ($newStatus === 'submitted' && $currentStatus === 'draft') {
                $updateSql .= ", submitted_at = NOW()";
            }

            $updateSql .= " WHERE id = ?";
            $updateParams[] = $applicationId;

            $stmt = $pdo->prepare($updateSql);
            $stmt->execute($updateParams);

            $pid = UlidGenerator::generate();
            $stmt = $pdo->prepare("
                INSERT INTO application_updates
                (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id, is_visible_to_agent)
                VALUES (?, ?, 'admin_to_student', 'status_change', ?, ?, ?, 1)
            ");
            $content = "Application status changed from {$currentStatus} to {$newStatus}";
            $stmt->execute([
                $pid,
                $applicationId,
                $content,
                $byUserType,
                $byUserId
            ]);

            $pdo->commit();

            ActivityLogger::log('application.status_changed', 'application', $applicationId, $byUserId, ['old_status' => $currentStatus], ['new_status' => $newStatus]);

            // Fire Notifications
            $stmt = $pdo->prepare("
                SELECT s.user_id as student_user_id, a.agent_id_at_submission
                FROM applications app
                JOIN students s ON app.student_id = s.id
                LEFT JOIN applications a ON a.id = app.id
                WHERE app.id = ?
            ");
            $stmt->execute([$applicationId]);
            $appData = $stmt->fetch(PDO::FETCH_ASSOC);

            $userIds = [];
            if (!empty($appData['student_user_id'])) {
                $userIds[] = (int)$appData['student_user_id'];
            }
            if (!empty($appData['agent_id_at_submission'])) {
                $stmt = $pdo->prepare("SELECT user_id FROM agents WHERE id = ?");
                $stmt->execute([$appData['agent_id_at_submission']]);
                $agentUserId = $stmt->fetchColumn();
                if ($agentUserId) {
                    $userIds[] = (int)$agentUserId;
                }
            }

            if (!empty($userIds)) {
                NotificationService::fire('application.status_changed', ['application_id' => $applicationId, 'new_status' => $newStatus], $userIds);
            }

            // Fire SLA Triggers
            if ($newStatus === 'submitted') {
                SLAService::startEvent($pdo, 'application', 'submitted', $applicationId);
            } elseif ($newStatus === 'under_review') {
                SLAService::resolveEvent($pdo, 'application', $applicationId);
            } elseif (in_array($newStatus, ['withdrawn', 'rejected'])) {
                SLAService::cancelEvent($pdo, 'application', $applicationId);
            }

        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}
