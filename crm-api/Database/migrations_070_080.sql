-- ============================================================
-- Combined migrations 070-080
-- Generated to close the gap: these files are not covered by
-- all_migrations_combined.sql (stops at 059), setup_database.php's
-- inline 060-069 block, or run_all_migrations.php's old regex
-- (which silently skipped 071-080).
-- Apply this AFTER schema.sql + all_migrations_combined.sql + the
-- inline 060-069 block (i.e. after a normal setup_database.php run
-- through migration 069, or after run_all_migrations.php).
-- ============================================================

-- ==================== Migration: 070_activity_logs_view_all_permission.sql ====================
-- Adds the permission that gates the system-wide "Super Activity Log" page.
-- Super admins already bypass all permission checks; this is only relevant
-- when a super admin grants a regular admin explicit access to it via the
-- page-access UI (AdminPageAccessService).
INSERT IGNORE INTO permissions (module, action, description) VALUES
  ('activity_logs', 'view_all', 'View system-wide activity logs across all admins, agents, and students (Super Activity Log)');


-- ==================== Migration: 070_html_email_templates.sql ====================
-- Migration 070: HTML Email Templates
-- Replaces all plain-text body_templates with professional HTML fragments.
-- These fragments are wrapped by MailService::wrapInEmailLayout() at send time.
-- Variables use {{double_brace}} syntax, rendered by NotificationService::render().

-- ============================================================
-- OTP / SECURITY CODES
-- ============================================================

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Verify Your Email</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Use the code below to complete your registration with The Global Avenues.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td align="center">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border:2px solid #D96200;border-radius:8px;background-color:#fffaf5;">
        <tr>
          <td style="padding:24px 48px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;color:#999999;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">Verification Code</p>
            <p style="margin:0;font-size:46px;font-weight:bold;color:#12172b;letter-spacing:14px;font-family:Courier New,Courier,monospace;">{{otp_code}}</p>
            <p style="margin:10px 0 0;font-size:13px;color:#D96200;font-weight:bold;">Valid for {{expiry_minutes}} minutes</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fff8f0;border-left:4px solid #D96200;padding:14px 16px;">
      <p style="margin:0 0 4px;font-size:13px;color:#D96200;font-weight:bold;">Security Notice</p>
      <p style="margin:0;font-size:13px;color:#666666;line-height:1.6;">If you did not request this code, please ignore this email. The Global Avenues will never ask for your OTP over phone or chat. Do not share this code with anyone.</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'student.registration_otp';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Verify Your Email</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Use the code below to complete your partner registration with The Global Avenues.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td align="center">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border:2px solid #D96200;border-radius:8px;background-color:#fffaf5;">
        <tr>
          <td style="padding:24px 48px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;color:#999999;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">Verification Code</p>
            <p style="margin:0;font-size:46px;font-weight:bold;color:#12172b;letter-spacing:14px;font-family:Courier New,Courier,monospace;">{{otp_code}}</p>
            <p style="margin:10px 0 0;font-size:13px;color:#D96200;font-weight:bold;">Valid for {{expiry_minutes}} minutes</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fff8f0;border-left:4px solid #D96200;padding:14px 16px;">
      <p style="margin:0 0 4px;font-size:13px;color:#D96200;font-weight:bold;">Security Notice</p>
      <p style="margin:0;font-size:13px;color:#666666;line-height:1.6;">If you did not request this code, please ignore this email. The Global Avenues will never ask for your OTP over phone or chat. Do not share this code with anyone.</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.registration_otp';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Your Login Code</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  A one-time login code has been requested for your account. Enter it to complete sign-in.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td align="center">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border:2px solid #D96200;border-radius:8px;background-color:#fffaf5;">
        <tr>
          <td style="padding:24px 48px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;color:#999999;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">One-Time Login Code</p>
            <p style="margin:0;font-size:46px;font-weight:bold;color:#12172b;letter-spacing:14px;font-family:Courier New,Courier,monospace;">{{otp_code}}</p>
            <p style="margin:10px 0 0;font-size:13px;color:#D96200;font-weight:bold;">Valid for {{expiry_minutes}} minutes</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fff8f0;border-left:4px solid #D96200;padding:14px 16px;">
      <p style="margin:0 0 4px;font-size:13px;color:#D96200;font-weight:bold;">Did not request this?</p>
      <p style="margin:0;font-size:13px;color:#666666;line-height:1.6;">If you did not attempt to log in, someone may be trying to access your account. Please contact us immediately at <strong>connect@theglobalavenues.com</strong>. Never share this code with anyone.</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'login.otp';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Admin Two-Factor Authentication</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Your admin portal sign-in requires two-factor verification. Use the code below.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td align="center">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border:2px solid #D96200;border-radius:8px;background-color:#fffaf5;">
        <tr>
          <td style="padding:24px 48px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;color:#999999;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">2FA Authentication Code</p>
            <p style="margin:0;font-size:46px;font-weight:bold;color:#12172b;letter-spacing:14px;font-family:Courier New,Courier,monospace;">{{otp_code}}</p>
            <p style="margin:10px 0 0;font-size:13px;color:#D96200;font-weight:bold;">Valid for {{expiry_minutes}} minutes</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fef2f2;border-left:4px solid #dc2626;padding:14px 16px;">
      <p style="margin:0 0 4px;font-size:13px;color:#dc2626;font-weight:bold;">High Security Alert</p>
      <p style="margin:0;font-size:13px;color:#666666;line-height:1.6;">This code grants access to the TGA admin portal. If you did not initiate this login, contact your system administrator immediately. Never share this code.</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'admin.2fa_otp';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Reset Your Password</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  We received a request to reset the password for your account. Use the code below to proceed.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td align="center">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border:2px solid #D96200;border-radius:8px;background-color:#fffaf5;">
        <tr>
          <td style="padding:24px 48px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;color:#999999;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">Password Reset Code</p>
            <p style="margin:0;font-size:46px;font-weight:bold;color:#12172b;letter-spacing:14px;font-family:Courier New,Courier,monospace;">{{otp_code}}</p>
            <p style="margin:10px 0 0;font-size:13px;color:#D96200;font-weight:bold;">Valid for {{expiry_minutes}} minutes</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fff8f0;border-left:4px solid #D96200;padding:14px 16px;">
      <p style="margin:0 0 4px;font-size:13px;color:#D96200;font-weight:bold;">Did not request a reset?</p>
      <p style="margin:0;font-size:13px;color:#666666;line-height:1.6;">If you did not request a password reset, please ignore this email. Your password will not change. Consider contacting support if you are concerned about your account security.</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'password.reset_otp';


