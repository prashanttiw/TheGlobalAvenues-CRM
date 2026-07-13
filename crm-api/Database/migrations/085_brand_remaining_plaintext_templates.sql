-- Migration 085: Bring the last 6 plain-text notification templates up to the same branded
-- HTML style migration 070 gave everything else (heading, intro paragraph, highlight/info box,
-- signed-off close — same colors/typography as every other template). These 6 were never
-- converted in 070 because they didn't exist yet (document.* / agent.registered landed in 082,
-- after 070) or were added later still (application.status_changed, migration 074/pending gap).
--
-- No new template variables are introduced — every {{var}} used below was already being passed
-- by the firing code. The one exception, application.status_changed's {{new_status}}, used to
-- receive the raw DB value (e.g. "offer_received"); StateManager::transition() now formats it
-- the same way the student/agent/admin portals already display it ("Offer Received") before
-- passing it to fire() — see StateManager.php.

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Welcome to The Global Avenues, {{full_name}}!</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Your TGA partner account has been created. The final step is to complete your partner application so our team can review it.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:20px 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:bold;color:#333333;letter-spacing:1px;text-transform:uppercase;">Next steps</p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr><td style="padding:4px 0;font-size:14px;color:#555555;"><span style="color:#D96200;font-weight:bold;margin-right:8px;">&#8594;</span>Log in and complete your partner application</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#555555;"><span style="color:#D96200;font-weight:bold;margin-right:8px;">&#8594;</span>Our team will review it and confirm your partnership</td></tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#D96200;border-radius:6px;">
      <a href="{{portal_url}}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">Complete Partner Application &rarr;</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">If you have any questions, contact us at <strong>connect@theglobalavenues.com</strong>.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.registered';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">New Document Requested</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  A new document has been requested for your application. Please upload it as soon as possible to keep things moving.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fff8f0;border-left:4px solid #D96200;border-radius:0 8px 8px 0;padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#D96200;font-weight:bold;">Document Needed</p>
      <p style="margin:0;font-size:15px;font-weight:bold;color:#12172b;">{{doc_label}}</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Please log in to your portal to upload it.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'document.requested';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Document Submitted for Review</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  A document has been uploaded and is ready for your review.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#999999;font-weight:bold;">Document</p>
      <p style="margin:0;font-size:15px;font-weight:bold;color:#12172b;">{{doc_label}}</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Please log in to the admin panel to review it.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'document.submitted';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Document Reviewed</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Your submitted document has been reviewed by our team.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#999999;font-weight:bold;">Document</p>
      <p style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#12172b;">{{doc_label}}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#999999;font-weight:bold;">Status</p>
      <p style="margin:0;font-size:15px;font-weight:bold;color:#D96200;">{{status}}</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Please log in to your portal for details.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'document.reviewed';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Document Request Cancelled</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  The document request below has been cancelled. No further action is needed.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#999999;font-weight:bold;">Document</p>
      <p style="margin:0;font-size:15px;font-weight:bold;color:#12172b;">{{doc_label}}</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'document.cancelled';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Application Update</p>
<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Hi {{recipient_name}}, your application <strong>{{reference_number}}</strong> has a new status.
</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fff8f0;border-left:4px solid #D96200;border-radius:0 8px 8px 0;padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#D96200;font-weight:bold;">New Status</p>
      <p style="margin:0;font-size:15px;font-weight:bold;color:#12172b;">{{new_status}}</p>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#D96200;border-radius:6px;">
      <a href="{{portal_url}}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">View Application &rarr;</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'application.status_changed';
