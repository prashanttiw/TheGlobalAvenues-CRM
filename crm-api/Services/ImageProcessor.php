<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use TGA\CRM\Config\Environment;

/**
 * Avatar-specific image processing. The upload UI always exports a square (1:1) crop
 * client-side, so this only needs to defensively square-crop, then resize down to the
 * two fixed sizes the app actually renders (64px thumb for lists/topbar/sidebar, 256px
 * full for the profile page) — done once at upload time, never per-request. Output is
 * always WebP regardless of input format, for consistent small file size.
 */
final class ImageProcessor
{
    public const THUMB_SIZE = 64;
    public const FULL_SIZE = 256;

    /**
     * Generates {destDir}/{uuid}.webp (FULL_SIZE) and {destDir}/{uuid}_thumb.webp (THUMB_SIZE)
     * from the given source image, then deletes the source. Returns the shared uuid.webp
     * filename (avatar_value) to store, or null if the source could not be read.
     */
    public static function createAvatarDerivatives(string $sourcePath, string $mimeType, string $destDir, string $uuid): ?string
    {
        $source = self::loadImage($sourcePath, $mimeType);
        if ($source === false) {
            return null;
        }

        $srcWidth = imagesx($source);
        $srcHeight = imagesy($source);
        $side = min($srcWidth, $srcHeight);
        $cropX = intdiv($srcWidth - $side, 2);
        $cropY = intdiv($srcHeight - $side, 2);

        $filename = "{$uuid}.webp";
        $thumbFilename = "{$uuid}_thumb.webp";

        self::saveResizedSquare($source, $srcWidth, $srcHeight, $cropX, $cropY, $side, self::FULL_SIZE, $destDir . '/' . $filename);
        self::saveResizedSquare($source, $srcWidth, $srcHeight, $cropX, $cropY, $side, self::THUMB_SIZE, $destDir . '/' . $thumbFilename);

        imagedestroy($source);
        @unlink($sourcePath);

        return $filename;
    }

    /** Deletes both derivatives for a previously-stored avatar_value filename (e.g. on replace/remove). */
    public static function deleteAvatarDerivatives(string $destDir, string $filename): void
    {
        $uuid = pathinfo($filename, PATHINFO_FILENAME);
        @unlink($destDir . '/' . $uuid . '.webp');
        @unlink($destDir . '/' . $uuid . '_thumb.webp');
    }

    /**
     * Resolves a users.avatar_type/avatar_value pair into ready-to-render URLs. Shared by
     * every endpoint that returns a user-ish payload (auth/me, profile GETs, admin/agent
     * list queries) so callers never need to know preset vs. upload — just render the URL.
     * @return array{avatar_url: ?string, avatar_thumb_url: ?string}
     */
    public static function resolveAvatarUrls(?string $avatarType, ?string $avatarValue): array
    {
        if ($avatarType === null || $avatarValue === null || $avatarValue === '') {
            return ['avatar_url' => null, 'avatar_thumb_url' => null];
        }

        if ($avatarType === 'preset') {
            return [
                'avatar_url' => "/avatar-presets/{$avatarValue}.webp",
                'avatar_thumb_url' => "/avatar-presets/{$avatarValue}_thumb.webp",
            ];
        }

        $appUrl = Environment::get('APP_URL') ?: 'http://localhost';
        $uuid = pathinfo($avatarValue, PATHINFO_FILENAME);
        return [
            'avatar_url' => "{$appUrl}/uploads/public/avatars/{$uuid}.webp",
            'avatar_thumb_url' => "{$appUrl}/uploads/public/avatars/{$uuid}_thumb.webp",
        ];
    }

    /** @return \GdImage|false */
    private static function loadImage(string $path, string $mimeType)
    {
        return match ($mimeType) {
            'image/jpeg' => @imagecreatefromjpeg($path),
            'image/png' => @imagecreatefrompng($path),
            'image/webp' => @imagecreatefromwebp($path),
            default => false,
        };
    }

    private static function saveResizedSquare($source, int $srcWidth, int $srcHeight, int $cropX, int $cropY, int $cropSide, int $targetSize, string $destPath): void
    {
        $out = imagecreatetruecolor($targetSize, $targetSize);
        imagealphablending($out, false);
        imagesavealpha($out, true);
        $transparent = imagecolorallocatealpha($out, 0, 0, 0, 127);
        imagefilledrectangle($out, 0, 0, $targetSize, $targetSize, $transparent);

        imagecopyresampled($out, $source, 0, 0, $cropX, $cropY, $targetSize, $targetSize, $cropSide, $cropSide);
        imagewebp($out, $destPath, 88);
        imagedestroy($out);
    }
}
