<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;
use TGA\CRM\Config\Constants;
use TGA\CRM\Services\AuditService;

final class Admin extends BaseModel
{
    private AuditService $audit;

    public function __construct()
    {
        parent::__construct();
        $this->audit = new AuditService();
    }

    public function dashboardStats(string $role): array
    {
        return [
            'totalApplications' => $this->countValue('SELECT COUNT(*) FROM applications'),
            'pendingAgentApprovals' => $this->countValue("SELECT COUNT(*) FROM agents WHERE status = 'pending'"),
            'pendingDocumentReviews' => $this->countValue("SELECT COUNT(*) FROM documents WHERE status = 'pending'"),
            'activeStudents' => $this->countValue("SELECT COUNT(*) FROM users WHERE role = 'student' AND status = 'active' AND deleted_at IS NULL"),
            'activeAgents' => $this->countValue("SELECT COUNT(*) FROM agents WHERE status = 'approved'"),
            'activeUniversities' => $this->countValue('SELECT COUNT(*) FROM universities WHERE is_active = 1'),
            'activePrograms' => $this->countValue('SELECT COUNT(*) FROM programs WHERE is_active = 1'),
            'applicationsByStage' => $this->applicationsByStage(),
            'pendingAgentsPreview' => $this->pendingAgentsPreview(),
            'pendingDocumentsPreview' => $this->pendingDocumentsPreview(),
            'recentStageMovement' => $this->recentStageMovement(),
            'assignees' => $this->listAssignees(),
            'permissions' => $this->permissionSummary($role),
        ];
    }

    public function pipeline(array $filters): array
    {
        [$whereSql, $params] = $this->pipelineFilters($filters);
        [$perPage, $offset, $page] = $this->pagination($filters, 15);

        $countStatement = $this->connection->prepare(
            'SELECT COUNT(DISTINCT a.id)
             FROM applications a
             INNER JOIN programs p ON p.id = a.program_id
             INNER JOIN universities u ON u.id = a.university_id
             INNER JOIN users su ON su.id = a.student_user_id
             LEFT JOIN student_profiles sp ON sp.user_id = su.id
             LEFT JOIN agents ag ON ag.id = a.agent_id
             LEFT JOIN users au ON au.id = ag.user_id
             LEFT JOIN users assignee ON assignee.id = a.assigned_to
             ' . $whereSql
        );
        $countStatement->execute($params);
        $total = (int) $countStatement->fetchColumn();

        $statement = $this->connection->prepare(
            'SELECT
                a.id,
                a.reference_number,
                a.status,
                a.priority,
                a.intake_month,
                a.intake_year,
                a.assigned_to,
                a.is_flagged,
                a.flag_reason,
                a.created_at,
                a.updated_at,
                CONCAT(COALESCE(sp.first_name, "Student"), " ", COALESCE(sp.last_name, "User")) AS student_name,
                su.email AS student_email,
                u.id AS university_id,
                u.name AS university_name,
                u.country AS university_country,
                p.id AS program_id,
                p.name AS program_name,
                p.degree_level,
                ag.id AS agent_id,
                ag.agency_name,
                assignee.email AS assignee_email,
                COUNT(DISTINCT d.id) AS document_count,
                MAX(n.created_at) AS latest_note_at
             FROM applications a
             INNER JOIN programs p ON p.id = a.program_id
             INNER JOIN universities u ON u.id = a.university_id
             INNER JOIN users su ON su.id = a.student_user_id
             LEFT JOIN student_profiles sp ON sp.user_id = su.id
             LEFT JOIN agents ag ON ag.id = a.agent_id
             LEFT JOIN users au ON au.id = ag.user_id
             LEFT JOIN users assignee ON assignee.id = a.assigned_to
             LEFT JOIN documents d ON d.application_id = a.id
             LEFT JOIN application_notes n ON n.application_id = a.id
             ' . $whereSql . '
             GROUP BY
                a.id, a.reference_number, a.status, a.priority, a.intake_month, a.intake_year, a.assigned_to,
                a.is_flagged, a.flag_reason, a.created_at, a.updated_at,
                sp.first_name, sp.last_name, su.email, u.id, u.name, u.country, p.id, p.name, p.degree_level,
                ag.id, ag.agency_name, assignee.email
             ORDER BY a.updated_at DESC
             LIMIT :limit OFFSET :offset'
        );

        foreach ($params as $key => $value) {
            $statement->bindValue($key, $value);
        }

        $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        return [
            'items' => $statement->fetchAll(PDO::FETCH_ASSOC) ?: [],
            'meta' => $this->paginationMeta($page, $perPage, $total),
        ];
    }

