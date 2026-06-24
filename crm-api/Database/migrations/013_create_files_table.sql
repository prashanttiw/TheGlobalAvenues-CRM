-- 013: files (versioned document storage)
CREATE TABLE files (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(26) NOT NULL UNIQUE,
  owner_type VARCHAR(30) NOT NULL COMMENT 'student, application, university, notice',
  owner_id INT UNSIGNED NOT NULL,
  display_filename VARCHAR(500) NOT NULL
    COMMENT 'Human-readable: Rahul_Sharma_Passport_2026-06-22.pdf — used in download headers and Drive',
  stored_filename VARCHAR(500) NOT NULL COMMENT 'UUID-based — never guessable, used on disk',
  storage_path VARCHAR(1000) NOT NULL COMMENT 'Relative path from storage root',
  is_public TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0 = private/gatekeeper; 1 = public/direct',
  mime_type VARCHAR(100) NULL,
  file_size_bytes INT UNSIGNED NULL,
  checksum_sha256 VARCHAR(64) NULL COMMENT 'Computed after write, verified on access',
  version_number SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  previous_version_id INT UNSIGNED NULL COMMENT 'Points to older version of same document',
  superseded_at DATETIME NULL COMMENT 'Set when a newer version is uploaded',
  uploaded_by_type VARCHAR(20) NULL COMMENT 'student, agent, admin',
  uploaded_by_id INT UNSIGNED NULL,
  drive_file_id VARCHAR(255) NULL,
  drive_folder_path VARCHAR(500) NULL COMMENT 'Folder path in Drive for organisation',
  drive_sync_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    COMMENT 'pending, synced, failed',
  deleted_at DATETIME NULL,
  deleted_by INT UNSIGNED NULL,
  deletion_reason TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY fk_file_prev (previous_version_id) REFERENCES files(id) ON DELETE SET NULL,
  INDEX idx_files_owner (owner_type, owner_id),
  INDEX idx_files_sync (drive_sync_status),
  INDEX idx_files_version (owner_type, owner_id, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
