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

    private function getStudentId(int $userId): int
    {
        $stmt = $this->pdo->prepare("SELECT id FROM students WHERE user_id = ? AND deleted_at IS NULL");
        $stmt->execute([$userId]);
        $studentId = $stmt->fetchColumn();

        if (!$studentId) {
            Response::error('Student profile not found', 'FORBIDDEN', 403);
        }

        return (int)$studentId;
    }

    public function listApplications(): void
    {
        $user = AuthMiddleware::user();
        $studentId = $this->getStudentId($user['id']);

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
        $studentId = $this->getStudentId($user['id']);

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
        $timeline = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $application['history'] = $timeline;

        // Populate documents checklist (left-joining requests with uploaded files)
        $stmt = $this->pdo->prepare("
            SELECT dr.public_id as id, dr.public_id, dr.doc_label as document_type, dr.status, dr.rejection_reason,
                   f.public_id as file_public_id, f.display_filename as file_name, f.mime_type, f.file_size
            FROM document_requests dr
            LEFT JOIN files f ON dr.submitted_file_id = f.id
            WHERE dr.application_id = ?
            ORDER BY dr.created_at DESC
        ");
        $stmt->execute([$application['id']]);
        $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $application['documents'] = $documents;

        // Still return document_requests as a fallback
        $stmt = $this->pdo->prepare("
            SELECT dr.public_id, dr.doc_label, dr.description, dr.deadline, dr.status, dr.rejection_reason
            FROM document_requests dr
            WHERE dr.application_id = ?
            ORDER BY dr.created_at DESC
        ");
        $stmt->execute([$application['id']]);
        $documentRequests = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $application['document_requests'] = $documentRequests;

        $stmt = $this->pdo->prepare("
            SELECT ap.public_id, ap.label, ap.amount, ap.currency, ap.payment_link, ap.due_date, ap.status
            FROM application_payments ap
            WHERE ap.application_id = ?
            ORDER BY ap.created_at DESC
        ");
        $stmt->execute([$application['id']]);
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $application['payments'] = $payments;

        $application['id'] = $application['public_id'];

        Response::json(['application' => $application]);
    }

    public function getProfile(): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? $user['user_type'] ?? '') !== 'student') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $userId  = (int) $user['id'];
        $studentId = $this->getStudentId($userId);

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

        // Decrypt PII fields safely
        $decryptMaybe = static function (mixed $val): ?string {
            if (!is_string($val) || $val === '') {
                return null;
            }
            try {
                return EncryptionService::decrypt($val);
            } catch (\Throwable) {
                return null;
            }
        };

        $plainEmail   = $decryptMaybe($row['email']);
        $plainPhone   = $decryptMaybe($row['user_phone'] ?? null);
        $plainProfile = $decryptMaybe($row['phone_in_profile'] ?? null);
        $plainPassport = $decryptMaybe($row['passport_number'] ?? null);

        $fullName  = (string) ($row['full_name'] ?? '');
        $nameParts = preg_split('/\s+/', trim($fullName), 2) ?: [];
        $firstName = $nameParts[0] ?? '';
        $lastName  = $nameParts[1] ?? '';

        Response::json([
            'profile' => [
                'public_id'          => $row['public_id'],
                'first_name'         => $firstName,
                'last_name'          => $lastName,
                'full_name'          => $fullName,
                'email'              => $plainEmail,
                'phone'              => $plainPhone ?? $plainProfile,
                'dob'                => $row['date_of_birth'],
                'nationality'        => $row['nationality'],
                'passport_number'    => $plainPassport,
                'passport_expiry'    => $row['passport_expiry'],
                'lead_source'        => $row['lead_source'],
                'profile_status'     => $row['profile_status'],
                'status'             => $row['status'],
                // Preference fields live in a separate service — returning null until Phase 3 profile service
                'desired_country'    => null,
                'desired_subject'    => null,
                'desired_degree_level' => null,
                'budget_min'         => null,
                'budget_max'         => null,
                'budget_currency'    => null,
                'career_goal'        => null,
                'gamification_points' => 0,
                'profile_completion' => $this->calcProfileCompletion($firstName, $plainEmail, $row['nationality'], $row['date_of_birth'], $plainPassport),
            ],
        ]);
    }

    public function getDashboard(): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? $user['user_type'] ?? '') !== 'student') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $userId    = (int) $user['id'];
        $studentId = $this->getStudentId($userId);

        // Application count
        $appStmt = $this->pdo->prepare(
            'SELECT COUNT(*) FROM applications WHERE student_id = ? AND deleted_at IS NULL'
        );
        $appStmt->execute([$studentId]);
        $applicationCount = (int) $appStmt->fetchColumn();

        // Profile completion
        $profileStmt = $this->pdo->prepare(
            'SELECT full_name, nationality, date_of_birth, passport_number, phone_in_profile FROM students WHERE id = ? AND deleted_at IS NULL'
        );
        $profileStmt->execute([$studentId]);
        $profileRow = $profileStmt->fetch(PDO::FETCH_ASSOC);

        $nameParts = $profileRow ? preg_split('/\s+/', trim((string)$profileRow['full_name']), 2) : [];
        $firstName = $nameParts[0] ?? '';

        $profileCompletion = $this->calcProfileCompletion(
            $firstName,
            null, // email always exists on users table — count it as present
            $profileRow['nationality'] ?? null,
            $profileRow['date_of_birth'] ?? null,
            $profileRow['passport_number'] ?? null
        );
        // Bump base to account for email always being present
        $profileCompletion = min(100, $profileCompletion + 20);

        // Query actual unread notifications count
        $notifStmt = $this->pdo->prepare(
            "SELECT COUNT(*) FROM notifications 
             WHERE recipient_user_id = ? 
               AND FIND_IN_SET('in_app', channel) > 0 
               AND read_at IS NULL"
        );
        $notifStmt->execute([$userId]);
        $unreadNotifications = (int) $notifStmt->fetchColumn();

        Response::json([
            'stats' => [
                'profileCompletion'    => $profileCompletion,
                'applicationCount'     => $applicationCount,
                'points'               => 0,  // Phase 6: gamification engine
                'unreadNotifications'  => $unreadNotifications,
            ],
        ]);
    }

    /**
     * Calculate a simple profile completion percentage based on known fields.
     * Base: 20 points per present field across 5 key fields.
     */
    private function calcProfileCompletion(
        ?string $firstName,
        ?string $email,
        ?string $nationality,
        ?string $dob,
        ?string $passport
    ): int {
        $filled = 0;
        if ($firstName !== null && $firstName !== '') $filled++;
        if ($email    !== null && $email !== '')    $filled++;
        if ($nationality !== null && $nationality !== '') $filled++;
        if ($dob !== null && $dob !== '') $filled++;
        if ($passport !== null && $passport !== '') $filled++;
        return (int) round(($filled / 5) * 100);
    }
}
