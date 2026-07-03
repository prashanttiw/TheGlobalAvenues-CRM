<?php

declare(strict_types=1);

namespace TGA\CRM\Helpers;

/**
 * Turns a raw activity_logs row (dotted action key + before/after JSON) into a
 * plain-English sentence, a lucide-react icon name, and a relative time string —
 * the same three fields every activity feed/log view in the CRM renders.
 *
 * Shared by ActivityFeedController (dashboard widget) and ActivityLogController
 * (Activity Log / Super Activity Log / agent Activity Log pages) so the wording
 * never drifts between the two.
 */
final class ActivityLabelFormatter
{
    /**
     * Static "{module}.{verb}" -> "verb phrase with %s for the target" templates,
     * covering every action key currently emitted by ActivityLogger::log() calls.
     * Anything not listed here falls back to a generic humanized phrase.
     */
    private const ACTION_TEMPLATES = [
        'university.created' => 'added %s',
        'university.updated' => 'updated %s',
        'university.deleted' => 'deleted %s',
        'university.logo_uploaded' => 'uploaded a new logo for %s',

        'course.created' => 'added %s',
        'course.updated' => 'updated %s',
        'course.deleted' => 'deleted %s',
        'course.fee_updated' => 'updated the fee for %s',

        'intake.created' => 'created %s',
        'intake.updated' => 'updated %s',
        'intake.deleted' => 'deleted %s',
        'intake.cloned' => 'cloned %s',

        'application.created' => 'started %s',

        'notice.created' => 'created %s',
        'notice.updated' => 'updated %s',
        'notice.deleted' => 'deleted %s',
        'notice.published' => 'published %s',
        'notice.attachment_uploaded' => 'uploaded an attachment to %s',

        'commission.created' => 'created %s',
        'commission.confirmed' => 'confirmed %s',
        'commission.paid' => 'marked %s as paid',

        'agent.approved' => 'approved %s',
        'agent.rejected' => 'rejected %s',
        'agent.suspended' => 'suspended %s',
        'agent.onboarding_doc_uploaded' => 'uploaded an onboarding document for %s',
        'agent.registration_submitted' => 'submitted a partner application for %s',
        'agent.application_submitted' => 'submitted an application for %s',
        'subagent.created' => 'added a new sub-agent: %s',

        'student.created_by_agent' => 'created a student profile for %s',
        'student.readiness_submitted' => 'submitted profile details for %s',

        'lead.created' => 'added a new lead: %s',
        'lead.updated' => 'updated %s',
        'lead.deleted' => 'deleted %s',
        'lead.converted' => 'converted %s into a student',

        'document_request.created' => 'requested a document: %s',
        'document_request.submitted' => 'submitted a document for %s',
        'document_request.cancelled' => 'cancelled a document request for %s',

        'payment_request.warning' => 'flagged a payment issue on %s',
        'payment_request.created' => 'requested payment for %s',
        'payment_request.submitted' => 'submitted a payment for %s',
        'payment_request.verified' => 'verified a payment for %s',
        'payment_request.resolved' => 'resolved a payment dispute for %s',

        'reassignment.requested' => 'requested to reassign %s',
        'reassignment.denied' => 'denied a reassignment request for %s',

        'internal_note.added' => 'added a note on %s',
        'internal_note.updated' => 'updated a note on %s',
        'internal_note.deleted' => 'deleted a note on %s',

        'application_update.added' => 'posted an update on %s',
        'application_update.deleted' => 'removed an update on %s',

        'student_custom_field.created' => 'created a custom field: %s',
        'student_custom_field.updated' => 'updated a custom field: %s',
        'student_custom_field.deleted' => 'deleted a custom field: %s',

        'file.downloaded' => 'downloaded %s',
        'file.permanently_erased' => 'permanently erased %s',
        'file.erase_failed_pending' => 'flagged a failed erase for %s',

        'user.password_reset' => 'reset the password for %s',
        'user.password_changed' => 'changed the password for %s',
        'user.updated' => 'updated %s',
        'admin.deleted' => 'deleted %s',

        'report.exported' => 'exported %s',
    ];

    /** Generic noun (with article) for a target_type when target_display is empty. */
    private const TARGET_TYPE_NOUNS = [
        'student' => 'a student',
        'application' => 'an application',
        'agent' => 'an agent',
        'university' => 'a university',
        'course' => 'a course',
        'intake' => 'an intake',
        'notice' => 'a notice',
        'leads' => 'a lead',
        'lead' => 'a lead',
        'document_request' => 'a document request',
        'application_payment' => 'a payment',
        'system_setting' => 'a system setting',
        'user' => 'a user account',
        'student_custom_field' => 'a custom field',
        'file' => 'a file',
        'report' => 'a report',
        'application_update' => 'a timeline update',
        'commission' => 'a commission',
    ];

