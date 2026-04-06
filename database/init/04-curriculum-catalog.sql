CREATE TABLE IF NOT EXISTS curriculum_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 12),
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(80) NOT NULL,
    curriculum_provider VARCHAR(160) NOT NULL,
    position INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_curriculum_subject_grade_slug UNIQUE (grade_level, slug)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_subjects_grade_level ON curriculum_subjects(grade_level);

CREATE TABLE IF NOT EXISTS curriculum_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES curriculum_subjects(id) ON DELETE CASCADE,
    external_id VARCHAR(80) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    semantic_description TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curriculum_modules_subject_id ON curriculum_modules(subject_id);

CREATE TABLE IF NOT EXISTS curriculum_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES curriculum_modules(id) ON DELETE CASCADE,
    external_id VARCHAR(80) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    learning_objectives TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    position INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curriculum_lessons_module_id ON curriculum_lessons(module_id);