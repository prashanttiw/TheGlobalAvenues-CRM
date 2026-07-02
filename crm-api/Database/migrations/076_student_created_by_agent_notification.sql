-- 076: Welcome email for students created directly by an agent (no OTP step).
-- Deliberately has NO password variable — the generated password is never
-- emailed. Login is via OTP (login.otp / requestOtpLogin) or the existing
-- forgot-password reset flow.

INSERT IGNORE INTO notification_templates
  (event_key, subject_template, body_template, channels, category, is_active)
VALUES
  ('student.created_by_agent',
   'Your Global Avenues student profile is ready',
   '<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Welcome to The Global Avenues, {{student_name}}!</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Your student profile has been created with The Global Avenues by <strong>{{agent_name}}</strong>. You can now track your applications, documents, and offers in one place.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:bold;color:#333333;letter-spacing:1px;text-transform:uppercase;">How to log in</p>
      <p style="margin:0 0 10px;font-size:14px;color:#555555;line-height:1.6;">Use this email address (<strong>{{student_email}}</strong>) with either:</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr><td style="padding:4px 0;font-size:14px;color:#555555;"><span style="color:#D96200;font-weight:bold;margin-right:8px;">&#8594;</span>One-time passcode (OTP) login &mdash; no password needed, or</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#555555;"><span style="color:#D96200;font-weight:bold;margin-right:8px;">&#8594;</span>"Forgot password" to set your own password</td></tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#D96200;border-radius:6px;">
      <a href="{{portal_url}}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">Go to Student Portal &rarr;</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">If you have any questions, reply to this email or contact us at <strong>connect@theglobalavenues.com</strong>.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>',
   'email,in_app',
   'system',
   1);
