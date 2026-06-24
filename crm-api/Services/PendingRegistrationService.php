<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;

final class PendingRegistrationService
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function store(string $regType, string $email, array $data): string
    {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $emailHash = EncryptionService::hash(strtolower(trim($email)));
        $encryptedData = EncryptionService::encrypt(json_encode($data));

        $stmt = $this->pdo->prepare(
            'INSERT INTO pending_registrations (token_hash, email_hash, reg_type, encrypted_data, expires_at)
             VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))'
        );
        $stmt->execute([$tokenHash, $emailHash, $regType, $encryptedData]);

        return $token;
    }

    public function retrieve(string $token): ?array
    {
        $tokenHash = hash('sha256', $token);

        $stmt = $this->pdo->prepare(
            'SELECT encrypted_data FROM pending_registrations
             WHERE token_hash = ? AND expires_at > NOW()'
        );
        $stmt->execute([$tokenHash]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $json = EncryptionService::decrypt((string) $row['encrypted_data']);
        return json_decode($json, true);
    }

    public function consume(string $token): ?array
    {
        $tokenHash = hash('sha256', $token);
        $startedTransaction = false;

        if (!$this->pdo->inTransaction()) {
            $this->pdo->beginTransaction();
            $startedTransaction = true;
        }

        try {
            $stmt = $this->pdo->prepare(
                'SELECT id, encrypted_data FROM pending_registrations
                 WHERE token_hash = ? AND expires_at > NOW() FOR UPDATE'
            );
            $stmt->execute([$tokenHash]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                if ($startedTransaction && $this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }
                return null;
            }

            $json = EncryptionService::decrypt((string) $row['encrypted_data']);
            $data = json_decode($json, true);

            $delStmt = $this->pdo->prepare('DELETE FROM pending_registrations WHERE id = ?');
            $delStmt->execute([(int) $row['id']]);

            if ($startedTransaction && $this->pdo->inTransaction()) {
                $this->pdo->commit();
            }

            return $data;
        } catch (\Throwable $e) {
            if ($startedTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function cleanup(): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM pending_registrations WHERE expires_at < NOW()');
        $stmt->execute();
    }
}
