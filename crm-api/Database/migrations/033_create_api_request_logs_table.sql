-- 033: api_request_logs (API performance monitoring)
CREATE TABLE api_request_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  method VARCHAR(10) NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  status_code SMALLINT UNSIGNED NOT NULL,
  response_time_ms INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NULL,
  user_type VARCHAR(20) NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_api_endpoint (endpoint, created_at),
  INDEX idx_api_status (status_code),
  INDEX idx_api_slow (response_time_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
