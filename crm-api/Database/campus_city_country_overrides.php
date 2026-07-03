<?php

/**
 * One-time, hand-curated lookup for campus cities that are in a DIFFERENT country than the
 * parent university -- built by reading the actual ~91-university candidate list produced by
 * this session's audit (not a general geocoder, not meant to scale). Keys are lowercased for
 * case-insensitive matching. Cities not listed here default to the parent university's own
 * country during promotion.
 */
return [
    'dubai' => 'UAE',
    'vienna' => 'Austria',
    'yerevan' => 'Armenia',
    'budapest' => 'Hungary',
    'manipal' => 'India',
    'mangaluru' => 'India',
    'barcelona' => 'Spain',
    'athens' => 'Greece',
    'london' => 'UK',
    'cardiff' => 'UK',
    'frankfut' => 'Germany',
    'madrid' => 'Spain',
    'heidelberg' => 'Germany',
];
