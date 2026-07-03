-- 077: university_campuses
-- Universities can have multiple physical campuses (main location + "other campuses").
-- Previously only universities.city (single value) existed. This table lets us record
-- every campus location without losing data or duplicating university/course rows.
CREATE TABLE university_campuses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  university_id INT UNSIGNED NOT NULL,
  city VARCHAR(255) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  FOREIGN KEY fk_campus_uni (university_id) REFERENCES universities(id) ON DELETE CASCADE,
  INDEX idx_campus_uni (university_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
