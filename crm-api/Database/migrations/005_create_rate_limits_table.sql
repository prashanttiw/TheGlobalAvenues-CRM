-- 005: rate_limits
CREATE TABLE rate_limits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  requests INT UNSIGNED DEFAULT 1,
  window_start DATETIME NOT NULL,
  UNIQUE KEY uk_rl (identifier, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
