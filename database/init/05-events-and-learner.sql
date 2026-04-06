-- LUMO Phase 5 — Events, Learner, and Attention Tracking
-- Adds: events schema (sessions + user_events), learner schema (mastery_scores + attention_metrics)
-- Privacy-aware design with auto-anonymization and retention policies.
-- Safe to re-run (IF NOT EXISTS everywhere).

CREATE SCHEMA IF NOT EXISTS events;
CREATE SCHEMA IF NOT EXISTS learner;

-- ============================================================
-- EVENTS SCHEMA — learning sessions and interaction telemetry
-- ============================================================

CREATE TABLE IF NOT EXISTS events.sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    device_type VARCHAR(50),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_sessions_user_id ON events.sessions(user_id);

CREATE TABLE IF NOT EXISTS events.user_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id UUID REFERENCES events.sessions(session_id),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    anonymized_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON events.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_session_id ON events.user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON events.user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON events.user_events(created_at);

-- ============================================================
-- LEARNER SCHEMA — mastery scores and attention metrics
-- ============================================================

CREATE TABLE IF NOT EXISTS learner.mastery_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lesson_id UUID,
    score FLOAT NOT NULL DEFAULT 0.0 CHECK (score BETWEEN 0.0 AND 1.0),
    attempts INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_mastery_user_id ON learner.mastery_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_mastery_lesson_id ON learner.mastery_scores(lesson_id);

CREATE TABLE IF NOT EXISTS learner.attention_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id UUID REFERENCES events.sessions(session_id),
    lesson_id UUID,
    attention_score FLOAT CHECK (attention_score BETWEEN 0.0 AND 1.0),
    avg_response_latency_ms INTEGER,
    error_rate FLOAT CHECK (error_rate BETWEEN 0.0 AND 1.0),
    hour_of_day SMALLINT,
    day_of_week SMALLINT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
