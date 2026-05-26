<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;
use TGA\CRM\Helpers\Response;

final class Agent extends BaseModel
{
    private const PROFILE_FIELDS = [
        'agency_name',
        'agency_type',
        'registration_number',
        'tax_id',
        'website',
        'agency_country',
        'agency_state',
        'agency_city',
        'agency_address',
        'years_in_business',
        'annual_student_volume',
        'pan_number',
        'gstin',
    ];

    public function profileForUser(int $userId, string $role): ?array
    {
        if ($role === 'agent') {
            return $this->findAgentByUserId($userId);
        }

        if ($role === 'sub_agent') {
            return $this->findSubAgentByUserId($userId);
        }

        return null;
    }

    public function updateProfile(int $userId, array $data): array
    {
        $profile = $this->findAgentByUserId($userId);

        if ($profile === null) {
            throw new \RuntimeException('Agent profile not found');
        }

        $setClauses = [];
        $parameters = ['user_id' => $userId];

        foreach (self::PROFILE_FIELDS as $field) {
            if (array_key_exists($field, $data)) {
                $setClauses[] = $field . ' = :' . $field;
                $parameters[$field] = $data[$field];
            }
        }

        if ($setClauses !== []) {
            $statement = $this->connection->prepare(
                'UPDATE agents SET ' . implode(', ', $setClauses) . ' WHERE user_id = :user_id'
            );
            $statement->execute($parameters);
        }

        return $this->findAgentByUserId($userId) ?? $profile;
    }

    public function dashboardForUser(int $userId, string $role): ?array
    {
        $profile = $this->profileForUser($userId, $role);

        if ($profile === null) {
            return null;
        }

        $agentId = (int) ($profile['agent_id'] ?? $profile['id'] ?? 0);
        $subAgentId = $role === 'sub_agent' ? (int) ($profile['id'] ?? 0) : null;

        return [
            'profile' => $profile,
            'stats' => [
                'leadCount' => $this->countLeads($agentId, $subAgentId),
                'applicationCount' => $this->countApplications($agentId, $subAgentId),
                'pendingCommission' => $this->sumPendingCommission($agentId),
                'recentLeads' => $this->listLeads($userId, $role, '', 5),
            ],
        ];
    }

    public function createLead(int $userId, string $role, array $input): array
    {
        $profile = $this->profileForUser($userId, $role);

        if ($profile === null) {
            throw new \RuntimeException('Agent profile not found');
        }

        foreach (['first_name', 'last_name'] as $field) {
            if (($input[$field] ?? '') === '') {
                Response::error('Validation failed', 'VALIDATION_FAILED', 422, [
                    $field => 'This field is required.',
                ]);
            }
        }

        $agentId = (int) ($profile['agent_id'] ?? $profile['id']);
        $subAgentId = $role === 'sub_agent' ? (int) $profile['id'] : null;

        $statement = $this->connection->prepare(
            'INSERT INTO leads (
                agent_id, sub_agent_id, first_name, last_name, email, phone, phone_country,
                nationality, desired_country, desired_subject, desired_level, budget, notes, source
             ) VALUES (
                :agent_id, :sub_agent_id, :first_name, :last_name, :email, :phone, :phone_country,
                :nationality, :desired_country, :desired_subject, :desired_level, :budget, :notes, :source
             )'
        );
        $statement->execute([
            'agent_id' => $agentId,
            'sub_agent_id' => $subAgentId,
            'first_name' => $input['first_name'],
            'last_name' => $input['last_name'],
            'email' => $input['email'] ?? null,
            'phone' => $input['phone'] ?? null,
            'phone_country' => $input['phone_country'] ?? null,
            'nationality' => $input['nationality'] ?? null,
            'desired_country' => $input['desired_country'] ?? null,
            'desired_subject' => $input['desired_subject'] ?? null,
            'desired_level' => $input['desired_level'] ?? null,
            'budget' => $input['budget'] ?? null,
            'notes' => $input['notes'] ?? null,
            'source' => $input['source'] ?? 'portal',
        ]);

