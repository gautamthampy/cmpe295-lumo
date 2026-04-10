-- LUMO Phase 3 Student Login Support
-- Adds canonical student profiles tied to parent_users plus one-time student login codes.

CREATE TABLE IF NOT EXISTS students (
    student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID NOT NULL REFERENCES parent_users(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 12),
    avatar_id VARCHAR(50) NOT NULL DEFAULT 'owl',
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_parent_user_id ON students(parent_user_id);

CREATE TABLE IF NOT EXISTS student_login_code_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID NOT NULL REFERENCES parent_users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
    delivery_email VARCHAR(320) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    request_origin VARCHAR(32) NOT NULL DEFAULT 'student_login',
    requested_ip VARCHAR(64),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_login_codes_parent_user_id ON student_login_code_tokens(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_student_login_codes_student_id ON student_login_code_tokens(student_id);
CREATE INDEX IF NOT EXISTS idx_student_login_codes_expires_at ON student_login_code_tokens(expires_at);