<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PDO;
use finfo;
use TGA\CRM\Config\Environment;
use TGA\CRM\Helpers\FileHelper;
use TGA\CRM\Helpers\UlidGenerator;

final class FileUploadService
{
    private const MIME_EXTENSION_MAP = [
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
    ];

    private const DOCUMENT_MIME_RULES = [
        'passport' => ['application/pdf', 'image/jpeg', 'image/png'],
        'visa_copy' => ['application/pdf', 'image/jpeg', 'image/png'],
        'photograph' => ['image/jpeg', 'image/png'],
        'birth_certificate' => ['application/pdf', 'image/jpeg', 'image/png'],
        'academic_transcript' => ['application/pdf'],
        'degree_certificate' => ['application/pdf'],
        'english_test_result' => ['application/pdf'],
        'sop' => ['application/pdf'],
        'lor' => ['application/pdf'],
        'cv_resume' => ['application/pdf'],
        'bank_statement' => ['application/pdf'],
        'financial_sponsorship' => ['application/pdf'],
        'offer_letter' => ['application/pdf'],
        'cas_coe' => ['application/pdf'],
        'enrollment_letter' => ['application/pdf'],
        'police_clearance' => ['application/pdf'],
        'medical_certificate' => ['application/pdf'],
        'insurance' => ['application/pdf'],
        'other' => ['application/pdf', 'image/jpeg', 'image/png'],
        'logo' => ['image/jpeg', 'image/png'],
        'business_registration' => ['application/pdf', 'image/jpeg', 'image/png'],
        'agency_logo' => ['image/jpeg', 'image/png'],
        'partnership_scope_doc' => ['application/pdf'],
    ];

