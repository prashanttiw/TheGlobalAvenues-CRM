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
