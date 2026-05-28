<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;

final class University extends BaseModel
{
    public function listUniversities(array $filters): array
    {
        [$joins, $where, $params] = $this->buildUniversityFilters($filters);
        [$perPage, $offset] = $this->resolvePagination($filters);

        $countStatement = $this->connection->prepare(
            'SELECT COUNT(DISTINCT u.id)
             FROM universities u
             ' . $joins . '
             ' . $where
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
                COUNT(DISTINCT p.id) AS program_count,
                MIN(p.tuition_fee) AS starting_tuition,
                MIN(CASE WHEN p.tuition_fee IS NOT NULL THEN p.tuition_currency ELSE NULL END) AS starting_tuition_currency
             FROM universities u
             ' . $joins . '
             ' . $where . '
             GROUP BY u.id, u.name, u.short_name, u.country, u.city, u.partnership_type
             ORDER BY
                CASE u.partnership_type WHEN "exclusive" THEN 0 ELSE 1 END,
                u.name ASC
             LIMIT :limit OFFSET :offset'
        );

        foreach ($params as $key => $value) {
            $statement->bindValue($key, $value);
        }

        $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        return [
            'items' => array_map([$this, 'mapUniversitySummary'], $statement->fetchAll(PDO::FETCH_ASSOC) ?: []),
            'meta' => $this->paginationMeta($filters, $perPage, $total),
        ];
    }

    public function listPrograms(array $filters): array
    {
        [$where, $params] = $this->buildProgramFilters($filters);
        [$perPage, $offset] = $this->resolvePagination($filters);

        $countStatement = $this->connection->prepare(
            'SELECT COUNT(*)
             FROM programs p
             INNER JOIN universities u ON u.id = p.university_id
             ' . $where
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
                u.name AS university_name,
                u.short_name AS university_short_name,
                u.country AS university_country,
                u.city AS university_city,
                u.partnership_type
             FROM programs p
             INNER JOIN universities u ON u.id = p.university_id
             ' . $where . '
             ORDER BY
                CASE u.partnership_type WHEN "exclusive" THEN 0 ELSE 1 END,
                p.name ASC
             LIMIT :limit OFFSET :offset'
        );

        foreach ($params as $key => $value) {
            $statement->bindValue($key, $value);
        }

        $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        return [
            'items' => array_map([$this, 'mapProgramSummary'], $statement->fetchAll(PDO::FETCH_ASSOC) ?: []),
            'meta' => $this->paginationMeta($filters, $perPage, $total),
        ];
    }

