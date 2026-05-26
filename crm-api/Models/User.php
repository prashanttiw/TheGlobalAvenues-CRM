<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;
use TGA\CRM\Services\JWTService;

final class User extends BaseModel
{
    public function findByEmail(string $email): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT * FROM users WHERE email = :email AND deleted_at IS NULL LIMIT 1'
        );
        $statement->execute(['email' => strtolower($email)]);
        $user = $statement->fetch(PDO::FETCH_ASSOC);

        return $user === false ? null : $user;
    }

    public function findById(int $id): ?array
    {
        $statement = $this->connection->prepare('SELECT * FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $statement->execute(['id' => $id]);
        $user = $statement->fetch(PDO::FETCH_ASSOC);

        return $user === false ? null : $user;
    }

    public function createUser(array $data): int
    {
        $statement = $this->connection->prepare(
            'INSERT INTO users (email, phone, password_hash, role, oauth_provider, status)
             VALUES (:email, :phone, :password_hash, :role, :oauth_provider, :status)'
        );
        $statement->execute([
            'email' => strtolower((string) $data['email']),
            'phone' => $data['phone'] ?? null,
            'password_hash' => $data['password_hash'],
            'role' => $data['role'],
            'oauth_provider' => 'local',
            'status' => $data['status'] ?? 'pending',
        ]);

        return (int) $this->connection->lastInsertId();
    }

    public function createStudentProfile(int $userId, array $data): void
    {
        $statement = $this->connection->prepare(
            'INSERT INTO student_profiles (user_id, first_name, last_name)
             VALUES (:user_id, :first_name, :last_name)'
        );
        $statement->execute([
            'user_id' => $userId,
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
        ]);
    }

    public function createAgentProfile(int $userId, array $data): void
    {
        $statement = $this->connection->prepare(
            'INSERT INTO agents (user_id, agency_name, agency_country)
             VALUES (:user_id, :agency_name, :agency_country)'
        );
        $statement->execute([
            'user_id' => $userId,
            'agency_name' => $data['agency_name'],
            'agency_country' => $data['agency_country'],
        ]);
    }

    public function updateLastLogin(int $userId, string $ipAddress): void
    {
        $statement = $this->connection->prepare(
            'UPDATE users SET last_login = UTC_TIMESTAMP(), last_ip = :last_ip WHERE id = :id'
        );
        $statement->execute([
            'last_ip' => $ipAddress,
            'id' => $userId,
        ]);
    }

    public function buildProfileSummary(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'role' => $user['role'],
            'status' => $user['status'],
            'emailVerified' => (bool) $user['email_verified'],
            'phoneVerified' => (bool) $user['phone_verified'],
        ];
    }

    public function storeRefreshToken(int $userId, string $token, string $expiresAt): void
    {
        $statement = $this->connection->prepare(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES (:user_id, :token_hash, :expires_at)'
        );
        $statement->execute([
            'user_id' => $userId,
            'token_hash' => hash('sha256', $token),
            'expires_at' => $expiresAt,
        ]);
    }

    public function rotateRefreshToken(string $refreshToken): ?array
    {
        $payload = JWTService::verifyRefreshToken($refreshToken);

        if ($payload === false) {
            return null;
        }

        $statement = $this->connection->prepare(
            'SELECT * FROM refresh_tokens
             WHERE token_hash = :token_hash AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP()
             LIMIT 1'
        );
        $statement->execute([
            'token_hash' => hash('sha256', $refreshToken),
        ]);

        $storedToken = $statement->fetch(PDO::FETCH_ASSOC);

        if ($storedToken === false) {
            return null;
        }

        $user = $this->findById((int) $payload['sub']);

        if ($user === null) {
            return null;
        }

        $this->revokeRefreshToken($refreshToken);
        $newPair = JWTService::issueTokenPair((int) $user['id'], (string) $user['role']);
        $this->storeRefreshToken((int) $user['id'], $newPair['refresh_token'], $newPair['refresh_expires_at']);

        return $newPair;
    }

    public function revokeRefreshToken(string $refreshToken): void
    {
        $statement = $this->connection->prepare(
            'UPDATE refresh_tokens
             SET revoked_at = UTC_TIMESTAMP()
             WHERE token_hash = :token_hash AND revoked_at IS NULL'
        );
        $statement->execute([
            'token_hash' => hash('sha256', $refreshToken),
        ]);
    }
}
