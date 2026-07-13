<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Middleware\RBACMiddleware;
use TGA\CRM\Models\InternalNoteModel;
use TGA\CRM\Services\ActivityLogger;

class InternalNotesController
{
    private PDO $pdo;
    private InternalNoteModel $model;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
        $this->model = new InternalNoteModel($this->pdo);
    }

    /** @var array<string,string> entityType => page-access module key, shared by verifyModuleAccess() and the cross-author check in update()/delete() */
    private const ENTITY_PERM_MAP = [
        'student' => 'students',
        'application' => 'applications',
        'agent' => 'agents',
        'university' => 'universities',
        'course' => 'courses',
        'lead' => 'leads',
    ];

    private function verifyModuleAccess(string $entityType, int $recordId, array $user, string $action = 'view'): void
    {
        // Admins use RBAC. $action defaults to 'view' (list/read, and the record-visibility
        // check update()/delete() run before their own separate write-permission check) —
        // create() passes 'edit' explicitly, since adding a note is a write action and was
        // previously only gated on view, letting a read-only-granted admin create notes.
        if ($user['utype'] === 'admin') {
            $perm = self::ENTITY_PERM_MAP[$entityType] ?? null;
            if ($perm) {
                RBACMiddleware::requirePermission($perm, $action);
            }
        } elseif ($user['utype'] === 'agent') {
            // Agents can only view notes on students/applications within their subtree
            $stmt = $this->pdo->prepare("SELECT root_agent_id FROM agents WHERE user_id = ?");
            $stmt->execute([$user['id']]);
            $rootAgentId = $stmt->fetchColumn() ?: $user['id'];

            if ($entityType === 'student') {
                $stmt = $this->pdo->prepare("
                    SELECT s.id FROM students s
                    LEFT JOIN agents a ON a.id = s.agent_id
                    WHERE s.id = ? AND a.root_agent_id = ? AND s.deleted_at IS NULL
                ");
                $stmt->execute([$recordId, $rootAgentId]);
                if (!$stmt->fetch()) Response::error('Access denied', 'FORBIDDEN', 403);
            } elseif ($entityType === 'application') {
                $stmt = $this->pdo->prepare("
                    SELECT app.id FROM applications app
                    JOIN students s ON app.student_id = s.id
                    LEFT JOIN agents a ON a.id = s.agent_id
                    WHERE app.id = ? AND a.root_agent_id = ? AND app.deleted_at IS NULL
                ");
                $stmt->execute([$recordId, $rootAgentId]);
                if (!$stmt->fetch()) Response::error('Access denied', 'FORBIDDEN', 403);
            } else {
                Response::error('Access denied', 'FORBIDDEN', 403);
            }
        } elseif ($user['utype'] === 'student') {
            // Students can only view notes on themselves or their applications
            if ($entityType === 'student' && $recordId !== (int)$user['id']) {
                Response::error('Access denied', 'FORBIDDEN', 403);
            } elseif ($entityType === 'application') {
                $stmt = $this->pdo->prepare("SELECT id FROM applications WHERE id = ? AND student_id = ? AND deleted_at IS NULL");
                $stmt->execute([$recordId, $user['id']]);
                if (!$stmt->fetch()) Response::error('Access denied', 'FORBIDDEN', 403);
            } else {
                Response::error('Access denied', 'FORBIDDEN', 403);
            }
        }

        // Verify the record actually exists to avoid clutter
        $tableName = $entityType === 'university' ? 'universities' : $entityType . 's';
        $stmt = $this->pdo->prepare("SELECT id FROM {$tableName} WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$recordId]);
        if (!$stmt->fetch()) {
            Response::error(ucfirst($tableName) . ' record not found', 'NOT_FOUND', 404);
        }
    }

    public function list(string $moduleName, string $recordPublicId): void
    {
        $user = AuthMiddleware::user();
        $entityType = $this->mapModuleToEntity($moduleName);
        $recordId = $this->resolvePublicId($entityType, $recordPublicId);
        $this->verifyModuleAccess($entityType, $recordId, $user);

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 50;
        $offset = ($page - 1) * $perPage;

        $user = AuthMiddleware::user();
        $notes = $this->model->findVisibleNotes($entityType, $recordId, $user, $perPage, $offset);

        // Sanitize output
        $sanitizedNotes = array_map(function($note) {
            return [
                'public_id' => $note['public_id'],
                'content' => $note['content'],
                'is_pinned' => (bool)$note['is_pinned'],
                'visible_to_student' => (bool)$note['visible_to_student'],
                'visible_to_agent' => (bool)$note['visible_to_agent'],
                'visible_to_admin' => (bool)$note['visible_to_admin'],
                'created_at' => $note['created_at'],
                'author' => [
                    'full_name' => $note['author_full_name'] ?? 'Unknown',
                    'user_type' => $note['user_type']
                ]
            ];
        }, $notes);

        Response::json(['data' => $sanitizedNotes]);
    }

    public function create(string $moduleName, string $recordPublicId): void
    {
        $user = AuthMiddleware::user();
        $entityType = $this->mapModuleToEntity($moduleName);
        $recordId = $this->resolvePublicId($entityType, $recordPublicId);
        $this->verifyModuleAccess($entityType, $recordId, $user, 'edit');

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $content = trim($input['content'] ?? '');
        $isPinned = !empty($input['is_pinned']) ? 1 : 0;
        $visibleToStudent = !empty($input['visible_to_student']) ? 1 : 0;
        $visibleToAgent = !empty($input['visible_to_agent']) ? 1 : 0;
        $visibleToAdmin = !empty($input['visible_to_admin']) ? 1 : 1; // Always visible to admin default

        if (!$content) {
            Response::error('Note content is required', 'VALIDATION_ERROR', 400);
        }

        $pid = UlidGenerator::generate();
        $noteId = $this->model->insert([
            'public_id' => $pid,
            'entity_type' => $entityType,
            'entity_id' => $recordId,
            'content' => $content,
            'is_pinned' => $isPinned,
            'author_type' => $user['utype'],
            'author_id' => $user['id'],
            'visible_to_student' => $visibleToStudent,
            'visible_to_agent' => $visibleToAgent,
            'visible_to_admin' => $visibleToAdmin
        ]);

        ActivityLogger::log('internal_note.added', $entityType, $recordId, (int)$user['id'], [], ['note_id' => $noteId]);

        $note = $this->model->findById($noteId);
        Response::json(['data' => $note], 201);
    }

    public function update(string $pid): void
    {
        $user = AuthMiddleware::user();

        $note = $this->model->findByPublicId($pid);
        if (!$note) {
            Response::error('Note not found', 'NOT_FOUND', 404);
        }

        $isOwnNote = (string)$note['author_id'] === (string)$user['id'];
        if ($user['utype'] !== 'admin' && !$isOwnNote) {
            Response::error('You can only edit your own notes', 'FORBIDDEN', 403);
        }
        // An admin editing someone ELSE's note needs write access to that module, not just
        // view — previously any admin who could merely *see* the module (view-only grant)
        // could edit or delete every other admin's notes on it. Editing your own note is
        // still always allowed regardless of grant level.
        if ($user['utype'] === 'admin' && !$isOwnNote) {
            $perm = self::ENTITY_PERM_MAP[$note['entity_type']] ?? null;
            if ($perm) {
                RBACMiddleware::requirePermission($perm, 'edit');
            }
        }

        $this->verifyModuleAccess($note['entity_type'], (int)$note['entity_id'], $user);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $updateData = [];

        if (isset($input['content'])) {
            $updateData['content'] = trim($input['content']);
        }
        if (isset($input['is_pinned'])) {
            $updateData['is_pinned'] = !empty($input['is_pinned']) ? 1 : 0;
        }

        if (!empty($updateData)) {
            $this->model->update($note['id'], $updateData);
            ActivityLogger::log('internal_note.updated', $note['entity_type'], (int)$note['entity_id'], (int)$user['id']);
        }

        $updatedNote = $this->model->findById($note['id']);
        Response::json(['data' => $updatedNote]);
    }

    public function delete(string $pid): void
    {
        $user = AuthMiddleware::user();

        $note = $this->model->findByPublicId($pid);
        if (!$note) {
            Response::error('Note not found', 'NOT_FOUND', 404);
        }

        $isOwnNote = (string)$note['author_id'] === (string)$user['id'];
        if ($user['utype'] !== 'admin' && !$isOwnNote) {
            Response::error('You can only delete your own notes', 'FORBIDDEN', 403);
        }
        if ($user['utype'] === 'admin' && !$isOwnNote) {
            $perm = self::ENTITY_PERM_MAP[$note['entity_type']] ?? null;
            if ($perm) {
                RBACMiddleware::requirePermission($perm, 'edit');
            }
        }

        $this->verifyModuleAccess($note['entity_type'], (int)$note['entity_id'], $user);

        $this->model->softDelete($note['id']);
        ActivityLogger::log('internal_note.deleted', $note['entity_type'], (int)$note['entity_id'], (int)$user['id']);

        Response::json(['success' => true, 'message' => 'Note deleted']);
    }

    private function resolvePublicId(string $entityType, string $publicId): int
    {
        // Simple mapping to get ID from public_id for various tables
        $validEntities = ['student', 'application', 'agent', 'university', 'course', 'lead'];
        if (!in_array($entityType, $validEntities)) {
            Response::error('Invalid entity type', 'VALIDATION_ERROR', 400);
        }

        $tableName = $entityType === 'university' ? 'universities' : $entityType . 's';

        $stmt = $this->pdo->prepare("SELECT id FROM {$tableName} WHERE public_id = ? AND deleted_at IS NULL LIMIT 1");
        $stmt->execute([$publicId]);
        $id = $stmt->fetchColumn();

        if (!$id) {
            Response::error('Record not found', 'NOT_FOUND', 404);
        }

        return (int) $id;
    }

    private function mapModuleToEntity(string $moduleName): string
    {
        $map = [
            'students' => 'student',
            'applications' => 'application',
            'agents' => 'agent',
            'universities' => 'university',
            'courses' => 'course',
            'leads' => 'lead'
        ];
        return $map[$moduleName] ?? 'unknown';
    }
}
