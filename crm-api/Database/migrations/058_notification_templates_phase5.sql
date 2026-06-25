-- 058: Phase 5 notification templates
-- All agent reassignment and commission event templates

INSERT INTO notification_templates (event_key, subject_template, body_template, channels, category) VALUES
('agent.reassignment_requested',
 'Agent Reassignment Request — Action Required',
 'Student {{student_name}} has requested an agent reassignment. Current agent: {{current_agent_name}}. Reason: {{reason}}. Review in admin panel.',
 'email,in_app', 'approvals'),

('agent.reassignment_approved',
 'Your Agent Reassignment Has Been Approved',
 'Hi {{student_name}}, your request to change agents has been approved. New agent: {{new_agent_name}}. The TGA Team.',
 'email,in_app', 'system'),

('agent.reassignment_denied',
 'Your Agent Reassignment Request Was Not Approved',
 'Hi {{student_name}}, after review your request to change agents could not be approved at this time. Reason: {{review_notes}}. Contact support if you have questions.',
 'email,in_app', 'system'),

('agent.reassignment_lost',
 'Student Reassigned to Another Agent',
 'Hi {{agent_name}}, student {{student_name}} has been reassigned to another agent. Your historical records for this student remain in your activity log.',
 'email,in_app', 'agent'),

('agent.reassignment_gained',
 'New Student Assigned to You',
 'Hi {{agent_name}}, student {{student_name}} has been assigned to your portfolio.',
 'email,in_app', 'agent'),

('commission.created',
 'Commission Record Created',
 'Hi {{agent_name}}, a commission of {{amount}} {{currency}} has been recorded for student {{student_name}}. Status: Pending.',
 'email,in_app', 'approvals'),

('commission.confirmed',
 'Commission Confirmed',
 'Hi {{agent_name}}, your commission of {{amount}} {{currency}} for student {{student_name}} has been confirmed by admin.',
 'email,in_app', 'approvals'),

('commission.paid',
 'Commission Paid',
 'Hi {{agent_name}}, your commission of {{amount}} {{currency}} for student {{student_name}} has been marked as paid.',
 'email,in_app', 'approvals');
