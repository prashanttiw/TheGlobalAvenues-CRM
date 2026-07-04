-- Migration 081: Missing system alert notification templates
--
-- cron/check-sla-breaches.php and cron/monitor-disk.php have always called
-- NotificationService::fire('sla.breached', ...), fire('system.disk_warning', ...), and
-- fire('system.disk_critical', ...) — but no notification_templates row existed for any of
-- the three event keys. NotificationService::fire() silently no-ops when no active template
-- exists, so SLA breach alerts and disk space warnings/critical alerts to super admins have
-- never actually been sent. This was found while auditing old one-off seed scripts
-- (scripts/seed_6i_6j_templates.php had these same three rows, written at some point but
-- never folded into a real migration or setup_database.php's seed list — content preserved
-- here, superseding that script).

INSERT INTO notification_templates (event_key, subject_template, body_template, channels, category) VALUES
('sla.breached',
 'SLA Breach: {{rule_name}} — Immediate Action Required',
 '<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#dc2626;">SLA Breach Detected</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  An SLA target has been missed and requires immediate attention.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fef2f2;border-radius:8px;padding:20px 24px;border:1px solid #fecaca;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:bold;color:#dc2626;letter-spacing:1px;text-transform:uppercase;">Breach Details</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;width:140px;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;">Rule</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;font-weight:bold;">{{rule_name}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #fecaca;">Entity</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;border-top:1px solid #fecaca;">{{entity_type}} #{{entity_id}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #fecaca;">Target Was</td>
          <td style="padding:6px 0;font-size:13px;color:#333333;border-top:1px solid #fecaca;">{{target_at}}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#999999;font-weight:bold;vertical-align:top;border-top:1px solid #fecaca;">Overdue By</td>
          <td style="padding:6px 0;font-size:13px;color:#dc2626;font-weight:bold;border-top:1px solid #fecaca;">{{overdue_hours}} hours</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#D96200;border-radius:6px;">
      <a href="{{admin_url}}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">Review in Admin Panel &rarr;</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">The Global Avenues System</p>',
 'email,in_app', 'system'),

('system.disk_warning',
 'Disk Space Warning: {{used_pct}}% Used',
 '<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Disk Space Warning</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Server disk usage has crossed the warning threshold.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fff8f0;border-left:4px solid #D96200;padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#D96200;font-weight:bold;">Current Usage</p>
      <p style="margin:0;font-size:15px;font-weight:bold;color:#12172b;">{{used_pct}}% used &mdash; {{free_gb}} GB free</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Consider clearing old backups or logs before this reaches critical levels.
</p>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">The Global Avenues System</p>',
 'email,in_app', 'system'),

('system.disk_critical',
 'CRITICAL: Disk Space {{used_pct}}% Used',
 '<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#dc2626;">Critical Disk Space Alert</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Server disk usage has crossed the critical threshold. Immediate action is required.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fef2f2;border-left:4px solid #dc2626;padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#dc2626;font-weight:bold;">Current Usage</p>
      <p style="margin:0;font-size:15px;font-weight:bold;color:#12172b;">{{used_pct}}% used &mdash; {{free_gb}} GB free</p>
    </td>
  </tr>
</table>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  New uploads will begin failing once the disk is full. Free up space now.
</p>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">The Global Avenues System</p>',
 'email,in_app', 'system')

ON DUPLICATE KEY UPDATE
  subject_template = VALUES(subject_template),
  body_template = VALUES(body_template);
