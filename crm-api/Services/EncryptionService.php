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

    /**
     * Deterministic hash of a fixed-length prefix, for "starts with" search on an
     * otherwise-encrypted column without decrypting rows at query time. Returns null
     * when $value is shorter than $length — that value simply has no such prefix, so
     * the stored column should be null rather than hashing the whole (shorter) value.
     */
    public static function hashPrefix(string $value, int $length): ?string {
        $normalized = strtolower(trim($value));
        if (mb_strlen($normalized) < $length) {
            return null;
        }
        return hash('sha256', mb_substr($normalized, 0, $length));
    }

    /**
     * Same idea as hashPrefix(), but normalizes to a bare 10-digit local number first.
     * Phone numbers in this DB are stored inconsistently — some with a leading "+" and
     * country code, some with a domestic trunk "0", some as plain 10-digit locals — so
     * without normalization the same person's number could hash differently depending
     * on how it was captured at registration.
     *
     * Strategy: strip everything but digits, then trim characters off the FRONT until
     * exactly 10 remain. This one rule handles a leading "+91" (2-digit country code),
     * "+1" (1-digit country code), and a leading domestic "0" uniformly — no need for
     * an explicit country-code-length lookup table. Assumes the true local mobile
     * number is always 10 digits, which holds for India (this consultancy's primary
     * market) but not universally for every country's numbering scheme.
     */
    public static function hashPhonePrefix(string $value, int $length): ?string {
        $digitsOnly = preg_replace('/\D/', '', $value) ?? '';
        while (mb_strlen($digitsOnly) > 10) {
            $digitsOnly = mb_substr($digitsOnly, 1);
        }
        if (mb_strlen($digitsOnly) < $length) {
            return null;
        }
        return hash('sha256', mb_substr($digitsOnly, 0, $length));
    }

    private static function loadKey(): string {
        // Environment::get() reads the request-scoped $_ENV/$_SERVER superglobals — NOT raw
        // getenv(), which reads the process-wide C environment table that Environment::load()
        // populates via putenv(). Under Apache's Windows threaded MPM, that process-wide table is
        // shared across concurrent worker threads and not safe for concurrent read/write, causing
        // intermittent empty reads here under load. Every other config read in this codebase
        // already goes through Environment::get() — this was the one remaining raw getenv() call.
        $env = \TGA\CRM\Config\Environment::get('ENCRYPTION_KEY');
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
