-- LUMO Phase 2 Schema Extension
-- Adds: auth schema (parents + students), subject/topic hierarchy,
--       misconception taxonomies, generation run tracking, diagnostic assessments
--
-- Run AFTER 01-schema.sql. Safe to re-run (IF NOT EXISTS everywhere).

CREATE SCHEMA IF NOT EXISTS auth;

-- ============================================================
-- AUTH SCHEMA — parent and student accounts
-- ============================================================

CREATE TABLE IF NOT EXISTS auth.parents (
    parent_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS auth.students (
    student_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id     UUID NOT NULL REFERENCES auth.parents(parent_id) ON DELETE CASCADE,
    display_name  VARCHAR(100) NOT NULL,
    grade_level   INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 12),
    pin_hash      TEXT,
    avatar_id     VARCHAR(50) DEFAULT 'avatar-01',
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_parent_id ON auth.students(parent_id);

-- ============================================================
-- CONTENT SCHEMA EXTENSIONS — subjects, topics, taxonomies
-- ============================================================

CREATE TABLE IF NOT EXISTS content.subjects (
    subject_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    slug        VARCHAR(50) UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content.topics (
    topic_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id      UUID NOT NULL REFERENCES content.subjects(subject_id) ON DELETE CASCADE,
    parent_topic_id UUID REFERENCES content.topics(topic_id) ON DELETE SET NULL,
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    grade_level     INTEGER CHECK (grade_level BETWEEN 1 AND 12),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subject_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON content.topics(subject_id);

-- Misconception taxonomy — structured tags per subject/grade
CREATE TABLE IF NOT EXISTS content.misconception_taxonomies (
    taxonomy_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id   UUID NOT NULL REFERENCES content.subjects(subject_id) ON DELETE CASCADE,
    tag          VARCHAR(100) NOT NULL,
    description  TEXT NOT NULL,
    grade_levels INTEGER[] NOT NULL DEFAULT '{3}',
    parent_tag   VARCHAR(100),
    generated_by VARCHAR(20) NOT NULL DEFAULT 'static' CHECK (generated_by IN ('static', 'ai_generated')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subject_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_subject_id ON content.misconception_taxonomies(subject_id);

-- Student ↔ subject enrollment
CREATE TABLE IF NOT EXISTS content.student_subjects (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.students(student_id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES content.subjects(subject_id) ON DELETE CASCADE,
    enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, subject_id)
);

-- Add topic FK to existing lessons table (nullable for migration compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'content' AND table_name = 'lessons' AND column_name = 'topic_id'
    ) THEN
        ALTER TABLE content.lessons
            ADD COLUMN topic_id UUID REFERENCES content.topics(topic_id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- GENERATION RUN TRACKING — for comparative evaluation
-- ============================================================

CREATE TABLE IF NOT EXISTS content.generation_runs (
    run_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id          UUID REFERENCES content.lessons(lesson_id) ON DELETE SET NULL,
    strategy           VARCHAR(30) NOT NULL CHECK (strategy IN ('zpd', 'misconception', 'bkt', 'hybrid', 'legacy')),
    topic              TEXT NOT NULL,
    subject_id         UUID REFERENCES content.subjects(subject_id) ON DELETE SET NULL,
    grade_level        INTEGER NOT NULL,
    student_id         UUID REFERENCES auth.students(student_id) ON DELETE SET NULL,
    prompt_hash        TEXT,
    llm_model          VARCHAR(100) NOT NULL DEFAULT 'unknown',
    latency_ms         INTEGER,
    accessibility_score FLOAT,
    eval_scores        JSONB NOT NULL DEFAULT '{}',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gen_runs_strategy ON content.generation_runs(strategy);
CREATE INDEX IF NOT EXISTS idx_gen_runs_subject_id ON content.generation_runs(subject_id);

-- ============================================================
-- DIAGNOSTIC ASSESSMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS content.diagnostic_assessments (
    assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id    UUID NOT NULL REFERENCES content.subjects(subject_id) ON DELETE CASCADE,
    student_id    UUID REFERENCES auth.students(student_id) ON DELETE CASCADE,
    topic_id      UUID REFERENCES content.topics(topic_id) ON DELETE SET NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
    activities    JSONB NOT NULL DEFAULT '[]',
    results       JSONB DEFAULT NULL,
    weak_tags     TEXT[] DEFAULT '{}',
    requested_by  VARCHAR(10) NOT NULL DEFAULT 'parent' CHECK (requested_by IN ('parent', 'system')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_diagnostics_student_id ON content.diagnostic_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_status ON content.diagnostic_assessments(status);

-- ============================================================
-- SEED: default subjects
-- ============================================================

INSERT INTO content.subjects (name, slug) VALUES
    ('Mathematics', 'math'),
    ('English Language Arts', 'english'),
    ('Science', 'science'),
    ('History', 'history'),
    ('Art', 'art')
ON CONFLICT (slug) DO NOTHING;
