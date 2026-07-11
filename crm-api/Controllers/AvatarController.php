<?php

declare(strict_types=1);

namespace TGA\CRM\Controllers;

use PDO;
use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\FileHelper;
use TGA\CRM\Helpers\Response;
use TGA\CRM\Middleware\AuthMiddleware;
use TGA\CRM\Services\ActivityLogger;
use TGA\CRM\Services\ImageProcessor;

/**
 * Role-agnostic: any authenticated student/agent/admin manages their own avatar.
 * Deliberately does NOT go through FileUploadService/the `files` table — avatars are
 * disposable, constantly-replaced cosmetic images, not audited documents, so they skip
 * versioning, Drive backup sync, and erasure workflows built for real files. Only a
 * filename string is stored, on users.avatar_type / users.avatar_value.
 */
final class AvatarController
{
    // Must match src/lib/avatarPresets.ts exactly — 7 girl presets then 6 boy presets.
    private const VALID_PRESET_KEYS = [
        'preset-1', 'preset-2', 'preset-3', 'preset-4', 'preset-5', 'preset-6', 'preset-7',
        'preset-8', 'preset-9', 'preset-10', 'preset-11', 'preset-12', 'preset-13',
    ];

    private const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    private const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // pre-crop cap; stored derivatives are always small

    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function upload(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();

        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
            Response::error('No image uploaded or upload error.', 'VALIDATION_ERROR', 400);
        }

        $tmpName = (string) $_FILES['avatar']['tmp_name'];
        if ($tmpName === '' || !is_uploaded_file($tmpName)) {
            Response::error('Invalid upload source.', 'VALIDATION_ERROR', 400);
        }

        $size = (int) $_FILES['avatar']['size'];
        if ($size <= 0 || $size > self::MAX_UPLOAD_BYTES) {
            Response::error('Image must be smaller than 5MB.', 'VALIDATION_ERROR', 422);
        }

        $mimeType = strtolower(trim((string) (new \finfo(FILEINFO_MIME_TYPE))->file($tmpName)));
        if (!in_array($mimeType, self::ALLOWED_MIME_TYPES, true)) {
            Response::error('Only JPEG, PNG, or WebP images are allowed.', 'VALIDATION_ERROR', 422);
        }

        $contents = file_get_contents($tmpName);
        if ($contents !== false && preg_match('/<\?(php|=)/i', $contents) === 1) {
            Response::error('The uploaded image contains disallowed content.', 'VALIDATION_ERROR', 422);
        }

        $destDir = self::avatarStorageDir();
        FileHelper::ensureDirectory($destDir);

        $uuid = self::generateUuidV4();
        $filename = ImageProcessor::createAvatarDerivatives($tmpName, $mimeType, $destDir, $uuid);
        if ($filename === null) {
            Response::error('Could not process the uploaded image.', 'PROCESSING_ERROR', 422);
        }

        $this->replaceAvatar($user['id'], 'upload', $filename);

        ActivityLogger::log('user.avatar_updated', 'user', $user['id'], $user['id']);

        Response::json(['data' => $this->currentAvatarUrls('upload', $filename)]);
    }

    public function selectPreset(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $presetKey = trim((string) ($input['preset_key'] ?? ''));
        if (!in_array($presetKey, self::VALID_PRESET_KEYS, true)) {
            Response::error('Unknown preset avatar.', 'VALIDATION_ERROR', 422);
        }

        $this->replaceAvatar($user['id'], 'preset', $presetKey);

        ActivityLogger::log('user.avatar_updated', 'user', $user['id'], $user['id']);

        Response::json(['data' => $this->currentAvatarUrls('preset', $presetKey)]);
    }

    public function remove(): void
    {
        AuthMiddleware::requireAuth();
        $user = AuthMiddleware::user();

        $this->replaceAvatar($user['id'], null, null);

        ActivityLogger::log('user.avatar_updated', 'user', $user['id'], $user['id']);

        Response::json(['data' => ['avatar_type' => null, 'avatar_url' => null, 'avatar_thumb_url' => null]]);
    }

    /** Swaps in the new avatar and cleans up any previously-uploaded derivative files. */
    private function replaceAvatar(int $userId, ?string $type, ?string $value): void
    {
        $stmt = $this->pdo->prepare('SELECT avatar_type, avatar_value FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $previous = $stmt->fetch(PDO::FETCH_ASSOC);

        $this->pdo->prepare('UPDATE users SET avatar_type = ?, avatar_value = ? WHERE id = ?')
            ->execute([$type, $value, $userId]);

        if ($previous && $previous['avatar_type'] === 'upload' && $previous['avatar_value']) {
            ImageProcessor::deleteAvatarDerivatives(self::avatarStorageDir(), $previous['avatar_value']);
        }
    }

    private function currentAvatarUrls(string $type, string $value): array
    {
        return ['avatar_type' => $type] + ImageProcessor::resolveAvatarUrls($type, $value);
    }

    private static function avatarStorageDir(): string
    {
        $projectRoot = dirname(__DIR__, 2);
        return FileHelper::joinPaths($projectRoot, 'uploads/public', 'avatars');
    }

    private static function generateUuidV4(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}
