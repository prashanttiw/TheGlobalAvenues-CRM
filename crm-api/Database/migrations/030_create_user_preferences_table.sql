-- 030: user_preferences
CREATE TABLE user_preferences (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  preferences JSON NOT NULL DEFAULT ('{}')
    COMMENT 'Keys: table_page_size, sidebar_collapsed, dashboard_widgets,
             notification_categories, theme',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_pref_user (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
