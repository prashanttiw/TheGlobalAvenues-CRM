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