    public function applicationDetail(int $applicationId): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT
                a.*,
                CONCAT(COALESCE(sp.first_name, "Student"), " ", COALESCE(sp.last_name, "User")) AS student_name,
                su.email AS student_email,
                su.phone AS student_phone,
                sp.nationality,
                sp.desired_country,
                sp.desired_subject,
                sp.profile_completion,
                u.name AS university_name,
                u.country AS university_country,
                p.name AS program_name,
                p.degree_level,
                ag.id AS agent_id,
                ag.agency_name,
                au.email AS agent_email,
                assignee.email AS assignee_email
             FROM applications a
             INNER JOIN users su ON su.id = a.student_user_id
             LEFT JOIN student_profiles sp ON sp.user_id = su.id
             INNER JOIN universities u ON u.id = a.university_id
             INNER JOIN programs p ON p.id = a.program_id
             LEFT JOIN agents ag ON ag.id = a.agent_id
             LEFT JOIN users au ON au.id = ag.user_id
             LEFT JOIN users assignee ON assignee.id = a.assigned_to
             WHERE a.id = :id
             LIMIT 1'
        );
        $statement->execute([':id' => $applicationId]);
        $detail = $statement->fetch(PDO::FETCH_ASSOC);

        if ($detail === false) {
            return null;
        }

        $detail['documents'] = $this->applicationDocuments($applicationId);
        $detail['history'] = $this->applicationHistory($applicationId);
        $detail['notes'] = $this->applicationNotes($applicationId);

        return $detail;
    }

    public function updateApplication(int $applicationId, array $payload, array $actor): ?array
    {
        $current = $this->applicationDetail($applicationId);

        if ($current === null) {
            return null;
        }

        $updates = [];
        $params = [':id' => $applicationId];
        $note = trim((string) ($payload['note'] ?? ''));

        if (isset($payload['status'])) {
            $status = (string) $payload['status'];

            if (!in_array($status, Constants::APPLICATION_STATUSES, true)) {
                throw new \RuntimeException('Invalid application status.');
            }

            if (!$this->canTransitionTo((string) $actor['role'], $status)) {
                throw new \RuntimeException('You do not have permission to move this application to that stage.');
            }

            if ($status !== (string) $current['status']) {
                $updates[] = 'status = :status';
                $params[':status'] = $status;
            }
        }

        if (isset($payload['priority'])) {
            $priority = (string) $payload['priority'];

            if (!in_array($priority, Constants::APPLICATION_PRIORITIES, true)) {
                throw new \RuntimeException('Invalid application priority.');
            }

            $updates[] = 'priority = :priority';
            $params[':priority'] = $priority;
        }

        if (array_key_exists('assigned_to', $payload)) {
            $assignedTo = $payload['assigned_to'] !== null ? (int) $payload['assigned_to'] : null;

            if ($assignedTo !== null && !$this->isAssignableInternalUser($assignedTo)) {
                throw new \RuntimeException('Assigned user must be an active internal user.');
            }

            $updates[] = 'assigned_to = :assigned_to';
            $params[':assigned_to'] = $assignedTo;
        }

        if (array_key_exists('is_flagged', $payload)) {
            $isFlagged = (bool) $payload['is_flagged'];
            $updates[] = 'is_flagged = :is_flagged';
            $params[':is_flagged'] = $isFlagged ? 1 : 0;

            $flagReason = trim((string) ($payload['flag_reason'] ?? ''));
            $updates[] = 'flag_reason = :flag_reason';
            $params[':flag_reason'] = $isFlagged && $flagReason !== '' ? $flagReason : null;
        }

        if ($updates !== []) {
            $statement = $this->connection->prepare(
                'UPDATE applications
                 SET ' . implode(', ', $updates) . ', updated_at = UTC_TIMESTAMP()
                 WHERE id = :id'
            );
            $statement->execute($params);
        }

        if (isset($params[':status']) && $params[':status'] !== (string) $current['status']) {
            $this->recordStageHistory(
                $applicationId,
                (string) $current['status'],
                (string) $params[':status'],
                (int) $actor['sub'],
                $note
            );
        }

        if ($note !== '') {
            $this->createNote($applicationId, (int) $actor['sub'], $note, true);
        }

        $updated = $this->applicationDetail($applicationId);

        $this->audit->log(
            (int) $actor['sub'],
            'application.updated',
            'application',
            $applicationId,
            $this->applicationAuditSnapshot($current),
            $updated !== null ? $this->applicationAuditSnapshot($updated) : null
        );

        return $updated;
    }

    public function documentQueue(array $filters): array
    {
        [$perPage, $offset, $page] = $this->pagination($filters, 15);
        $where = ['1 = 1'];
        $params = [];

        if (($filters['status'] ?? '') !== '') {
            $where[] = 'd.status = :status';
            $params[':status'] = (string) $filters['status'];
        }

        if (($filters['q'] ?? '') !== '') {
            $where[] = '(d.file_name LIKE :q_file_name OR d.document_type LIKE :q_document_type OR u.name LIKE :q_university_name OR sp.first_name LIKE :q_student_first_name OR sp.last_name LIKE :q_student_last_name)';
            $search = '%' . trim((string) $filters['q']) . '%';
            $params[':q_file_name'] = $search;
            $params[':q_document_type'] = $search;
            $params[':q_university_name'] = $search;
            $params[':q_student_first_name'] = $search;
            $params[':q_student_last_name'] = $search;
        }

        $whereSql = 'WHERE ' . implode(' AND ', $where);

        $countStatement = $this->connection->prepare(
            'SELECT COUNT(*)
             FROM documents d
             INNER JOIN applications a ON a.id = d.application_id
             INNER JOIN users su ON su.id = a.student_user_id
             LEFT JOIN student_profiles sp ON sp.user_id = su.id
             INNER JOIN universities u ON u.id = a.university_id
             ' . $whereSql
        );
        $countStatement->execute($params);
        $total = (int) $countStatement->fetchColumn();

        $statement = $this->connection->prepare(
            'SELECT
                d.id,
                d.application_id,
                d.document_type,
                d.file_name,
                d.file_path,
                d.file_size,
                d.mime_type,
                d.status,
                d.rejection_reason,
                d.created_at,
                a.reference_number,
                a.status AS application_status,
                CONCAT(COALESCE(sp.first_name, "Student"), " ", COALESCE(sp.last_name, "User")) AS student_name,
                su.email AS student_email,
                u.name AS university_name,
                p.name AS program_name
             FROM documents d
             INNER JOIN applications a ON a.id = d.application_id
             INNER JOIN users su ON su.id = a.student_user_id
             LEFT JOIN student_profiles sp ON sp.user_id = su.id
             INNER JOIN universities u ON u.id = a.university_id
             INNER JOIN programs p ON p.id = a.program_id
             ' . $whereSql . '
             ORDER BY d.created_at DESC
             LIMIT :limit OFFSET :offset'
        );

        foreach ($params as $key => $value) {
            $statement->bindValue($key, $value);
        }

        $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        return [
            'items' => $statement->fetchAll(PDO::FETCH_ASSOC) ?: [],
            'meta' => $this->paginationMeta($page, $perPage, $total),
        ];
    }

    public function reviewDocument(int $documentId, string $decision, string $reason, array $actor): ?array
    {
        $current = $this->findDocumentWithContext($documentId);

        if ($current === null) {
            return null;
        }

        if (!in_array($decision, ['verified', 'rejected'], true)) {
            throw new \RuntimeException('Document decision must be verified or rejected.');
        }

        $statement = $this->connection->prepare(
            'UPDATE documents
             SET status = :status,
                 verified_by = :verified_by,
                 verified_at = UTC_TIMESTAMP(),
                 rejection_reason = :rejection_reason
             WHERE id = :id'
        );
        $statement->execute([
            ':status' => $decision,
            ':verified_by' => (int) $actor['sub'],
            ':rejection_reason' => $decision === 'rejected' ? ($reason !== '' ? $reason : 'Document did not meet review standards.') : null,
            ':id' => $documentId,
        ]);

        $updated = $this->findDocumentWithContext($documentId);

        $this->audit->log(
            (int) $actor['sub'],
            'document.reviewed',
            'document',
            $documentId,
            $current,
            $updated
        );

        return $updated;
    }

    public function users(array $filters): array
    {
        [$perPage, $offset, $page] = $this->pagination($filters, 20);
        [$whereSql, $params] = $this->userFilters($filters);

        $countStatement = $this->connection->prepare(
            'SELECT COUNT(*)
             FROM users u
             LEFT JOIN student_profiles sp ON sp.user_id = u.id
             LEFT JOIN agents a ON a.user_id = u.id
             LEFT JOIN sub_agents sa ON sa.user_id = u.id
             ' . $whereSql
        );
        $countStatement->execute($params);
        $total = (int) $countStatement->fetchColumn();

        $statement = $this->connection->prepare(
            'SELECT
                u.id,
                u.email,
                u.phone,
                u.role,
                u.status,
                u.email_verified,
                u.created_at,
                sp.first_name,
                sp.last_name,
                a.agency_name,
                sa.display_name
             FROM users u
             LEFT JOIN student_profiles sp ON sp.user_id = u.id
             LEFT JOIN agents a ON a.user_id = u.id
             LEFT JOIN sub_agents sa ON sa.user_id = u.id
             ' . $whereSql . '
             ORDER BY u.created_at DESC
             LIMIT :limit OFFSET :offset'
        );

        foreach ($params as $key => $value) {
            $statement->bindValue($key, $value);
        }

        $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        return [
            'items' => array_map([$this, 'mapUserSummary'], $statement->fetchAll(PDO::FETCH_ASSOC) ?: []),
            'meta' => $this->paginationMeta($page, $perPage, $total),
        ];
    }

    public function userDetail(int $userId): ?array
    {
        $statement = $this->connection->prepare('SELECT * FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $statement->execute([':id' => $userId]);
        $user = $statement->fetch(PDO::FETCH_ASSOC);

        if ($user === false) {
            return null;
        }

        $detail = [
            'id' => (int) $user['id'],
            'email' => (string) $user['email'],
            'phone' => $user['phone'] !== null ? (string) $user['phone'] : null,
            'role' => (string) $user['role'],
            'status' => (string) $user['status'],
            'emailVerified' => (bool) $user['email_verified'],
            'phoneVerified' => (bool) $user['phone_verified'],
            'lastLogin' => $user['last_login'],
            'createdAt' => (string) $user['created_at'],
        ];

        $detail['profile'] = match ((string) $user['role']) {
            'student' => $this->studentProfileForUser($userId),
            'agent' => $this->agentProfileForUser($userId),
            'sub_agent' => $this->subAgentProfileForUser($userId),
            default => null,
        };

        return $detail;
    }

    public function updateUser(int $userId, array $payload, array $actor): ?array
    {
        $current = $this->userDetail($userId);

        if ($current === null) {
            return null;
        }

        $updates = [];
        $params = [':id' => $userId];

        if (isset($payload['status'])) {
            $status = (string) $payload['status'];

            if (!in_array($status, Constants::USER_STATUSES, true)) {
                throw new \RuntimeException('Invalid user status.');
            }

            $updates[] = 'status = :status';
            $params[':status'] = $status;
        }

        if (isset($payload['role'])) {
            if ((string) $actor['role'] !== 'super_admin') {
                throw new \RuntimeException('Only super admins can change internal roles.');
            }

            $role = (string) $payload['role'];

            if (!in_array($role, Constants::INTERNAL_MUTABLE_ROLES, true)) {
                throw new \RuntimeException('Only admin, counsellor, and visa officer roles can be assigned here.');
            }

            if (!in_array((string) $current['role'], Constants::INTERNAL_ROLES, true)) {
                throw new \RuntimeException('Only internal users can have their role changed from this panel.');
            }

            $updates[] = 'role = :role';
            $params[':role'] = $role;
        }

        if ($updates !== []) {
            $statement = $this->connection->prepare(
                'UPDATE users SET ' . implode(', ', $updates) . ', updated_at = UTC_TIMESTAMP() WHERE id = :id'
            );
            $statement->execute($params);
        }

        $updated = $this->userDetail($userId);

        $this->audit->log(
            (int) $actor['sub'],
            'user.updated',
            'user',
            $userId,
            $current,
            $updated
        );

        return $updated;
    }

    public function agents(array $filters): array
    {
        [$perPage, $offset, $page] = $this->pagination($filters, 20);
        $where = ['1 = 1'];
        $params = [];

        if (($filters['status'] ?? '') !== '') {
            $where[] = 'a.status = :status';
            $params[':status'] = (string) $filters['status'];
        }

        if (($filters['tier'] ?? '') !== '') {
            $where[] = 'a.tier = :tier';
            $params[':tier'] = (string) $filters['tier'];
        }

        if (($filters['q'] ?? '') !== '') {
            $where[] = '(a.agency_name LIKE :q_agency_name OR a.registration_number LIKE :q_registration OR u.email LIKE :q_email OR a.agency_country LIKE :q_country)';
            $search = '%' . trim((string) $filters['q']) . '%';
            $params[':q_agency_name'] = $search;
            $params[':q_registration'] = $search;
            $params[':q_email'] = $search;
            $params[':q_country'] = $search;
        }

        $whereSql = 'WHERE ' . implode(' AND ', $where);

        $countStatement = $this->connection->prepare(
            'SELECT COUNT(*)
             FROM agents a
             INNER JOIN users u ON u.id = a.user_id
             ' . $whereSql
        );
        $countStatement->execute($params);
        $total = (int) $countStatement->fetchColumn();

        $statement = $this->connection->prepare(
            'SELECT
                a.id,
                a.user_id,
                a.agency_name,
                a.agency_country,
                a.registration_number,
                a.partnership_type,
                a.tier,
                a.status,
                a.approved_at,
                u.email,
                u.phone,
                u.status AS user_status
             FROM agents a
             INNER JOIN users u ON u.id = a.user_id
             ' . $whereSql . '
             ORDER BY a.created_at DESC
             LIMIT :limit OFFSET :offset'
        );

        foreach ($params as $key => $value) {
            $statement->bindValue($key, $value);
        }

        $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        return [
            'items' => $statement->fetchAll(PDO::FETCH_ASSOC) ?: [],
            'meta' => $this->paginationMeta($page, $perPage, $total),
        ];
    }

    public function approveAgent(int $agentId, string $decision, string $note, array $actor): ?array
    {
        $current = $this->agentDetailById($agentId);

        if ($current === null) {
            return null;
        }

        if (!in_array($decision, ['approved', 'rejected'], true)) {
            throw new \RuntimeException('Agent decision must be approved or rejected.');
        }

        $statement = $this->connection->prepare(
            'UPDATE agents
             SET status = :status,
                 approved_by = :approved_by,
                 approved_at = CASE WHEN :status = "approved" THEN UTC_TIMESTAMP() ELSE approved_at END,
                 rejection_reason = :rejection_reason,
                 updated_at = UTC_TIMESTAMP()
             WHERE id = :id'
        );
        $statement->execute([
            ':status' => $decision,
            ':approved_by' => (int) $actor['sub'],
            ':rejection_reason' => $decision === 'rejected' ? ($note !== '' ? $note : 'Agent application was rejected during review.') : null,
            ':id' => $agentId,
        ]);

        $userStatus = $decision === 'approved' ? 'active' : 'suspended';
        $userStatement = $this->connection->prepare(
            'UPDATE users SET status = :status, updated_at = UTC_TIMESTAMP() WHERE id = :user_id'
        );
        $userStatement->execute([
            ':status' => $userStatus,
            ':user_id' => (int) $current['user_id'],
        ]);

        $updated = $this->agentDetailById($agentId);

        $this->audit->log(
            (int) $actor['sub'],
            'agent.reviewed',
            'agent',
            $agentId,
            $current,
            $updated
        );

        return $updated;
    }

    public function universities(array $filters): array
    {
        [$perPage, $offset, $page] = $this->pagination($filters, 15);
        $where = ['1 = 1'];
        $params = [];

        if (($filters['status'] ?? '') === 'active') {
            $where[] = 'u.is_active = 1';
        } elseif (($filters['status'] ?? '') === 'inactive') {
            $where[] = 'u.is_active = 0';
        }

        if (($filters['q'] ?? '') !== '') {
            $where[] = '(u.name LIKE :q_name OR u.short_name LIKE :q_short_name OR u.country LIKE :q_country OR u.city LIKE :q_city)';
            $search = '%' . trim((string) $filters['q']) . '%';
            $params[':q_name'] = $search;
            $params[':q_short_name'] = $search;
            $params[':q_country'] = $search;
            $params[':q_city'] = $search;
        }

        $whereSql = 'WHERE ' . implode(' AND ', $where);

        $countStatement = $this->connection->prepare(
            'SELECT COUNT(*) FROM universities u ' . $whereSql
        );
        $countStatement->execute($params);
        $total = (int) $countStatement->fetchColumn();

        $statement = $this->connection->prepare(
            'SELECT
                u.id,
                u.name,
                u.short_name,
                u.country,
                u.city,
                u.partnership_type,
                u.is_active,
                u.created_at,
                COUNT(p.id) AS program_count
             FROM universities u
             LEFT JOIN programs p ON p.university_id = u.id
             ' . $whereSql . '
             GROUP BY u.id, u.name, u.short_name, u.country, u.city, u.partnership_type, u.is_active, u.created_at
             ORDER BY u.updated_at DESC
             LIMIT :limit OFFSET :offset'
        );

        foreach ($params as $key => $value) {
            $statement->bindValue($key, $value);
        }

        $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        return [
            'items' => array_map([$this, 'mapAdminUniversity'], $statement->fetchAll(PDO::FETCH_ASSOC) ?: []),
            'meta' => $this->paginationMeta($page, $perPage, $total),
        ];
    }

    public function createUniversity(array $payload, array $actor): array
    {
        $statement = $this->connection->prepare(
            'INSERT INTO universities (name, short_name, country, city, partnership_type, is_active)
             VALUES (:name, :short_name, :country, :city, :partnership_type, :is_active)'
        );
        $statement->execute([
            ':name' => trim((string) $payload['name']),
            ':short_name' => $this->nullableString($payload['short_name'] ?? null),
            ':country' => trim((string) $payload['country']),
            ':city' => $this->nullableString($payload['city'] ?? null),
            ':partnership_type' => (string) ($payload['partnership_type'] ?? 'non_exclusive'),
            ':is_active' => isset($payload['is_active']) ? ((bool) $payload['is_active'] ? 1 : 0) : 1,
        ]);

        $id = (int) $this->connection->lastInsertId();
        $created = $this->universityDetail($id) ?? [];

        $this->audit->log((int) $actor['sub'], 'university.created', 'university', $id, null, $created);

        return $created;
    }

    public function updateUniversity(int $id, array $payload, array $actor): ?array
    {
        $current = $this->universityDetail($id);

        if ($current === null) {
            return null;
        }

        $statement = $this->connection->prepare(
            'UPDATE universities
             SET name = :name,
                 short_name = :short_name,
                 country = :country,
                 city = :city,
                 partnership_type = :partnership_type,
                 is_active = :is_active,
                 updated_at = UTC_TIMESTAMP()
             WHERE id = :id'
        );
        $statement->execute([
            ':id' => $id,
            ':name' => trim((string) ($payload['name'] ?? $current['name'])),
            ':short_name' => $this->nullableString($payload['short_name'] ?? $current['shortName'] ?? null),
            ':country' => trim((string) ($payload['country'] ?? $current['country'])),
            ':city' => $this->nullableString($payload['city'] ?? $current['city'] ?? null),
            ':partnership_type' => (string) ($payload['partnership_type'] ?? $current['partnershipType']),
            ':is_active' => isset($payload['is_active']) ? ((bool) $payload['is_active'] ? 1 : 0) : ((bool) ($current['isActive'] ?? true) ? 1 : 0),
        ]);

        $updated = $this->universityDetail($id);
        $this->audit->log((int) $actor['sub'], 'university.updated', 'university', $id, $current, $updated);

        return $updated;
    }

    public function disableUniversity(int $id, array $actor): ?array
    {
        $current = $this->universityDetail($id);

        if ($current === null) {
            return null;
        }

        $statement = $this->connection->prepare(
            'UPDATE universities SET is_active = 0, updated_at = UTC_TIMESTAMP() WHERE id = :id'
        );
        $statement->execute([':id' => $id]);

        $updated = $this->universityDetail($id);
        $this->audit->log((int) $actor['sub'], 'university.disabled', 'university', $id, $current, $updated);

        return $updated;
    }

    public function programs(array $filters): array
    {
        [$perPage, $offset, $page] = $this->pagination($filters, 15);
        $where = ['1 = 1'];
        $params = [];

        if (($filters['status'] ?? '') === 'active') {
            $where[] = 'p.is_active = 1';
        } elseif (($filters['status'] ?? '') === 'inactive') {
            $where[] = 'p.is_active = 0';
        }

        if (($filters['degree_level'] ?? '') !== '') {
            $where[] = 'p.degree_level = :degree_level';
            $params[':degree_level'] = (string) $filters['degree_level'];
        }

        if (($filters['university_id'] ?? null) !== null && (int) $filters['university_id'] > 0) {
            $where[] = 'p.university_id = :university_id';
            $params[':university_id'] = (int) $filters['university_id'];
        }

        if (($filters['q'] ?? '') !== '') {
            $where[] = '(p.name LIKE :q_program_name OR p.subject_area LIKE :q_subject_area OR u.name LIKE :q_university_name)';
            $search = '%' . trim((string) $filters['q']) . '%';
            $params[':q_program_name'] = $search;
            $params[':q_subject_area'] = $search;
            $params[':q_university_name'] = $search;
        }

        $whereSql = 'WHERE ' . implode(' AND ', $where);

        $countStatement = $this->connection->prepare(
            'SELECT COUNT(*)
             FROM programs p
             INNER JOIN universities u ON u.id = p.university_id
             ' . $whereSql
        );
        $countStatement->execute($params);
        $total = (int) $countStatement->fetchColumn();

        $statement = $this->connection->prepare(
            'SELECT
                p.id,
                p.university_id,
                p.name,
                p.degree_level,
                p.subject_area,
                p.tuition_fee,
                p.tuition_currency,
                p.intake_months_json,
                p.is_active,
                p.created_at,
                u.name AS university_name
             FROM programs p
             INNER JOIN universities u ON u.id = p.university_id
             ' . $whereSql . '
             ORDER BY p.updated_at DESC
             LIMIT :limit OFFSET :offset'
        );

        foreach ($params as $key => $value) {
            $statement->bindValue($key, $value);
        }

        $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        return [
            'items' => array_map([$this, 'mapAdminProgram'], $statement->fetchAll(PDO::FETCH_ASSOC) ?: []),
            'meta' => $this->paginationMeta($page, $perPage, $total),
        ];
    }

    public function createProgram(array $payload, array $actor): array
    {
        if (!$this->universityExists((int) $payload['university_id'])) {
            throw new \RuntimeException('University not found.');
        }

        $statement = $this->connection->prepare(
            'INSERT INTO programs (
                university_id, name, degree_level, subject_area, tuition_fee, tuition_currency, intake_months_json, is_active
             ) VALUES (
                :university_id, :name, :degree_level, :subject_area, :tuition_fee, :tuition_currency, :intake_months_json, :is_active
             )'
        );
        $statement->execute([
            ':university_id' => (int) $payload['university_id'],
            ':name' => trim((string) $payload['name']),
            ':degree_level' => (string) $payload['degree_level'],
            ':subject_area' => $this->nullableString($payload['subject_area'] ?? null),
            ':tuition_fee' => $payload['tuition_fee'] !== null && $payload['tuition_fee'] !== '' ? (float) $payload['tuition_fee'] : null,
            ':tuition_currency' => (string) ($payload['tuition_currency'] ?? 'EUR'),
            ':intake_months_json' => $this->jsonArray($payload['intake_months'] ?? []),
            ':is_active' => isset($payload['is_active']) ? ((bool) $payload['is_active'] ? 1 : 0) : 1,
        ]);

        $id = (int) $this->connection->lastInsertId();
        $created = $this->programDetail($id) ?? [];
        $this->audit->log((int) $actor['sub'], 'program.created', 'program', $id, null, $created);

        return $created;
    }

    public function updateProgram(int $id, array $payload, array $actor): ?array
    {
        $current = $this->programDetail($id);

        if ($current === null) {
            return null;
        }

        $universityId = (int) ($payload['university_id'] ?? $current['universityId']);

        if (!$this->universityExists($universityId)) {
            throw new \RuntimeException('University not found.');
        }

        $statement = $this->connection->prepare(
            'UPDATE programs
             SET university_id = :university_id,
                 name = :name,
                 degree_level = :degree_level,
                 subject_area = :subject_area,
                 tuition_fee = :tuition_fee,
                 tuition_currency = :tuition_currency,
                 intake_months_json = :intake_months_json,
                 is_active = :is_active,
                 updated_at = UTC_TIMESTAMP()
             WHERE id = :id'
        );
        $statement->execute([
            ':id' => $id,
            ':university_id' => $universityId,
            ':name' => trim((string) ($payload['name'] ?? $current['name'])),
            ':degree_level' => (string) ($payload['degree_level'] ?? $current['degreeLevel']),
            ':subject_area' => $this->nullableString($payload['subject_area'] ?? $current['subjectArea'] ?? null),
            ':tuition_fee' => ($payload['tuition_fee'] ?? $current['tuitionFee']) !== null && ($payload['tuition_fee'] ?? $current['tuitionFee']) !== ''
                ? (float) ($payload['tuition_fee'] ?? $current['tuitionFee'])
                : null,
            ':tuition_currency' => (string) ($payload['tuition_currency'] ?? $current['tuitionCurrency'] ?? 'EUR'),
            ':intake_months_json' => $this->jsonArray($payload['intake_months'] ?? $current['intakeMonths'] ?? []),
            ':is_active' => isset($payload['is_active']) ? ((bool) $payload['is_active'] ? 1 : 0) : ((bool) ($current['isActive'] ?? true) ? 1 : 0),
        ]);

        $updated = $this->programDetail($id);
        $this->audit->log((int) $actor['sub'], 'program.updated', 'program', $id, $current, $updated);

        return $updated;
    }

    public function disableProgram(int $id, array $actor): ?array
    {
        $current = $this->programDetail($id);

        if ($current === null) {
            return null;
        }

        $statement = $this->connection->prepare(
            'UPDATE programs SET is_active = 0, updated_at = UTC_TIMESTAMP() WHERE id = :id'
        );
        $statement->execute([':id' => $id]);

        $updated = $this->programDetail($id);
        $this->audit->log((int) $actor['sub'], 'program.disabled', 'program', $id, $current, $updated);

        return $updated;
    }

    public function auditLog(array $filters): array
    {
        [$perPage, $offset, $page] = $this->pagination($filters, 20);
        $where = ['1 = 1'];
        $params = [];

        if (($filters['audit_action'] ?? '') !== '') {
            $where[] = 'a.action = :action';
            $params[':action'] = (string) $filters['audit_action'];
        }

        if (($filters['entity_type'] ?? '') !== '') {
            $where[] = 'a.entity_type = :entity_type';
            $params[':entity_type'] = (string) $filters['entity_type'];
        }

        $whereSql = 'WHERE ' . implode(' AND ', $where);

        $countStatement = $this->connection->prepare(
            'SELECT COUNT(*) FROM audit_logs a ' . $whereSql
        );
        $countStatement->execute($params);
        $total = (int) $countStatement->fetchColumn();

        $statement = $this->connection->prepare(
            'SELECT
                a.id,
                a.user_id,
                a.action,
                a.entity_type,
                a.entity_id,
                a.old_data,
                a.new_data,
                a.ip_address,
                a.user_agent,
                a.created_at,
                u.email AS actor_email,
                u.role AS actor_role
             FROM audit_logs a
             LEFT JOIN users u ON u.id = a.user_id
             ' . $whereSql . '
             ORDER BY a.created_at DESC
             LIMIT :limit OFFSET :offset'
        );

        foreach ($params as $key => $value) {
            $statement->bindValue($key, $value);
        }

        $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        $items = array_map(static function (array $row): array {
            return [
                'id' => (int) $row['id'],
                'userId' => $row['user_id'] !== null ? (int) $row['user_id'] : null,
                'actorEmail' => $row['actor_email'] !== null ? (string) $row['actor_email'] : null,
                'actorRole' => $row['actor_role'] !== null ? (string) $row['actor_role'] : null,
                'action' => (string) $row['action'],
                'entityType' => $row['entity_type'] !== null ? (string) $row['entity_type'] : null,
                'entityId' => $row['entity_id'] !== null ? (int) $row['entity_id'] : null,
                'oldData' => self::decodeJsonObject($row['old_data'] ?? null),
                'newData' => self::decodeJsonObject($row['new_data'] ?? null),
                'ipAddress' => $row['ip_address'] !== null ? (string) $row['ip_address'] : null,
                'userAgent' => $row['user_agent'] !== null ? (string) $row['user_agent'] : null,
                'createdAt' => (string) $row['created_at'],
            ];
        }, $statement->fetchAll(PDO::FETCH_ASSOC) ?: []);

        return [
            'items' => $items,
            'meta' => $this->paginationMeta($page, $perPage, $total),
        ];
    }

    private function pendingAgentsPreview(): array
    {
        $statement = $this->connection->query(
            'SELECT a.id, a.agency_name, a.agency_country, a.registration_number, u.email, a.created_at
             FROM agents a
             INNER JOIN users u ON u.id = a.user_id
             WHERE a.status = "pending"
             ORDER BY a.created_at ASC
             LIMIT 5'
        );

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function pendingDocumentsPreview(): array
    {
        $statement = $this->connection->query(
            'SELECT
                d.id,
                d.document_type,
                d.status,
                d.created_at,
                a.reference_number,
                CONCAT(COALESCE(sp.first_name, "Student"), " ", COALESCE(sp.last_name, "User")) AS student_name
             FROM documents d
             INNER JOIN applications a ON a.id = d.application_id
             INNER JOIN users su ON su.id = a.student_user_id
             LEFT JOIN student_profiles sp ON sp.user_id = su.id
             WHERE d.status = "pending"
             ORDER BY d.created_at DESC
             LIMIT 5'
        );

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function recentStageMovement(): array
    {
        $statement = $this->connection->query(
            'SELECT
                h.id,
                h.application_id,
                h.from_status,
                h.to_status,
                h.created_at,
                a.reference_number,
                CONCAT(COALESCE(sp.first_name, "Student"), " ", COALESCE(sp.last_name, "User")) AS student_name
             FROM application_stage_history h
             INNER JOIN applications a ON a.id = h.application_id
             INNER JOIN users su ON su.id = a.student_user_id
             LEFT JOIN student_profiles sp ON sp.user_id = su.id
             ORDER BY h.created_at DESC
             LIMIT 8'
        );

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function applicationsByStage(): array
    {
        $statement = $this->connection->query(
            'SELECT status, COUNT(*) AS total
             FROM applications
             GROUP BY status
             ORDER BY total DESC'
        );

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function listAssignees(): array
    {
        $statement = $this->connection->query(
            'SELECT id, email, role, status
             FROM users
             WHERE role IN ("counsellor", "visa_officer", "admin", "super_admin")
               AND status = "active"
               AND deleted_at IS NULL
             ORDER BY role ASC, email ASC'
        );

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function permissionSummary(string $role): array
    {
        return [
            'role' => $role,
            'allowedStages' => Constants::STAGE_PERMISSIONS[$role] ?? [],
            'canManageCatalog' => in_array($role, ['admin', 'super_admin', 'counsellor'], true),
            'catalogReadOnly' => $role === 'counsellor',
            'canReviewDocuments' => in_array($role, Constants::DOCUMENT_REVIEW_ROLES, true),
            'canManageUsers' => in_array($role, ['admin', 'super_admin'], true),
            'canChangeInternalRoles' => $role === 'super_admin',
            'canViewAuditLog' => in_array($role, ['admin', 'super_admin'], true),
            'canApproveAgents' => in_array($role, ['admin', 'super_admin'], true),
        ];
    }

    private function pipelineFilters(array $filters): array
    {
        $where = ['1 = 1'];
        $params = [];

        if (($filters['status'] ?? '') !== '') {
            $where[] = 'a.status = :status';
            $params[':status'] = (string) $filters['status'];
        }

        if (($filters['country'] ?? '') !== '') {
            $where[] = 'u.country = :country';
            $params[':country'] = (string) $filters['country'];
        }

        if (($filters['university_id'] ?? null) !== null && (int) $filters['university_id'] > 0) {
            $where[] = 'a.university_id = :university_id';
            $params[':university_id'] = (int) $filters['university_id'];
        }

        if (($filters['agent_id'] ?? null) !== null && (int) $filters['agent_id'] > 0) {
            $where[] = 'a.agent_id = :agent_id';
            $params[':agent_id'] = (int) $filters['agent_id'];
        }

        if (($filters['assigned_to'] ?? null) !== null && (int) $filters['assigned_to'] > 0) {
            $where[] = 'a.assigned_to = :assigned_to';
            $params[':assigned_to'] = (int) $filters['assigned_to'];
        }

        if (($filters['date_from'] ?? '') !== '') {
            $where[] = 'DATE(a.created_at) >= :date_from';
            $params[':date_from'] = (string) $filters['date_from'];
        }

        if (($filters['date_to'] ?? '') !== '') {
            $where[] = 'DATE(a.created_at) <= :date_to';
            $params[':date_to'] = (string) $filters['date_to'];
        }

        if (($filters['q'] ?? '') !== '') {
            $where[] = '(a.reference_number LIKE :q_reference OR sp.first_name LIKE :q_student_first_name OR sp.last_name LIKE :q_student_last_name OR su.email LIKE :q_student_email OR u.name LIKE :q_university_name OR p.name LIKE :q_program_name OR ag.agency_name LIKE :q_agency_name)';
            $search = '%' . trim((string) $filters['q']) . '%';
            $params[':q_reference'] = $search;
            $params[':q_student_first_name'] = $search;
            $params[':q_student_last_name'] = $search;
            $params[':q_student_email'] = $search;
            $params[':q_university_name'] = $search;
            $params[':q_program_name'] = $search;
            $params[':q_agency_name'] = $search;
        }

        return ['WHERE ' . implode(' AND ', $where), $params];
    }

    private function applicationDocuments(int $applicationId): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                id,
                application_id,
                uploaded_by,
                document_type,
                file_name,
                file_path,
                file_size,
                mime_type,
                file_uuid,
                status,
                rejection_reason,
                verified_by,
                verified_at,
                created_at
             FROM documents
             WHERE application_id = :application_id
             ORDER BY created_at DESC'
        );
        $statement->execute([':application_id' => $applicationId]);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function applicationHistory(int $applicationId): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                h.id,
                h.from_status,
                h.to_status,
                h.changed_by,
                h.note,
                h.created_at,
                u.email AS changed_by_email
             FROM application_stage_history h
             LEFT JOIN users u ON u.id = h.changed_by
             WHERE h.application_id = :application_id
             ORDER BY h.created_at ASC'
        );
        $statement->execute([':application_id' => $applicationId]);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function applicationNotes(int $applicationId): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                n.id,
                n.note,
                n.is_internal,
                n.created_at,
                u.id AS author_id,
                u.email AS author_email,
                u.role AS author_role
             FROM application_notes n
             INNER JOIN users u ON u.id = n.author_id
             WHERE n.application_id = :application_id
             ORDER BY n.created_at DESC'
        );
        $statement->execute([':application_id' => $applicationId]);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function applicationAuditSnapshot(array $application): array
    {
        return [
            'id' => (int) $application['id'],
            'status' => (string) $application['status'],
            'priority' => (string) $application['priority'],
            'assigned_to' => $application['assigned_to'] !== null ? (int) $application['assigned_to'] : null,
            'is_flagged' => (bool) ($application['is_flagged'] ?? false),
            'flag_reason' => $application['flag_reason'] ?? null,
        ];
    }

    private function recordStageHistory(int $applicationId, string $fromStatus, string $toStatus, int $changedBy, string $note): void
    {
        $statement = $this->connection->prepare(
            'INSERT INTO application_stage_history (application_id, from_status, to_status, changed_by, note)
             VALUES (:application_id, :from_status, :to_status, :changed_by, :note)'
        );
        $statement->execute([
            ':application_id' => $applicationId,
            ':from_status' => $fromStatus,
            ':to_status' => $toStatus,
            ':changed_by' => $changedBy,
            ':note' => $note !== '' ? $note : null,
        ]);
    }

    private function createNote(int $applicationId, int $authorId, string $note, bool $isInternal): void
    {
        $statement = $this->connection->prepare(
            'INSERT INTO application_notes (application_id, author_id, note, is_internal)
             VALUES (:application_id, :author_id, :note, :is_internal)'
        );
        $statement->execute([
            ':application_id' => $applicationId,
            ':author_id' => $authorId,
            ':note' => $note,
            ':is_internal' => $isInternal ? 1 : 0,
        ]);
    }

    private function findDocumentWithContext(int $documentId): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT
                d.id,
                d.application_id,
                d.document_type,
                d.file_name,
                d.file_path,
                d.file_size,
                d.mime_type,
                d.status,
                d.rejection_reason,
                d.created_at,
                a.reference_number,
                CONCAT(COALESCE(sp.first_name, "Student"), " ", COALESCE(sp.last_name, "User")) AS student_name,
                u.name AS university_name,
                p.name AS program_name
             FROM documents d
             INNER JOIN applications a ON a.id = d.application_id
             INNER JOIN users su ON su.id = a.student_user_id
             LEFT JOIN student_profiles sp ON sp.user_id = su.id
             INNER JOIN universities u ON u.id = a.university_id
             INNER JOIN programs p ON p.id = a.program_id
             WHERE d.id = :id
             LIMIT 1'
        );
        $statement->execute([':id' => $documentId]);
        $document = $statement->fetch(PDO::FETCH_ASSOC);

        return $document === false ? null : $document;
    }

    private function userFilters(array $filters): array
    {
        $where = ['u.deleted_at IS NULL'];
        $params = [];

        if (($filters['role'] ?? '') !== '') {
            $where[] = 'u.role = :role';
            $params[':role'] = (string) $filters['role'];
        }

        if (($filters['status'] ?? '') !== '') {
            $where[] = 'u.status = :status';
            $params[':status'] = (string) $filters['status'];
        }

        if (($filters['q'] ?? '') !== '') {
            $where[] = '(u.email LIKE :q_email OR sp.first_name LIKE :q_student_first_name OR sp.last_name LIKE :q_student_last_name OR a.agency_name LIKE :q_agency_name OR sa.display_name LIKE :q_display_name)';
            $search = '%' . trim((string) $filters['q']) . '%';
            $params[':q_email'] = $search;
            $params[':q_student_first_name'] = $search;
            $params[':q_student_last_name'] = $search;
            $params[':q_agency_name'] = $search;
            $params[':q_display_name'] = $search;
        }

        return ['WHERE ' . implode(' AND ', $where), $params];
    }

    private function mapUserSummary(array $row): array
    {
        $firstName = null;
        $lastName = null;

        if ($row['first_name'] !== null || $row['last_name'] !== null) {
            $firstName = (string) ($row['first_name'] ?? 'Student');
            $lastName = (string) ($row['last_name'] ?? 'User');
        } elseif ($row['agency_name'] !== null) {
            $firstName = (string) $row['agency_name'];
            $lastName = 'Team';
        } elseif ($row['display_name'] !== null) {
            $parts = preg_split('/\s+/', trim((string) $row['display_name'])) ?: [];
            $firstName = $parts[0] ?? 'Sub';
            $lastName = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : 'Agent';
        }

        return [
            'id' => (int) $row['id'],
            'email' => (string) $row['email'],
            'phone' => $row['phone'] !== null ? (string) $row['phone'] : null,
            'role' => (string) $row['role'],
            'status' => (string) $row['status'],
            'emailVerified' => (bool) $row['email_verified'],
            'createdAt' => (string) $row['created_at'],
            'firstName' => $firstName,
            'lastName' => $lastName,
        ];
    }

    private function studentProfileForUser(int $userId): ?array
    {
        $statement = $this->connection->prepare('SELECT * FROM student_profiles WHERE user_id = :user_id LIMIT 1');
        $statement->execute([':user_id' => $userId]);
        $profile = $statement->fetch(PDO::FETCH_ASSOC);

        return $profile === false ? null : $profile;
    }

    private function agentProfileForUser(int $userId): ?array
    {
        $statement = $this->connection->prepare('SELECT * FROM agents WHERE user_id = :user_id LIMIT 1');
        $statement->execute([':user_id' => $userId]);
        $profile = $statement->fetch(PDO::FETCH_ASSOC);

        return $profile === false ? null : $profile;
    }

    private function subAgentProfileForUser(int $userId): ?array
    {
        $statement = $this->connection->prepare('SELECT * FROM sub_agents WHERE user_id = :user_id LIMIT 1');
        $statement->execute([':user_id' => $userId]);
        $profile = $statement->fetch(PDO::FETCH_ASSOC);

        return $profile === false ? null : $profile;
    }

    private function agentDetailById(int $agentId): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT
                a.*,
                u.email,
                u.phone,
                u.status AS user_status
             FROM agents a
             INNER JOIN users u ON u.id = a.user_id
             WHERE a.id = :id
             LIMIT 1'
        );
        $statement->execute([':id' => $agentId]);
        $agent = $statement->fetch(PDO::FETCH_ASSOC);

        return $agent === false ? null : $agent;
    }

    private function universityDetail(int $id): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT
                u.id,
                u.name,
                u.short_name,
                u.country,
                u.city,
                u.partnership_type,
                u.is_active,
                u.created_at,
                COUNT(p.id) AS program_count
             FROM universities u
             LEFT JOIN programs p ON p.university_id = u.id
             WHERE u.id = :id
             GROUP BY u.id, u.name, u.short_name, u.country, u.city, u.partnership_type, u.is_active, u.created_at
             LIMIT 1'
        );
        $statement->execute([':id' => $id]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $this->mapAdminUniversity($row);
    }

    private function programDetail(int $id): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT
                p.id,
                p.university_id,
                p.name,
                p.degree_level,
                p.subject_area,
                p.tuition_fee,
                p.tuition_currency,
                p.intake_months_json,
                p.is_active,
                p.created_at,
                u.name AS university_name
             FROM programs p
             INNER JOIN universities u ON u.id = p.university_id
             WHERE p.id = :id
             LIMIT 1'
        );
        $statement->execute([':id' => $id]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $this->mapAdminProgram($row);
    }

    private function mapAdminUniversity(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'shortName' => $row['short_name'] !== null ? (string) $row['short_name'] : null,
            'country' => (string) $row['country'],
            'city' => $row['city'] !== null ? (string) $row['city'] : null,
            'partnershipType' => (string) $row['partnership_type'],
            'isActive' => (bool) $row['is_active'],
            'programCount' => (int) $row['program_count'],
            'createdAt' => (string) $row['created_at'],
        ];
    }

    private function mapAdminProgram(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'universityId' => (int) $row['university_id'],
            'universityName' => (string) $row['university_name'],
            'name' => (string) $row['name'],
            'degreeLevel' => (string) $row['degree_level'],
            'subjectArea' => $row['subject_area'] !== null ? (string) $row['subject_area'] : null,
            'tuitionFee' => $row['tuition_fee'] !== null ? (float) $row['tuition_fee'] : null,
            'tuitionCurrency' => $row['tuition_currency'] !== null ? (string) $row['tuition_currency'] : null,
            'intakeMonths' => self::decodeJsonArray($row['intake_months_json'] ?? null),
            'isActive' => (bool) $row['is_active'],
            'createdAt' => (string) $row['created_at'],
        ];
    }

    private function universityExists(int $universityId): bool
    {
        $statement = $this->connection->prepare('SELECT COUNT(*) FROM universities WHERE id = :id');
        $statement->execute([':id' => $universityId]);

        return (int) $statement->fetchColumn() > 0;
    }

    private function isAssignableInternalUser(int $userId): bool
    {
        $statement = $this->connection->prepare(
            'SELECT COUNT(*) FROM users
             WHERE id = :id
               AND role IN ("counsellor", "visa_officer", "admin", "super_admin")
               AND status = "active"
               AND deleted_at IS NULL'
        );
        $statement->execute([':id' => $userId]);

        return (int) $statement->fetchColumn() > 0;
    }

    private function canTransitionTo(string $role, string $status): bool
    {
        $allowed = Constants::STAGE_PERMISSIONS[$role] ?? [];

        return in_array($status, $allowed, true);
    }

    private function countValue(string $sql): int
    {
        $statement = $this->connection->query($sql);

        return (int) $statement->fetchColumn();
    }

    private function pagination(array $filters, int $defaultPerPage): array
    {
        $page = max(1, (int) ($filters['page'] ?? 1));
        $perPage = max(1, min(100, (int) ($filters['per_page'] ?? $defaultPerPage)));

        return [$perPage, ($page - 1) * $perPage, $page];
    }

    private function paginationMeta(int $page, int $perPage, int $total): array
    {
        $totalPages = max(1, (int) ceil($total / max(1, $perPage)));

        return [
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => $totalPages,
            'has_next' => $page < $totalPages,
            'has_prev' => $page > 1,
        ];
    }

    private function nullableString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }

    private function jsonArray(mixed $value): ?string
    {
        if (!is_array($value)) {
            return json_encode([], JSON_UNESCAPED_SLASHES);
        }

        $items = array_values(array_filter($value, static fn (mixed $item): bool => is_string($item) && trim($item) !== ''));

        return json_encode($items, JSON_UNESCAPED_SLASHES);
    }

    private static function decodeJsonArray(?string $json): array
    {
        if ($json === null || trim($json) === '') {
            return [];
        }

        $decoded = json_decode($json, true);

        return is_array($decoded) ? array_values($decoded) : [];
    }

    private static function decodeJsonObject(?string $json): ?array
    {
        if ($json === null || trim($json) === '') {
            return null;
        }

        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : null;
    }
}
