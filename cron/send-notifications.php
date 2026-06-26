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

Environment::load(__DIR__ . '/../crm-api/.env');

CronHealth::start('send_notifications');
$startTime = microtime(true);

try {
    $pdo = Database::getConnection();
    // Atomically lock and mark as processing to prevent duplicate dispatch by concurrent crons
    $pdo->beginTransaction();
    $notifications = $pdo->query("
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
    ")->fetchAll(PDO::FETCH_ASSOC);

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

            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Timeout    = 10; // Prevent hanging on SMTP server issues
            $mail->Host       = Environment::get('MAIL_HOST') ?? Environment::get('SMTP_HOST') ?? '';
            $mail->SMTPAuth   = true;
            $mail->Username   = Environment::get('MAIL_USERNAME') ?? Environment::get('SMTP_USER') ?? '';
            $mail->Password   = Environment::get('MAIL_PASSWORD') ?? Environment::get('SMTP_PASS') ?? '';
            $mail->SMTPSecure = Environment::get('MAIL_ENCRYPTION') ?? Environment::get('SMTP_ENCRYPTION') ?? PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = (int) (Environment::get('MAIL_PORT') ?? Environment::get('SMTP_PORT') ?? 587);
            $mail->setFrom(
                Environment::get('MAIL_FROM_EMAIL') ?? Environment::get('SMTP_FROM_ADDRESS') ?? 'noreply@theglobalavenues.com',
                Environment::get('MAIL_FROM_NAME') ?? Environment::get('SMTP_FROM_NAME') ?? 'The Global Avenues'
            );
            $mail->addAddress($email);
            $mail->isHTML(true);
            $mail->Subject = $notif['subject'] ?? '(No Subject)';
            $body = $notif['body'] ?? '';
            $mail->Body    = nl2br(htmlspecialchars($body, ENT_QUOTES, 'UTF-8'));
            $mail->AltBody = $body;
            try {
                $mail->send();
            } catch (\Throwable $primaryEx) {
                $fallbackHost = Environment::get('MAIL_FALLBACK_HOST');
                if (!empty($fallbackHost)) {
                    error_log("[SMTP Fallback] Primary failed. Retrying with fallback server: " . $primaryEx->getMessage());
                    $mailFallback = new PHPMailer(true);
                    $mailFallback->isSMTP();
                    $mailFallback->Timeout    = 10;
                    $mailFallback->Host       = $fallbackHost;
                    $mailFallback->SMTPAuth   = true;
                    $mailFallback->Username   = Environment::get('MAIL_FALLBACK_USERNAME') ?? '';
                    $mailFallback->Password   = Environment::get('MAIL_FALLBACK_PASSWORD') ?? '';
                    $mailFallback->SMTPSecure = Environment::get('MAIL_FALLBACK_ENCRYPTION') ?? PHPMailer::ENCRYPTION_STARTTLS;
                    $mailFallback->Port       = (int) (Environment::get('MAIL_FALLBACK_PORT') ?? 587);
                    $mailFallback->setFrom(
                        Environment::get('MAIL_FROM_EMAIL') ?? 'noreply@theglobalavenues.com',
                        Environment::get('MAIL_FROM_NAME') ?? 'The Global Avenues'
                    );
                    $mailFallback->addAddress($email);
                    $mailFallback->isHTML(true);
                    $mailFallback->Subject = $notif['subject'] ?? '(No Subject)';
                    $mailFallback->Body    = nl2br(htmlspecialchars($body, ENT_QUOTES, 'UTF-8'));
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
