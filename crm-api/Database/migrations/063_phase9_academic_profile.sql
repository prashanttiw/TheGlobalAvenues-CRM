CREATE TABLE student_academics (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(26) NOT NULL UNIQUE,
    student_id INT UNSIGNED NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    degree_level VARCHAR(100) NOT NULL COMMENT 'High School, Diploma, Bachelors, Masters',
    field_of_study VARCHAR(255) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    score_type VARCHAR(50) NULL COMMENT 'CGPA, Percentage, Grade',
    score_value VARCHAR(50) NULL,
    is_highest_qualification BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student_academics_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_test_scores (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    public_id CHAR(26) NOT NULL UNIQUE,
    student_id INT UNSIGNED NOT NULL,
    test_name VARCHAR(100) NOT NULL COMMENT 'IELTS, TOEFL, PTE, Duolingo, GRE, GMAT',
    overall_score VARCHAR(50) NOT NULL,
    reading_score VARCHAR(50) NULL,
    writing_score VARCHAR(50) NULL,
    listening_score VARCHAR(50) NULL,
    speaking_score VARCHAR(50) NULL,
    test_date DATE NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student_tests_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
