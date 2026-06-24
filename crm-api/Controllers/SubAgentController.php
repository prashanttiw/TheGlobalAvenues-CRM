<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use Exception;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Services\EncryptionService;
use TGA\CRM\Services\PasswordValidator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RateLimitMiddleware;

final class SubAgentController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function invite(): void
    {
        $user = AuthMiddleware::user();
        if ($user['utype'] !== 'agent') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $creatorStmt = $this->pdo->prepare("SELECT id, status, tier, root_agent_id FROM agents WHERE user_id = ? LIMIT 1");
        $creatorStmt->execute([$user['sub']]);
        $creator = $creatorStmt->fetch(PDO::FETCH_ASSOC);

        if (!$creator) {
            Response::error('Agent not found', 'NOT_FOUND', 404);
        }

        if ($creator['status'] !== 'approved') {
            Response::error('Only approved agents can invite sub-agents', 'AGENT_NOT_APPROVED', 403);
        }

        if ((int)$creator['tier'] >= 3) {
            Response::error('Maximum depth is 3 levels', 'TIER_LIMIT_REACHED', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $agencyName = trim($input['agency_name'] ?? '');
        $country = trim($input['country'] ?? '');
        $partnershipScope = trim($input['partnership_scope'] ?? '');
        $fullName = trim($input['full_name'] ?? '');
        $email = trim($input['email'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $businessRegNumber = trim($input['business_registration_number'] ?? '');
        $password = $input['password'] ?? '';

        if (!$agencyName || !$country || !$fullName || !$email || !$password) {
            Response::error('Missing required fields', 'VALIDATION_ERROR', 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email format', 'VALIDATION_ERROR', 400);
        }

        $pwdValidation = PasswordValidator::validate($password);
        if (!$pwdValidation['valid']) {
            Response::error(implode(', ', $pwdValidation['errors']), 'VALIDATION_ERROR', 400);
        }

        $emailHash = EncryptionService::hash(strtolower($email));
        $checkStmt = $this->pdo->prepare('SELECT COUNT(*) FROM users WHERE email_lookup_hash = ? AND deleted_at IS NULL');
        $checkStmt->execute([$emailHash]);
        if ((int)$checkStmt->fetchColumn() > 0) {
            Response::error('Email already registered', 'EMAIL_ALREADY_REGISTERED', 409);
        }

        try {
            $this->pdo->beginTransaction();

            $userPublicId = UlidGenerator::generate();
            $agentPublicId = UlidGenerator::generate();

            $encryptedEmail = EncryptionService::encrypt(strtolower($email));
            $phoneHash = $phone ? EncryptionService::hash($phone) : null;
            $encryptedPhone = $phone ? EncryptionService::encrypt($phone) : null;

            // Insert User
            $userStmt = $this->pdo->prepare(
                "INSERT INTO users (public_id, email, email_lookup_hash, phone, phone_lookup_hash, password_hash, user_type, status, registered_by_type, registered_by_id)
                 VALUES (?, ?, ?, ?, ?, ?, 'agent', 'pending', 'agent', ?)"
            );
            $userStmt->execute([
                $userPublicId,
                $encryptedEmail,
                $emailHash,
                $encryptedPhone,
                $phoneHash,
                password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_MEMORY_COST', '19456'),
            'time_cost' => (int) \TGA\CRM\Config\Environment::get('ARGON2_TIME_COST', '2'),
            'threads' => 1,
        ]),
                $user['sub']
            ]);

            $userId = (int)$this->pdo->lastInsertId();

            $newTier = (int)$creator['tier'] + 1;

            // Insert Agent (Sub-agent)
            $agentStmt = $this->pdo->prepare(
                "INSERT INTO agents (public_id, user_id, tier, parent_agent_id, root_agent_id, full_name, agency_name, country, business_reg_number, partnership_scope, referral_code, status, terms_accepted_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', NOW())"
            );
            $agentStmt->execute([
                $agentPublicId,
                $userId,
                $newTier,
                $creator['id'],
                $creator['root_agent_id'],
                $fullName,
                $agencyName,
                $country,
                $businessRegNumber ?: null,
                $partnershipScope ?: null
            ]);

            // Insert Preferences
            $prefStmt = $this->pdo->prepare('INSERT INTO user_preferences (user_id) VALUES (?)');
            $prefStmt->execute([$userId]);

            $this->pdo->commit();

            $ip = RateLimitMiddleware::getIpAddress();
            $this->pdo->prepare("INSERT INTO security_events (event_type, identifier, ip_address, created_at) VALUES ('registration_completed', ?, ?, NOW())")->execute([$emailHash, $ip]);

            // Phase 6 notification service will handle `subagent.created`

            Response::json([
                'success' => true,
                'status' => 'pending',
                'message' => 'Sub-agent invited successfully. Awaiting admin approval.',
                'subagent' => [
                    'id' => $agentPublicId,
                    'tier' => $newTier
                ]
            ], 201);

        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