    public function findDetail(int $universityId): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT
                u.id,
                u.name,
                u.short_name,
                u.country,
                u.city,
                u.partnership_type,
                COUNT(DISTINCT p.id) AS program_count,
                MIN(p.tuition_fee) AS starting_tuition,
                MIN(CASE WHEN p.tuition_fee IS NOT NULL THEN p.tuition_currency ELSE NULL END) AS starting_tuition_currency
             FROM universities u
             LEFT JOIN programs p ON p.university_id = u.id AND p.is_active = 1
             WHERE u.id = :id AND u.is_active = 1
             GROUP BY u.id, u.name, u.short_name, u.country, u.city, u.partnership_type
             LIMIT 1'
        );
        $statement->execute([':id' => $universityId]);
        $university = $statement->fetch(PDO::FETCH_ASSOC);

        if ($university === false) {
            return null;
        }

        $detail = $this->mapUniversitySummary($university);
        $detail['programs'] = $this->listPrograms([
            'university_id' => $universityId,
            'page' => 1,
            'per_page' => 100,
        ])['items'];

        return $detail;
    }

    public function compare(array $ids): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn (int $id): bool => $id > 0)));

        if ($ids === []) {
            return [];
        }

        $placeholders = [];
        $params = [];

        foreach ($ids as $index => $id) {
            $placeholder = ':id_' . $index;
            $placeholders[] = $placeholder;
            $params[$placeholder] = $id;
        }

        $statement = $this->connection->prepare(
            'SELECT
                u.id,
                u.name,
                u.short_name,
                u.country,
                u.city,
                u.partnership_type,
                COUNT(DISTINCT p.id) AS program_count,
                MIN(p.tuition_fee) AS starting_tuition,
                MIN(CASE WHEN p.tuition_fee IS NOT NULL THEN p.tuition_currency ELSE NULL END) AS starting_tuition_currency
             FROM universities u
             LEFT JOIN programs p ON p.university_id = u.id AND p.is_active = 1
             WHERE u.is_active = 1 AND u.id IN (' . implode(', ', $placeholders) . ')
             GROUP BY u.id, u.name, u.short_name, u.country, u.city, u.partnership_type
             ORDER BY FIELD(u.id, ' . implode(', ', array_map('intval', $ids)) . ')'
        );

        foreach ($params as $key => $value) {
            $statement->bindValue($key, $value, PDO::PARAM_INT);
        }

        $statement->execute();
        $universities = array_map([$this, 'mapUniversitySummary'], $statement->fetchAll(PDO::FETCH_ASSOC) ?: []);

        foreach ($universities as &$university) {
            $university['programs'] = $this->listPrograms([
                'university_id' => $university['id'],
                'page' => 1,
                'per_page' => 12,
            ])['items'];
        }

        return $universities;
    }

    private function buildUniversityFilters(array $filters): array
    {
        $joins = 'LEFT JOIN programs p ON p.university_id = u.id AND p.is_active = 1';
        $where = ['u.is_active = 1'];
        $params = [];

        if (($filters['country'] ?? '') !== '') {
            $where[] = 'u.country = :country';
            $params[':country'] = (string) $filters['country'];
        }

        if (($filters['partnership_type'] ?? '') !== '') {
            $where[] = 'u.partnership_type = :partnership_type';
            $params[':partnership_type'] = (string) $filters['partnership_type'];
        }

        if (($filters['subject_area'] ?? '') !== '') {
            $where[] = 'p.subject_area = :subject_area';
            $params[':subject_area'] = (string) $filters['subject_area'];
        }

        if (($filters['degree_level'] ?? '') !== '') {
            $where[] = 'p.degree_level = :degree_level';
            $params[':degree_level'] = (string) $filters['degree_level'];
        }

        if (($filters['q'] ?? '') !== '') {
            $where[] = '(u.name LIKE :q_name OR u.short_name LIKE :q_short_name OR u.country LIKE :q_country OR u.city LIKE :q_city)';
            $search = '%' . trim((string) $filters['q']) . '%';
            $params[':q_name'] = $search;
            $params[':q_short_name'] = $search;
            $params[':q_country'] = $search;
            $params[':q_city'] = $search;
        }

        return [$joins, 'WHERE ' . implode(' AND ', $where), $params];
    }

    private function buildProgramFilters(array $filters): array
    {
        $where = ['p.is_active = 1', 'u.is_active = 1'];
        $params = [];

        if (($filters['country'] ?? '') !== '') {
            $where[] = 'u.country = :country';
            $params[':country'] = (string) $filters['country'];
        }

        if (($filters['subject_area'] ?? '') !== '') {
            $where[] = 'p.subject_area = :subject_area';
            $params[':subject_area'] = (string) $filters['subject_area'];
        }

        if (($filters['degree_level'] ?? '') !== '') {
            $where[] = 'p.degree_level = :degree_level';
            $params[':degree_level'] = (string) $filters['degree_level'];
        }

        if (($filters['university_id'] ?? null) !== null && (int) $filters['university_id'] > 0) {
            $where[] = 'u.id = :university_id';
            $params[':university_id'] = (int) $filters['university_id'];
        }

        if (($filters['budget_max'] ?? null) !== null && (float) $filters['budget_max'] > 0) {
            $where[] = 'p.tuition_fee <= :budget_max';
            $params[':budget_max'] = (float) $filters['budget_max'];
        }

        if (($filters['partnership_type'] ?? '') !== '') {
            $where[] = 'u.partnership_type = :partnership_type';
            $params[':partnership_type'] = (string) $filters['partnership_type'];
        }

        if (($filters['q'] ?? '') !== '') {
            $where[] = '(p.name LIKE :q_program_name OR p.subject_area LIKE :q_subject_area OR u.name LIKE :q_university_name OR u.country LIKE :q_country OR u.city LIKE :q_city)';
            $search = '%' . trim((string) $filters['q']) . '%';
            $params[':q_program_name'] = $search;
            $params[':q_subject_area'] = $search;
            $params[':q_university_name'] = $search;
            $params[':q_country'] = $search;
            $params[':q_city'] = $search;
        }

        return ['WHERE ' . implode(' AND ', $where), $params];
    }

    private function resolvePagination(array $filters): array
    {
        $page = max(1, (int) ($filters['page'] ?? 1));
        $perPage = max(1, min(100, (int) ($filters['per_page'] ?? 12)));

        return [$perPage, ($page - 1) * $perPage];
    }

    private function paginationMeta(array $filters, int $perPage, int $total): array
    {
        $page = max(1, (int) ($filters['page'] ?? 1));
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

    private function mapUniversitySummary(array $row): array
    {
        $startingTuition = $row['starting_tuition'] !== null ? (float) $row['starting_tuition'] : null;
        $currency = $row['starting_tuition_currency'] !== null ? (string) $row['starting_tuition_currency'] : null;

        return [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'shortName' => $row['short_name'] !== null ? (string) $row['short_name'] : null,
            'country' => (string) $row['country'],
            'city' => $row['city'] !== null ? (string) $row['city'] : null,
            'partnershipType' => (string) $row['partnership_type'],
            'isExclusive' => (string) $row['partnership_type'] === 'exclusive',
            'programCount' => (int) $row['program_count'],
            'startingTuition' => $startingTuition,
            'startingTuitionCurrency' => $currency,
            'startingTuitionLabel' => $startingTuition !== null && $currency !== null
                ? sprintf('%s %s', $currency, number_format($startingTuition, 0))
                : null,
        ];
    }

    private function mapProgramSummary(array $row): array
    {
        $tuitionFee = $row['tuition_fee'] !== null ? (float) $row['tuition_fee'] : null;
        $currency = $row['tuition_currency'] !== null ? (string) $row['tuition_currency'] : null;
        $intakeMonths = $this->decodeJsonArray($row['intake_months_json'] ?? null);

        return [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'degreeLevel' => (string) $row['degree_level'],
            'subjectArea' => $row['subject_area'] !== null ? (string) $row['subject_area'] : null,
            'tuitionFee' => $tuitionFee,
            'tuitionCurrency' => $currency,
            'tuitionLabel' => $tuitionFee !== null && $currency !== null
                ? sprintf('%s %s', $currency, number_format($tuitionFee, 0))
                : null,
            'intakeMonths' => $intakeMonths,
            'university' => [
                'id' => (int) $row['university_id'],
                'name' => (string) $row['university_name'],
                'shortName' => $row['university_short_name'] !== null ? (string) $row['university_short_name'] : null,
                'country' => (string) $row['university_country'],
                'city' => $row['university_city'] !== null ? (string) $row['university_city'] : null,
                'partnershipType' => (string) $row['partnership_type'],
                'isExclusive' => (string) $row['partnership_type'] === 'exclusive',
            ],
        ];
    }

    private function decodeJsonArray(?string $json): array
    {
        if ($json === null || trim($json) === '') {
            return [];
        }

        $decoded = json_decode($json, true);

        return is_array($decoded) ? array_values(array_filter($decoded, static fn (mixed $value): bool => is_string($value) && $value !== '')) : [];
    }
}
