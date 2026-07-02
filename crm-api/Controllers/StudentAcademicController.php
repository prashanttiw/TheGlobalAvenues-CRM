<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Services\AgentAccessService;

class StudentAcademicController
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

    /**
     * Resolves the target student for an agent-facing endpoint given the student's
     * public_id, authorizing via the same tier-scoped subtree check used everywhere
     * else agents act on a specific student.
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

    public function getProfile(): void
    {
        $user = AuthMiddleware::user();
        $studentId = $this->getStudentId($user['id']);

        Response::json($this->getProfileFor($studentId));
    }

    public function agentGetProfile(string $studentPid): void
    {
        $studentId = $this->resolveAgentTargetStudentId($studentPid);

        Response::json($this->getProfileFor($studentId));
    }

    private function getProfileFor(int $studentId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT public_id, institution_name, degree_level, field_of_study, start_date, end_date, score_type, score_value, is_highest_qualification
            FROM student_academics
            WHERE student_id = ? AND deleted_at IS NULL
            ORDER BY start_date DESC
        ");
        $stmt->execute([$studentId]);
        $academics = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $this->pdo->prepare("
            SELECT public_id, test_name, overall_score, reading_score, writing_score, listening_score, speaking_score, test_date
            FROM student_test_scores
            WHERE student_id = ? AND deleted_at IS NULL
            ORDER BY test_date DESC
        ");
        $stmt->execute([$studentId]);
        $testScores = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'academics' => $academics,
            'test_scores' => $testScores
        ];
    }

    public function addAcademic(): void
    {
        $user = AuthMiddleware::user();
        $studentId = $this->getStudentId($user['id']);
        $input = json_decode(file_get_contents('php://input'), true);

        $publicId = $this->addAcademicFor($studentId, $input ?? []);

        Response::json(['message' => 'Academic record added', 'public_id' => $publicId], 201);
    }

    public function agentAddAcademic(string $studentPid): void
    {
        $studentId = $this->resolveAgentTargetStudentId($studentPid);
        $input = json_decode(file_get_contents('php://input'), true);

        $publicId = $this->addAcademicFor($studentId, $input ?? []);

        Response::json(['message' => 'Academic record added', 'public_id' => $publicId], 201);
    }

    private function addAcademicFor(int $studentId, array $input): string
    {
        if (empty($input['institution_name']) || empty($input['degree_level'])) {
            Response::error('Institution name and degree level are required', 'VALIDATION_ERROR', 400);
        }

        $publicId = UlidGenerator::generate();

        $stmt = $this->pdo->prepare("
            INSERT INTO student_academics (
                public_id, student_id, institution_name, degree_level, field_of_study,
                start_date, end_date, score_type, score_value, is_highest_qualification
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $publicId,
            $studentId,
            $input['institution_name'],
            $input['degree_level'],
            $input['field_of_study'] ?? null,
            $input['start_date'] ?? null,
            $input['end_date'] ?? null,
            $input['score_type'] ?? null,
            $input['score_value'] ?? null,
            !empty($input['is_highest_qualification']) ? 1 : 0
        ]);

        return $publicId;
    }

    public function addTestScore(): void
    {
        $user = AuthMiddleware::user();
        $studentId = $this->getStudentId($user['id']);
        $input = json_decode(file_get_contents('php://input'), true);

        $publicId = $this->addTestScoreFor($studentId, $input ?? []);

        Response::json(['message' => 'Test score added', 'public_id' => $publicId], 201);
    }

    public function agentAddTestScore(string $studentPid): void
    {
        $studentId = $this->resolveAgentTargetStudentId($studentPid);
        $input = json_decode(file_get_contents('php://input'), true);

        $publicId = $this->addTestScoreFor($studentId, $input ?? []);

        Response::json(['message' => 'Test score added', 'public_id' => $publicId], 201);
    }

    private function addTestScoreFor(int $studentId, array $input): string
    {
        if (empty($input['test_name']) || empty($input['overall_score'])) {
            Response::error('Test name and overall score are required', 'VALIDATION_ERROR', 400);
        }

        $publicId = UlidGenerator::generate();

        $stmt = $this->pdo->prepare("
            INSERT INTO student_test_scores (
                public_id, student_id, test_name, overall_score,
                reading_score, writing_score, listening_score, speaking_score, test_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $publicId,
            $studentId,
            $input['test_name'],
            $input['overall_score'],
            $input['reading_score'] ?? null,
            $input['writing_score'] ?? null,
            $input['listening_score'] ?? null,
            $input['speaking_score'] ?? null,
            $input['test_date'] ?? null
        ]);

        return $publicId;
    }

    public function deleteAcademic(string $publicId): void
    {
        $user = AuthMiddleware::user();
        $studentId = $this->getStudentId($user['id']);

        $this->deleteAcademicFor($studentId, $publicId);

        Response::json(['message' => 'Academic record deleted']);
    }

    public function agentDeleteAcademic(string $studentPid, string $recordPid): void
    {
        $studentId = $this->resolveAgentTargetStudentId($studentPid);

        $this->deleteAcademicFor($studentId, $recordPid);

        Response::json(['message' => 'Academic record deleted']);
    }

    private function deleteAcademicFor(int $studentId, string $publicId): void
    {
        $stmt = $this->pdo->prepare("UPDATE student_academics SET deleted_at = NOW() WHERE public_id = ? AND student_id = ?");
        $stmt->execute([$publicId, $studentId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Record not found or already deleted', 'NOT_FOUND', 404);
        }
    }

    public function deleteTestScore(string $publicId): void
    {
        $user = AuthMiddleware::user();
        $studentId = $this->getStudentId($user['id']);

        $this->deleteTestScoreFor($studentId, $publicId);

        Response::json(['message' => 'Test score deleted']);
    }

    public function agentDeleteTestScore(string $studentPid, string $recordPid): void
    {
        $studentId = $this->resolveAgentTargetStudentId($studentPid);

        $this->deleteTestScoreFor($studentId, $recordPid);

        Response::json(['message' => 'Test score deleted']);
    }

    private function deleteTestScoreFor(int $studentId, string $publicId): void
    {
        $stmt = $this->pdo->prepare("UPDATE student_test_scores SET deleted_at = NOW() WHERE public_id = ? AND student_id = ?");
        $stmt->execute([$publicId, $studentId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Record not found or already deleted', 'NOT_FOUND', 404);
        }
    }
}
