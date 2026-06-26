-- 061: Add FULLTEXT indexes for global search
ALTER TABLE students     ADD FULLTEXT INDEX ft_students_name (full_name);
ALTER TABLE agents       ADD FULLTEXT INDEX ft_agents_name (agency_name); -- u.first_name is in users table, we'll need to join
ALTER TABLE universities ADD FULLTEXT INDEX ft_universities (name, city, country);
ALTER TABLE applications ADD FULLTEXT INDEX ft_applications_ref (reference_number);
ALTER TABLE leads        ADD FULLTEXT INDEX ft_leads_name (full_name);
