-- LUMO Database Schema
-- Three schemas: content, events, learner
-- Privacy-aware design with auto-anonymization and retention policies

CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS events;
CREATE SCHEMA IF NOT EXISTS learner;

-- ============================================================
-- CONTENT SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS content.lessons (
    lesson_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 12),
    content_mdx TEXT NOT NULL,
    misconception_tags TEXT[] DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content.quiz_questions (
    question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES content.lessons(lesson_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL DEFAULT 'multiple_choice',
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    correct_answer TEXT NOT NULL,
    distractors JSONB NOT NULL DEFAULT '[]',
    explanation TEXT,
    misconception_type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content.feedback_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    misconception_type VARCHAR(100) NOT NULL,
    hint_level INTEGER NOT NULL CHECK (hint_level BETWEEN 1 AND 3),
    hint_text TEXT NOT NULL,
    motivational_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVENTS SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS events.sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    device_type VARCHAR(50),
    user_agent TEXT
);

CREATE TABLE IF NOT EXISTS events.user_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id UUID REFERENCES events.sessions(session_id),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    anonymized_at TIMESTAMPTZ
);

-- Indexes for event queries
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON events.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_session_id ON events.user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON events.user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON events.user_events(created_at);

-- ============================================================
-- LEARNER SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS learner.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(100),
    grade_level INTEGER CHECK (grade_level BETWEEN 1 AND 12),
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learner.mastery_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lesson_id UUID REFERENCES content.lessons(lesson_id) ON DELETE CASCADE,
    score FLOAT NOT NULL DEFAULT 0.0 CHECK (score BETWEEN 0.0 AND 1.0),
    attempts INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS learner.attention_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id UUID REFERENCES events.sessions(session_id),
    lesson_id UUID REFERENCES content.lessons(lesson_id) ON DELETE CASCADE,
    attention_score FLOAT CHECK (attention_score BETWEEN 0.0 AND 1.0),
    avg_response_latency_ms INTEGER,
    error_rate FLOAT CHECK (error_rate BETWEEN 0.0 AND 1.0),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for learner queries
CREATE INDEX IF NOT EXISTS idx_mastery_user_id ON learner.mastery_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_mastery_lesson_id ON learner.mastery_scores(lesson_id);
CREATE INDEX IF NOT EXISTS idx_attention_user_id ON learner.attention_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_attention_session_id ON learner.attention_metrics(session_id);

-- ============================================================
-- PRIVACY: Auto-anonymization function (90-day retention)
-- ============================================================

CREATE OR REPLACE FUNCTION events.anonymize_old_events()
RETURNS INTEGER AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE events.user_events
    SET
        user_id = gen_random_uuid(),
        event_data = jsonb_set(event_data, '{anonymized}', 'true'),
        anonymized_at = NOW()
    WHERE
        created_at < NOW() - INTERVAL '90 days'
        AND anonymized_at IS NULL;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lessons_updated_at
    BEFORE UPDATE ON content.lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
