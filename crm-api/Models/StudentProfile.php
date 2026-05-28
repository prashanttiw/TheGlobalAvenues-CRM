<?php

declare(strict_types=1);

namespace TGA\CRM\Models;

use PDO;

final class StudentProfile extends BaseModel
{
    private const UPDATABLE_FIELDS = [
        'first_name',
        'last_name',
        'middle_name',
        'dob',
        'gender',
        'nationality',
        'country_of_residence',
        'passport_number',
        'passport_expiry',
        'desired_country',
        'desired_subject',
        'desired_degree_level',
        'budget_min',
        'budget_max',
        'budget_currency',
        'career_goal',
    ];

    public function findByUserId(int $userId): ?array
    {
        $statement = $this->connection->prepare('SELECT * FROM student_profiles WHERE user_id = :user_id LIMIT 1');
        $statement->execute(['user_id' => $userId]);
        $profile = $statement->fetch(PDO::FETCH_ASSOC);

        return $profile === false ? null : $profile;
    }

    public function updateByUserId(int $userId, array $data): array
    {
        $profile = $this->findByUserId($userId);

        if ($profile === null) {
            throw new \RuntimeException('Student profile not found');
        }

        $setClauses = [];
        $parameters = ['user_id' => $userId];

        foreach (self::UPDATABLE_FIELDS as $field) {
            if (array_key_exists($field, $data)) {
                $setClauses[] = $field . ' = :' . $field;
                $parameters[$field] = $data[$field];
                $profile[$field] = $data[$field];
            }
        }

        $profile['profile_completion'] = $this->calculateCompletion($profile);
        $setClauses[] = 'profile_completion = :profile_completion';
        $parameters['profile_completion'] = $profile['profile_completion'];

        if ($setClauses !== []) {
            $statement = $this->connection->prepare(
                'UPDATE student_profiles SET ' . implode(', ', $setClauses) . ' WHERE user_id = :user_id'
            );
            $statement->execute($parameters);
        }

        return $this->findByUserId($userId) ?? $profile;
    }

    private function calculateCompletion(array $profile): int
    {
        $trackedFields = [
            'first_name',
            'last_name',
            'dob',
            'nationality',
            'country_of_residence',
            'passport_number',
            'desired_country',
            'desired_subject',
            'desired_degree_level',
            'budget_min',
            'budget_max',
            'career_goal',
        ];

        $filled = 0;

        foreach ($trackedFields as $field) {
            $value = $profile[$field] ?? null;

            if ($value !== null && $value !== '') {
                $filled++;
            }
        }

        return (int) round(($filled / count($trackedFields)) * 100);
    }
}
