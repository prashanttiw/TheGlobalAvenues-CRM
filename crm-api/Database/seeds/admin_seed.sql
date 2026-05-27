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
