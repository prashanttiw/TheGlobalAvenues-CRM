<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

/**
 * Sanitizes TipTap-authored rich text before it is stored and later rendered via
 * `dangerouslySetInnerHTML` on the notices feed (shared by all 3 portals).
 *
 * `strip_tags($html, $allowedTags)` alone is NOT sufficient here: it only removes
 * disallowed tag *names* and leaves every attribute on allowed tags untouched — so
 * `<a href="javascript:alert(document.cookie)">` or `<a onmouseover="...">` pass
 * straight through unchanged, since `<a>` has to stay allowed for legitimate links.
 * This walks the parsed DOM and strips every attribute except an explicit per-tag
 * allowlist, then validates `href` against a scheme allowlist.
 */
final class HtmlSanitizer
{
    private const ALLOWED_TAGS = [
        'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4',
        'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre',
    ];

    /** @var array<string, array<int, string>> */
    private const ALLOWED_ATTRS = [
        'a' => ['href'],
    ];

    public static function clean(string $html): string
    {
        $html = trim($html);
        if ($html === '') {
            return '';
        }

        $doc = new \DOMDocument();
        libxml_use_internal_errors(true);
        // UTF-8 meta tag forces DOMDocument to parse as UTF-8 instead of guessing Latin-1
        // from the missing charset, which would mangle multi-byte characters.
        $doc->loadHTML(
            '<?xml encoding="utf-8"?><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><div>' . $html . '</div>',
            LIBXML_NOERROR | LIBXML_NOWARNING
        );
        libxml_clear_errors();

        $container = $doc->getElementsByTagName('div')->item(0);
        if ($container === null) {
            return '';
        }

        self::cleanChildren($doc, $container);

        $out = '';
        foreach (iterator_to_array($container->childNodes) as $child) {
            $out .= $doc->saveHTML($child);
        }

        return trim($out);
    }

    private static function cleanChildren(\DOMDocument $doc, \DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if (!($child instanceof \DOMElement)) {
                continue; // text nodes / comments are inert, leave as-is
            }

            // Sanitize descendants FIRST, depth-first, regardless of whether $child itself
            // ends up kept or unwrapped. Unwrapping a disallowed element moves its children
            // up into $node — if those children hadn't already been cleaned, a nested
            // dangerous element (e.g. <div><img onerror=...></div>) would be spliced into
            // the tree unexamined, since the unwrap happens after this loop's snapshot was
            // taken and would never get revisited.
            self::cleanChildren($doc, $child);

            $tag = strtolower($child->tagName);

            if (!in_array($tag, self::ALLOWED_TAGS, true)) {
                // Disallowed tag: keep its (already-cleaned) text/inline content, drop the
                // wrapping element itself (e.g. a stray <script> or <img>) rather than
                // deleting content the author typed.
                while ($child->firstChild) {
                    $node->insertBefore($child->firstChild, $child);
                }
                $node->removeChild($child);
                continue;
            }

            $allowedAttrs = self::ALLOWED_ATTRS[$tag] ?? [];
            foreach (iterator_to_array($child->attributes) as $attr) {
                if (!in_array(strtolower($attr->name), $allowedAttrs, true)) {
                    $child->removeAttribute($attr->name);
                }
            }

            if ($tag === 'a' && $child->hasAttribute('href')) {
                $href = trim($child->getAttribute('href'));
                // Only allow http(s), mailto, and same-site relative links. Anything else —
                // javascript:, data:, vbscript:, or a scheme we didn't anticipate — is dropped
                // rather than guessed at; a plain <a> with no href just renders as static text.
                if (preg_match('~^(https?://|mailto:|/|#)~i', $href) !== 1) {
                    $child->removeAttribute('href');
                } else {
                    $child->setAttribute('rel', 'noopener noreferrer nofollow');
                    $child->setAttribute('target', '_blank');
                }
            }
        }
    }
}
