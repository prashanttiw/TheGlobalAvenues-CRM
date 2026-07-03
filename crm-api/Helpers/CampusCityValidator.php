<?php

namespace TGA\CRM\Helpers;

/**
 * Decides whether free-text "other campus" strings pulled from the source spreadsheets look
 * like a real, promotable city name versus noise (fee fragments, street addresses, department
 * names, full sentences). Reject-wins on purpose: a real city left as a note is a minor
 * inconvenience, a fee string becoming a fake university is a real data-quality regression.
 */
class CampusCityValidator
{
    private const MAX_LENGTH = 35;

    private const BLACKLIST = [
        'campus', 'branch', 'centre', 'center', 'institute', 'department', 'street', 'road',
        'avenue', 'program', 'fee', 'tuition', 'location', 'such as', 'within', 'main', 'other',
        'work-study', 'college', 'university', 'school', 'hub', 'aquatics', 'sciences', 'agriculture',
    ];

    // Country names that sometimes show up as a bare "campus" candidate on their own (e.g. a
    // cell just says "UAE") -- not a city, so never promotable regardless of other rules.
    private const COUNTRY_NAMES = [
        'uae', 'usa', 'uk', 'uzbekistan', 'latvia', 'france', 'germany', 'austria', 'cyprus',
        'malta', 'estonia', 'poland', 'czech republic', 'slovakia', 'hungary', 'moldova',
        'morocco', 'indonesia', 'lithuania', 'netherlands', 'spain', 'ireland', 'armenia',
        'italy',
    ];

    public static function isPromotable(string $city): bool
    {
        $trimmed = trim($city);
        if ($trimmed === '') {
            return false;
        }
        if (mb_strlen($trimmed) > self::MAX_LENGTH) {
            return false;
        }
        if (preg_match('/[0-9]/', $trimmed)) {
            return false;
        }
        if (preg_match('/[€$£]/u', $trimmed)) {
            return false;
        }
        if (str_contains($trimmed, ',') || str_contains($trimmed, ';') || str_contains($trimmed, '|')) {
            return false;
        }
        if (str_contains($trimmed, '/') || str_contains($trimmed, '&')) {
            return false;
        }
        if (preg_match('/\band\b/i', $trimmed)) {
            return false;
        }
        // a stray/unbalanced parenthesis, or one with nothing meaningful in front of it, is a
        // leftover fragment from the original (naive) splitting -- not a clean "City (Country)"
        if (str_starts_with($trimmed, '(')) {
            return false;
        }
        $openCount = substr_count($trimmed, '(');
        $closeCount = substr_count($trimmed, ')');
        if ($openCount !== $closeCount || $openCount > 1) {
            return false;
        }
        if ($openCount === 1 && !preg_match('/^.+\([A-Za-z .]+\)$/', $trimmed)) {
            return false;
        }
        // more than 3 words is almost never a single clean city name in this dataset
        if (count(preg_split('/\s+/', $trimmed)) > 3) {
            return false;
        }
        $lower = mb_strtolower($trimmed);
        // strip a trailing "(Country)" annotation before checking the country-name list, so
        // "Los Angeles (USA)" isn't rejected just because "usa" appears inside the parens
        $withoutAnnotation = preg_replace('/\s*\([^)]*\)\s*$/', '', $lower);
        if (in_array(trim($withoutAnnotation), self::COUNTRY_NAMES, true)) {
            return false;
        }
        foreach (self::BLACKLIST as $word) {
            if (str_contains($lower, $word)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Splits a trailing "(Country)" annotation off a city string, e.g. "Lille (France)" ->
     * ["Lille", "France"]. Returns [city, null] if no such annotation is present.
     */
    public static function splitCountryAnnotation(string $city): array
    {
        if (preg_match('/^(.*?)\s*\(([A-Za-z .]+)\)\s*$/', trim($city), $m)) {
            return [trim($m[1]), trim($m[2])];
        }
        return [trim($city), null];
    }
}
