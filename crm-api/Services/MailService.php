<?php

declare(strict_types=1);

namespace TGA\CRM\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;
use TGA\CRM\Config\Environment;

class MailService
{
    /**
     * Send an email RIGHT NOW, synchronously.
     * Used for OTP, password reset, 2FA — anything the user is waiting for.
     *
     * Returns false on failure. Does NOT queue a fallback.
     *
     * @return bool true if sent successfully, false on failure
     */
    public static function sendNow(
        string $toEmail,
        string $subject,
        string $rawBody,
        ?string $plainBody = null
    ): bool {
        try {
            $mail = self::createMailer();
            $mail->addAddress($toEmail);
            $mail->Subject = $subject;
            $mail->isHTML(true);
            $mail->Body = self::buildHtmlBody($rawBody);
            $mail->AltBody = $plainBody ?? $rawBody;
            $mail->send();
            return true;
        } catch (\Throwable $e) {
            // Log failure to security_events for admin visibility into SMTP health
            SecurityEventLogger::log(
                'smtp_send_failure',
                null,                                // no user_id context
                EncryptionService::hash($toEmail),  // don't store plaintext email
                null,                                // IP fallback in logger
                [
                    'error'   => $e->getMessage(),
                    'method'  => 'synchronous',
                    'subject' => $subject,
                ]
            );
            return false;
        }
    }

    /**
     * Convert plain text to HTML safely by encoding special characters and converting newlines.
     */
    public static function buildHtmlBody(string $rawBody): string
    {
        return nl2br(htmlspecialchars($rawBody, ENT_QUOTES, 'UTF-8'));
    }

    /**
     * Create a configured PHPMailer instance.
     * Single source of truth for SMTP config — used by BOTH
     * synchronous sends AND the send-notifications.php cron.
     */
    public static function createMailer(): PHPMailer
    {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Timeout    = 10; // Hard cap to prevent request hanging
        $mail->Host       = Environment::get('SMTP_HOST') ?? Environment::get('MAIL_HOST') ?? '';
        $mail->SMTPAuth   = true;
        $mail->Username   = Environment::get('SMTP_USER') ?? Environment::get('MAIL_USERNAME') ?? '';
        $mail->Password   = Environment::get('SMTP_PASS') ?? Environment::get('MAIL_PASSWORD') ?? '';
        $mail->SMTPSecure = Environment::get('SMTP_ENCRYPTION') ?? Environment::get('MAIL_ENCRYPTION') ?? PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int) (Environment::get('SMTP_PORT') ?? Environment::get('MAIL_PORT') ?? 587);
        $mail->setFrom(
            Environment::get('SMTP_FROM_ADDRESS') ?? Environment::get('MAIL_FROM_EMAIL') ?? 'noreply@theglobalavenues.com',
            Environment::get('SMTP_FROM_NAME') ?? Environment::get('MAIL_FROM_NAME') ?? 'The Global Avenues'
        );
        $mail->CharSet = 'UTF-8';
        return $mail;
    }

    /**
     * Create a configured PHPMailer instance for the fallback SMTP server.
     */
    public static function createFallbackMailer(): ?PHPMailer
    {
        $fallbackHost = Environment::get('MAIL_FALLBACK_HOST');
        if (empty($fallbackHost)) {
            return null;
        }

        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Timeout    = 10;
        $mail->Host       = $fallbackHost;
        $mail->SMTPAuth   = true;
        $mail->Username   = Environment::get('MAIL_FALLBACK_USERNAME') ?? '';
        $mail->Password   = Environment::get('MAIL_FALLBACK_PASSWORD') ?? '';
        $mail->SMTPSecure = Environment::get('MAIL_FALLBACK_ENCRYPTION') ?? PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int) (Environment::get('MAIL_FALLBACK_PORT') ?? 587);
        $mail->setFrom(
            Environment::get('SMTP_FROM_EMAIL') ?? 'noreply@theglobalavenues.com',
            Environment::get('SMTP_FROM_NAME') ?? 'The Global Avenues'
        );
        $mail->CharSet = 'UTF-8';
        return $mail;
    }
}
