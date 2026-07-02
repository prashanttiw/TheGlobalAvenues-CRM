<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\FileUploadService;

class StudentCustomFieldController
{
    private const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'file'];

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

        return (int) $studentId;
    }

    private function findDefinitionByPublicId(string $pid): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM student_custom_field_definitions WHERE public_id = ? AND deleted_at IS NULL");
        $stmt->execute([$pid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    // ── Admin: schema management ────────────────────────────────────────

    public function adminListDefinitions(): void
    {
        RBACMiddleware::requirePermission('students', 'edit');

        $stmt = $this->pdo->query("
            SELECT public_id, label, field_type, options, is_required, display_order, is_active, created_at, updated_at
            FROM student_custom_field_definitions
            WHERE deleted_at IS NULL
            ORDER BY display_order ASC, created_at ASC
        ");
        $definitions = array_map([$this, 'formatDefinition'], $stmt->fetchAll(PDO::FETCH_ASSOC));

        Response::json(['definitions' => $definitions]);
    }

    public function adminCreateDefinition(): void
    {
        RBACMiddleware::requirePermission('students', 'edit');
        $user = AuthMiddleware::user();

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $label = trim((string) ($input['label'] ?? ''));
        $fieldType = (string) ($input['field_type'] ?? 'text');

        if ($label === '') {
            Response::error('Label is required.', 'VALIDATION_ERROR', 400);
        }
        if (!in_array($fieldType, self::FIELD_TYPES, true)) {
            Response::error('Invalid field type.', 'VALIDATION_ERROR', 400);
        }

        $options = null;
        if ($fieldType === 'select') {
            $options = $this->normalizeOptions($input['options'] ?? []);
            if ($options === []) {
                Response::error('Select fields need at least one option.', 'VALIDATION_ERROR', 400);
            }
        }

        $nextOrder = ((int) $this->pdo->query(
            "SELECT COALESCE(MAX(display_order), -1) FROM student_custom_field_definitions WHERE deleted_at IS NULL"
        )->fetchColumn()) + 1;

        $pid = UlidGenerator::generate();
        $stmt = $this->pdo->prepare("
            INSERT INTO student_custom_field_definitions
                (public_id, label, field_type, options, is_required, display_order, is_active, created_by)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        ");
        $stmt->execute([
            $pid,
            $label,
            $fieldType,
            $options !== null ? json_encode($options) : null,
            !empty($input['is_required']) ? 1 : 0,
            isset($input['display_order']) ? (int) $input['display_order'] : $nextOrder,
            $user['id'] ?? null,
        ]);

        ActivityLogger::log(
            'student_custom_field.created',
            'student_custom_field_definition',
            (int) $this->pdo->lastInsertId(),
            $user['id'] ?? null,
            [],
            ['label' => $label, 'field_type' => $fieldType]
        );

        Response::json(['definition' => $this->formatDefinition($this->findDefinitionByPublicId($pid))], 201);
    }

    public function adminUpdateDefinition(string $pid): void
    {
        RBACMiddleware::requirePermission('students', 'edit');
        $user = AuthMiddleware::user();

        $definition = $this->findDefinitionByPublicId($pid);
        if (!$definition) {
            Response::error('Field definition not found.', 'NOT_FOUND', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $fields = [];
        $params = [];

        if (array_key_exists('label', $input)) {
            $label = trim((string) $input['label']);
            if ($label === '') {
                Response::error('Label cannot be empty.', 'VALIDATION_ERROR', 400);
            }
            $fields[] = 'label = ?';
            $params[] = $label;
        }

        $fieldType = $definition['field_type'];
        if (array_key_exists('field_type', $input)) {
            $fieldType = (string) $input['field_type'];
            if (!in_array($fieldType, self::FIELD_TYPES, true)) {
                Response::error('Invalid field type.', 'VALIDATION_ERROR', 400);
            }
            $fields[] = 'field_type = ?';
            $params[] = $fieldType;
        }

        if (array_key_exists('options', $input) || array_key_exists('field_type', $input)) {
            if ($fieldType === 'select') {
                $existingOptions = $definition['options'] ? (json_decode((string) $definition['options'], true) ?? []) : [];
                $options = $this->normalizeOptions($input['options'] ?? $existingOptions);
                if ($options === []) {
                    Response::error('Select fields need at least one option.', 'VALIDATION_ERROR', 400);
                }
                $fields[] = 'options = ?';
                $params[] = json_encode($options);
            } else {
                $fields[] = 'options = NULL';
            }
        }

        if (array_key_exists('is_required', $input)) {
            $fields[] = 'is_required = ?';
            $params[] = !empty($input['is_required']) ? 1 : 0;
        }

        if (array_key_exists('display_order', $input)) {
            $fields[] = 'display_order = ?';
            $params[] = (int) $input['display_order'];
        }

        if (array_key_exists('is_active', $input)) {
            $fields[] = 'is_active = ?';
            $params[] = !empty($input['is_active']) ? 1 : 0;
        }

        if ($fields !== []) {
            $params[] = $definition['id'];
            $this->pdo->prepare('UPDATE student_custom_field_definitions SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

            ActivityLogger::log(
                'student_custom_field.updated',
                'student_custom_field_definition',
                (int) $definition['id'],
                $user['id'] ?? null,
                [],
                $input
            );
        }

        Response::json(['definition' => $this->formatDefinition($this->findDefinitionByPublicId($pid))]);
    }

    public function adminDeleteDefinition(string $pid): void
    {
        RBACMiddleware::requirePermission('students', 'edit');
        $user = AuthMiddleware::user();

        $definition = $this->findDefinitionByPublicId($pid);
        if (!$definition) {
            Response::error('Field definition not found.', 'NOT_FOUND', 404);
        }

        $this->pdo->prepare('UPDATE student_custom_field_definitions SET deleted_at = NOW() WHERE id = ?')->execute([$definition['id']]);

        ActivityLogger::log(
            'student_custom_field.deleted',
            'student_custom_field_definition',
            (int) $definition['id'],
            $user['id'] ?? null,
            ['label' => $definition['label']],
            []
        );

        Response::json(['message' => 'Field deleted.']);
    }

    public function adminReorder(): void
    {
        RBACMiddleware::requirePermission('students', 'edit');

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $order = $input['order'] ?? [];

        if (!is_array($order) || $order === []) {
            Response::error('No order provided.', 'VALIDATION_ERROR', 400);
        }

        try {
            $this->pdo->beginTransaction();
            $stmt = $this->pdo->prepare('UPDATE student_custom_field_definitions SET display_order = ? WHERE public_id = ? AND deleted_at IS NULL');
            foreach ($order as $item) {
                if (!is_array($item) || !isset($item['public_id'])) {
                    continue;
                }
                $stmt->execute([(int) ($item['display_order'] ?? 0), $item['public_id']]);
            }
            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }

        Response::json(['message' => 'Order updated.']);
    }

    /**
     * Called by AdminStudentController::adminGetDetail() to build the
     * "Additional Information" snapshot for one student — a LEFT JOIN so
     * fields the student hasn't reached yet still appear, just blank.
     */
    public function buildCustomFieldsSnapshot(int $studentId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT d.public_id AS definition_public_id, d.label, d.field_type, d.options, d.is_required,
                   v.value_text, f.public_id AS file_public_id, f.display_filename
            FROM student_custom_field_definitions d
            LEFT JOIN student_custom_field_values v ON v.definition_id = d.id AND v.student_id = ? AND v.deleted_at IS NULL
            LEFT JOIN files f ON f.id = v.file_id
            WHERE d.deleted_at IS NULL
            ORDER BY d.display_order ASC, d.created_at ASC
        ");
        $stmt->execute([$studentId]);

        return array_map([$this, 'formatValueRow'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // ── Student: fill in values ──────────────────────────────────────────

    public function studentListActiveDefinitions(): void
    {
        $user = AuthMiddleware::user();
        $studentId = $this->getStudentId((int) $user['id']);

        $stmt = $this->pdo->prepare("
            SELECT d.public_id AS definition_public_id, d.label, d.field_type, d.options, d.is_required,
                   v.value_text, f.public_id AS file_public_id, f.display_filename
            FROM student_custom_field_definitions d
            LEFT JOIN student_custom_field_values v ON v.definition_id = d.id AND v.student_id = ? AND v.deleted_at IS NULL
            LEFT JOIN files f ON f.id = v.file_id
            WHERE d.deleted_at IS NULL AND d.is_active = 1
            ORDER BY d.display_order ASC, d.created_at ASC
        ");
        $stmt->execute([$studentId]);

        Response::json(['definitions' => array_map([$this, 'formatValueRow'], $stmt->fetchAll(PDO::FETCH_ASSOC))]);
    }

    public function studentSubmitValue(): void
    {
        $user = AuthMiddleware::user();
        $studentId = $this->getStudentId((int) $user['id']);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $definitionPid = trim((string) ($input['definition_public_id'] ?? ''));

        if ($definitionPid === '') {
            Response::error('definition_public_id is required.', 'VALIDATION_ERROR', 400);
        }

        $definition = $this->findDefinitionByPublicId($definitionPid);
        if (!$definition || !$definition['is_active']) {
            Response::error('Field not found.', 'NOT_FOUND', 404);
        }
        if ($definition['field_type'] === 'file') {
            Response::error('Use the file upload endpoint for this field.', 'VALIDATION_ERROR', 400);
        }

        $value = array_key_exists('value', $input) ? trim((string) $input['value']) : '';
        if ($definition['is_required'] && $value === '') {
            Response::error('This field is required.', 'VALIDATION_ERROR', 400);
        }

        $pid = UlidGenerator::generate();
        $stmt = $this->pdo->prepare("
            INSERT INTO student_custom_field_values (public_id, student_id, definition_id, value_text)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE value_text = VALUES(value_text), deleted_at = NULL, updated_at = NOW()
        ");
        $stmt->execute([$pid, $studentId, $definition['id'], $value !== '' ? $value : null]);

        Response::json(['message' => 'Saved.']);
    }

    public function studentUploadFileValue(): void
    {
        $user = AuthMiddleware::user();
        $studentId = $this->getStudentId((int) $user['id']);

        $definitionPid = trim((string) ($_POST['definition_public_id'] ?? ''));
        if ($definitionPid === '') {
            Response::error('definition_public_id is required.', 'VALIDATION_ERROR', 400);
        }

        $definition = $this->findDefinitionByPublicId($definitionPid);
        if (!$definition || !$definition['is_active']) {
            Response::error('Field not found.', 'NOT_FOUND', 404);
        }
        if ($definition['field_type'] !== 'file') {
            Response::error('This field does not accept file uploads.', 'VALIDATION_ERROR', 400);
        }

        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            Response::error('No file uploaded or upload error.', 'VALIDATION_ERROR', 400);
        }

        $stmt = $this->pdo->prepare('SELECT public_id FROM students WHERE id = ?');
        $stmt->execute([$studentId]);
        $studentPid = $stmt->fetchColumn();

        $existingStmt = $this->pdo->prepare('SELECT id, file_id FROM student_custom_field_values WHERE student_id = ? AND definition_id = ? AND deleted_at IS NULL');
        $existingStmt->execute([$studentId, $definition['id']]);
        $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);

        try {
            $this->pdo->beginTransaction();

            $versionNumber = 1;
            $prevFileId = $existing['file_id'] ?? null;
            if ($prevFileId) {
                $verStmt = $this->pdo->prepare('SELECT version_number FROM files WHERE id = ?');
                $verStmt->execute([$prevFileId]);
                $prevVersion = $verStmt->fetchColumn();
                $versionNumber = $prevVersion ? (int) $prevVersion + 1 : 2;
                $this->pdo->prepare('UPDATE files SET superseded_at = NOW() WHERE id = ?')->execute([$prevFileId]);
            }

            $fileService = new FileUploadService();
            $uploadResult = $fileService->upload(
                $this->pdo,
                $_FILES['file'],
                'other',
                'student',
                $studentId,
                'student',
                (int) $user['id'],
                null,
                false,
                "students/{$studentPid}/custom-fields",
                $versionNumber,
                $prevFileId ? (int) $prevFileId : null
            );

            $fileIdStmt = $this->pdo->prepare('SELECT id FROM files WHERE public_id = ?');
            $fileIdStmt->execute([$uploadResult['public_id']]);
            $fileId = (int) $fileIdStmt->fetchColumn();

            if ($existing) {
                $this->pdo->prepare('UPDATE student_custom_field_values SET file_id = ?, updated_at = NOW() WHERE id = ?')->execute([$fileId, $existing['id']]);
            } else {
                $valuePid = UlidGenerator::generate();
                $this->pdo->prepare('INSERT INTO student_custom_field_values (public_id, student_id, definition_id, file_id) VALUES (?, ?, ?, ?)')
                    ->execute([$valuePid, $studentId, $definition['id'], $fileId]);
            }

            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }

        Response::json([
            'value' => [
                'file_public_id' => $uploadResult['public_id'],
                'display_filename' => $uploadResult['display_filename'],
            ],
        ], 201);
    }

    // ── Helpers ────────────────────────────────────────────────────────

    private function formatDefinition(array $row): array
    {
        return [
            'public_id' => $row['public_id'],
            'label' => $row['label'],
            'field_type' => $row['field_type'],
            'options' => !empty($row['options']) ? json_decode((string) $row['options'], true) : null,
            'is_required' => (bool) $row['is_required'],
            'display_order' => (int) $row['display_order'],
            'is_active' => (bool) $row['is_active'],
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    private function formatValueRow(array $row): array
    {
        return [
            'definition_public_id' => $row['definition_public_id'],
            'label' => $row['label'],
            'field_type' => $row['field_type'],
            'options' => !empty($row['options']) ? json_decode((string) $row['options'], true) : null,
            'is_required' => (bool) $row['is_required'],
            'value_text' => $row['value_text'],
            'file' => $row['file_public_id'] ? [
                'public_id' => $row['file_public_id'],
                'display_filename' => $row['display_filename'],
            ] : null,
        ];
    }

    private function normalizeOptions(mixed $raw): array
    {
        if (!is_array($raw)) {
            return [];
        }

        $options = [];
        foreach ($raw as $opt) {
            if (is_string($opt) && trim($opt) !== '') {
                $options[] = ['value' => trim($opt), 'label' => trim($opt)];
            } elseif (is_array($opt) && !empty($opt['value'])) {
                $options[] = [
                    'value' => (string) $opt['value'],
                    'label' => (string) ($opt['label'] ?? $opt['value']),
                ];
            }
        }

        return $options;
    }
}