        return $this->findLeadById((int) $this->connection->lastInsertId()) ?? [];
    }

    public function listLeads(int $userId, string $role, string $status = '', ?int $limit = null): array
    {
        $profile = $this->profileForUser($userId, $role);

        if ($profile === null) {
            return [];
        }

        $agentId = (int) ($profile['agent_id'] ?? $profile['id']);
        $subAgentId = $role === 'sub_agent' ? (int) $profile['id'] : null;

        $sql = 'SELECT * FROM leads WHERE agent_id = :agent_id';
        $params = ['agent_id' => $agentId];

        if ($subAgentId !== null) {
            $sql .= ' AND sub_agent_id = :sub_agent_id';
            $params['sub_agent_id'] = $subAgentId;
        }

        if ($status !== '') {
            $sql .= ' AND status = :status';
            $params['status'] = $status;
        }

        $sql .= ' ORDER BY created_at DESC';

        if ($limit !== null) {
            $sql .= ' LIMIT ' . (int) $limit;
        }

        $statement = $this->connection->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function updateLead(int $userId, string $role, int $leadId, array $input): array
    {
        $lead = $this->findLeadById($leadId);

        if ($lead === null) {
            Response::error('Lead not found', 'RESOURCE_NOT_FOUND', 404);
        }

        $this->assertLeadAccess($lead, $userId, $role);

        $statement = $this->connection->prepare(
            'UPDATE leads SET status = :status, notes = :notes, updated_at = UTC_TIMESTAMP() WHERE id = :id'
        );
        $statement->execute([
            'status' => $input['status'] ?? $lead['status'],
            'notes' => $input['notes'] ?? $lead['notes'],
            'id' => $leadId,
        ]);

        return $this->findLeadById($leadId) ?? $lead;
    }

    public function listApplications(int $userId, string $role): array
    {
        $profile = $this->profileForUser($userId, $role);

        if ($profile === null) {
            return [];
        }

        $agentId = (int) ($profile['agent_id'] ?? $profile['id']);
        $subAgentId = $role === 'sub_agent' ? (int) $profile['id'] : null;

        $sql = 'SELECT a.id, a.reference_number, a.status, a.priority, a.intake_month, a.intake_year,
                       a.created_at, u.name AS university_name, p.name AS program_name
                FROM applications a
                INNER JOIN universities u ON u.id = a.university_id
                INNER JOIN programs p ON p.id = a.program_id
                WHERE a.agent_id = :agent_id';

        $params = ['agent_id' => $agentId];

        if ($subAgentId !== null) {
            $sql .= ' AND a.sub_agent_id = :sub_agent_id';
            $params['sub_agent_id'] = $subAgentId;
        }

        $sql .= ' ORDER BY a.created_at DESC';

        $statement = $this->connection->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function listCommissions(int $userId): array
    {
        $profile = $this->findAgentByUserId($userId);

        if ($profile === null) {
            return [];
        }

        $statement = $this->connection->prepare(
            'SELECT id, application_id, gross_amount, net_amount, currency, status, paid_at, created_at
             FROM commission_claims
             WHERE agent_id = :agent_id
             ORDER BY created_at DESC'
        );
        $statement->execute(['agent_id' => (int) $profile['id']]);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function listResources(string $role): array
    {
        $statement = $this->connection->prepare(
            'SELECT id, title, description, category, file_url, file_type, target_role, target_country, download_count
             FROM resources
             WHERE is_active = 1 AND (target_role = :role OR target_role = :all_role)
             ORDER BY created_at DESC'
        );
        $statement->execute([
            'role' => $role === 'sub_agent' ? 'sub_agent' : 'agent',
            'all_role' => 'all',
        ]);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function listSubAgents(int $userId): array
    {
        $agent = $this->findAgentByUserId($userId);

        if ($agent === null) {
            return [];
        }

        $statement = $this->connection->prepare(
            'SELECT sa.id, sa.display_name, sa.permissions_json, sa.status, sa.created_at, u.email
             FROM sub_agents sa
             INNER JOIN users u ON u.id = sa.user_id
             WHERE sa.agent_id = :agent_id
             ORDER BY sa.created_at DESC'
        );
        $statement->execute(['agent_id' => (int) $agent['id']]);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function findAgentByUserId(int $userId): ?array
    {
        $statement = $this->connection->prepare('SELECT * FROM agents WHERE user_id = :user_id LIMIT 1');
        $statement->execute(['user_id' => $userId]);
        $agent = $statement->fetch(PDO::FETCH_ASSOC);

        return $agent === false ? null : $agent;
    }

    private function findSubAgentByUserId(int $userId): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT sa.*, sa.agent_id AS agent_id, a.agency_name, a.tier, a.status AS agency_status
             FROM sub_agents sa
             INNER JOIN agents a ON a.id = sa.agent_id
             WHERE sa.user_id = :user_id
             LIMIT 1'
        );
        $statement->execute(['user_id' => $userId]);
        $subAgent = $statement->fetch(PDO::FETCH_ASSOC);

        return $subAgent === false ? null : $subAgent;
    }

    private function findLeadById(int $leadId): ?array
    {
        $statement = $this->connection->prepare('SELECT * FROM leads WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $leadId]);
        $lead = $statement->fetch(PDO::FETCH_ASSOC);

        return $lead === false ? null : $lead;
    }

    private function assertLeadAccess(array $lead, int $userId, string $role): void
    {
        $profile = $this->profileForUser($userId, $role);

        if ($profile === null) {
            Response::error('Agent profile not found', 'RESOURCE_NOT_FOUND', 404);
        }

        $agentId = (int) ($profile['agent_id'] ?? $profile['id']);

        if ((int) $lead['agent_id'] !== $agentId) {
            Response::error('You do not have permission to access this lead', 'AUTH_INSUFFICIENT_ROLE', 403);
        }

        if ($role === 'sub_agent' && (int) ($lead['sub_agent_id'] ?? 0) !== (int) $profile['id']) {
            Response::error('You do not have permission to access this lead', 'AUTH_INSUFFICIENT_ROLE', 403);
        }
    }

    private function countLeads(int $agentId, ?int $subAgentId): int
    {
        $sql = 'SELECT COUNT(*) FROM leads WHERE agent_id = :agent_id';
        $params = ['agent_id' => $agentId];

        if ($subAgentId !== null) {
            $sql .= ' AND sub_agent_id = :sub_agent_id';
            $params['sub_agent_id'] = $subAgentId;
        }

        $statement = $this->connection->prepare($sql);
        $statement->execute($params);

        return (int) $statement->fetchColumn();
    }

    private function countApplications(int $agentId, ?int $subAgentId): int
    {
        $sql = 'SELECT COUNT(*) FROM applications WHERE agent_id = :agent_id';
        $params = ['agent_id' => $agentId];

        if ($subAgentId !== null) {
            $sql .= ' AND sub_agent_id = :sub_agent_id';
            $params['sub_agent_id'] = $subAgentId;
        }

        $statement = $this->connection->prepare($sql);
        $statement->execute($params);

        return (int) $statement->fetchColumn();
    }

    private function sumPendingCommission(int $agentId): string
    {
        $statement = $this->connection->prepare(
            "SELECT COALESCE(SUM(net_amount), 0) FROM commission_claims WHERE agent_id = :agent_id AND status IN ('pending','under_review','approved')"
        );
        $statement->execute(['agent_id' => $agentId]);

        return number_format((float) $statement->fetchColumn(), 2, '.', '');
    }
}
