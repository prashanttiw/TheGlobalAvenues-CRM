<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;
use TGA\CRM\Helpers\Response;

final class Application extends BaseModel
{
    public function programExists(int $programId): bool
    {
        $statement = $this->connection->prepare('SELECT COUNT(*) FROM programs WHERE id = :id AND is_active = 1');
        $statement->execute(['id' => $programId]);

        return (int) $statement->fetchColumn() > 0;
    }

    public function universityExists(int $universityId): bool
    {
        $statement = $this->connection->prepare('SELECT COUNT(*) FROM universities WHERE id = :id AND is_active = 1');
        $statement->execute(['id' => $universityId]);

        return (int) $statement->fetchColumn() > 0;
    }

    public function findProgramSnapshot(int $programId): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT p.id, p.university_id, p.name, p.degree_level, p.subject_area, u.name AS university_name
             FROM programs p
             INNER JOIN universities u ON u.id = p.university_id
             WHERE p.id = :id AND p.is_active = 1 AND u.is_active = 1
             LIMIT 1'
        );
        $statement->execute(['id' => $programId]);
        $program = $statement->fetch(PDO::FETCH_ASSOC);

        return $program === false ? null : $program;
    }

    public function create(array $data): array
    {
        $referenceNumber = $this->generateReferenceNumber();
        $agentId = null;
        $subAgentId = null;

        if (($data['creator_role'] ?? '') === 'agent') {
            $agentId = $this->findAgentIdByUserId((int) $data['created_by']);
        }

        if (($data['creator_role'] ?? '') === 'sub_agent') {
            $subAgentId = $this->findSubAgentIdByUserId((int) $data['created_by']);
        }

        $statement = $this->connection->prepare(
            'INSERT INTO applications (
                reference_number, student_user_id, agent_id, sub_agent_id, program_id, university_id, intake_month, intake_year, source
             ) VALUES (
                :reference_number, :student_user_id, :agent_id, :sub_agent_id, :program_id, :university_id, :intake_month, :intake_year, :source
             )'
        );
        $statement->execute([
            'reference_number' => $referenceNumber,
            'student_user_id' => $data['student_user_id'],
            'agent_id' => $agentId,
            'sub_agent_id' => $subAgentId,
            'program_id' => $data['program_id'],
            'university_id' => $data['university_id'],
            'intake_month' => $data['intake_month'],
            'intake_year' => $data['intake_year'],
            'source' => $data['source'],
        ]);

        $applicationId = (int) $this->connection->lastInsertId();
        $this->recordStatusHistory($applicationId, null, 'inquiry', (int) $data['created_by'], 'Application created');

        return $this->findDetail($applicationId) ?? [];
    }

    public function listForStudent(int $studentUserId, ?int $limit = null): array
    {
        $sql = 'SELECT a.id, a.reference_number, a.status, a.priority, a.intake_month, a.intake_year,
                       a.created_at, u.name AS university_name, p.name AS program_name
                FROM applications a
                INNER JOIN universities u ON u.id = a.university_id
                INNER JOIN programs p ON p.id = a.program_id
                WHERE a.student_user_id = :student_user_id
                ORDER BY a.created_at DESC';

        if ($limit !== null) {
            $sql .= ' LIMIT ' . (int) $limit;
        }

        $statement = $this->connection->prepare($sql);
        $statement->execute(['student_user_id' => $studentUserId]);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function countForStudent(int $studentUserId): int
    {
        $statement = $this->connection->prepare('SELECT COUNT(*) FROM applications WHERE student_user_id = :student_user_id');
        $statement->execute(['student_user_id' => $studentUserId]);

        return (int) $statement->fetchColumn();
    }

    public function findDetail(int $applicationId): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT a.*, u.name AS university_name, p.name AS program_name, p.degree_level
             FROM applications a
             INNER JOIN universities u ON u.id = a.university_id
             INNER JOIN programs p ON p.id = a.program_id
             WHERE a.id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $applicationId]);
        $application = $statement->fetch(PDO::FETCH_ASSOC);

        if ($application === false) {
            return null;
        }

        $application['history'] = $this->statusHistory($applicationId);
        $application['documents'] = $this->documents($applicationId);

        return $application;
    }

    public function statusHistory(int $applicationId): array
    {
        $statement = $this->connection->prepare(
            'SELECT id, from_status, to_status, changed_by, note, created_at
             FROM application_stage_history
             WHERE application_id = :application_id
             ORDER BY created_at ASC'
        );
        $statement->execute(['application_id' => $applicationId]);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function updateStatus(int $applicationId, string $newStatus, int $changedBy, string $note): array
    {
        $current = $this->findDetail($applicationId);

        if ($current === null) {
            throw new \RuntimeException('Application not found');
        }

        $statement = $this->connection->prepare(
            'UPDATE applications SET status = :status, updated_at = UTC_TIMESTAMP() WHERE id = :id'
        );
        $statement->execute([
            'status' => $newStatus,
            'id' => $applicationId,
        ]);

        $this->recordStatusHistory($applicationId, (string) $current['status'], $newStatus, $changedBy, $note);

        return $this->findDetail($applicationId) ?? $current;
    }

    public function documents(int $applicationId): array
    {
        $statement = $this->connection->prepare(
            'SELECT id, document_type, file_name, file_path, file_size, mime_type, file_uuid, status, created_at
             FROM documents
             WHERE application_id = :application_id
             ORDER BY created_at DESC'
        );
        $statement->execute(['application_id' => $applicationId]);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function createDocument(int $applicationId, int $uploadedBy, string $documentType, array $fileData): array
    {
        $statement = $this->connection->prepare(
            'INSERT INTO documents (
                application_id, uploaded_by, document_type, file_name, file_path, file_size, mime_type, file_uuid, status
             ) VALUES (
                :application_id, :uploaded_by, :document_type, :file_name, :file_path, :file_size, :mime_type, :file_uuid, :status
             )'
        );
        $statement->execute([
            'application_id' => $applicationId,
            'uploaded_by' => $uploadedBy,
            'document_type' => $documentType,
            'file_name' => $fileData['file_name'],
            'file_path' => $fileData['file_path'],
            'file_size' => $fileData['file_size'],
            'mime_type' => $fileData['mime_type'],
            'file_uuid' => $fileData['uuid'],
            'status' => 'pending',
        ]);

        return $this->findDocument((int) $this->connection->lastInsertId()) ?? [];
    }

    public function findDocument(int $documentId): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT id, application_id, uploaded_by, document_type, file_name, file_path, file_size, mime_type, file_uuid, status, created_at
             FROM documents
             WHERE id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $documentId]);
        $document = $statement->fetch(PDO::FETCH_ASSOC);

        return $document === false ? null : $document;
    }

    public function deleteDocument(int $documentId): void
    {
        $statement = $this->connection->prepare('DELETE FROM documents WHERE id = :id');
        $statement->execute(['id' => $documentId]);
    }

    public function assertAccess(array $application, array $user): void
    {
        $role = (string) ($user['role'] ?? '');

        if (in_array($role, ['admin', 'super_admin', 'counsellor', 'visa_officer'], true)) {
            return;
        }

        if ($role === 'student' && (int) $application['student_user_id'] === (int) $user['sub']) {
            return;
        }

        if ($role === 'agent') {
            $agentId = $this->findAgentIdByUserId((int) $user['sub']);

            if ($agentId !== null && (int) ($application['agent_id'] ?? 0) === $agentId) {
                return;
            }
        }

        if ($role === 'sub_agent') {
            $subAgentId = $this->findSubAgentIdByUserId((int) $user['sub']);

            if ($subAgentId !== null && (int) ($application['sub_agent_id'] ?? 0) === $subAgentId) {
                return;
            }
        }

        Response::error('You do not have permission to access this resource', 'AUTH_INSUFFICIENT_ROLE', 403);
    }

    private function recordStatusHistory(int $applicationId, ?string $fromStatus, string $toStatus, int $changedBy, string $note): void
    {
        $statement = $this->connection->prepare(
            'INSERT INTO application_stage_history (application_id, from_status, to_status, changed_by, note)
             VALUES (:application_id, :from_status, :to_status, :changed_by, :note)'
        );
        $statement->execute([
            'application_id' => $applicationId,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'changed_by' => $changedBy,
            'note' => $note !== '' ? $note : null,
        ]);
    }

    private function generateReferenceNumber(): string
    {
        return 'TGA' . date('y') . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    }

    private function findAgentIdByUserId(int $userId): ?int
    {
        $statement = $this->connection->prepare('SELECT id FROM agents WHERE user_id = :user_id LIMIT 1');
        $statement->execute(['user_id' => $userId]);
        $agentId = $statement->fetchColumn();

        return $agentId === false ? null : (int) $agentId;
    }

    private function findSubAgentIdByUserId(int $userId): ?int
    {
        $statement = $this->connection->prepare('SELECT id FROM sub_agents WHERE user_id = :user_id LIMIT 1');
        $statement->execute(['user_id' => $userId]);
        $subAgentId = $statement->fetchColumn();

        return $subAgentId === false ? null : (int) $subAgentId;
    }
}
