-- LUMO Database Schema
-- This file initializes the PostgreSQL database with tables for content, events, and learner models

-- Content Schema: Stores lesson content, quiz questions, and feedback templates
CREATE SCHEMA IF NOT EXISTS content;

-- Events Schema: Stores all user interactions and system events
CREATE SCHEMA IF NOT EXISTS events;

-- Learner Model Schema: Stores user profiles, mastery scores, and attention metrics
CREATE SCHEMA IF NOT EXISTS learner;

-- ============================================
-- CONTENT SCHEMA
-- ============================================

-- Lessons table: Stores lesson metadata and content
CREATE TABLE content.lessons (
    lesson_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    grade_level INTEGER CHECK (grade_level BETWEEN 1 AND 12),
    content_mdx TEXT NOT NULL,
    misconception_tags TEXT[], -- Array of misconception types
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived'))
);

-- Quiz questions table
CREATE TABLE content.quiz_questions (
    question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES content.lessons(lesson_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank')),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    correct_answer TEXT NOT NULL,
    distractors JSONB, -- Array of plausible incorrect answers with misconception types
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Feedback templates table
CREATE TABLE content.feedback_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    misconception_type VARCHAR(100) NOT NULL,
    hint_level INTEGER CHECK (hint_level BETWEEN 1 AND 3),
    hint_text TEXT NOT NULL,
    motivational_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EVENTS SCHEMA
-- ============================================

-- User events table: Stores all user interactions
CREATE TABLE events.user_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Privacy: Events are retained for 90 days then anonymized
    retention_until TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days')
);

-- Create index for faster queries
CREATE INDEX idx_user_events_user_id ON events.user_events(user_id);
CREATE INDEX idx_user_events_session_id ON events.user_events(session_id);
CREATE INDEX idx_user_events_timestamp ON events.user_events(timestamp);
CREATE INDEX idx_user_events_type ON events.user_events(event_type);

-- Session metadata table
CREATE TABLE events.sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    lesson_id UUID REFERENCES content.lessons(lesson_id),
    device_type VARCHAR(50),
    user_agent TEXT
);

-- ============================================
-- LEARNER MODEL SCHEMA
-- ============================================

-- User profiles table
CREATE TABLE learner.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    grade_level INTEGER CHECK (grade_level BETWEEN 1 AND 12),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE,
    -- Privacy: Store only necessary information
    consent_given BOOLEAN DEFAULT FALSE,
    data_retention_days INTEGER DEFAULT 90
);

-- Mastery scores table
CREATE TABLE learner.mastery_scores (
    score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES learner.users(user_id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES content.lessons(lesson_id),
    subject VARCHAR(100) NOT NULL,
    concept_tag VARCHAR(100),
    mastery_level DECIMAL(3, 2) CHECK (mastery_level BETWEEN 0 AND 1),
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attention metrics table
CREATE TABLE learner.attention_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES learner.users(user_id) ON DELETE CASCADE,
    session_id UUID REFERENCES events.sessions(session_id),
    attention_score DECIMAL(3, 2) CHECK (attention_score BETWEEN 0 AND 1),
    response_latency_ms INTEGER,
    error_rate DECIMAL(3, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Computed metrics for peak time detection
    hour_of_day INTEGER CHECK (hour_of_day BETWEEN 0 AND 23),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6)
);

-- Create indexes for performance
CREATE INDEX idx_mastery_user_id ON learner.mastery_scores(user_id);
CREATE INDEX idx_mastery_lesson_id ON learner.mastery_scores(lesson_id);
CREATE INDEX idx_attention_user_id ON learner.attention_metrics(user_id);
CREATE INDEX idx_attention_timestamp ON learner.attention_metrics(timestamp);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for lessons table
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON content.lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for mastery_scores table
CREATE TRIGGER update_mastery_updated_at BEFORE UPDATE ON learner.mastery_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Privacy: Function to anonymize old events
CREATE OR REPLACE FUNCTION anonymize_old_events()
RETURNS void AS $$
BEGIN
    UPDATE events.user_events
    SET event_data = jsonb_build_object('anonymized', true)
    WHERE retention_until < CURRENT_TIMESTAMP
    AND event_data IS NOT NULL
    AND event_data != jsonb_build_object('anonymized', true);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA content TO lumo;
GRANT USAGE ON SCHEMA events TO lumo;
GRANT USAGE ON SCHEMA learner TO lumo;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA content TO lumo;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA events TO lumo;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA learner TO lumo;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA content TO lumo;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA events TO lumo;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA learner TO lumo;

