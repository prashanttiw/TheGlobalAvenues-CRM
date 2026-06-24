<?php

namespace TGA\CRM\Helpers;

class UlidGenerator {

    private static int $lastTime = 0;
    private static string $lastRandom = '';

    /**
     * Generates a monotonic ULID (Universally Unique Lexicographically Sortable Identifier).
     * 26-char, URL-safe, sortable, unique.
     * Prevents same-millisecond collisions by incrementing the random portion.
     */
    public static function generate(): string {
        $time = (int)(microtime(true) * 1000);
        $chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32

        if ($time === self::$lastTime) {
            // Increment the last random string by 1 (base32)
            $random = self::incrementRandom(self::$lastRandom, $chars);
        } else {
            // Generate a fresh random string
            $random = '';
            for ($i = 0; $i < 16; $i++) {
                $random .= $chars[random_int(0, 31)];
            }
        }

        self::$lastTime = $time;
        self::$lastRandom = $random;

        // Encode time
        $timeStr = '';
        for ($i = 9; $i >= 0; $i--) {
            $timeStr = $chars[$time % 32] . $timeStr;
            $time = (int)($time / 32);
        }

        return $timeStr . $random;
    }

    private static function incrementRandom(string $random, string $chars): string {
        $charMap = array_flip(str_split($chars));
        $charsArray = str_split($random);
        $carried = true;
        
        for ($i = 15; $i >= 0; $i--) {
            $charIndex = $charMap[$charsArray[$i]];
            if ($charIndex < 31) {
                $charsArray[$i] = $chars[$charIndex + 1];
                $carried = false;
                break;
            } else {
                $charsArray[$i] = $chars[0]; // Roll over and carry to the next digit
            }
        }
        
        if ($carried) {
            throw new \RuntimeException('ULID monotonic random component overflowed in the same millisecond.');
        }
        
        return implode('', $charsArray);
    }
}
