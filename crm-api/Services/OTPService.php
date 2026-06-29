<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use Exception;
use TGA\CRM\Config\Database;
use TGA\CRM\Models\NotificationTemplateModel;

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

    /**
     * Generate an OTP and send it via email IMMEDIATELY (synchronous).
     * Throws on delivery failure — caller must catch and return an error
     * response to the frontend.
     */
    public static function generateAndSend(
        string $email,
        string $purpose,
        string $eventKey,
        array $extraVars = [],
        ?string $clientIp = null
    ): string {
        // 0. RATE LIMIT CHECK
        $clientIp = $clientIp ?? \TGA\CRM\Middleware\RateLimitMiddleware::getIpAddress();
        $emailHash = EncryptionService::hash(strtolower(trim($email)));
        
        $ipMax = 3;
        $emailMax = 3;
        $window = 3600;

        if ($purpose === '2fa' || $purpose === '2fa_login') {
            $ipMax = 5;
            $emailMax = 5;
            $window = 900;
        }

        $ipWait = \TGA\CRM\Middleware\RateLimitMiddleware::checkLimit("otp_send_ip_{$clientIp}_{$purpose}", 'otp_send', $ipMax, $window);
        $emailWait = \TGA\CRM\Middleware\RateLimitMiddleware::checkLimit("otp_send_email_{$emailHash}_{$purpose}", 'otp_send', $emailMax, $window);
        
        $maxWait = max($ipWait, $emailWait);
        if ($maxWait > 0) {
            throw new \RuntimeException('OTP_RATE_LIMITED:' . $maxWait);
        }

        $pdo = Database::getConnection();
        $instance = new self($pdo);
        $code = $instance->generate($email, $purpose);

        $template = NotificationTemplateModel::findByEventKey($eventKey);
        if (!$template) {
            throw new \RuntimeException("Missing notification template for event: $eventKey");
        }

        $vars = array_merge([
            'otp_code'       => $code,
            'expiry_minutes' => (int) SystemSettings::get('otp_expiry_minutes', '15'),
        ], $extraVars);

        $subject = NotificationService::render($template['subject_template'], $vars);
        $body    = NotificationService::render($template['body_template'], $vars);

        try {
            $sent = MailService::sendNow($email, $subject, $body);
            if (!$sent) {
                throw new \RuntimeException('OTP_EMAIL_DELIVERY_FAILED');
            }
        } catch (\Throwable $e) {
            $identifierHash = EncryptionService::hash(strtolower(trim($email)));
            $deleteStmt = $pdo->prepare('DELETE FROM otp_verifications WHERE identifier_hash = ? AND purpose = ?');
            $deleteStmt->execute([$identifierHash, $purpose]);
            throw $e;
        }

        return $code;
    }
}