    private const ICONS = [
        'created' => 'PlusCircle',
        'updated' => 'Pencil',
        'deleted' => 'Trash2',
        'approved' => 'CheckCircle2',
        'confirmed' => 'CheckCircle2',
        'published' => 'Megaphone',
        'rejected' => 'XCircle',
        'denied' => 'XCircle',
        'cancelled' => 'XCircle',
        'suspended' => 'Ban',
        'downloaded' => 'Download',
        'permanently_erased' => 'FileWarning',
        'erase_failed_pending' => 'FileWarning',
        'logo_uploaded' => 'Upload',
        'attachment_uploaded' => 'Upload',
        'onboarding_doc_uploaded' => 'Upload',
        'password_reset' => 'KeyRound',
        'password_changed' => 'KeyRound',
        'status_changed' => 'RefreshCw',
        'status_updated' => 'RefreshCw',
        'cloned' => 'Copy',
        'converted' => 'Sparkles',
        'paid' => 'DollarSign',
        'verified' => 'CheckCircle2',
        'resolved' => 'CheckCircle2',
        'warning' => 'AlertTriangle',
        'requested' => 'Send',
        'submitted' => 'Send',
        'registered' => 'UserPlus',
        'registration_submitted' => 'UserPlus',
        'application_submitted' => 'Send',
        'exported' => 'FileText',
        'added' => 'MessageSquarePlus',
        'reviewed' => 'CheckCircle2',
        'fee_updated' => 'Pencil',
        'created_by_agent' => 'UserPlus',
        'readiness_submitted' => 'Send',
        'changed' => 'Settings',
        'enabled' => 'ToggleRight',
        'disabled' => 'ToggleLeft',
        'login' => 'LogIn',
    ];

    public static function label(array $row): string
    {
        $actor = $row['actor_display_name'] ?? 'System';
        $action = (string) ($row['action'] ?? '');
        $before = self::decode($row['before_value'] ?? null);
        $after = self::decode($row['after_value'] ?? null);

        if ($action === 'student.registered') {
            return "{$actor} registered as a student";
        }
        if ($action === 'login') {
            return "{$actor} logged in";
        }
        if ($action === 'maintenance_mode.enabled') {
            return "{$actor} enabled maintenance mode";
        }
        if ($action === 'maintenance_mode.disabled') {
            return "{$actor} disabled maintenance mode";
        }

        // Actions where before/after already fully tells the story in bespoke
        // wording (e.g. "changed the status of X to Y") — these embed every
        // piece of relevant data themselves, so no generic diff is appended.
        $special = self::specialCase($action, $row, $before, $after);
        if ($special !== null) {
            return "{$actor} {$special}";
        }

        $target = self::targetLabel($row);
        $targetIsGeneric = empty($row['target_display'] ?? null);
        $phrase = self::basePhrase($action, $target, $targetIsGeneric);

        // Every other field ActivityLogger captured for this action gets surfaced
        // right in the label — not hidden behind the Details view — so the
        // reader sees exactly what changed without an extra click.
        $summary = self::summarizeChanges($action, $before, $after);
        if ($summary !== null) {
            $phrase .= " ({$summary})";
        }

        return trim("{$actor} {$phrase}");
    }

    /** Verbs whose base phrase already states the resulting status — showing "Status: X → Y" too would be redundant. */
    private const STATUS_IMPLIED_VERBS = [
        'approved', 'rejected', 'suspended', 'confirmed', 'paid', 'denied', 'cancelled', 'published', 'reviewed',
    ];

    private static function basePhrase(string $action, string $target, bool $targetIsGeneric): string
    {
        if (isset(self::ACTION_TEMPLATES[$action])) {
            $template = self::ACTION_TEMPLATES[$action];
            // "created a custom field: %s" reads redundantly as "created a custom
            // field: a custom field" when there's no specific name to show — drop
            // the ": %s" entirely rather than filling it with a generic noun.
            if ($targetIsGeneric && str_contains($template, ': %s')) {
                return str_replace(': %s', '', $template);
            }
            return sprintf($template, $target);
        }

        // Generic fallback for any action key not covered above.
        $parts = explode('.', $action, 2);
        $module = $parts[0] ?? $action;
        $verb = $parts[1] ?? '';
        $verbPhrase = trim(str_replace('_', ' ', $verb !== '' ? $verb : $module));

        return trim("{$verbPhrase} {$target}");
    }

    /**
     * Turns the raw before/after JSON into a short, readable "what changed"
     * fragment, e.g. "status: pending → approved, referral_code: TGA-A1B2".
     * Skips internal/ID-like keys and anything already surfaced via the target
     * label (name/display/full_name) to avoid repeating the same value twice.
     */
    private static function summarizeChanges(string $action, array $before, array $after): ?string
    {
        $skip = ['name', 'display', 'full_name', 'cloned_from'];

        $parts = explode('.', $action, 2);
        $verb = $parts[1] ?? $parts[0];
        if (in_array($verb, self::STATUS_IMPLIED_VERBS, true)) {
            // e.g. "approved" already means status went to "approved" — don't repeat it.
            array_push($skip, 'status', 'new_status', 'old_status');
        }

        $fragments = [];

        foreach (array_unique(array_merge(array_keys($before), array_keys($after))) as $key) {
            if (in_array($key, $skip, true) || self::isIdLike($key)) {
                continue;
            }

            $hasBefore = array_key_exists($key, $before);
            $hasAfter = array_key_exists($key, $after);

            if ($hasBefore && $hasAfter) {
                $beforeStr = self::formatValue($before[$key]);
                $afterStr = self::formatValue($after[$key]);
                if ($beforeStr === $afterStr) {
                    continue;
                }
                $fragments[] = self::prettyKey($key) . ": {$beforeStr} \u{2192} {$afterStr}";
            } elseif ($hasAfter) {
                $fragments[] = self::prettyKey($key) . ': ' . self::formatValue($after[$key]);
            }
        }

        if (empty($fragments)) {
            return null;
        }

        $shown = array_slice($fragments, 0, 3);
        $remaining = count($fragments) - count($shown);

        return implode(', ', $shown) . ($remaining > 0 ? " (+{$remaining} more)" : '');
    }

