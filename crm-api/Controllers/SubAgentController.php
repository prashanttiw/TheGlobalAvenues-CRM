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

        $creatorStmt = $this->pdo->prepare("SELECT id, status, tier, root_agent_id, full_name FROM agents WHERE user_id = ? LIMIT 1");
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

        // Optional — same profile fields collected on the primary agent onboarding
        // form. Not required here yet since the sub-agent invite UI doesn't collect
        // them; the parent agent can fill these in later via the sub-agent's own
        // onboarding-style edit, same as a rejected primary agent re-editing.
        $firstName   = trim($input['first_name'] ?? '');
        $lastName    = trim($input['last_name'] ?? '');
        $addressLine = trim($input['address_line'] ?? '');
        $city        = trim($input['city'] ?? '');
        $state       = trim($input['state'] ?? '');
        $altMobile   = trim($input['alternate_mobile_number'] ?? '');

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

            // Insert User — `users` has no registered_by_type/registered_by_id columns
            // (that tracking only exists on `students`), so it isn't recorded here.
            $userStmt = $this->pdo->prepare(
                "INSERT INTO users (public_id, email, email_lookup_hash, phone, phone_lookup_hash, password_hash, user_type, status)
                 VALUES (?, ?, ?, ?, ?, ?, 'agent', 'pending')"
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
            ]);

            $userId = (int)$this->pdo->lastInsertId();

            $newTier = (int)$creator['tier'] + 1;

            // Insert Agent (Sub-agent) — created directly with status='pending' since
            // the parent agent fills the form in one sitting (like an admin creating
            // a sub-admin), no self-service draft step for the junior agent.
            $agentStmt = $this->pdo->prepare(
                "INSERT INTO agents (public_id, user_id, tier, parent_agent_id, root_agent_id, full_name, first_name, last_name, agency_name, country, address_line, city, state, mobile_number, alternate_mobile_number, business_reg_number, partnership_scope, referral_code, status, terms_accepted_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', NOW())"
            );
            $agentStmt->execute([
                $agentPublicId,
                $userId,
                $newTier,
                $creator['id'],
                $creator['root_agent_id'],
                $fullName,
                $firstName ?: null,
                $lastName ?: null,
                $agencyName,
                $country,
                $addressLine ?: null,
                $city ?: null,
                $state ?: null,
                $phone ? EncryptionService::encrypt($phone) : null,
                $altMobile ? EncryptionService::encrypt($altMobile) : null,
                $businessRegNumber ?: null,
                $partnershipScope ?: null
            ]);

            $newAgentId = (int) $this->pdo->lastInsertId();

            // Insert Preferences
            $prefStmt = $this->pdo->prepare('INSERT INTO user_preferences (user_id) VALUES (?)');
            $prefStmt->execute([$userId]);

            $this->pdo->commit();

            \TGA\CRM\Services\SecurityEventLogger::log('registration_completed', $userId, $emailHash, RateLimitMiddleware::getIpAddress());

            \TGA\CRM\Services\ActivityLogger::log('subagent.created', 'agent', $newAgentId, (int) $user['sub']);

            \TGA\CRM\Services\NotificationService::fire('subagent.created', [
                'parent_agent_name' => $creator['full_name'],
                'subagent_name'     => $fullName,
                'subagent_agency'   => $agencyName,
            ], [(int) $user['sub']]);

            // Welcome the new sub-agent account itself — 'subagent.created' above only
            // notifies the parent who created it.
            \TGA\CRM\Services\NotificationService::fire('agent.registered', [
                'full_name'  => $fullName,
                'portal_url' => \TGA\CRM\Config\Environment::get('APP_FRONTEND_URL', '') . '/portal/agent/',
            ], [$userId]);

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

    /**
     * Upload an onboarding document (profile_photo, aadhar_card, cv_resume) on
     * behalf of a sub-agent the caller just created. Only the DIRECT parent may
     * do this — not the wider subtree.
     */
    public function uploadDocument(string $pid): void
    {
        $user = AuthMiddleware::user();
        if ($user['utype'] !== 'agent') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $creatorStmt = $this->pdo->prepare("SELECT id FROM agents WHERE user_id = ? LIMIT 1");
        $creatorStmt->execute([$user['sub']]);
        $creatorId = $creatorStmt->fetchColumn();

        if (!$creatorId) {
            Response::error('Agent not found', 'NOT_FOUND', 404);
        }

        $targetStmt = $this->pdo->prepare(
            "SELECT id, public_id, status FROM agents
             WHERE public_id = ? AND parent_agent_id = ? AND deleted_at IS NULL"
        );
        $targetStmt->execute([$pid, $creatorId]);
        $target = $targetStmt->fetch(PDO::FETCH_ASSOC);

        if (!$target) {
            Response::error('Sub-agent not found in your direct team.', 'NOT_FOUND', 404);
        }

        if (!in_array($target['status'], ['pending', 'draft', 'rejected'], true)) {
            Response::error('Documents can only be uploaded while the sub-agent application is editable.', 'BAD_REQUEST', 400);
        }

        $docType = trim($_POST['document_type'] ?? '');
        $allowed = ['profile_photo', 'aadhar_card', 'cv_resume'];
        if (!in_array($docType, $allowed, true)) {
            Response::error('Invalid document_type. Allowed: ' . implode(', ', $allowed), 'VALIDATION_ERROR', 400);
        }

        if (empty($_FILES['file'])) {
            Response::error('No file uploaded', 'VALIDATION_ERROR', 400);
        }

        $targetId    = (int) $target['id'];
        $storagePath = "agents/{$target['public_id']}/onboarding";

        $uploadSvc = new \TGA\CRM\Services\FileUploadService();
        try {
            $fileRecord = $uploadSvc->upload(
                $this->pdo,
                $_FILES['file'],
                $docType,
                'agent',
                $targetId,
                'agent',
                (int) $creatorId,
                null,
                false,
                $storagePath
            );
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 'VALIDATION_ERROR', 422);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 'UPLOAD_FAILED', 500);
        }

        \TGA\CRM\Services\ActivityLogger::log('agent.onboarding_doc_uploaded', 'agent', $targetId, (int) $creatorId);

        Response::json([
            'success' => true,
            'message' => 'Document uploaded successfully',
            'data' => [
                'public_id'     => $fileRecord['public_id'],
                'document_type' => $docType,
                'filename'      => $fileRecord['display_filename'],
            ],
        ]);
    }
}
