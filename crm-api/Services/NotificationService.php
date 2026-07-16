<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use TGA\CRM\Config\Database;
use TGA\CRM\Helpers\UlidGenerator;
use TGA\CRM\Models\NotificationTemplateModel;
use PDO;

final class NotificationService
{
    public static function fire(
        string $eventKey,
        array  $vars,
        array  $recipientUserIds
    ): void {
        if (empty($recipientUserIds)) return;

        $template = NotificationTemplateModel::findByEventKey($eventKey);
        if (!$template || !$template['is_active']) return;

        $subject = self::render($template['subject_template'], $vars);
        $body    = self::render($template['body_template'], $vars);
        $channels = array_map('trim', explode(',', $template['channels']));

        // Most templates are HTML (tables, inline styles — see migration 070's HTML branding pass),
        // meant for an email client to render. The in_app row was reusing that exact same HTML
        // string, but NotificationCenter.tsx renders notification.body as plain text (no
        // dangerouslySetInnerHTML) — so the notification bell showed raw markup as literal text
        // instead of a message. Reusing MailService::toPlainText() (already used for the email's
        // AltBody fallback) gives in_app a real plain-text version instead. Safe no-op for the
        // handful of templates that are already plain text (application.status_changed, document.*)
        // — strip_tags()/the tag-to-newline replacements just find nothing to do on those.
        $inAppBody = MailService::toPlainText($body);

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO notifications
              (public_id, event_key, recipient_user_id, channel, category,
               subject, body, status, related_entity_type, related_entity_id, created_at)
            VALUES (?,?,?,?,?,?,?,'queued',?,?,NOW())
        ");

        foreach ($recipientUserIds as $userId) {
            if (!$userId) continue;
            foreach ($channels as $channel) {
                $channelBody = $channel === 'in_app' ? $inAppBody : $body;
                $stmt->execute([
                    UlidGenerator::generate(),
                    $eventKey, $userId, $channel,
                    $template['category'] ?? null,
                    $subject, $channelBody,
                    $vars['entity_type'] ?? null,
                    $vars['entity_id']   ?? null,
                ]);
            }
        }
    }

    /**
     * Walk up parent_agent_id chain from a student's attached agent.
     * Returns user_ids of all agents in the chain (agent + parents up to root).
     */
    public static function resolveAgentChain(int $studentId): array {
        $pdo = Database::getConnection();
        $studentStmt = $pdo->prepare(
            "SELECT agent_id FROM students WHERE id = ? AND deleted_at IS NULL"
        );
        $studentStmt->execute([$studentId]);
        $row = $studentStmt->fetch();
        if (!$row || !$row['agent_id']) return [];

        $userIds = [];
        $agentId = $row['agent_id'];

        while ($agentId) {
            $a = $pdo->prepare(
                "SELECT user_id, parent_agent_id FROM agents WHERE id = ? AND deleted_at IS NULL"
            );
            $a->execute([$agentId]);
            $agent = $a->fetch();
            if (!$agent) break;

            $userStmt = $pdo->prepare(
                "SELECT id FROM users WHERE id = ? AND status = 'active'"
            );
            $userStmt->execute([$agent['user_id']]);
            $u = $userStmt->fetch();
            if ($u) $userIds[] = $u['id'];

            $agentId = $agent['parent_agent_id'];
        }

        return array_unique($userIds);
    }

    public static function getSuperAdminUserIds(): array {
        $pdo = Database::getConnection();
        return $pdo->query("
            SELECT u.id FROM users u
            JOIN admins a ON a.user_id = u.id
            WHERE a.is_super_admin = 1 AND u.status = 'active'
              AND u.deleted_at IS NULL
        ")->fetchAll(PDO::FETCH_COLUMN);
    }

    public static function render(string $template, array $vars): string {
        foreach ($vars as $key => $value) {
            if (is_scalar($value)) {
                $safeValue = (string)$value;
                $template = str_replace('{{' . $key . '}}', $safeValue, $template);
            }
        }
        return $template;
    }
}