-- ============================================================
-- WELCOME / ACCOUNT CREATION
-- ============================================================

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Welcome to The Global Avenues, {{student_name}}!</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Your student account is ready. We are excited to support your journey toward international education.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:bold;color:#333333;letter-spacing:1px;text-transform:uppercase;">What you can do now</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr><td style="padding:4px 0;font-size:14px;color:#555555;"><span style="color:#D96200;font-weight:bold;margin-right:8px;">&#8594;</span>Browse universities and courses</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#555555;"><span style="color:#D96200;font-weight:bold;margin-right:8px;">&#8594;</span>Submit your first application</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#555555;"><span style="color:#D96200;font-weight:bold;margin-right:8px;">&#8594;</span>Track your application status in real time</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#555555;"><span style="color:#D96200;font-weight:bold;margin-right:8px;">&#8594;</span>Upload documents and receive feedback</td></tr>
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
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">If you have any questions, reply to this email or contact us at <strong>connect@theglobalavenues.com</strong>.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'student.registered';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Welcome to the TGA Admin Portal, {{full_name}}!</p>
<p style="margin:0 0 28px;font-size:15px;color:#555555;line-height:1.7;">
  Your admin account has been created by a super administrator. Below you will find the details of your account access level.
</p>
{{pages_section}}
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#D96200;border-radius:6px;">
      <a href="{{portal_url}}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">Access Admin Portal &rarr;</a>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fff8f0;border-left:4px solid #D96200;padding:14px 16px;">
      <p style="margin:0;font-size:13px;color:#666666;line-height:1.6;">Please change your password upon first login and enable two-factor authentication to keep your account secure. If you did not expect this email, please contact the TGA system administrator immediately.</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'admin.created';


