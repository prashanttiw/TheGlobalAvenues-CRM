<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Services\EncryptionService;

class StudentController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    private function requireStudentUser(): array
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? $user['user_type'] ?? '') !== 'student') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        return $user;
    }

    private function getStudentId(int $userId): int
    {
        $stmt = $this->pdo->prepare("SELECT id FROM students WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$userId]);
        $studentId = $stmt->fetchColumn();

        if (!$studentId) {
            Response::error('Student profile not found', 'FORBIDDEN', 403);
        }

        return (int) $studentId;
    }

    private function decryptMaybe(mixed $value): ?string
    {
        if (!is_string($value) || $value === '') {
            return null;
        }

        try {
            return EncryptionService::decrypt($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function buildProfileResponse(array $row): array
    {
        $plainEmail = $this->decryptMaybe($row['email'] ?? null);
        $plainPhone = $this->decryptMaybe($row['user_phone'] ?? null);
        $plainProfilePhone = $this->decryptMaybe($row['phone_in_profile'] ?? null);
        $plainPassport = $this->decryptMaybe($row['passport_number'] ?? null);

        $fullName = trim((string) ($row['full_name'] ?? ''));
        $nameParts = $fullName === '' ? [] : (preg_split('/\s+/', $fullName, 2) ?: []);
        $firstName = $nameParts[0] ?? '';
        $lastName = $nameParts[1] ?? '';

        return [
            'public_id' => (string) ($row['public_id'] ?? ''),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'full_name' => $fullName,
            'email' => $plainEmail,
            'phone' => $plainPhone ?? $plainProfilePhone,
            'dob' => $row['date_of_birth'] ?: null,
            'nationality' => $row['nationality'] ?: null,
            'passport_number' => $plainPassport,
            'passport_expiry' => $row['passport_expiry'] ?: null,
            'lead_source' => $row['lead_source'] ?: null,
            'profile_status' => $row['profile_status'] ?: null,
            'status' => $row['status'] ?: null,
            'desired_country' => null,
            'desired_subject' => null,
            'desired_degree_level' => null,
            'budget_min' => null,
            'budget_max' => null,
            'budget_currency' => null,
            'career_goal' => null,
            'gamification_points' => 0,
            'profile_completion' => $this->calcProfileCompletion(
                $firstName,
                $plainEmail,
                $row['nationality'] ?? null,
                $row['date_of_birth'] ?? null,
                $plainPassport
            ),
        ];
    }

    private function fetchStudentProfileRow(int $studentId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT s.public_id, s.full_name, s.date_of_birth, s.nationality,
                   s.passport_number, s.passport_expiry, s.phone_in_profile,
                   s.lead_source, s.profile_status, s.created_at,
                   u.email, u.phone AS user_phone, u.status, u.user_type
            FROM students s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = ? AND s.deleted_at IS NULL
        ");
        $stmt->execute([$studentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Response::error('Student profile not found', 'NOT_FOUND', 404);
        }

        return $row;
    }

    public function listApplications(): void
    {
        $user = AuthMiddleware::user();
        $studentId = $this->getStudentId((int) $user['id']);

        $stmt = $this->pdo->prepare("
            SELECT a.public_id as id, a.public_id, a.reference_number, a.status, a.submitted_at, a.created_at,
                   i.public_id as intake_pid, i.name as intake_name, i.intake_month, i.intake_year,
                   c.name as program_name, c.degree_level as course_level,
                   u.name as university_name
            FROM applications a
            JOIN intakes i ON a.intake_id = i.id
            JOIN courses c ON i.course_id = c.id
            JOIN universities u ON c.university_id = u.id
            WHERE a.student_id = ? AND a.deleted_at IS NULL
            ORDER BY a.created_at DESC
        ");
        $stmt->execute([$studentId]);
        $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json(['applications' => $applications]);
    }

    public function getApplication(string $pid): void
    {
        $user = AuthMiddleware::user();
        $studentId = $this->getStudentId((int) $user['id']);

        $stmt = $this->pdo->prepare("
            SELECT a.id, a.public_id, a.reference_number, a.status, a.submitted_at, a.created_at, a.notes,
                   i.public_id as intake_pid, i.name as intake_name, i.intake_month, i.intake_year,
                   i.tuition_fee_amount, i.tuition_fee_currency,
                   c.name as program_name, c.degree_level as degree_level,
                   u.name as university_name
            FROM applications a
            JOIN intakes i ON a.intake_id = i.id
            JOIN courses c ON i.course_id = c.id
            JOIN universities u ON c.university_id = u.id
            WHERE a.public_id = ? AND a.student_id = ? AND a.deleted_at IS NULL
        ");
        $stmt->execute([$pid, $studentId]);
        $application = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$application) {
            Response::error('Application not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->pdo->prepare("
            SELECT au.public_id, au.direction, au.item_type, au.content, au.created_at,
                   f.public_id as file_public_id, f.display_filename as file_name
            FROM application_updates au
            LEFT JOIN files f ON au.file_id = f.id
            WHERE au.application_id = ?
            ORDER BY au.created_at DESC
        ");
        $stmt->execute([$application['id']]);
        $application['history'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $this->pdo->prepare("
            SELECT dr.public_id as id, dr.public_id, dr.doc_label as document_type, dr.status, dr.rejection_reason,
                   f.public_id as file_public_id, f.display_filename as file_name, f.mime_type, f.file_size
            FROM document_requests dr
            LEFT JOIN files f ON dr.submitted_file_id = f.id
            WHERE dr.application_id = ?
            ORDER BY dr.created_at DESC
        ");
        $stmt->execute([$application['id']]);
        $application['documents'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $this->pdo->prepare("
            SELECT dr.public_id, dr.doc_label, dr.description, dr.deadline, dr.status, dr.rejection_reason
            FROM document_requests dr
            WHERE dr.application_id = ?
            ORDER BY dr.created_at DESC
        ");
        $stmt->execute([$application['id']]);
        $application['document_requests'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $this->pdo->prepare("
            SELECT ap.public_id, ap.label, ap.amount, ap.currency, ap.payment_link, ap.due_date, ap.status
            FROM application_payments ap
            WHERE ap.application_id = ?
            ORDER BY ap.created_at DESC
        ");
        $stmt->execute([$application['id']]);
        $application['payments'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $application['id'] = $application['public_id'];

        Response::json(['application' => $application]);
    }

    public function getProfile(): void
    {
        $user = $this->requireStudentUser();
        $studentId = $this->getStudentId((int) $user['id']);
        $row = $this->fetchStudentProfileRow($studentId);

        Response::json([
            'profile' => $this->buildProfileResponse($row),
        ]);
    }

    public function updateProfile(): void
    {
        $user = $this->requireStudentUser();
        $userId = (int) $user['id'];
        $studentId = $this->getStudentId($userId);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $firstName = trim((string) ($input['first_name'] ?? ''));
        $lastName = trim((string) ($input['last_name'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $phone = trim((string) ($input['phone'] ?? ''));
        $dob = trim((string) ($input['dob'] ?? ''));
        $nationality = trim((string) ($input['nationality'] ?? ''));
        $passportNumber = trim((string) ($input['passport_number'] ?? ''));
        $passportExpiry = trim((string) ($input['passport_expiry'] ?? ''));

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('A valid email address is required.', 'VALIDATION_ERROR', 400);
        }

        foreach (['dob' => $dob, 'passport_expiry' => $passportExpiry] as $field => $value) {
            if ($value !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                Response::error("Invalid {$field} format.", 'VALIDATION_ERROR', 400);
            }
        }

        $emailHash = EncryptionService::hash($email);
        $emailConflictStmt = $this->pdo->prepare('SELECT COUNT(*) FROM users WHERE email_lookup_hash = ? AND id != ? AND deleted_at IS NULL');
        $emailConflictStmt->execute([$emailHash, $userId]);
        if ((int) $emailConflictStmt->fetchColumn() > 0) {
            Response::error('Email already registered by another account.', 'EMAIL_ALREADY_REGISTERED', 409);
        }

        $phoneHash = $phone !== '' ? EncryptionService::hash($phone) : null;
        if ($phoneHash !== null) {
            $phoneConflictStmt = $this->pdo->prepare('SELECT COUNT(*) FROM users WHERE phone_lookup_hash = ? AND id != ? AND deleted_at IS NULL');
            $phoneConflictStmt->execute([$phoneHash, $userId]);
            if ((int) $phoneConflictStmt->fetchColumn() > 0) {
                Response::error('Phone number already registered by another account.', 'PHONE_ALREADY_REGISTERED', 409);
            }
        }

        $fullName = trim($firstName . ' ' . $lastName);
        $encryptedEmail = EncryptionService::encrypt($email);
        $encryptedPhone = $phone !== '' ? EncryptionService::encrypt($phone) : null;
        $encryptedPassport = $passportNumber !== '' ? EncryptionService::encrypt($passportNumber) : null;

        try {
            $this->pdo->beginTransaction();

            $userStmt = $this->pdo->prepare('UPDATE users SET email = ?, email_lookup_hash = ?, phone = ?, phone_lookup_hash = ? WHERE id = ? AND deleted_at IS NULL');
            $userStmt->execute([$encryptedEmail, $emailHash, $encryptedPhone, $phoneHash, $userId]);

            $studentStmt = $this->pdo->prepare('UPDATE students SET full_name = ?, date_of_birth = ?, nationality = ?, passport_number = ?, passport_expiry = ?, phone_in_profile = ? WHERE id = ? AND deleted_at IS NULL');
            $studentStmt->execute([
                $fullName,
                $dob !== '' ? $dob : null,
                $nationality !== '' ? $nationality : null,
                $encryptedPassport,
                $passportExpiry !== '' ? $passportExpiry : null,
                $encryptedPhone,
                $studentId,
            ]);

            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }

        $row = $this->fetchStudentProfileRow($studentId);
        Response::json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'profile' => $this->buildProfileResponse($row),
        ]);
    }

    public function getDashboard(): void
    {
        $user = $this->requireStudentUser();
        $userId = (int) $user['id'];
        $studentId = $this->getStudentId($userId);

        $appStmt = $this->pdo->prepare('SELECT COUNT(*) FROM applications WHERE student_id = ? AND deleted_at IS NULL');
        $appStmt->execute([$studentId]);
        $applicationCount = (int) $appStmt->fetchColumn();

        $profileStmt = $this->pdo->prepare('SELECT full_name, nationality, date_of_birth, passport_number, phone_in_profile FROM students WHERE id = ? AND deleted_at IS NULL');
        $profileStmt->execute([$studentId]);
        $profileRow = $profileStmt->fetch(PDO::FETCH_ASSOC);

        $nameParts = $profileRow ? preg_split('/\s+/', trim((string) $profileRow['full_name']), 2) : [];
        $firstName = $nameParts[0] ?? '';

        $profileCompletion = $this->calcProfileCompletion(
            $firstName,
            null,
            $profileRow['nationality'] ?? null,
            $profileRow['date_of_birth'] ?? null,
            $profileRow['passport_number'] ?? null
        );
        $profileCompletion = min(100, $profileCompletion + 20);

        $notifStmt = $this->pdo->prepare("SELECT COUNT(*) FROM notifications WHERE recipient_user_id = ? AND FIND_IN_SET('in_app', channel) > 0 AND read_at IS NULL");
        $notifStmt->execute([$userId]);
        $unreadNotifications = (int) $notifStmt->fetchColumn();

        Response::json([
            'stats' => [
                'profileCompletion' => $profileCompletion,
                'applicationCount' => $applicationCount,
                'points' => 0,
                'unreadNotifications' => $unreadNotifications,
            ],
        ]);
    }

    private function calcProfileCompletion(?string $firstName, ?string $email, ?string $nationality, ?string $dob, ?string $passport): int
    {
        $filled = 0;
        if ($firstName !== null && $firstName !== '') $filled++;
        if ($email !== null && $email !== '') $filled++;
        if ($nationality !== null && $nationality !== '') $filled++;
        if ($dob !== null && $dob !== '') $filled++;
        if ($passport !== null && $passport !== '') $filled++;
        return (int) round(($filled / 5) * 100);
    }
}
