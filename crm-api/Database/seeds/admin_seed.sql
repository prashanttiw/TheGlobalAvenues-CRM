INSERT INTO users (
  email,
  phone,
  password_hash,
  role,
  oauth_provider,
  email_verified,
  status
)
VALUES (
  'admin@theglobalavenues.com',
  '+911146801133',
  '$2y$12$5weFxDrElYvme5ED6C.A/OIt0WqgrRcbxQLyqrbMvnikhO/oea9au',
  'super_admin',
  'local',
  1,
  'active'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  status = VALUES(status);
