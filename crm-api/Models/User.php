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
        $name = $this->resolveProfileName((int) $user['id'], (string) $user['role'], (string) $user['email']);

        return [
            'id' => (int) $user['id'],
            'email' => $user['email'],
            'phone' => $user['phone'],
            'role' => $user['role'],
            'status' => $user['status'],
            'emailVerified' => (bool) $user['email_verified'],
            'phoneVerified' => (bool) $user['phone_verified'],
            'firstName' => $name['first_name'],
            'lastName' => $name['last_name'],
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

    private function resolveProfileName(int $userId, string $role, string $email): array
    {
        if ($role === 'student') {
            $statement = $this->connection->prepare(
                'SELECT first_name, last_name FROM student_profiles WHERE user_id = :user_id LIMIT 1'
            );
            $statement->execute(['user_id' => $userId]);
            $profile = $statement->fetch(PDO::FETCH_ASSOC);

            if ($profile !== false) {
                return [
                    'first_name' => (string) ($profile['first_name'] ?? 'Student'),
                    'last_name' => (string) ($profile['last_name'] ?? 'User'),
                ];
            }
        }

        if ($role === 'agent') {
            $statement = $this->connection->prepare(
                'SELECT agency_name FROM agents WHERE user_id = :user_id LIMIT 1'
            );
            $statement->execute(['user_id' => $userId]);
            $agencyName = $statement->fetchColumn();

            if (is_string($agencyName) && $agencyName !== '') {
                return [
                    'first_name' => $agencyName,
                    'last_name' => 'Team',
                ];
            }
        }

        if ($role === 'sub_agent') {
            $statement = $this->connection->prepare(
                'SELECT display_name FROM sub_agents WHERE user_id = :user_id LIMIT 1'
            );
            $statement->execute(['user_id' => $userId]);
            $displayName = $statement->fetchColumn();

            if (is_string($displayName) && $displayName !== '') {
                $parts = preg_split('/\s+/', trim($displayName)) ?: [];

                return [
                    'first_name' => $parts[0] ?? 'Sub',
                    'last_name' => count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : 'Agent',
                ];
            }
        }

        $localPart = explode('@', $email)[0] ?? 'User';
        $clean = preg_replace('/[^a-zA-Z0-9]+/', ' ', $localPart) ?? 'User';
        $parts = preg_split('/\s+/', trim($clean)) ?: [];

        return [
            'first_name' => ucfirst(strtolower($parts[0] ?? 'User')),
            'last_name' => ucfirst(strtolower($parts[1] ?? 'Account')),
        ];
    }
}
