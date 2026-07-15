-- Migration 086: Remove every clickable button/link from notification emails.
--
-- Client decision (2026-07-14): rather than keep verifying/maintaining destination links as the
-- site's routes evolve, remove the risk entirely — no template should ever be able to send a
-- dead or wrong link again. Every CTA button (`<a href="{{...}}">...</a>` wrapped in its own
-- highlighted table cell) is stripped from the 13 templates that had one; all other content
-- (heading, info boxes, sign-off) is untouched. The 22 templates that never had a button
-- (commission.*, agent.rejected/suspended, agent.reassignment_approved/denied/lost/gained,
-- subagent.created, document.*, OTP codes, system.disk_*) needed no change.
--
-- portal_url/admin_url variables are still passed by the firing PHP code (harmless — an unused
-- {{var}} in the array is simply never matched by NotificationService::render()'s str_replace);
-- left alone rather than touching 9 controller files for a value that's now write-only.

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">Welcome to the TGA Admin Portal, {{full_name}}!</p>
<p style="margin:0 0 28px;font-size:15px;color:#555555;line-height:1.7;">
  Your admin account has been created by a super administrator. Below you will find the details of your account access level.
</p>
{{pages_section}}
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#fff8f0;border-left:4px solid #D96200;padding:14px 16px;">
      <p style="margin:0;font-size:13px;color:#666666;line-height:1.6;">Please change your password upon first login and enable two-factor authentication to keep your account secure. If you did not expect this email, please contact the TGA system administrator immediately.</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'admin.created';

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
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">If you have any questions, please contact us at <strong>connect@theglobalavenues.com</strong>.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.approved';

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
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.onboarding_submitted';

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
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.reassignment_requested';

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
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">If you have any questions, contact us at <strong>connect@theglobalavenues.com</strong>.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'agent.registered';

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
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'application.status_changed';

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
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'lead.assigned';

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
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'lead.new';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.7;">
  Lead <strong>{{full_name}}</strong> has moved to a new status: <strong style="color:#D96200;">{{new_status}}</strong>.
</p>'
WHERE event_key = 'lead.status_changed';

UPDATE notification_templates SET body_template =
'<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#12172b;">New Notice: {{title}}</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
  <tr>
    <td style="background-color:#f8f9fa;border-radius:8px;border-left:4px solid #D96200;padding:20px 24px;">
      <p style="margin:0;font-size:14px;color:#555555;line-height:1.7;">{{content_preview}}</p>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'notice.published';

UPDATE notification_templates SET body_template =
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
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">The Global Avenues System</p>'
WHERE event_key = 'sla.breached';

UPDATE notification_templates SET body_template =
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
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">If you have any questions, reply to this email or contact us at <strong>connect@theglobalavenues.com</strong>.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'student.created_by_agent';

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
<p style="margin:0;font-size:14px;color:#888888;line-height:1.6;">If you have any questions, reply to this email or contact us at <strong>connect@theglobalavenues.com</strong>.<br><br>Warm regards,<br><strong style="color:#333333;">The Global Avenues Team</strong></p>'
WHERE event_key = 'student.registered';
