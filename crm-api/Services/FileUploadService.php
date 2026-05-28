<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use finfo;
use TGA\CRM\Config\Environment;
use TGA\CRM\Helpers\FileHelper;

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
    ];

    public function upload(array $file, string $documentType, int $applicationId): array
    {
        $this->assertUploadArray($file);
        $this->assertUploadError((int) $file['error']);
        $this->assertUploadedFile((string) $file['tmp_name']);

        $mimeType = $this->detectMimeType((string) $file['tmp_name']);
        $this->assertAllowedMimeType($documentType, $mimeType);
        $this->assertFileSize((int) $file['size'], $mimeType);
        $this->assertSafeImagePayload((string) $file['tmp_name'], $mimeType);

        $uuid = $this->generateUuidV4();
        $extension = self::MIME_EXTENSION_MAP[$mimeType] ?? null;

        if ($extension === null) {
            throw new \RuntimeException('Unsupported file type.');
        }

        $uploadRoot = Environment::get('UPLOAD_PATH', 'uploads');
        $targetDirectory = FileHelper::joinPaths(
            dirname(__DIR__),
            $uploadRoot,
            'documents',
            'application-' . $applicationId
        );
        FileHelper::ensureDirectory($targetDirectory);

        $storedFileName = $uuid . '.' . $extension;
        $absoluteTarget = FileHelper::joinPaths($targetDirectory, $storedFileName);

        if (!move_uploaded_file((string) $file['tmp_name'], $absoluteTarget)) {
            throw new \RuntimeException('Failed to store uploaded file.');
        }

        $relativePath = FileHelper::normalizeRelativePath(
            FileHelper::joinPaths($uploadRoot, 'documents', 'application-' . $applicationId, $storedFileName)
        );

        return [
            'uuid' => $uuid,
            'file_path' => $relativePath,
            'file_name' => $storedFileName,
            'mime_type' => $mimeType,
            'file_size' => (int) $file['size'],
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
        $documentLimitBytes = ((int) Environment::get('UPLOAD_MAX_SIZE_MB', '10')) * 1024 * 1024;
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

    private function generateUuidV4(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }
}
