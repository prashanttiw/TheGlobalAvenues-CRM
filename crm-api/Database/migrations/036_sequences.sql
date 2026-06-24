-- 036: sequences (for atomic generation)
CREATE TABLE sequences (
  seq_name VARCHAR(50) NOT NULL PRIMARY KEY,
  next_val INT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO sequences (seq_name, next_val) VALUES ('application_ref', 1);
