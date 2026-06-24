<?php

namespace TGA\CRM\Services;

class EncryptionService {

    /**
     * Encrypts plaintext using XSalsa20-Poly1305.
     * Does NOT require AES-NI hardware.
     * Key must be exactly SODIUM_CRYPTO_SECRETBOX_KEYBYTES (32) bytes.
     */
    public static function encrypt(string $plaintext): string {
        self::assertSodiumAvailable();
        $key   = self::loadKey();
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $ciphertext = sodium_crypto_secretbox($plaintext, $nonce, $key);
        sodium_memzero($key);
        // prefix with version byte 0x01 for future algorithm migration
        return base64_encode("\x01" . $nonce . $ciphertext);
    }

    /**
     * Decrypts ciphertext using XSalsa20-Poly1305.
     */
    public static function decrypt(string $encrypted): string {
        self::assertSodiumAvailable();
        $key     = self::loadKey();
        $decoded = base64_decode($encrypted, true);
        if ($decoded === false || strlen($decoded) <= 1 + SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
            throw new \RuntimeException('Encrypted payload is malformed.');
        }
        $version    = ord($decoded[0]);
        $nonce      = substr($decoded, 1, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $ciphertext = substr($decoded, 1 + SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $plain = sodium_crypto_secretbox_open($ciphertext, $nonce, $key);
        sodium_memzero($key);
        if ($plain === false) {
            throw new \RuntimeException('Decryption failed — ciphertext tampered or wrong key.');
        }
        return $plain;
    }

    /**
     * Generates a deterministic hash for lookup columns.
     */
    public static function hash(string $value): string {
        // Lowercase first for case-insensitive search
        return hash('sha256', strtolower(trim($value)));
    }

    private static function loadKey(): string {
        $env = getenv('ENCRYPTION_KEY');
        if (empty($env)) {
            throw new \RuntimeException('ENCRYPTION_KEY environment variable is missing or empty.');
        }

        try {
            $raw = sodium_base642bin(
                (string) $env,
                SODIUM_BASE64_VARIANT_ORIGINAL
            );
        } catch (\SodiumException $e) {
            throw new \RuntimeException('ENCRYPTION_KEY must be a valid base64-encoded string.', 0, $e);
        }

        if (strlen($raw) !== SODIUM_CRYPTO_SECRETBOX_KEYBYTES) {
            throw new \RuntimeException('ENCRYPTION_KEY must be exactly 32 bytes when decoded.');
        }
        return $raw;
    }

    /** Call once at bootstrap (index.php) to fail fast, not mid-request */
    public static function assertSodiumAvailable(): void {
        if (!extension_loaded('sodium')) {
            throw new \RuntimeException('PHP sodium extension is not loaded. Enable it in php.ini.');
        }
    }
}
