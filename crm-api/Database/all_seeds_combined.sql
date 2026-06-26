INSERT INTO users (
  email,
  phone,
  password_hash,
  role,
  oauth_provider,
  email_verified,
  status
)
VALUES
  (
    'admin@theglobalavenues.com',
    '+911146801133',
    '$2y$12$E.d5XILvohbIaISj7dzTduMKGl8l2J/Td/gNeLu4v/1k5ZQCb8MhS',
    'super_admin',
    'local',
    1,
    'active'
  ),
  (
    'ops@theglobalavenues.com',
    '+911146801134',
    '$2y$12$E.d5XILvohbIaISj7dzTduMKGl8l2J/Td/gNeLu4v/1k5ZQCb8MhS',
    'admin',
    'local',
    1,
    'active'
  ),
  (
    'counsellor@theglobalavenues.com',
    '+911146801135',
    '$2y$12$E.d5XILvohbIaISj7dzTduMKGl8l2J/Td/gNeLu4v/1k5ZQCb8MhS',
    'counsellor',
    'local',
    1,
    'active'
  ),
  (
    'visa@theglobalavenues.com',
    '+911146801136',
    '$2y$12$E.d5XILvohbIaISj7dzTduMKGl8l2J/Td/gNeLu4v/1k5ZQCb8MhS',
    'visa_officer',
    'local',
    1,
    'active'
  )
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  status = VALUES(status);
INSERT INTO programs (
  id, university_id, name, degree_level, subject_area, tuition_fee, tuition_currency, intake_months_json, is_active
) VALUES
(1, 1, 'AI & Data Science', 'bachelors', 'IT & Game Design', 726.00, 'EUR', '["September"]', 1),
(2, 1, 'Business Management', 'bachelors', 'Business & Management', 726.00, 'EUR', '["September"]', 1),
(3, 2, 'Business Administration', 'bachelors', 'Business & Management', 3500.00, 'EUR', '["September"]', 1),
(4, 2, 'MBA', 'masters', 'Business & Management', 6000.00, 'EUR', '["September"]', 1),
(5, 3, 'Doctor of Medicine (MD)', 'phd', 'Medicine & Health', 32000.00, 'USD', '["January","April","August"]', 1),
(6, 3, 'Public Health', 'masters', 'Medicine & Health', 25000.00, 'USD', '["January","August"]', 1),
(7, 4, 'MBA', 'masters', 'Business & Management', 36000.00, 'USD', '["January","August"]', 1),
(8, 4, 'Computer Science', 'bachelors', 'IT & Game Design', 34000.00, 'USD', '["January","August"]', 1),
(9, 5, 'Business Administration', 'bachelors', 'Business & Management', 34000.00, 'USD', '["January","August"]', 1),
(10, 5, 'Nursing', 'bachelors', 'Medicine & Health', 38000.00, 'USD', '["January","August"]', 1),
(11, 6, 'Sustainable Energy', 'masters', 'Engineering', 12000.00, 'EUR', '["September"]', 1),
(12, 6, 'Energy Innovation', 'masters', 'Engineering', 18000.00, 'EUR', '["September"]', 1),
(13, 7, 'Graphic Design', 'bachelors', 'Design & Creative Arts', 8000.00, 'EUR', '["September","February"]', 1),
(14, 7, 'Interior Architecture', 'masters', 'Design & Creative Arts', 14000.00, 'EUR', '["September","February"]', 1),
(15, 8, 'Bachelor in Management', 'bachelors', 'Business & Management', 9000.00, 'EUR', '["September","January"]', 1),
(16, 8, 'Master in Management', 'masters', 'Business & Management', 16000.00, 'EUR', '["September","January"]', 1),
(17, 9, 'Hospitality Management', 'bachelors', 'Hospitality', 7000.00, 'EUR', '["February","September"]', 1),
(18, 9, 'Business Administration', 'bachelors', 'Business & Management', 6500.00, 'EUR', '["February","September"]', 1),
(19, 10, 'International Business', 'bachelors', 'Business & Management', 8500.00, 'EUR', '["September","February"]', 1),
(20, 10, 'Marketing', 'masters', 'Business & Management', 13000.00, 'EUR', '["September","February"]', 1),
(21, 11, 'Culinary Arts', 'diploma', 'Hospitality', 4500.00, 'EUR', '["February","September"]', 1),
(22, 11, 'Hotel Management', 'diploma', 'Hospitality', 8000.00, 'EUR', '["February","September"]', 1),
(23, 12, 'Business Administration', 'bachelors', 'Business & Management', 18000.00, 'USD', '["January","March","June","August","October"]', 1),
(24, 12, 'MBA', 'masters', 'Business & Management', 28000.00, 'USD', '["January","March","June","August","October"]', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  degree_level = VALUES(degree_level),
  subject_area = VALUES(subject_area),
  tuition_fee = VALUES(tuition_fee),
  tuition_currency = VALUES(tuition_currency),
  intake_months_json = VALUES(intake_months_json),
  is_active = VALUES(is_active);
INSERT INTO quiz_questions (
  id, quiz_type, question_text, question_type, options_json, weight_map_json, help_text, order_index, is_required, is_active
) VALUES
(1, 'course_finder', 'Which broad field are you most excited to study?', 'single_choice',
 '["Business & Management","IT & Game Design","Medicine & Health","Design & Creative Arts","Hospitality"]',
 '{"Business & Management":{"subject_area":"Business & Management"},"IT & Game Design":{"subject_area":"IT & Game Design"},"Medicine & Health":{"subject_area":"Medicine & Health"},"Design & Creative Arts":{"subject_area":"Design & Creative Arts"},"Hospitality":{"subject_area":"Hospitality"}}',
 'Pick the field you want to build a career in.', 1, 1, 1),
(2, 'course_finder', 'Which destination feels right for you?', 'single_choice',
 '["Austria","Estonia","France","Cyprus","USA"]',
 '{"Austria":{"country":"Austria"},"Estonia":{"country":"Estonia"},"France":{"country":"France"},"Cyprus":{"country":"Cyprus"},"USA":{"country":"USA"}}',
 'We use this to prioritize matching institutions.', 2, 1, 1),
(3, 'course_finder', 'What tuition range is realistic for you?', 'single_choice',
 '["Below 5000 EUR","5000-10000 EUR","10000-20000 EUR","20000+ EUR"]',
 '{"Below 5000 EUR":{"budget_max":5000},"5000-10000 EUR":{"budget_min":5000,"budget_max":10000},"10000-20000 EUR":{"budget_min":10000,"budget_max":20000},"20000+ EUR":{"budget_min":20000}}',
 'This helps filter programs you can realistically pursue.', 3, 1, 1),
(4, 'course_finder', 'What degree level are you aiming for?', 'single_choice',
 '["Diploma","Bachelors","Masters","PhD"]',
 '{"Diploma":{"degree_level":"diploma"},"Bachelors":{"degree_level":"bachelors"},"Masters":{"degree_level":"masters"},"PhD":{"degree_level":"phd"}}',
 'Choose the level that matches your current education stage.', 4, 1, 1)
ON DUPLICATE KEY UPDATE
  question_text = VALUES(question_text),
  question_type = VALUES(question_type),
  options_json = VALUES(options_json),
  weight_map_json = VALUES(weight_map_json),
  help_text = VALUES(help_text),
  order_index = VALUES(order_index),
  is_required = VALUES(is_required),
  is_active = VALUES(is_active);
INSERT INTO universities (id, name, short_name, country, city, partnership_type, is_active) VALUES
(1, 'FH Kufstein Tirol', 'FH Kufstein', 'Austria', 'Kufstein', 'exclusive', 1),
(2, 'Estonian Entrepreneurship University of Applied Sciences', 'EUAS', 'Estonia', 'Tallinn', 'exclusive', 1),
(3, 'St. George''s University', 'SGU', 'Grenada', 'St. George''s', 'exclusive', 1),
(4, 'Benedictine University', 'Benedictine', 'USA', 'Lisle, Illinois', 'exclusive', 1),
(5, 'Elmhurst University', 'Elmhurst', 'USA', 'Elmhurst, Illinois', 'exclusive', 1),
(6, 'EIT InnoEnergy', 'InnoEnergy', 'Europe', 'Pan-European', 'exclusive', 1),
(7, 'MJM Graphic Design', 'MJM', 'France', 'Paris / London', 'exclusive', 1),
(8, 'ICN Business School', 'ICN', 'France', 'Nancy / Paris', 'exclusive', 1),
(9, 'Mesoyios College', 'Mesoyios', 'Cyprus', 'Limassol', 'exclusive', 1),
(10, 'CEFAM International School', 'CEFAM', 'France', 'Lyon', 'exclusive', 1),
(11, 'KES College Nicosia', 'KES', 'Cyprus', 'Nicosia', 'exclusive', 1),
(12, 'International American University', 'IAU', 'USA', 'Los Angeles, California', 'exclusive', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  short_name = VALUES(short_name),
  country = VALUES(country),
  city = VALUES(city),
  partnership_type = VALUES(partnership_type),
  is_active = VALUES(is_active);