    public function upload(
        PDO $pdo,
        array $file,
        string $documentType,
        string $ownerType,
        int $ownerId,
        string $uploadedByType,
        int $uploadedById,
        ?string $displayFilename = null,
        bool $isPublic = false,
        ?string $customStoragePath = null,
        int $versionNumber = 1,
        ?int $previousVersionId = null
    ): array {
        $this->assertUploadArray($file);
        $this->assertUploadError((int) $file['error']);
        $this->assertUploadedFile((string) $file['tmp_name']);

        $mimeType = $this->detectMimeType((string) $file['tmp_name']);
        $this->assertAllowedMimeType($documentType, $mimeType);
        $fileSize = (int) $file['size'];
        $this->assertFileSize($fileSize, $mimeType);
        $this->assertSafeImagePayload((string) $file['tmp_name'], $mimeType);
        $this->assertDiskSpace($fileSize);

        $uuid = $this->generateUuidV4();
        $extension = self::MIME_EXTENSION_MAP[$mimeType] ?? null;

        if ($extension === null) {
            throw new \RuntimeException('Unsupported file type.');
        }

        $ownerPublicId = self::fetchOwnerPublicId($pdo, $ownerType, $ownerId);
        $slugifiedLabel = self::slugify($documentType !== 'other' ? $documentType : pathinfo((string) $file['name'], PATHINFO_FILENAME));
        $displayFilename = sprintf('%s_%s_%s_%s.%s',
            $ownerType,
            substr($ownerPublicId, -8),
            $slugifiedLabel,
            date('Y-m-d'),
            $extension
        );

        $projectRoot = dirname(__DIR__, 2);
        if ($isPublic) {
            $uploadRoot = 'uploads/public';
        } else {
            $uploadRoot = 'storage/private';
        }

        if ($customStoragePath !== null) {
            $baseSubDir = $customStoragePath;
        } else {
            $baseSubDir = FileHelper::joinPaths('documents', $ownerType . '-' . $ownerId);
        }

        $targetDirectory = FileHelper::joinPaths($projectRoot, $uploadRoot, $baseSubDir);
        FileHelper::ensureDirectory($targetDirectory);

        $storedFileName = $uuid . '.' . $extension;
        $absoluteTarget = FileHelper::joinPaths($targetDirectory, $storedFileName);

        // Move to final location
        if (!move_uploaded_file((string) $file['tmp_name'], $absoluteTarget)) {
            throw new \RuntimeException('Failed to store uploaded file.');
        }

        $relativePath = FileHelper::normalizeRelativePath(
            FileHelper::joinPaths($uploadRoot, $baseSubDir, $storedFileName)
        );

        $checksum = hash_file('sha256', $absoluteTarget);
        $publicId = UlidGenerator::generate();

        $driveFolderPath = self::buildDriveFolderPath($ownerType, $ownerPublicId);

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO files
                 (public_id, owner_type, owner_id, display_filename, stored_filename,
                  storage_path, is_public, mime_type, file_size_bytes, checksum_sha256,
                  version_number, previous_version_id, uploaded_by_type, uploaded_by_id, 
                  drive_sync_status, drive_folder_path, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())'
            );
            $stmt->execute([
                $publicId, $ownerType, $ownerId,
                $displayFilename, $storedFileName, $relativePath,
                $isPublic ? 1 : 0, $mimeType, $fileSize, $checksum,
                $versionNumber, $previousVersionId, $uploadedByType, $uploadedById,
                'pending', $driveFolderPath
            ]);
        } catch (\Exception $e) {
            // Rollback filesystem change
            if (file_exists($absoluteTarget)) {
                if (!@unlink($absoluteTarget)) {
                    error_log("CRITICAL: Failed to clean up orphaned file on disk after database insert failure. Path: " . $absoluteTarget);
                }
            }
            throw $e;
        }

        return [
            'public_id'     => $publicId,
            'file_path'     => $relativePath,
            'stored_name'   => $storedFileName,
            'mime_type'     => $mimeType,
            'file_size'     => $fileSize,
            'checksum'      => $checksum,
            'absolute_path' => $absoluteTarget,
        ];
    }

    public function delete(string $absolutePath): bool
    {
        FileHelper::deleteIfExists($absolutePath);
        return true;
    }

    private function assertUploadArray(array $file): void
    {
        foreach (['tmp_name', 'error', 'size', 'name'] as $field) {
            if (!array_key_exists($field, $file)) {
                throw new \RuntimeException('Malformed upload payload.');
            }
        }
    }

    private function assertUploadError(int $errorCode): void
    {
        if ($errorCode === UPLOAD_ERR_OK) {
            return;
        }

        throw new \RuntimeException(match ($errorCode) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Uploaded file exceeds the allowed size.',
            UPLOAD_ERR_PARTIAL => 'Uploaded file was only partially received.',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded.',
            default => 'Upload failed due to a server-side error.',
        });
    }

    private function assertUploadedFile(string $tmpPath): void
    {
        if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
            throw new \RuntimeException('Invalid upload source.');
        }
    }

    private function detectMimeType(string $tmpPath): string
    {
        $detector = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $detector->file($tmpPath);

        if (!is_string($mimeType) || $mimeType === '') {
            throw new \RuntimeException('Unable to detect file type.');
        }

        return strtolower(trim($mimeType));
    }

    private function assertAllowedMimeType(string $documentType, string $mimeType): void
    {
        $allowedTypes = self::DOCUMENT_MIME_RULES[$documentType] ?? null;

        if ($allowedTypes === null || !in_array($mimeType, $allowedTypes, true)) {
            throw new \RuntimeException('This file type is not allowed for the selected document.');
        }
    }

    private function assertFileSize(int $size, string $mimeType): void
    {
        $imageLimitBytes = 2 * 1024 * 1024;
        $documentLimitBytes = ((int) SystemSettings::get('upload_max_size_mb', '10')) * 1024 * 1024;
        $maxSize = str_starts_with($mimeType, 'image/') ? $imageLimitBytes : $documentLimitBytes;

        if ($size <= 0 || $size > $maxSize) {
            throw new \RuntimeException('Uploaded file exceeds the allowed size.');
        }
    }

    private function assertSafeImagePayload(string $tmpPath, string $mimeType): void
    {
        if (!str_starts_with($mimeType, 'image/')) {
            return;
        }

        $contents = file_get_contents($tmpPath);

        if ($contents === false) {
            throw new \RuntimeException('Unable to inspect uploaded file.');
        }

        if (preg_match('/<\?(php|=)?/i', $contents) === 1) {
            throw new \RuntimeException('The uploaded image contains disallowed executable content.');
        }
    }

    private function assertDiskSpace(int $fileSize): void
    {
        $projectRoot = dirname(__DIR__, 2);
        $minFreeSpace = 50 * 1024 * 1024;
        $freeSpace = @disk_free_space($projectRoot);

        if ($freeSpace !== false && $freeSpace < ($fileSize + $minFreeSpace)) {
            throw new \RuntimeException('Server disk space is critically low. Upload rejected.');
        }
    }

    private function generateUuidV4(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }

    private static function fetchOwnerPublicId(PDO $pdo, string $ownerType, int $ownerId): string
    {
        $tableMap = [
            'student'     => 'students',
            'application' => 'applications',
            'university'  => 'universities',
            'agent'       => 'agents',
        ];
        $table = $tableMap[$ownerType] ?? null;
        if (!$table) {
            return 'UNKNOWN';
        }
        $stmt = $pdo->prepare("SELECT public_id FROM {$table} WHERE id = ?");
        $stmt->execute([$ownerId]);
        return (string) $stmt->fetchColumn() ?: 'UNKNOWN';
    }

    private static function buildDriveFolderPath(string $ownerType, string $ownerPublicId): string
    {
        $map = [
            'student'     => "TGA-CRM/Students/{$ownerPublicId}/Documents",
            'application' => "TGA-CRM/Applications/{$ownerPublicId}",
            'university'  => "TGA-CRM/Universities/{$ownerPublicId}",
            'notice'      => "TGA-CRM/Notices",
        ];
        return $map[$ownerType] ?? 'TGA-CRM/Misc';
    }

    private static function slugify(string $text): string
    {
        return strtolower(preg_replace('/[^a-z0-9]+/i', '_', trim($text)));
    }
}