-- ============================================================
-- AGENT LIFECYCLE
-- ============================================================

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">New Partner Application Received</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  A new education agent application has been submitted and requires your review.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 16px;font-size:13px;font-weight:bold;color:#333333;letter-spacing:1px;text-transform:uppercase;">Application Details</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;width:140px;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;">Agency Name</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;font-weight:bold;">{{agency_name}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #e8e8e8;">Contact Name</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;border-top:1px solid #e8e8e8;">{{full_name}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #e8e8e8;">Country</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;border-top:1px solid #e8e8e8;">{{country}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#D96200;border-radius:6px;">
      <a href="{{admin_url}}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">Review Application &rarr;</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.onboarding_submitted';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Congratulations, {{full_name}}!</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Your application to become a certified partner of The Global Avenues has been <strong style="color:#16a34a;">approved</strong>. Welcome to our global education network.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:bold;color:#333333;letter-spacing:1px;text-transform:uppercase;">Your Partner Details</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;width:140px;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;">Referral Code</td>
          <td style="padding:6px 0;font-size:15px;color:#D96200;font-weight:bold;font-family:Courier New,Courier,monospace;letter-spacing:2px;">{{referral_code}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #e8e8e8;">Partner Tier</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;border-top:1px solid #e8e8e8;">Bronze (upgrades with performance)</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#D96200;border-radius:6px;">
      <a href="{{portal_url}}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">Access Partner Portal &rarr;</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">If you have any questions, please contact us at <strong>connect@theglobalavenues.com</strong>.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.approved';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Update on Your Partner Application</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Dear {{full_name}}, thank you for your interest in partnering with The Global Avenues. After careful review of your application, we regret that we are unable to proceed at this time.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fef2f2;border-left:4px solid #dc2626;border-radius:0 8px 8px 0;padding:16px 20px;">
      <p style="margin:0 0 6px;font-size:13px;color:#dc2626;font-weight:bold;">Reason for Decision</p>
      <p style="margin:0;font-size:14px;color:#555555;line-height:1.6;">{{rejection_reason}}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  You are welcome to reapply in the future if your circumstances change. For questions or to discuss this decision, please write to us at <strong>connect@theglobalavenues.com</strong>.
</p>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.rejected';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Your Partner Account Has Been Suspended</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Dear {{full_name}}, we regret to inform you that your partner account with The Global Avenues has been placed under suspension, effective immediately.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fef2f2;border-left:4px solid #dc2626;border-radius:0 8px 8px 0;padding:16px 20px;">
      <p style="margin:0 0 6px;font-size:13px;color:#dc2626;font-weight:bold;">Reason for Suspension</p>
      <p style="margin:0;font-size:14px;color:#555555;line-height:1.6;">{{suspension_reason}}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  During the suspension period your access to the partner portal is restricted. To appeal this decision or seek clarification, please contact us at <strong>connect@theglobalavenues.com</strong>.
</p>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Regards,<br><strong style="color:#333333;">The Global Avenues Compliance Team</strong></p>'
WHERE event_key = 'agent.suspended';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">New Sub-Agent Application Under Your Account</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Hi {{parent_agent_name}}, a new sub-agent has applied under your referral network and is pending approval from The Global Avenues.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:bold;color:#333333;letter-spacing:1px;text-transform:uppercase;">Application Details</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;width:140px;font-size:13px;color:#999999;font-weight:bold;">Name</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;font-weight:bold;">{{subagent_name}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;border-top:1px solid #e8e8e8;">Agency</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;border-top:1px solid #e8e8e8;">{{subagent_agency}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;border-top:1px solid #e8e8e8;">Status</td>
          <td style="padding:6px 0;border-top:1px solid #e8e8e8;"><span style="display:inline-block;background-color:#fff3cd;color:#856404;font-size:12px;font-weight:bold;padding:2px 10px;border-radius:20px;">Pending TGA Review</span></td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">We will notify you once their application has been reviewed.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'subagent.created';


-- ============================================================
-- LEAD PIPELINE
-- ============================================================

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">New Lead Captured</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  A new prospective student has submitted an enquiry through the TGA website.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:bold;color:#333333;letter-spacing:1px;text-transform:uppercase;">Lead Information</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;width:160px;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;">Name</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;font-weight:bold;">{{full_name}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #e8e8e8;">Source</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;border-top:1px solid #e8e8e8;">{{source}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #e8e8e8;">Interested In</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;border-top:1px solid #e8e8e8;">{{interested_country}} &mdash; {{interested_course}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#D96200;border-radius:6px;">
      <a href="{{admin_url}}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">View Lead in CRM &rarr;</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'lead.new';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Lead Assigned to You</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Hi {{staff_name}}, a prospective student lead has been assigned to you for follow-up.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:20px 24px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;width:140px;font-size:13px;color:#999999;font-weight:bold;">Name</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;font-weight:bold;">{{full_name}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;border-top:1px solid #e8e8e8;">Source</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;border-top:1px solid #e8e8e8;">{{source}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#D96200;border-radius:6px;">
      <a href="{{admin_url}}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">View Lead &rarr;</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'lead.assigned';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Lead <strong>{{full_name}}</strong> has moved to a new status: <strong style="color:#D96200;">{{new_status}}</strong>.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#D96200;border-radius:6px;">
      <a href="{{admin_url}}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">View in CRM &rarr;</a>
    </td>
  </tr>
</table>'
WHERE event_key = 'lead.status_changed';


-- ============================================================
-- NOTICES
-- ============================================================

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">New Notice: {{title}}</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;border-left:4px solid #D96200;padding:20px 24px;">
      <p style="margin:0;font-size:14px;color:#555555;line-height:1.7;">{{content_preview}}</p>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#D96200;border-radius:6px;">
      <a href="{{portal_url}}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">Read Full Notice &rarr;</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'notice.published';


-- ============================================================
-- AGENT REASSIGNMENT
-- ============================================================

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Agent Reassignment Request &mdash; Action Required</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  A student has submitted a request to change their assigned education agent. Please review and take action.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:bold;color:#333333;letter-spacing:1px;text-transform:uppercase;">Request Details</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;width:160px;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;">Student</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;font-weight:bold;">{{student_name}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #e8e8e8;">Current Agent</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;border-top:1px solid #e8e8e8;">{{current_agent_name}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #e8e8e8;">Reason</td>
          <td style="padding:6px 0;font-size:13px;color:#555555;border-top:1px solid #e8e8e8;">{{reason}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#D96200;border-radius:6px;">
      <a href="{{admin_url}}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">Review Request &rarr;</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.reassignment_requested';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Your Reassignment Request Has Been Approved</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Dear {{student_name}}, we are pleased to confirm that your request to change your assigned education consultant has been approved.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 8px 8px 0;padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#16a34a;font-weight:bold;">New Agent Assigned</p>
      <p style="margin:0;font-size:15px;font-weight:bold;color:#12172b;">{{new_agent_name}}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Your new agent will reach out to you shortly. You can also view this update on your student portal.
</p>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.reassignment_approved';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Update on Your Reassignment Request</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Dear {{student_name}}, after careful review, your request to change your assigned education consultant could not be approved at this time.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fef2f2;border-left:4px solid #dc2626;border-radius:0 8px 8px 0;padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#dc2626;font-weight:bold;">Review Notes</p>
      <p style="margin:0;font-size:14px;color:#555555;line-height:1.6;">{{review_notes}}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  If you have further questions or would like to submit a new request, please contact us at <strong>connect@theglobalavenues.com</strong>.
</p>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.reassignment_denied';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Student Portfolio Update</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Hi {{agent_name}}, we are writing to inform you that student <strong>{{student_name}}</strong> has been reassigned to another education consultant, effective immediately.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:16px 20px;">
      <p style="margin:0;font-size:13px;color:#666666;line-height:1.6;">Your historical records and commission ledger for this student remain available in your partner portal activity log.</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Thank you for your partnership with The Global Avenues.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.reassignment_lost';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">New Student Assigned to You</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Hi {{agent_name}}, a new student has been added to your portfolio.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 8px 8px 0;padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#16a34a;font-weight:bold;">Student Assigned</p>
      <p style="margin:0;font-size:15px;font-weight:bold;color:#12172b;">{{student_name}}</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Please log in to your partner portal to view their profile and application details.
</p>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.reassignment_gained';


-- ============================================================
-- COMMISSION
-- ============================================================

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Commission Record Created</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Hi {{agent_name}}, a new commission entry has been recorded in your ledger.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:bold;color:#333333;letter-spacing:1px;text-transform:uppercase;">Commission Details</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;width:140px;font-size:13px;color:#999999;font-weight:bold;">Student</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;font-weight:bold;">{{student_name}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;border-top:1px solid #e8e8e8;">Amount</td>
          <td style="padding:6px 0;font-size:15px;color:#D96200;font-weight:bold;border-top:1px solid #e8e8e8;">{{amount}} {{currency}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;border-top:1px solid #e8e8e8;">Status</td>
          <td style="padding:6px 0;border-top:1px solid #e8e8e8;"><span style="display:inline-block;background-color:#fff3cd;color:#856404;font-size:12px;font-weight:bold;padding:2px 10px;border-radius:20px;">Pending</span></td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">You will be notified when this commission is confirmed by our team.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'commission.created';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Commission Confirmed</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Hi {{agent_name}}, your commission has been verified and confirmed by our team.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:20px 24px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;width:140px;font-size:13px;color:#999999;font-weight:bold;">Student</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;font-weight:bold;">{{student_name}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;border-top:1px solid #e8e8e8;">Confirmed Amount</td>
          <td style="padding:6px 0;font-size:15px;color:#D96200;font-weight:bold;border-top:1px solid #e8e8e8;">{{amount}} {{currency}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;border-top:1px solid #e8e8e8;">Status</td>
          <td style="padding:6px 0;border-top:1px solid #e8e8e8;"><span style="display:inline-block;background-color:#dcfce7;color:#166534;font-size:12px;font-weight:bold;padding:2px 10px;border-radius:20px;">Confirmed</span></td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Payment will be processed per the standard commission schedule. You will receive a notification once payment is dispatched.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'commission.confirmed';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Commission Payment Dispatched</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Hi {{agent_name}}, your commission payment has been processed and marked as paid.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 8px 8px 0;padding:20px 24px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;width:140px;font-size:13px;color:#999999;font-weight:bold;">Student</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;font-weight:bold;">{{student_name}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;border-top:1px solid #c8e6c9;">Amount Paid</td>
          <td style="padding:6px 0;font-size:16px;color:#16a34a;font-weight:bold;border-top:1px solid #c8e6c9;">{{amount}} {{currency}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Please allow a few banking days for the funds to reflect in your account. Log in to your portal to download a commission statement.
</p>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Finance Team</strong></p>'
WHERE event_key = 'commission.paid';


-- ============================================================
-- SYSTEM ALERTS (admin-only)
-- ============================================================

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#dc2626;">Critical: Remote File Deletion Failed</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  A permanent file erasure operation could not delete the associated Google Drive copy after the maximum number of attempts. Manual intervention is required.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fef2f2;border-radius:8px;padding:20px 24px;border:1px solid #fecaca;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:bold;color:#dc2626;letter-spacing:1px;text-transform:uppercase;">Incident Details</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;width:140px;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;">File Name</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;font-family:Courier New,Courier,monospace;">{{file_name}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #fecaca;">Public ID</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;font-family:Courier New,Courier,monospace;border-top:1px solid #fecaca;">{{public_id}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #fecaca;">Attempts</td>
          <td style="padding:6px 0;font-size:13px;color:#dc2626;font-weight:bold;border-top:1px solid #fecaca;">{{attempts}} (maximum reached)</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #fecaca;">Error</td>
          <td style="padding:6px 0;font-size:12px;color:#555555;font-family:Courier New,Courier,monospace;border-top:1px solid #fecaca;word-break:break-all;">{{error}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td style="background-color:#fff8f0;border-left:4px solid #D96200;padding:14px 16px;">
      <p style="margin:0;font-size:13px;color:#666666;line-height:1.6;"><strong style="color:#D96200;">Required action:</strong> Log in to the Google Drive console and manually delete the file to complete the erasure and maintain GDPR compliance.</p>
    </td>
  </tr>
</table>'
WHERE event_key = 'system.erase_remote_delete_failed';


-- ==================== Migration: 070_student_custom_fields.sql ====================
CREATE TABLE student_custom_field_definitions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(26) NOT NULL UNIQUE,
    label VARCHAR(150) NOT NULL,
    field_type ENUM('text','textarea','number','date','select','file') NOT NULL DEFAULT 'text',
    options JSON NULL COMMENT 'Array of {value,label} choices — only used when field_type=select',
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT UNSIGNED NULL COMMENT 'users.id of the admin who created this field',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    INDEX idx_custom_field_defs_active_order (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_custom_field_values (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(26) NOT NULL UNIQUE,
    student_id INT UNSIGNED NOT NULL,
    definition_id INT UNSIGNED NOT NULL,
    value_text TEXT NULL,
    file_id INT UNSIGNED NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (definition_id) REFERENCES student_custom_field_definitions(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
    UNIQUE KEY uq_student_definition (student_id, definition_id),
    INDEX idx_custom_field_values_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==================== Migration: 071_users_email_unique_per_usertype.sql ====================
-- 071: Allow same email across different user types (student, agent, admin)
-- Replaces the global UNIQUE on email_lookup_hash with a composite unique
-- so the same email can register once per portal but not twice within the same portal.

ALTER TABLE users DROP INDEX email_lookup_hash;
ALTER TABLE users DROP INDEX idx_users_email_hash;
ALTER TABLE users ADD UNIQUE KEY uk_users_email_usertype (email_lookup_hash, user_type);


-- ==================== Migration: 072_agent_onboarding_profile.sql ====================
-- 072: Agent self-onboarding profile fields + files.document_type
-- Adds the applicant profile columns needed for the agent onboarding form
-- (first/last name, address, city, state, mobile numbers) and the
-- registered -> draft -> pending lifecycle states ahead of submission.
-- Also adds files.document_type, which AgentController::getOnboardingStatus()
-- already queries but which has never existed in the schema.

ALTER TABLE agents
  ADD COLUMN first_name VARCHAR(100) NULL AFTER full_name,
  ADD COLUMN last_name VARCHAR(100) NULL AFTER first_name,
  ADD COLUMN address_line TEXT NULL AFTER country,
  ADD COLUMN city VARCHAR(100) NULL AFTER address_line,
  ADD COLUMN state VARCHAR(100) NULL AFTER city,
  ADD COLUMN mobile_number VARCHAR(20) NULL AFTER state,
  ADD COLUMN alternate_mobile_number VARCHAR(20) NULL AFTER mobile_number,
  ADD COLUMN application_submitted_at DATETIME NULL AFTER terms_accepted_at,
  ADD COLUMN draft_updated_at DATETIME NULL AFTER application_submitted_at;

-- Existing rows were inserted directly as 'pending' (registration immediately
-- created a submitted-looking application). Re-baseline them to 'registered'
-- since none of them have actually filled out the new profile form yet.
UPDATE agents SET status = 'registered' WHERE status = 'pending';

ALTER TABLE agents
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'registered'
    COMMENT 'registered, draft, pending, approved, rejected, suspended';

ALTER TABLE files
  ADD COLUMN document_type VARCHAR(50) NULL AFTER owner_id,
  ADD INDEX idx_files_owner_doctype (owner_type, owner_id, document_type);


-- ==================== Migration: 073_agent_mobile_encryption.sql ====================
-- 073: Encrypt agents.mobile_number / alternate_mobile_number
-- These were added in 072 as plain VARCHAR, which is inconsistent with this
-- codebase's established PII pattern (students.phone_in_profile is XSalsa20
-- encrypted via EncryptionService — see migration 011). No lookup hash is
-- needed since these columns are never used in WHERE clauses, matching the
-- phone_in_profile precedent exactly.

-- Existing values (test data only, pre-encryption) cannot be migrated in
-- place since plaintext VARCHAR bytes are not valid ciphertext — clear them.
UPDATE agents SET mobile_number = NULL, alternate_mobile_number = NULL;

ALTER TABLE agents
  MODIFY COLUMN mobile_number BLOB NULL COMMENT 'XSalsa20-Poly1305 encrypted',
  MODIFY COLUMN alternate_mobile_number BLOB NULL COMMENT 'XSalsa20-Poly1305 encrypted';


-- ==================== Migration: 074_student_readiness.sql ====================
-- 074: Student profile readiness (personal fields + categorized document intake)
-- Supports the one-time "complete your profile" step a student finishes before
-- they're allowed to apply to any program/intake (gated via students.profile_status
-- reaching 'documents_submitted', enum already defined in migration 011).

ALTER TABLE students
  ADD COLUMN gender VARCHAR(20) NULL AFTER date_of_birth,
  ADD COLUMN alternate_mobile BLOB NULL COMMENT 'XSalsa20-Poly1305 encrypted, same pattern as phone_in_profile' AFTER phone_in_profile,
  ADD COLUMN how_heard_about_us VARCHAR(50) NULL COMMENT 'agent, university_staff, social_media, website, referral, other' AFTER lead_source,
  ADD COLUMN planning_phd TINYINT(1) NOT NULL DEFAULT 0 AFTER how_heard_about_us;

CREATE TABLE student_documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  student_id INT UNSIGNED NOT NULL,
  category VARCHAR(40) NOT NULL
    COMMENT 'photo, passport_front, passport_back, academic_marksheet, transcript, cv, sop, lor, noi, proficiency, phd_thesis, phd_lor_professional, other',
  file_id INT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_studentdoc_student (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY fk_studentdoc_file (file_id) REFERENCES files(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_student_category (student_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Closes CLAUDE.md Known Open Item #1: StateManager::transition() fires
-- 'application.status_changed' but no template exists, so notifications
-- silently no-op. Vars available at fire-time: {{new_status}} only
-- (see StateManager.php:153) — application_id is an internal int, not
-- rendered to end users.
INSERT IGNORE INTO notification_templates
  (event_key, subject_template, body_template, channels, category, is_active)
VALUES
  ('application.status_changed',
   'Your application status has been updated',
   'Hello,\n\nYour application status has changed to: {{new_status}}.\n\nLog in to your TGA portal to view the full details.\n\n— The Global Avenues',
   'email,in_app',
   'applications',
   1);


-- ==================== Migration: 075_application_cap_and_metadata.sql ====================
-- 075: Application cap + creation provenance + preference ranking
-- Supports: (1) an admin-editable cap on how many non-withdrawn/non-rejected
-- applications a student may hold open at once, (2) recording who actually
-- initiated an application (student self-service vs agent-on-behalf-of),
-- independent of agent_id_at_submission (which only reflects the student's
-- assigned agent at submit time, not the acting user), and (3) an optional
-- student-editable preference rank across their own active applications.

ALTER TABLE applications
  ADD COLUMN created_by_type ENUM('student','agent','admin') NOT NULL DEFAULT 'student' AFTER agent_id_at_submission,
  ADD COLUMN created_by_id INT UNSIGNED NULL COMMENT 'users.id of the actor who created this application' AFTER created_by_type,
  ADD COLUMN preference_rank SMALLINT UNSIGNED NULL COMMENT 'Student-editable 1..N rank across their own active applications; no DB uniqueness, recalculated wholesale on every reorder' AFTER status;

-- Best-effort backfill for existing rows: no way to recover the true actor,
-- so infer from whether an agent was attached at submission time.
UPDATE applications SET created_by_type = 'agent' WHERE agent_id_at_submission IS NOT NULL;

INSERT INTO system_settings (setting_key, setting_value, value_type, label, description, group_name, is_editable)
VALUES ('max_active_applications_per_student', '3', 'integer',
        'Max Active Applications per Student',
        'Maximum number of non-withdrawn, non-rejected applications a student may hold open at once.',
        'applications', 1);


-- ==================== Migration: 076_student_created_by_agent_notification.sql ====================
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


-- ==================== Migration: 077_university_campuses.sql ====================
-- 077: university_campuses
-- Universities can have multiple physical campuses (main location + "other campuses").
-- Previously only universities.city (single value) existed. This table lets us record
-- every campus location without losing data or duplicating university/course rows.
CREATE TABLE university_campuses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  university_id INT UNSIGNED NOT NULL,
  city VARCHAR(255) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_campus_uni (university_id) REFERENCES universities(id) ON DELETE CASCADE,
  INDEX idx_campus_uni (university_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==================== Migration: 078_university_campus_groups.sql ====================
-- 078: campus_group_id
-- Links sibling university rows that represent different physical campuses of the same
-- real-world institution (e.g. one row per city, each independently managed: own courses,
-- fees, intakes, students/applications). NULL = this university has no sibling campuses.
-- Not a foreign key -- it's a shared tag copied onto every row in the group, not a reference
-- to a single other row, so there's nothing for a FK to point at.
ALTER TABLE universities
  ADD COLUMN campus_group_id CHAR(26) NULL AFTER partnership_type,
  ADD INDEX idx_campus_group (campus_group_id);


-- ==================== Migration: 079_remove_dead_system_settings.sql ====================
-- Migration 079: Remove system_settings rows that no backend code ever reads.
-- Each of these had an editable field on the admin Settings page and saved
-- successfully, but changing the value had zero effect on app behavior:
--   otp_max_attempts              -- OTPService::verify() hardcodes maxAttempts=3;
--                                     every call site omits the 4th argument.
--   commission_pending_alert_days -- no cron/service ever checks commission age
--                                     against this to fire a reminder.
--   reminder_days_before_deadline -- ReminderService::schedule() takes offsets
--                                     as a parameter; the only caller
--                                     (PaymentTrackingController) hardcodes
--                                     [7 => 'payment_upcoming', 1 => 'payment_urgent'].
--   api_log_slow_threshold_ms     -- the api_request_logs table it would gate
--                                     is never written to anywhere.
--   argon2_memory_cost            -- password_hash() calls read
--   argon2_time_cost                 ARGON2_MEMORY_COST/ARGON2_TIME_COST from
--                                     crm-api/.env via Environment::get(),
--                                     never from system_settings.
DELETE FROM system_settings WHERE setting_key IN (
  'otp_max_attempts',
  'commission_pending_alert_days',
  'reminder_days_before_deadline',
  'api_log_slow_threshold_ms',
  'argon2_memory_cost',
  'argon2_time_cost'
);


-- ==================== Migration: 080_user_search_prefix_hashes.sql ====================
-- 080: Prefix-hash columns for partial "starts with" search on encrypted email/phone,
-- without decrypting rows at query time. See PHASE_4_APPEND.md 2026-07-04 entry for
-- the full design rationale (fixed-length hash equality, not arbitrary substring).
ALTER TABLE users
  ADD COLUMN email_prefix4_hash VARCHAR(64) NULL,
  ADD COLUMN email_prefix6_hash VARCHAR(64) NULL,
  ADD COLUMN email_prefix8_hash VARCHAR(64) NULL,
  ADD COLUMN phone_prefix4_hash VARCHAR(64) NULL,
  ADD COLUMN phone_prefix6_hash VARCHAR(64) NULL,
  ADD INDEX idx_users_email_prefix4 (email_prefix4_hash),
  ADD INDEX idx_users_email_prefix6 (email_prefix6_hash),
  ADD INDEX idx_users_email_prefix8 (email_prefix8_hash),
  ADD INDEX idx_users_phone_prefix4 (phone_prefix4_hash),
  ADD INDEX idx_users_phone_prefix6 (phone_prefix6_hash);


