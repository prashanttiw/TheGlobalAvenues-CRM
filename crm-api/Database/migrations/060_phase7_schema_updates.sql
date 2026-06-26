-- Migration 060: Phase 7 Schema Updates (Admin Power Features)

-- 1. Notices & Events: Add expires_at
ALTER TABLE notices 
ADD COLUMN expires_at DATETIME NULL COMMENT 'When the notice automatically drops off the feed';

-- 2. Internal Notes: Add is_pinned
ALTER TABLE internal_notes
ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Pinned notes stay at the top of the timeline';

-- 3. Global Search: Add FULLTEXT indexes
ALTER TABLE students ADD FULLTEXT INDEX ft_students_name (full_name);
ALTER TABLE agents ADD FULLTEXT INDEX ft_agents_name (full_name, agency_name);
ALTER TABLE universities ADD FULLTEXT INDEX ft_universities (name, city, country);
ALTER TABLE applications ADD FULLTEXT INDEX ft_applications_ref (reference_number);
ALTER TABLE leads ADD FULLTEXT INDEX ft_leads_name (full_name);

-- 4. Add Notification Templates for Phase 7
INSERT INTO notification_templates
  (event_key, subject_template, body_template, channels, category) VALUES
('lead.new',
 'New Lead: {{full_name}} from {{source}}',
 'A new lead has been captured.\n\nName: {{full_name}}\nSource: {{source}}\nInterested in: {{interested_country}} — {{interested_course}}\n\nView: {{admin_url}}',
 'email,in_app', 'system'),

('lead.assigned',
 'Lead Assigned to You: {{full_name}}',
 'Hi {{staff_name}},\n\nA lead has been assigned to you.\n\nName: {{full_name}}\nSource: {{source}}\n\nView: {{admin_url}}',
 'email,in_app', 'system'),

('lead.status_changed',
 'Lead Status Updated: {{full_name}}',
 'Lead {{full_name}} has moved to status: {{new_status}}.\n\nView: {{admin_url}}',
 'in_app', 'system'),

('notice.published',
 'New Notice: {{title}}',
 '{{title}}\n\n{{content_preview}}\n\nView on your portal: {{portal_url}}',
 'email,in_app', 'system');
