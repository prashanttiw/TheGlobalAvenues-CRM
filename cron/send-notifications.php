<?php
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('CLI only'); }
set_time_limit(110); // Prevent cron overlaps on slow SMTP

require_once __DIR__ . '/../crm-api/autoload.php';
require_once __DIR__ . '/../crm-api/vendor/autoload.php';

use TGA\CRM\Config\Environment;
use PHPMailer\PHPMailer\PHPMailer;
use TGA\CRM\Services\CronHealth;
use TGA\CRM\Config\Database;
use TGA\CRM\Services\EncryptionService;
use TGA\CRM\Services\MailService;

Environment::load(__DIR__ . '/../crm-api/.env');

CronHealth::start('send_notifications');
$startTime = microtime(true);

try {
    $pdo = Database::getConnection();
    // Atomically lock and mark as processing to prevent duplicate dispatch by concurrent crons
    $pdo->beginTransaction();
    $sql = "
        SELECT n.*, u.email AS email_enc
        FROM notifications n
        JOIN users u ON u.id = n.recipient_user_id
        WHERE n.channel = 'email'
          AND n.status = 'queued'
          AND n.attempts < 3
          AND u.deleted_at IS NULL
        ORDER BY n.created_at ASC
        LIMIT 50
        FOR UPDATE SKIP LOCKED
    ";
    if (!Database::supportsSkipLocked($pdo)) {
        $sql = str_replace('SKIP LOCKED', '', $sql);
    }
    $notifications = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    if (empty($notifications)) {
        $pdo->commit();
    } else {
        $ids = array_column($notifications, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $pdo->prepare("UPDATE notifications SET status='processing' WHERE id IN ($placeholders)")->execute($ids);
        $pdo->commit();
    }

    $sent = 0; $failed = 0;

    foreach ($notifications as $notif) {
        try {
            $email = EncryptionService::decrypt($notif['email_enc']);

            $mail = MailService::createMailer();
            $mail->addAddress($email);
            $mail->isHTML(true);
            $mail->Subject = $notif['subject'] ?? '(No Subject)';
            $body = $notif['body'] ?? '';
            $mail->Body    = MailService::buildHtmlBody($body);
            $mail->AltBody = $body;
            try {
                $mail->send();
            } catch (\Throwable $primaryEx) {
                $mailFallback = MailService::createFallbackMailer();
                if ($mailFallback !== null) {
                    error_log("[SMTP Fallback] Primary failed. Retrying with fallback server: " . $primaryEx->getMessage());
                    $mailFallback->addAddress($email);
                    $mailFallback->isHTML(true);
                    $mailFallback->Subject = $notif['subject'] ?? '(No Subject)';
                    $mailFallback->Body    = MailService::buildHtmlBody($body);
                    $mailFallback->AltBody = $body;
                    $mailFallback->send();
                } else {
                    throw $primaryEx;
                }
            }

            $pdo->prepare("
                UPDATE notifications SET status='sent', sent_at=NOW(),
                attempts=attempts+1, last_attempt_at=NOW() WHERE id=?
            ")->execute([$notif['id']]);
            $sent++;

        } catch (\Throwable $e) {
            $isFinal = ($notif['attempts'] + 1) >= 3;
            $pdo->prepare("
                UPDATE notifications
                SET attempts = attempts + 1,
                    last_attempt_at = NOW(),
                    error_message = ?,
                    status = ?
                WHERE id = ?
            ")->execute([
                substr($e->getMessage(), 0, 500),
                $isFinal ? 'failed' : 'queued',
                $notif['id'],
            ]);
            $failed++;
        }
    }

    // In-app: mark queued -> sent immediately (already in DB, no dispatch needed)
    $pdo->exec("
        UPDATE notifications SET status='sent', sent_at=NOW()
        WHERE channel='in_app' AND status='queued'
        LIMIT 500
    ");

    $ms = (int)((microtime(true) - $startTime) * 1000);
    CronHealth::success('send_notifications', $ms, "Sent:{$sent} Failed:{$failed}");

} catch (\Throwable $e) {
    CronHealth::failure('send_notifications', $e->getMessage());
    exit(1);
}
