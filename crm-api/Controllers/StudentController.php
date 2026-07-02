<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Config\Environment;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\AgentAccessService;
use TGA\CRM\Services\EncryptionService;
use TGA\CRM\Services\FileUploadService;
use TGA\CRM\Services\NotificationService;
use TGA\CRM\Services\PasswordValidator;
use TGA\CRM\Services\StateManager;
use TGA\CRM\Helpers\UlidGenerator;
use Exception;

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
                   a.preference_rank,
                   i.public_id as intake_pid, i.name as intake_name, i.intake_month, i.intake_year,
                   c.name as program_name, c.degree_level as course_level,
                   u.name as university_name
            FROM applications a
            JOIN intakes i ON a.intake_id = i.id
            JOIN courses c ON i.course_id = c.id
            JOIN universities u ON c.university_id = u.id
            WHERE a.student_id = ? AND a.deleted_at IS NULL
            ORDER BY (a.preference_rank IS NULL), a.preference_rank ASC, a.created_at DESC
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
                   f.public_id as file_public_id, f.display_filename as file_name, f.mime_type, f.file_size_bytes as file_size
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

    // ── Application readiness (profile + document intake gate) ─────────────

    private const DOCUMENT_CATEGORY_MAP = [
        'photo' => 'photograph',
        'passport_front' => 'passport',
        'passport_back' => 'passport',
        'academic_marksheet' => 'academic_marksheet',
        'transcript' => 'academic_transcript',
        'cv' => 'cv_resume',
        'sop' => 'sop',
        'lor' => 'lor',
        'noi' => 'noi',
        'proficiency' => 'english_test_result',
        'phd_thesis' => 'phd_thesis',
        'phd_lor_professional' => 'lor',
        'other' => 'other',
    ];

    private const REQUIRED_READINESS_CATEGORIES = ['photo', 'passport_front', 'passport_back', 'academic_marksheet', 'transcript'];
    private const PHD_REQUIRED_READINESS_CATEGORIES = ['phd_thesis', 'phd_lor_professional'];

    public function getReadiness(): void
    {
        $user = $this->requireStudentUser();
        $studentId = $this->getStudentId((int) $user['id']);

        Response::json(['readiness' => $this->buildReadinessSnapshot($studentId)]);
    }

    public function buildReadinessSnapshotForAdmin(int $studentId): array
    {
        return $this->buildReadinessSnapshot($studentId);
    }

    private function buildReadinessSnapshot(int $studentId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT gender, alternate_mobile, how_heard_about_us, planning_phd, agent_id, profile_status
            FROM students WHERE id = ? AND deleted_at IS NULL
        ");
        $stmt->execute([$studentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $agent = null;
        if (!empty($row['agent_id'])) {
            $agentStmt = $this->pdo->prepare("SELECT public_id, full_name, agency_name FROM agents WHERE id = ? AND deleted_at IS NULL");
            $agentStmt->execute([$row['agent_id']]);
            $agent = $agentStmt->fetch(PDO::FETCH_ASSOC) ?: null;
        }

        $docStmt = $this->pdo->prepare("
            SELECT sd.category, sd.updated_at, f.public_id AS file_public_id, f.display_filename
            FROM student_documents sd
            JOIN files f ON f.id = sd.file_id
            WHERE sd.student_id = ? AND sd.deleted_at IS NULL
        ");
        $docStmt->execute([$studentId]);
        $documents = $docStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'gender' => $row['gender'],
            'alternate_mobile' => $this->decryptMaybe($row['alternate_mobile']),
            'how_heard_about_us' => $row['how_heard_about_us'],
            'planning_phd' => (bool) $row['planning_phd'],
            'agent' => $agent,
            'profile_status' => $row['profile_status'],
            'documents' => $documents,
            'required_categories' => self::REQUIRED_READINESS_CATEGORIES,
            'phd_required_categories' => self::PHD_REQUIRED_READINESS_CATEGORIES,
        ];
    }

    public function saveReadinessDraft(): void
    {
        $user = $this->requireStudentUser();
        $studentId = $this->getStudentId((int) $user['id']);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $this->saveReadinessDraftFor($studentId, $input);

        Response::json(['success' => true, 'message' => 'Draft saved.']);
    }

    /**
     * Shared by the student's own saveReadinessDraft() and the agent-facing
     * agentSaveReadinessDraft() — takes an explicit student id instead of always
     * resolving it from the JWT, mirroring the buildReadinessSnapshotForAdmin() pattern.
     */
    private function saveReadinessDraftFor(int $studentId, array $input): void
    {
        $gender = trim((string) ($input['gender'] ?? ''));
        $altMobile = trim((string) ($input['alternate_mobile'] ?? ''));
        $howHeard = trim((string) ($input['how_heard_about_us'] ?? ''));
        $planningPhd = !empty($input['planning_phd']) ? 1 : 0;
        $agentPid = trim((string) ($input['agent_public_id'] ?? ''));

        $lockStmt = $this->pdo->prepare("SELECT agent_lock_status, profile_status FROM students WHERE id = ?");
        $lockStmt->execute([$studentId]);
        $current = $lockStmt->fetch(PDO::FETCH_ASSOC);

        $agentId = null;
        if ($agentPid !== '') {
            if ($current['agent_lock_status'] === 'locked') {
                Response::error('Your agent assignment is locked and cannot be changed.', 'FORBIDDEN', 403);
            }
            $agentStmt = $this->pdo->prepare("SELECT id FROM agents WHERE public_id = ? AND status = 'approved' AND deleted_at IS NULL");
            $agentStmt->execute([$agentPid]);
            $agentId = $agentStmt->fetchColumn();
            if (!$agentId) {
                Response::error('Selected agent was not found.', 'NOT_FOUND', 404);
            }
        }

        $encryptedAltMobile = $altMobile !== '' ? EncryptionService::encrypt($altMobile) : null;

        $sql = "UPDATE students SET gender = ?, alternate_mobile = ?, how_heard_about_us = ?, planning_phd = ?";
        $params = [$gender !== '' ? $gender : null, $encryptedAltMobile, $howHeard !== '' ? $howHeard : null, $planningPhd];

        if ($agentId) {
            $sql .= ", agent_id = ?";
            $params[] = $agentId;
        }

        if (in_array($current['profile_status'], ['registered', 'profile_complete'], true)) {
            $sql .= ", profile_status = 'documents_draft'";
        }

        $sql .= " WHERE id = ?";
        $params[] = $studentId;

        $this->pdo->prepare($sql)->execute($params);
    }

    public function uploadReadinessDocument(): void
    {
        $user = $this->requireStudentUser();
        $studentId = $this->getStudentId((int) $user['id']);
        $category = trim((string) ($_POST['category'] ?? ''));

        $document = $this->uploadReadinessDocumentFor($studentId, 'student', (int) $user['id'], $category, $_FILES['file'] ?? []);

        Response::json(['success' => true, 'document' => $document], 201);
    }

    /**
     * Shared by the student's own uploadReadinessDocument() and the agent-facing
     * agentUploadReadinessDocument(). $file is a $_FILES['file']-shaped array.
     */
    private function uploadReadinessDocumentFor(int $studentId, string $actingUserType, int $actingUserId, string $category, array $file): array
    {
        if (!isset(self::DOCUMENT_CATEGORY_MAP[$category])) {
            Response::error('Unknown document category.', 'VALIDATION_ERROR', 400);
        }

        if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
            Response::error('No file uploaded or upload error', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare("SELECT public_id FROM students WHERE id = ?");
        $stmt->execute([$studentId]);
        $studentPid = $stmt->fetchColumn();

        $existingStmt = $this->pdo->prepare("SELECT id, file_id FROM student_documents WHERE student_id = ? AND category = ? AND deleted_at IS NULL");
        $existingStmt->execute([$studentId, $category]);
        $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);

        try {
            $this->pdo->beginTransaction();

            $versionNumber = 1;
            $prevFileId = $existing['file_id'] ?? null;
            if ($prevFileId) {
                $verStmt = $this->pdo->prepare("SELECT version_number FROM files WHERE id = ?");
                $verStmt->execute([$prevFileId]);
                $prevVersion = $verStmt->fetchColumn();
                $versionNumber = $prevVersion ? (int) $prevVersion + 1 : 2;
                $this->pdo->prepare("UPDATE files SET superseded_at = NOW() WHERE id = ?")->execute([$prevFileId]);
            }

            $fileService = new FileUploadService();
            $uploadResult = $fileService->upload(
                $this->pdo,
                $file,
                self::DOCUMENT_CATEGORY_MAP[$category],
                'student',
                $studentId,
                $actingUserType,
                $actingUserId,
                null,
                false,
                "students/{$studentPid}/documents",
                $versionNumber,
                $prevFileId ? (int) $prevFileId : null
            );

            $fileIdStmt = $this->pdo->prepare("SELECT id FROM files WHERE public_id = ?");
            $fileIdStmt->execute([$uploadResult['public_id']]);
            $fileId = (int) $fileIdStmt->fetchColumn();

            if ($existing) {
                $this->pdo->prepare("UPDATE student_documents SET file_id = ? WHERE id = ?")->execute([$fileId, $existing['id']]);
            } else {
                $pid = UlidGenerator::generate();
                $this->pdo->prepare("INSERT INTO student_documents (public_id, student_id, category, file_id) VALUES (?, ?, ?, ?)")
                    ->execute([$pid, $studentId, $category, $fileId]);
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }

        return [
            'category' => $category,
            'file_public_id' => $uploadResult['public_id'],
            'display_filename' => $uploadResult['display_filename'],
        ];
    }

    public function submitReadiness(): void
    {
        $user = $this->requireStudentUser();
        $studentId = $this->getStudentId((int) $user['id']);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $applicationPid = trim((string) ($input['application_pid'] ?? ''));

        $this->submitReadinessFor($studentId, 'student', (int) $user['id'], $applicationPid !== '' ? $applicationPid : null);

        Response::json(['success' => true, 'message' => 'Profile submitted. You can now apply to programs.']);
    }

    /**
     * Shared by the student's own submitReadiness() and the agent-facing
     * agentSubmitReadiness(). When $applicationPid is given and resolves to a draft
     * application owned by this student, that application is auto-submitted right after
     * the profile flips to documents_submitted — unifying "finish my profile → my pending
     * application submits" for both the self-service and agent-assisted apply flows.
     */
    private function submitReadinessFor(int $studentId, string $actingUserType, int $actingUserId, ?string $applicationPid): void
    {
        $stmt = $this->pdo->prepare("SELECT planning_phd FROM students WHERE id = ?");
        $stmt->execute([$studentId]);
        $planningPhd = (bool) $stmt->fetchColumn();

        $docStmt = $this->pdo->prepare("SELECT category FROM student_documents WHERE student_id = ? AND deleted_at IS NULL");
        $docStmt->execute([$studentId]);
        $uploaded = $docStmt->fetchAll(PDO::FETCH_COLUMN);

        $required = self::REQUIRED_READINESS_CATEGORIES;
        if ($planningPhd) {
            $required = array_merge($required, self::PHD_REQUIRED_READINESS_CATEGORIES);
        }

        $missing = array_values(array_diff($required, $uploaded));
        if (!empty($missing)) {
            Response::error('Please upload all required documents before submitting.', 'VALIDATION_ERROR', 400, ['missing' => $missing]);
        }

        $this->pdo->prepare("UPDATE students SET profile_status = 'documents_submitted' WHERE id = ?")->execute([$studentId]);

        ActivityLogger::log('student.readiness_submitted', 'student', $studentId, $actingUserId);

        if ($applicationPid !== null) {
            $appStmt = $this->pdo->prepare("SELECT id, status FROM applications WHERE public_id = ? AND student_id = ? AND deleted_at IS NULL");
            $appStmt->execute([$applicationPid, $studentId]);
            $application = $appStmt->fetch(PDO::FETCH_ASSOC);

            if ($application && $application['status'] === 'draft') {
                try {
                    StateManager::transition($this->pdo, (int) $application['id'], 'submitted', $actingUserType, $actingUserId);
                } catch (Exception $e) {
                    // Leave the application as draft if the transition unexpectedly fails —
                    // the profile is still marked submitted regardless, so the student/agent
                    // can submit the application manually afterwards.
                }
            }
        }
    }

    /**
     * Resolves + authorizes the target student for an agent-facing endpoint given the
     * student's public_id, via the same tier-scoped subtree check used throughout the
     * agent portal (AgentAccessService).
     */
    private function resolveAgentTargetStudentId(string $studentPid): int
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? $user['user_type'] ?? '') !== 'agent') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $agent = AgentAccessService::resolveAgent($this->pdo, (int) $user['id']);

        $stmt = $this->pdo->prepare("SELECT id FROM students WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$studentPid]);
        $studentId = $stmt->fetchColumn();
        if (!$studentId) {
            Response::error('Student not found', 'NOT_FOUND', 404);
        }

        AgentAccessService::assertCanAccessStudent($this->pdo, $agent, (int) $studentId);

        return (int) $studentId;
    }

    public function agentGetReadiness(string $studentPid): void
    {
        $studentId = $this->resolveAgentTargetStudentId($studentPid);

        Response::json(['readiness' => $this->buildReadinessSnapshot($studentId)]);
    }

    public function agentSaveReadinessDraft(string $studentPid): void
    {
        $studentId = $this->resolveAgentTargetStudentId($studentPid);
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $this->saveReadinessDraftFor($studentId, $input);

        Response::json(['success' => true, 'message' => 'Draft saved.']);
    }

    public function agentUploadReadinessDocument(string $studentPid): void
    {
        $studentId = $this->resolveAgentTargetStudentId($studentPid);
        $user = AuthMiddleware::user();
        $category = trim((string) ($_POST['category'] ?? ''));

        $document = $this->uploadReadinessDocumentFor($studentId, 'agent', (int) $user['id'], $category, $_FILES['file'] ?? []);

        Response::json(['success' => true, 'document' => $document], 201);
    }

    public function agentSubmitReadiness(string $studentPid): void
    {
        $studentId = $this->resolveAgentTargetStudentId($studentPid);
        $user = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $applicationPid = trim((string) ($input['application_pid'] ?? ''));

        $this->submitReadinessFor($studentId, 'agent', (int) $user['id'], $applicationPid !== '' ? $applicationPid : null);

        Response::json(['success' => true, 'message' => 'Profile submitted.']);
    }

    /**
     * Agent directly creates a brand-new student account — no OTP, no
     * pending_registrations detour, modeled on SubAgentController::invite()'s
     * transaction shape. The password is server-generated and never returned to the
     * caller or emailed; the student logs in via OTP or sets their own password via
     * Forgot Password (see the student.created_by_agent notification template).
     */
    public function agentCreateStudent(): void
    {
        $user = AuthMiddleware::user();
        if (($user['utype'] ?? $user['user_type'] ?? '') !== 'agent') {
            Response::error('Forbidden', 'FORBIDDEN', 403);
        }

        $agent = AgentAccessService::resolveAgent($this->pdo, (int) $user['id']);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $fullName = trim((string) ($input['full_name'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $mobile = trim((string) ($input['mobile'] ?? ''));

        if ($fullName === '' || $email === '' || $mobile === '') {
            Response::error('Full name, email, and mobile are required.', 'VALIDATION_ERROR', 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email format.', 'VALIDATION_ERROR', 400);
        }

        // Uniqueness is scoped to (email, user_type) — the same email may already exist
        // for an agent/admin account elsewhere in the system, that's allowed by design.
        $emailHash = EncryptionService::hash($email);
        $checkStmt = $this->pdo->prepare("SELECT COUNT(*) FROM users WHERE email_lookup_hash = ? AND user_type = 'student' AND deleted_at IS NULL");
        $checkStmt->execute([$emailHash]);
        if ((int) $checkStmt->fetchColumn() > 0) {
            Response::error('A student account with this email already exists.', 'EMAIL_ALREADY_REGISTERED', 409);
        }

        $password = PasswordValidator::generateRandom();
        $phoneHash = EncryptionService::hash($mobile);

        try {
            $this->pdo->beginTransaction();

            $userPid = UlidGenerator::generate();
            $userStmt = $this->pdo->prepare(
                "INSERT INTO users (public_id, email, email_lookup_hash, phone, phone_lookup_hash, password_hash, user_type, status)
                 VALUES (?, ?, ?, ?, ?, ?, 'student', 'active')"
            );
            $userStmt->execute([
                $userPid,
                EncryptionService::encrypt($email),
                $emailHash,
                EncryptionService::encrypt($mobile),
                $phoneHash,
                password_hash($password, PASSWORD_ARGON2ID, [
                    'memory_cost' => (int) Environment::get('ARGON2_MEMORY_COST', '19456'),
                    'time_cost' => (int) Environment::get('ARGON2_TIME_COST', '2'),
                    'threads' => 1,
                ]),
            ]);
            $userId = (int) $this->pdo->lastInsertId();

            $studentPid = UlidGenerator::generate();
            $studentStmt = $this->pdo->prepare(
                "INSERT INTO students (public_id, user_id, agent_id, full_name, phone_in_profile, registered_by_type, registered_by_id, profile_status)
                 VALUES (?, ?, ?, ?, ?, 'agent', ?, 'registered')"
            );
            $studentStmt->execute([
                $studentPid,
                $userId,
                $agent['id'],
                $fullName,
                EncryptionService::encrypt($mobile),
                (int) $user['id'],
            ]);
            $studentId = (int) $this->pdo->lastInsertId();

            $this->pdo->prepare('INSERT INTO user_preferences (user_id) VALUES (?)')->execute([$userId]);

            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }

        ActivityLogger::log('student.created_by_agent', 'student', $studentId, (int) $user['id']);

        $portalUrl = rtrim(Environment::get('APP_FRONTEND_URL', ''), '/') . '/portal/login';
        NotificationService::fire('student.created_by_agent', [
            'student_name' => $fullName,
            'student_email' => $email,
            'agent_name' => $agent['full_name'],
            'portal_url' => $portalUrl,
        ], [$userId]);

        Response::json([
            'success' => true,
            'message' => 'Student profile created and welcome email sent.',
            'student' => ['public_id' => $studentPid, 'full_name' => $fullName],
        ], 201);
    }

    public function agentDirectory(): void
    {
        $this->requireStudentUser();
        $q = trim((string) ($_GET['q'] ?? ''));

        $sql = "SELECT public_id, full_name, agency_name, tier FROM agents WHERE status = 'approved' AND deleted_at IS NULL";
        $params = [];
        if ($q !== '') {
            $sql .= " AND (full_name LIKE ? OR agency_name LIKE ? OR public_id LIKE ?)";
            $like = '%' . $q . '%';
            $params = [$like, $like, $like];
        }
        $sql .= " ORDER BY full_name ASC LIMIT 20";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        Response::json(['agents' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
}
