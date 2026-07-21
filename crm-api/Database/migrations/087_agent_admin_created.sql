-- Migration 087: Admin-created agent accounts.
--
-- Adds a second path to becoming an agent partner: an admin creates the account directly
-- (offline relationship, no documents/review needed) instead of the existing self-registration
-- + document upload + approval flow. Two new columns:
--   - agents.created_by_admin_id: presence marks a record as admin-created (no separate
--     enum/status needed — the FK itself is the audit trail requested for the admin UI).
--   - users.must_change_password: forces a password change on first login for the temp
--     password emailed to the new agent (AuthController::changePassword clears it back to 0).
--
-- MySQL 5.7 safe: no CTEs/window functions/expression defaults used.

ALTER TABLE agents
  ADD COLUMN created_by_admin_id INT UNSIGNED NULL AFTER approved_by,
  ADD CONSTRAINT fk_agent_created_by_admin FOREIGN KEY (created_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  ADD INDEX idx_agent_created_by_admin (created_by_admin_id);

ALTER TABLE users
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash;

-- New welcome email — follows the migration-086 house style (no <a href> buttons/links in any
-- notification email, per 2026-07-14 client decision). Credentials shown in a plain styled box,
-- same idiom as agent.approved's referral-code box.
INSERT INTO notification_templates (event_key, subject_template, body_template, channels, category) VALUES
('agent.created_by_admin',
 'Welcome to The Global Avenues, {{full_name}}!',
 '<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Welcome to The Global Avenues, {{full_name}}!</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  An administrator has created your partner account with The Global Avenues. You can log in right away &mdash; no application or document review needed.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 16px;font-size:13px;font-weight:bold;color:#333333;letter-spacing:1px;text-transform:uppercase;">Your Login Details</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;width:160px;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;">Email</td>
          <td style="padding:6px 0;font-size:14px;color:#333333;font-weight:bold;">{{email}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #e8e8e8;">Temporary Password</td>
          <td style="padding:6px 0;font-size:15px;color:#D96200;font-weight:bold;font-family:Courier New,Courier,monospace;letter-spacing:1px;border-top:1px solid #e8e8e8;">{{temp_password}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #e8e8e8;">Referral Code</td>
          <td style="padding:6px 0;font-size:15px;color:#D96200;font-weight:bold;font-family:Courier New,Courier,monospace;letter-spacing:2px;border-top:1px solid #e8e8e8;">{{referral_code}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fff8f0;border-left:4px solid #D96200;padding:14px 16px;">
      <p style="margin:0;font-size:13px;color:#666666;line-height:1.6;">For your security, you will be asked to set a new password immediately after your first login. If you did not expect this email, please contact us right away.</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">If you have any questions, please contact us at <strong>connect@theglobalavenues.com</strong>.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>',
 'email,in_app', 'agent')
ON DUPLICATE KEY UPDATE
  subject_template = VALUES(subject_template),
  body_template = VALUES(body_template),
  channels = VALUES(channels),
  category = VALUES(category);
