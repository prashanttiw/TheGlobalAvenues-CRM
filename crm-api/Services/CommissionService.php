<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use TGA\CRM\Helpers\UlidGenerator;

final class CommissionService
{
    /**
     * Insert a row into commission_audit_log.
     * Called before every status transition.
     */
    public static function auditLog(
        int    $commissionId,
        string $commissionPublicId,
        string $oldStatus,
        string $newStatus,
        string $action,
        int    $actorUserId,
        string $actorName,
        PDO    $pdo,
        ?float $oldAmount = null,
        ?float $newAmount = null,
        ?string $notes = null
    ): void {
        $pdo->prepare(
            "INSERT INTO commission_audit_log
                 (public_id, commission_id, commission_public_id,
                  old_status, new_status, old_amount, new_amount,
                  action, changed_by_user_id, changed_by_name, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())"
        )->execute([
            UlidGenerator::generate(),
            $commissionId,
            $commissionPublicId,
            $oldStatus,
            $newStatus,
            $oldAmount,
            $newAmount,
            $action,
            $actorUserId,
            $actorName,
            $notes,
        ]);
    }

    /**
     * Confirm a pending commission. Throws on state violation.
     */
    public static function confirm(
        string $publicId,
        int    $reviewerUserId,
        string $reviewerName,
        string $reviewNotes,
        PDO    $pdo
    ): array {
        try {
            $pdo->beginTransaction();

            $commission = self::fetchForWrite($publicId, $pdo);

            if ($commission['status'] !== 'pending') {
                throw new \RuntimeException('Only pending commissions can be confirmed.');
            }

            self::auditLog(
                (int) $commission['id'],
                $commission['public_id'],
                'pending', 'confirmed',
                'confirmed',
                $reviewerUserId, $reviewerName,
                $pdo, null, null, $reviewNotes
            );

            $pdo->prepare(
                "UPDATE commissions
                 SET status = 'confirmed', decided_by = ?, decided_at = NOW(), updated_at = NOW()
                 WHERE id = ?"
            )->execute([$reviewerUserId, $commission['id']]);

            $pdo->commit();
            return $commission;
        } catch (\Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Mark a confirmed commission as paid.
     */
    public static function markPaid(
        string $publicId,
        int    $payerUserId,
        string $payerName,
        PDO    $pdo
    ): array {
        try {
            $pdo->beginTransaction();

            $commission = self::fetchForWrite($publicId, $pdo);

            if ($commission['status'] !== 'confirmed') {
                throw new \RuntimeException('Commission must be confirmed before marking as paid.');
            }

            self::auditLog(
                (int) $commission['id'],
                $commission['public_id'],
                'confirmed', 'paid',
                'paid',
                $payerUserId, $payerName,
                $pdo
            );

            $pdo->prepare(
                "UPDATE commissions
                 SET status = 'paid', paid_at = NOW(),
                     paid_by_user_id = ?, paid_by_name = ?, updated_at = NOW()
                 WHERE id = ?"
            )->execute([$payerUserId, $payerName, $commission['id']]);

            $pdo->commit();
            return $commission;
        } catch (\Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Soft-delete a pending commission.
     */
    public static function softDelete(
        string $publicId,
        int    $actorUserId,
        string $actorName,
        PDO    $pdo
    ): void {
        try {
            $pdo->beginTransaction();

            $commission = self::fetchForWrite($publicId, $pdo);

            if ($commission['status'] !== 'pending') {
                throw new \RuntimeException('Only pending commissions can be deleted.');
            }

            self::auditLog(
                (int) $commission['id'],
                $commission['public_id'],
                'pending', 'pending',
                'deleted',
                $actorUserId, $actorName,
                $pdo
            );

            $pdo->prepare(
                "UPDATE commissions SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?"
            )->execute([$commission['id']]);

            $pdo->commit();
        } catch (\Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    private static function fetchForWrite(string $publicId, PDO $pdo): array
    {
        $stmt = $pdo->prepare(
            "SELECT id, public_id, status, amount, agent_id, application_id
             FROM commissions WHERE public_id = ? AND deleted_at IS NULL FOR UPDATE"
        );
        $stmt->execute([$publicId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            throw new \RuntimeException('Commission record not found.');
        }

        return $row;
    }
}
