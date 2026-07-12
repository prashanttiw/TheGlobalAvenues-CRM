<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\DisabledEndpointResponder;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Services\EncryptionService;
use TGA\CRM\Services\ImageProcessor;

final class AdminController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function create(): void
    {
        DisabledEndpointResponder::legacyStub(
            'admin.create',
            'Legacy admin stub controller is not part of the active route map.',
            ['replacement' => 'Use RegistrationController and RoleController admin APIs.']
        );
    }

    public function update(): void
    {
        DisabledEndpointResponder::legacyStub(
            'admin.update',
            'Legacy admin stub controller is not part of the active route map.',
            ['replacement' => 'Use RegistrationController and RoleController admin APIs.']
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OWN PROFILE  GET /admin/profile
    // ─────────────────────────────────────────────────────────────────────────

    public function getProfile(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();

        $stmt = $this->pdo->prepare(
            "SELECT a.public_id, a.full_name, a.is_super_admin, a.created_at,
                    u.email, u.phone, u.avatar_type, u.avatar_value, u.two_factor_enabled
             FROM admins a
             JOIN users u ON u.id = a.user_id
             WHERE a.user_id = ?"
        );
        $stmt->execute([$user['id']]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$admin) {
            Response::error('Admin profile not found.', 'NOT_FOUND', 404);
        }

        $avatarUrls = ImageProcessor::resolveAvatarUrls($admin['avatar_type'] ?? null, $admin['avatar_value'] ?? null);

        Response::json([
            'data' => [
                'public_id' => $admin['public_id'],
                'full_name' => $admin['full_name'],
                'email' => $this->decryptMaybe($admin['email'] ?? null),
                'phone' => $this->decryptMaybe($admin['phone'] ?? null),
                'role_name' => (int) $admin['is_super_admin'] === 1 ? 'Super Admin' : 'Admin',
                'is_super_admin' => (int) $admin['is_super_admin'] === 1,
                'two_factor_enabled' => (bool) $admin['two_factor_enabled'],
                'created_at' => $admin['created_at'],
                'avatar_url' => $avatarUrls['avatar_url'],
                'avatar_thumb_url' => $avatarUrls['avatar_thumb_url'],
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE PROFILE  PUT /admin/profile
    // Editable: full_name only (email/phone changes require OTP — same deferred
    // pattern as AgentController::updateProfile). Avatar has its own endpoints.
    // ─────────────────────────────────────────────────────────────────────────

    public function updateProfile(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $fullName = trim((string) ($input['full_name'] ?? ''));
        if (strlen($fullName) < 2 || strlen($fullName) > 255) {
            Response::error('Full name must be 2–255 characters.', 'VALIDATION_ERROR', 422);
        }

        $beforeStmt = $this->pdo->prepare('SELECT full_name FROM admins WHERE user_id = ?');
        $beforeStmt->execute([$user['id']]);
        $previousName = $beforeStmt->fetchColumn();

        if ($previousName === false) {
            Response::error('Admin profile not found.', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare('UPDATE admins SET full_name = ?, updated_at = NOW() WHERE user_id = ?');
        $stmt->execute([$fullName, $user['id']]);

        if ($previousName !== $fullName) {
            \TGA\CRM\Services\ActivityLogger::log(
                'admin.profile_updated',
                'user',
                (int) $user['id'],
                (int) $user['id'],
                ['full_name' => $previousName],
                ['full_name' => $fullName]
            );
        }

        Response::json(['data' => ['message' => 'Profile updated successfully.']]);
    }

    private function decryptMaybe(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        try {
            return EncryptionService::decrypt($value);
        } catch (\Throwable) {
            return null;
        }
    }
}