    private static function isIdLike(string $key): bool
    {
        return $key === 'id' || $key === 'public_id' || str_ends_with($key, '_id') || str_ends_with($key, '_hash');
    }

    private static function formatValue(mixed $value): string
    {
        if ($value === null || $value === '') {
            return 'none';
        }
        if (is_bool($value)) {
            return $value ? 'yes' : 'no';
        }
        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }
        if (is_array($value)) {
            if ($value === []) {
                return 'none';
            }
            $isAllScalar = array_reduce(
                $value,
                static fn (bool $carry, $v) => $carry && (is_scalar($v) || $v === null),
                true
            );
            if (!$isAllScalar) {
                return '(details)';
            }
            if (array_is_list($value)) {
                return implode(', ', array_map(static fn ($v) => (string) $v, $value));
            }
            // Associative array (e.g. {"students": "read", "leads": "write"}) —
            // keep the keys, they're the whole point.
            $parts = [];
            foreach ($value as $k => $v) {
                $parts[] = "{$k}: " . (is_bool($v) ? ($v ? 'yes' : 'no') : (string) $v);
            }
            return implode(', ', $parts);
        }

        $str = str_replace('_', ' ', (string) $value);
        if (mb_strlen($str) > 60) {
            $str = mb_substr($str, 0, 57) . '...';
        }
        return "\"{$str}\"";
    }

    private static function prettyKey(string $key): string
    {
        return ucfirst(str_replace('_', ' ', $key));
    }

    public static function icon(string $action): string
    {
        $parts = explode('.', $action, 2);
        $verb = $parts[1] ?? $parts[0];

        return self::ICONS[$verb] ?? 'Activity';
    }

    public static function timeAgo(string $datetime): string
    {
        $time = strtotime($datetime);
        $diff = time() - $time;

        if ($diff < 60) {
            return 'Just now';
        }
        if ($diff < 3600) {
            return floor($diff / 60) . 'm ago';
        }
        if ($diff < 86400) {
            return floor($diff / 3600) . 'h ago';
        }
        return floor($diff / 86400) . 'd ago';
    }

    /** Handles the small set of actions where before/after tells the real story. */
    private static function specialCase(string $action, array $row, array $before, array $after): ?string
    {
        $target = self::targetLabel($row);

        switch ($action) {
            case 'application.status_changed':
                $status = $after['new_status'] ?? null;
                return $status
                    ? "changed the status of {$target} to " . self::humanize($status)
                    : "changed the status of {$target}";

            case 'intake.status_updated':
                $status = $after['new_status'] ?? null;
                return $status
                    ? "updated the status of {$target} to " . self::humanize($status)
                    : "updated the status of {$target}";

            case 'lead.status_changed':
                $status = $after['status'] ?? $after['new_status'] ?? null;
                return $status
                    ? "moved {$target} to " . self::humanize($status)
                    : "moved {$target} to a new stage";

            case 'lead.assigned':
                return "assigned {$target} to a staff member";

            case 'document_request.reviewed':
                $status = $after['status'] ?? null;
                if ($status === 'approved') {
                    return "approved a document for {$target}";
                }
                if ($status === 'rejected') {
                    return "rejected a document for {$target} — resubmission required";
                }
                return "reviewed a document for {$target}";

            case 'system_setting.changed':
                if (isset($after['key'])) {
                    $key = str_replace('_', ' ', (string) $after['key']);
                    $newVal = $after['value'] ?? null;
                    $oldVal = $before['value'] ?? null;
                    if ($oldVal !== null && $newVal !== null && $oldVal !== $newVal) {
                        return "changed the \"{$key}\" setting from {$oldVal} to {$newVal}";
                    }
                    return "changed the \"{$key}\" setting";
                }
                return "changed {$target}";

            default:
                return null;
        }
    }

    private static function targetLabel(array $row): string
    {
        $display = $row['target_display'] ?? null;
        if (!empty($display)) {
            return $display;
        }

        $targetType = $row['target_type'] ?? null;
        return self::TARGET_TYPE_NOUNS[$targetType] ?? 'a record';
    }

    private static function humanize(string $value): string
    {
        return str_replace('_', ' ', $value);
    }

    private static function decode(?string $json): array
    {
        if (!$json) {
            return [];
        }
        $decoded = json_decode($json, true);
        return is_array($decoded) ? $decoded : [];
    }
}
