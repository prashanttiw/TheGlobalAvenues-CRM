<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use TGA\CRM\Helpers\Response;
use TGA\CRM\Models\University;

final class UniversityController extends BaseController
{
    private University $universities;

    public function __construct()
    {
        $this->universities = new University();
    }

    public function list(): void
    {
        $result = $this->universities->listUniversities($this->catalogFilters());

        Response::success('Universities fetched successfully', [
            'universities' => $result['items'],
        ], $result['meta']);
    }

    public function search(): void
    {
        $result = $this->universities->listPrograms($this->catalogFilters());

        Response::success('Programs fetched successfully', [
            'programs' => $result['items'],
        ], $result['meta']);
    }

    public function getDetail(): void
    {
        $universityId = (int) $this->getQueryParam('id', 0);

        if ($universityId <= 0) {
            Response::error('University id is required', 'VALIDATION_FAILED', 422, [
                'id' => 'University id is required.',
            ]);
        }

        $university = $this->universities->findDetail($universityId);

        if ($university === null) {
            Response::error('University not found', 'RESOURCE_NOT_FOUND', 404);
        }

        Response::success('University fetched successfully', [
            'university' => $university,
        ]);
    }

    public function getPrograms(): void
    {
        $filters = $this->catalogFilters();
        $filters['university_id'] = (int) $this->getQueryParam('id', $this->getQueryParam('university_id', 0));

        $result = $this->universities->listPrograms($filters);

        Response::success('Programs fetched successfully', [
            'programs' => $result['items'],
        ], $result['meta']);
    }

    public function compare(): void
    {
        $rawIds = (string) $this->getQueryParam('ids', '');
        $ids = array_filter(array_map('trim', explode(',', $rawIds)), static fn (string $value): bool => $value !== '');

        if ($ids === []) {
            Response::error('At least one university id is required', 'VALIDATION_FAILED', 422, [
                'ids' => 'Provide a comma-separated list of university ids.',
            ]);
        }

        Response::success('Universities compared successfully', [
            'universities' => $this->universities->compare($ids),
        ]);
    }

    private function catalogFilters(): array
    {
        return [
            'page' => (int) $this->getQueryParam('page', 1),
            'per_page' => (int) $this->getQueryParam('per_page', 12),
            'q' => (string) $this->getQueryParam('q', ''),
            'country' => (string) $this->getQueryParam('country', ''),
            'subject_area' => (string) $this->getQueryParam('subject_area', ''),
            'degree_level' => (string) $this->getQueryParam('degree_level', ''),
            'partnership_type' => (string) $this->getQueryParam('partnership_type', ''),
            'budget_max' => $this->getQueryParam('budget_max', null),
        ];
    }
}
