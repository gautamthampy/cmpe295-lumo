-- Phase 2: learner.mastery_scores.lesson_id stores curriculum_lessons.id (UUID).
-- Drop legacy FK to content.lessons if present so catalog-backed mastery upserts work.
ALTER TABLE learner.mastery_scores DROP CONSTRAINT IF EXISTS mastery_scores_lesson_id_fkey;
