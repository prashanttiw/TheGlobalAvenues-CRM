<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use Exception;

final class OTPService
{
    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function generate(string $identifier, string $purpose, int $expiryMinutes = 10): string
    {
        // 1. Delete existing unused OTPs for this identifier+purpose to avoid spam
        $identifierHash = EncryptionService::hash(strtolower(trim($identifier)));
        
        $deleteStmt = $this->pdo->prepare(
            'DELETE FROM otp_verifications WHERE identifier_hash = ? AND purpose = ? AND used_at IS NULL'
        );
        $deleteStmt->execute([$identifierHash, $purpose]);

        // 2. Generate 6-digit random code
        $code = (string) random_int(100000, 999999);
        $otpHash = hash('sha256', $code);

        // 3. Store in DB
        $insertStmt = $this->pdo->prepare(
            'INSERT INTO otp_verifications (identifier_hash, otp_hash, purpose, expires_at, created_at)
             VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW())'
        );
        $insertStmt->execute([$identifierHash, $otpHash, $purpose, $expiryMinutes]);

        return $code; // Plain code returned so controller can email/SMS it
    }

    public function verify(string $identifier, string $code, string $purpose, int $maxAttempts = 3): OTPResult
    {
        $identifierHash = EncryptionService::hash(strtolower(trim($identifier)));

        try {
            $this->pdo->beginTransaction();

            // 1. Lookup active OTP with row-level locking (FOR UPDATE)
            $stmt = $this->pdo->prepare(
                'SELECT id, otp_hash, attempts, expires_at, used_at FROM otp_verifications 
                 WHERE identifier_hash = ? AND purpose = ? 
                 ORDER BY created_at DESC LIMIT 1 FOR UPDATE'
            );
            $stmt->execute([$identifierHash, $purpose]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                $this->pdo->rollBack();
                $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
                $logStmt = $this->pdo->prepare("INSERT INTO security_events (event_type, identifier, ip_address, details, created_at) VALUES ('otp_not_found', ?, ?, JSON_OBJECT('purpose', ?), NOW())");
                $logStmt->execute([$identifierHash, $ip, $purpose]);
                return OTPResult::NotFound;
            }

            if ($row['used_at'] !== null || strtotime($row['expires_at']) < time()) {
                $this->pdo->rollBack();
                return OTPResult::Expired;
            }

            if ((int)$row['attempts'] >= $maxAttempts) {
                $this->pdo->rollBack();
                $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
                $logStmt = $this->pdo->prepare("INSERT INTO security_events (event_type, identifier, ip_address, details, created_at) VALUES ('otp_brute_force', ?, ?, JSON_OBJECT('purpose', ?, 'attempts', ?), NOW())");
                $logStmt->execute([$identifierHash, $ip, $purpose, (int)$row['attempts']]);
                return OTPResult::BruteForced;
            }

            // 2. Increment attempts atomically within the lock
            $incStmt = $this->pdo->prepare('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?');
            $incStmt->execute([$row['id']]);

            // 3. Compare hashes (timing-attack safe)
            $inputHash = hash('sha256', $code);
            if (hash_equals($row['otp_hash'], $inputHash)) {
                $markUsedStmt = $this->pdo->prepare('UPDATE otp_verifications SET used_at = NOW() WHERE id = ?');
                $markUsedStmt->execute([$row['id']]);
                $this->pdo->commit();
                return OTPResult::Valid;
            }

            $this->pdo->commit();
            return OTPResult::Invalid;
            
        } catch (\Exception $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }
}
