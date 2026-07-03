<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Paginator;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Services\EncryptionService;

final class AdminStudentController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function listAll(): void
    {
        RBACMiddleware::requirePermission('students', 'view');

        $pager = Paginator::fromQuery($_GET);
        $status = trim((string) ($_GET['status'] ?? ''));
        $search = trim((string) ($_GET['search'] ?? ''));
        $agentScope = trim((string) ($_GET['agent_scope'] ?? ''));

        $conditions = ['s.deleted_at IS NULL'];
        $params = [];

        if ($status !== '') {
            $conditions[] = 's.profile_status = :status';
            $params['status'] = $status;
        }

        if ($agentScope === 'direct') {
            $conditions[] = 's.agent_id IS NULL';
        } elseif ($agentScope === 'assigned') {
            $conditions[] = 's.agent_id IS NOT NULL';
        }

        if ($search !== '') {
            // MySQL native prepares (Database::getConnection() runs with ATTR_EMULATE_PREPARES
            // false) reject a named placeholder reused more than once in the same query with
            // "Invalid parameter number" — bind a distinct name per occurrence instead.
            // Email/phone are XSalsa20-encrypted (EncryptionService) — LIKE on the ciphertext is
            // meaningless, so match those two fields by exact lookup-hash equality, plus
            // fixed-length prefix-hash equality for a "starts with" match (see
            // EncryptionService::hashPrefix()/hashPhonePrefix() — indexed equality lookups, same
            // cost as the exact-match hashes, no decryption at query time).
            $searchOr = [
                's.full_name LIKE :search1',
                's.public_id LIKE :search2',
                "COALESCE(a.agency_name, '') LIKE :search3",
                'u.email_lookup_hash = :searchEmailHash',
                'u.phone_lookup_hash = :searchPhoneHash',
            ];
            $searchTerm = '%' . $search . '%';
            $params['search1'] = $searchTerm;
            $params['search2'] = $searchTerm;
            $params['search3'] = $searchTerm;
            $params['searchEmailHash'] = EncryptionService::hash($search);
            $params['searchPhoneHash'] = EncryptionService::hash($search);

            foreach ([4, 6, 8] as $len) {
                $prefixHash = EncryptionService::hashPrefix($search, $len);
                if ($prefixHash !== null) {
                    $paramKey = "emailPrefix{$len}";
                    $searchOr[] = "u.email_prefix{$len}_hash = :{$paramKey}";
                    $params[$paramKey] = $prefixHash;
                }
            }
            foreach ([4, 6] as $len) {
                $phonePrefixHash = EncryptionService::hashPhonePrefix($search, $len);
                if ($phonePrefixHash !== null) {
                    $paramKey = "phonePrefix{$len}";
                    $searchOr[] = "u.phone_prefix{$len}_hash = :{$paramKey}";
                    $params[$paramKey] = $phonePrefixHash;
                }
            }

            $conditions[] = '(' . implode(' OR ', $searchOr) . ')';
        }

        $where = implode(' AND ', $conditions);

        $countStmt = $this->pdo->prepare("
            SELECT COUNT(DISTINCT s.id)
            FROM students s
            JOIN users u ON u.id = s.user_id
            LEFT JOIN agents a ON a.id = s.agent_id AND a.deleted_at IS NULL
            WHERE {$where}
        ");
        foreach ($params as $key => $value) {
            $countStmt->bindValue(':' . $key, $value);
        }
        $countStmt->execute();
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->pdo->prepare("
            SELECT s.id, s.public_id, s.full_name, s.nationality, s.profile_status, s.created_at,
                   u.email AS encrypted_email, u.phone AS encrypted_phone,
                   a.public_id AS agent_public_id, a.full_name AS agent_name, a.agency_name,
                   COUNT(app.id) AS applications_count
            FROM students s
            JOIN users u ON u.id = s.user_id
            LEFT JOIN agents a ON a.id = s.agent_id AND a.deleted_at IS NULL
            LEFT JOIN applications app ON app.student_id = s.id AND app.deleted_at IS NULL
            WHERE {$where}
            GROUP BY s.id, s.public_id, s.full_name, s.nationality, s.profile_status, s.created_at,
                     u.email, u.phone, a.public_id, a.full_name, a.agency_name
            ORDER BY s.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $pager['per_page'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pager['offset'], PDO::PARAM_INT);
        $stmt->execute();

        $students = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $email = null;
            $phone = null;

            if (!empty($row['encrypted_email'])) {
                try {
                    $email = EncryptionService::decrypt($row['encrypted_email']);
                } catch (\Throwable) {
                    $email = null;
                }
            }

            if (!empty($row['encrypted_phone'])) {
                try {
                    $phone = EncryptionService::decrypt($row['encrypted_phone']);
                } catch (\Throwable) {
                    $phone = null;
                }
            }

            $students[] = [
                'id' => $row['public_id'],
                'public_id' => $row['public_id'],
                'name' => $row['full_name'],
                'email' => $email,
                'phone' => $phone,
                'nationality' => $row['nationality'],
                'agent' => $row['agency_name'] ?: ($row['agent_name'] ?: 'None (Direct)'),
                'agent_public_id' => $row['agent_public_id'],
                'status' => $row['profile_status'],
                'applicationsCount' => (int) $row['applications_count'],
                'registeredDate' => $row['created_at'],
            ];
        }

        Response::json([
            'data' => $students,
            'meta' => [
                'total' => $total,
                'page' => $pager['page'],
                'per_page' => $pager['per_page'],
                'total_pages' => (int) ceil($total / $pager['per_page']),
                'has_next' => ($pager['page'] * $pager['per_page']) < $total,
            ],
        ]);
    }

    public function adminGetReadiness(string $pid): void
    {
        RBACMiddleware::requirePermission('students', 'view');

        $stmt = $this->pdo->prepare('SELECT id FROM students WHERE public_id = ? AND deleted_at IS NULL');
        $stmt->execute([$pid]);
        $studentId = $stmt->fetchColumn();

        if (!$studentId) {
            Response::error('Student not found', 'NOT_FOUND', 404);
        }

        $studentController = new StudentController();
        Response::json(['readiness' => $studentController->buildReadinessSnapshotForAdmin((int) $studentId)]);
    }

    /**
     * Full admin detail view for a single student — every students-table
     * field (decrypted where encrypted), agent, academics, test scores,
     * applications, the existing readiness snapshot, and admin-defined
     * custom field values. Unfilled fields come back as null so the
     * frontend can render "Not provided yet" instead of erroring or
     * omitting the section.
     */
    public function adminGetDetail(string $pid): void
    {
        RBACMiddleware::requirePermission('students', 'view');

        $stmt = $this->pdo->prepare("
            SELECT s.id, s.public_id, s.full_name, s.date_of_birth, s.gender, s.nationality,
                   s.passport_number, s.passport_expiry, s.phone_in_profile, s.alternate_mobile,
                   s.lead_source, s.how_heard_about_us, s.planning_phd, s.referral_agent_code,
                   s.agent_lock_status, s.profile_status, s.created_at, s.updated_at,
                   u.email AS encrypted_email, u.phone AS encrypted_phone, u.status AS user_status,
                   a.public_id AS agent_public_id, a.full_name AS agent_name, a.agency_name
            FROM students s
            JOIN users u ON u.id = s.user_id
            LEFT JOIN agents a ON a.id = s.agent_id AND a.deleted_at IS NULL
            WHERE s.public_id = ? AND s.deleted_at IS NULL
        ");
        $stmt->execute([$pid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Response::error('Student not found', 'NOT_FOUND', 404);
        }

        $studentId = (int) $row['id'];

        $academicsStmt = $this->pdo->prepare("
            SELECT public_id, institution_name, degree_level, field_of_study, start_date, end_date, score_type, score_value, is_highest_qualification
            FROM student_academics
            WHERE student_id = ? AND deleted_at IS NULL
            ORDER BY start_date DESC
        ");
        $academicsStmt->execute([$studentId]);

        $testScoresStmt = $this->pdo->prepare("
            SELECT public_id, test_name, overall_score, reading_score, writing_score, listening_score, speaking_score, test_date
            FROM student_test_scores
            WHERE student_id = ? AND deleted_at IS NULL
            ORDER BY test_date DESC
        ");
        $testScoresStmt->execute([$studentId]);

        $applicationsStmt = $this->pdo->prepare("
            SELECT ap.public_id, ap.reference_number, ap.status, ap.created_at,
                   c.name AS course_name, un.name AS university_name
            FROM applications ap
            JOIN intakes i ON i.id = ap.intake_id
            JOIN courses c ON c.id = i.course_id
            JOIN universities un ON un.id = c.university_id
            WHERE ap.student_id = ? AND ap.deleted_at IS NULL
            ORDER BY ap.created_at DESC
        ");
        $applicationsStmt->execute([$studentId]);
        $applications = $applicationsStmt->fetchAll(PDO::FETCH_ASSOC);

        $studentController = new StudentController();
        $customFieldController = new StudentCustomFieldController();

        Response::json([
            'student' => [
                'public_id' => $row['public_id'],
                'full_name' => $row['full_name'],
                'email' => $this->decryptOrNull($row['encrypted_email']),
                'phone' => $this->decryptOrNull($row['encrypted_phone']),
                'phone_in_profile' => $this->decryptOrNull($row['phone_in_profile']),
                'alternate_mobile' => $this->decryptOrNull($row['alternate_mobile']),
                'date_of_birth' => $row['date_of_birth'],
                'gender' => $row['gender'],
                'nationality' => $row['nationality'],
                'passport_number' => $this->decryptOrNull($row['passport_number']),
                'passport_expiry' => $row['passport_expiry'],
                'lead_source' => $row['lead_source'],
                'how_heard_about_us' => $row['how_heard_about_us'],
                'planning_phd' => (bool) $row['planning_phd'],
                'referral_agent_code' => $row['referral_agent_code'],
                'agent_lock_status' => $row['agent_lock_status'],
                'profile_status' => $row['profile_status'],
                'user_status' => $row['user_status'],
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at'],
                'agent' => $row['agent_public_id'] ? [
                    'public_id' => $row['agent_public_id'],
                    'full_name' => $row['agent_name'],
                    'agency_name' => $row['agency_name'],
                ] : null,
            ],
            'academics' => $academicsStmt->fetchAll(PDO::FETCH_ASSOC),
            'test_scores' => $testScoresStmt->fetchAll(PDO::FETCH_ASSOC),
            'applications' => [
                'count' => count($applications),
                'items' => $applications,
            ],
            'readiness' => $studentController->buildReadinessSnapshotForAdmin($studentId),
            'custom_fields' => $customFieldController->buildCustomFieldsSnapshot($studentId),
        ]);
    }

    private function decryptOrNull(mixed $value): ?string
    {
        if (empty($value)) {
            return null;
        }

        try {
            return EncryptionService::decrypt($value);
        } catch (\Throwable) {
            return null;
        }
    }
}


