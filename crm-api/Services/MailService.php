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
            $mail->Body    = self::wrapInEmailLayout($subject, self::toHtmlFragment($rawBody));
            $mail->AltBody = $plainBody ?? self::toPlainText($rawBody);
            $mail->send();
            return true;
        } catch (\Throwable $e) {
            SecurityEventLogger::log(
                'smtp_send_failure',
                null,
                EncryptionService::hash($toEmail),
                null,
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
     * Wrap a body HTML fragment in the full TGA branded email layout.
     *
     * Logo is referenced via a public HTTPS URL (MAIL_LOGO_URL env var).
     * This is the only approach that works across all clients without showing
     * a fake "attachment" in the inbox list (CID embedding causes that in Gmail).
     * The logo-light.png in Vite's public/ folder is deployed to Vercel automatically
     * and is publicly accessible at https://portal.theglobalavenues.com/logo-light.png.
     */
    public static function wrapInEmailLayout(string $subject, string $bodyHtml): string
    {
        $year    = date('Y');
        $logoUrl = Environment::get('MAIL_LOGO_URL') ?? '';

        $logoBlock = $logoUrl !== ''
            ? "<img src=\"{$logoUrl}\" alt=\"The Global Avenues\" width=\"260\" style=\"display:block;width:260px;height:auto;max-width:100%;\" />"
            : '<p style="margin:0 0 4px;font-size:22px;font-weight:bold;color:#2d2580;">The Global Avenues</p>'
              . '<p style="margin:0;font-size:11px;color:#E8651A;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">Education . Consulting . Collaborations</p>';

        return <<<HTML
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{$subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f2f5;">
  <tr>
    <td align="center" style="padding:32px 16px 48px;">

      <!-- ========== EMAIL CONTAINER ========== -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">

        <!-- HEADER: white background so the full-colour TGA logo renders correctly -->
        <tr>
          <td style="background-color:#ffffff;border-radius:8px 8px 0 0;padding:0;border-top:4px solid #E8651A;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding:28px 40px 24px;">
                  {$logoBlock}
                </td>
              </tr>
              <tr>
                <td style="background-color:#f0f2f5;height:1px;font-size:1px;line-height:1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CONTENT AREA -->
        <tr>
          <td style="background-color:#ffffff;padding:40px 40px 36px;">
            {$bodyHtml}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background-color:#f8f9fa;border-top:1px solid #e4e6ea;border-radius:0 0 8px 8px;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#555555;">The Global Avenues</p>
            <p style="margin:0 0 4px;font-size:12px;color:#888888;">New Delhi, India &nbsp;&bull;&nbsp; ICEF Certified Partner</p>
            <p style="margin:0 0 10px;font-size:12px;color:#888888;">connect@theglobalavenues.com</p>
            <p style="margin:0;font-size:11px;color:#bbbbbb;">&copy; {$year} The Global Avenues. All rights reserved.</p>
            <p style="margin:4px 0 0;font-size:11px;color:#bbbbbb;">This is an automated message &mdash; please do not reply directly to this email.</p>
          </td>
        </tr>

      </table>
      <!-- ========== END EMAIL CONTAINER ========== -->

    </td>
  </tr>
</table>

</body>
</html>
HTML;
    }

    /**
     * Turn a queued notification_templates.body_template (already variable-substituted)
     * into the final HTML sent by cron/send-notifications.php — wrapped in the same
     * branded layout sendNow() uses, so queued mail (welcome, commission, reassignment,
     * document requests, etc.) doesn't go out as a bare, unbranded fragment.
     */
    public static function buildHtmlBody(string $subject, string $rawBody): string
    {
        return self::wrapInEmailLayout($subject, self::toHtmlFragment($rawBody));
    }

    /**
     * Some templates (e.g. application.status_changed, document.*) are stored as plain
     * text with \n line breaks rather than HTML markup. Sent as-is inside an isHTML(true)
     * message, \n has no visual effect and the whole body collapses into one run-on line —
     * so plain bodies are escaped and nl2br'd here; bodies that already contain HTML markup
     * pass through untouched.
     */
    private static function toHtmlFragment(string $rawBody): string
    {
        $looksLikeHtml = preg_match('/<[a-z][\s\S]*>/i', $rawBody) === 1;
        return $looksLikeHtml ? $rawBody : nl2br(htmlspecialchars($rawBody, ENT_QUOTES, 'UTF-8'));
    }

    /**
     * Plain-text fallback (PHPMailer AltBody) for clients that can't render HTML.
     */
    public static function toPlainText(string $rawBody): string
    {
        return strip_tags(str_replace(
            ['<br>', '<br/>', '<br />', '</p>', '</tr>'],
            "\n",
            $rawBody
        ));
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
        $mail->Timeout    = 10;
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
