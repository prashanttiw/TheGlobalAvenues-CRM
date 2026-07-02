CREATE TABLE student_custom_field_definitions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(26) NOT NULL UNIQUE,
    label VARCHAR(150) NOT NULL,
    field_type ENUM('text','textarea','number','date','select','file') NOT NULL DEFAULT 'text',
    options JSON NULL COMMENT 'Array of {value,label} choices — only used when field_type=select',
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT UNSIGNED NULL COMMENT 'users.id of the admin who created this field',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    INDEX idx_custom_field_defs_active_order (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_custom_field_values (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(26) NOT NULL UNIQUE,
    student_id INT UNSIGNED NOT NULL,
    definition_id INT UNSIGNED NOT NULL,
    value_text TEXT NULL,
    file_id INT UNSIGNED NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (definition_id) REFERENCES student_custom_field_definitions(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
    UNIQUE KEY uq_student_definition (student_id, definition_id),
    INDEX idx_custom_field_values_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
