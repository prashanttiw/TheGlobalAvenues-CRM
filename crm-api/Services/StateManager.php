<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use Exception;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Config\Environment;

class StateManager
{
    private const GRAPH = [
        'inquiry' => ['profile_review', 'applied', 'withdrawn'],
        'profile_review' => ['applied', 'documents_submitted', 'under_review', 'withdrawn'],
        'applied' => ['documents_submitted', 'under_review', 'withdrawn'],
        'documents_submitted' => ['under_review', 'withdrawn'],
        'draft' => ['submitted', 'withdrawn'],
        'submitted' => ['under_review', 'withdrawn'],
        'under_review' => ['offer_received', 'conditional_offer', 'unconditional_offer', 'waitlisted', 'rejected', 'withdrawn'],
        'offer_received' => ['enrolled', 'rejected', 'withdrawn', 'deferred'],
        'conditional_offer' => ['enrolled', 'unconditional_offer', 'rejected', 'withdrawn', 'deferred'],
        'unconditional_offer' => ['enrolled', 'rejected', 'withdrawn', 'deferred'],
        'waitlisted' => ['submitted', 'offer_received', 'conditional_offer', 'unconditional_offer', 'rejected', 'withdrawn'],
        'enrolled' => ['cas_coe_issued', 'deferred', 'withdrawn', 'rejected'],
        'cas_coe_issued' => ['visa_applied', 'deferred', 'withdrawn', 'rejected'],
        'visa_applied' => ['visa_approved', 'visa_rejected', 'deferred', 'withdrawn', 'rejected'],
        'visa_approved' => ['pre_departure', 'deferred', 'withdrawn'],
        'visa_rejected' => ['visa_applied', 'deferred', 'withdrawn', 'rejected'],
        'pre_departure' => ['departed', 'deferred', 'withdrawn'],
        'departed' => ['deferred', 'withdrawn'],
        'deferred' => ['submitted', 'under_review', 'withdrawn'],
        'rejected' => ['submitted', 'under_review'],
        'withdrawn' => ['submitted', 'draft']
    ];

    public static function transition(PDO $pdo, int $applicationId, string $newStatus, string $byUserType, int $byUserId, array $payload = []): void
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
            if ($newStatus === 'withdrawn' && isset($payload['withdrawal_reason'])) {
                $updateSql .= ", withdrawal_reason = ?";
                $updateParams[] = $payload['withdrawal_reason'];
            }

            $updateSql .= " WHERE id = ?";
            $updateParams[] = $applicationId;

            $stmt = $pdo->prepare($updateSql);
            $stmt->execute($updateParams);

            // Sync student profile status and agent lock status
            $stmt = $pdo->prepare("SELECT student_id FROM applications WHERE id = ?");
            $stmt->execute([$applicationId]);
            $studentId = $stmt->fetchColumn();

            if ($studentId) {
                // Determine highest application state
                $stmt = $pdo->prepare("SELECT status FROM applications WHERE student_id = ? AND deleted_at IS NULL");
                $stmt->execute([$studentId]);
                $statuses = $stmt->fetchAll(PDO::FETCH_COLUMN);

                $highestStatus = 'registered';
                if (in_array('enrolled', $statuses, true)) {
                    $highestStatus = 'enrolled';
                } elseif (in_array('offer_received', $statuses, true) || in_array('conditional_offer', $statuses, true) || in_array('unconditional_offer', $statuses, true)) {
                    $highestStatus = 'offer_received';
                } elseif (in_array('under_review', $statuses, true) || in_array('submitted', $statuses, true)) {
                    $highestStatus = 'application_in_progress';
                } elseif (count($statuses) > 0) {
                    $highestStatus = 'application_in_progress';
                }

                $pdo->prepare('UPDATE students SET profile_status = ? WHERE id = ?')->execute([$highestStatus, $studentId]);

                if ($newStatus === 'enrolled') {
                    $pdo->prepare("UPDATE students SET agent_lock_status = 'locked' WHERE id = ?")->execute([$studentId]);
                }
            }

            $pid = UlidGenerator::generate();
            $stmt = $pdo->prepare("
                INSERT INTO application_updates
                (public_id, application_id, direction, item_type, content, posted_by_type, posted_by_id, is_visible_to_agent)
                VALUES (?, ?, 'admin_to_student', 'status_change', ?, ?, ?, 1)
            ");
            $content = "Application status changed from {$currentStatus} to {$newStatus}";
            if ($newStatus === 'withdrawn' && !empty($payload['withdrawal_reason'])) {
                $content .= "\nReason: " . $payload['withdrawal_reason'];
            }
            $stmt->execute([
                $pid,
                $applicationId,
                $content,
                $byUserType,
                $byUserId
            ]);

            $pdo->commit();

            ActivityLogger::log('application.status_changed', 'application', $applicationId, $byUserId, ['old_status' => $currentStatus], ['new_status' => $newStatus]);

            // Fire Notifications — separate calls per recipient so 'recipient_name' can
            // actually be personalized (fire() renders subject/body once per call, before
            // fanning out to recipientUserIds, so one shared call can't have per-person text).
            $stmt = $pdo->prepare("
                SELECT s.user_id as student_user_id, s.full_name as student_name,
                       app.agent_id_at_submission, app.reference_number
                FROM applications app
                JOIN students s ON app.student_id = s.id
                WHERE app.id = ?
            ");
            $stmt->execute([$applicationId]);
            $appData = $stmt->fetch(PDO::FETCH_ASSOC);

            $portalUrl = Environment::get('APP_FRONTEND_URL', '');
            $referenceNumber = $appData['reference_number'] ?? '';

            if (!empty($appData['student_user_id'])) {
                NotificationService::fire('application.status_changed', [
                    'application_id'   => $applicationId,
                    'new_status'       => $newStatus,
                    'reference_number' => $referenceNumber,
                    'recipient_name'   => $appData['student_name'] ?? 'there',
                    'portal_url'       => $portalUrl . '/portal/student/',
                ], [(int)$appData['student_user_id']]);
            }

            if (!empty($appData['agent_id_at_submission'])) {
                $stmt = $pdo->prepare("SELECT user_id, full_name FROM agents WHERE id = ?");
                $stmt->execute([$appData['agent_id_at_submission']]);
                $agentRow = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!empty($agentRow['user_id'])) {
                    NotificationService::fire('application.status_changed', [
                        'application_id'   => $applicationId,
                        'new_status'       => $newStatus,
                        'reference_number' => $referenceNumber,
                        'recipient_name'   => $agentRow['full_name'] ?? 'there',
                        'portal_url'       => $portalUrl . '/portal/agent/',
                    ], [(int)$agentRow['user_id']]);
                }
            }

            // Fire SLA Triggers
            if ($newStatus === 'submitted') {
                SLAService::startEvent($pdo, 'application', 'submitted', $applicationId);
            } elseif ($newStatus === 'under_review') {
                SLAService::resolveEvent($pdo, 'application', $applicationId);
            } elseif (in_array($newStatus, ['withdrawn', 'rejected'])) {
                SLAService::cancelEvent($pdo, 'application', $applicationId);
                
                if ($newStatus === 'withdrawn') {
                    $pdo->prepare("UPDATE document_requests SET status = 'cancelled' WHERE application_id = ? AND status = 'requested'")->execute([$applicationId]);
                    $pdo->prepare("UPDATE application_payments SET status = 'cancelled' WHERE application_id = ? AND status = 'pending'")->execute([$applicationId]);
                }
            }

        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}
