/**
 * IntegrationPanel — shows the lesson→quiz handoff contract.
 * Visible at the bottom of each lesson page for demo purposes.
 */
'use client';

import type { QuizContext } from '@/lib/types';

interface IntegrationPanelProps {
  lessonId: string;
  misconceptionTags: string[];
  quizContext: QuizContext;
}

export default function IntegrationPanel({
  lessonId,
  misconceptionTags,
  quizContext,
}: IntegrationPanelProps) {
  return (
    <section
      aria-labelledby="integration-heading"
      className="bg-gray-900 rounded-xl p-6 text-gray-300 font-mono text-xs"
    >
      <h2 id="integration-heading" className="text-green-400 font-bold text-sm mb-4">
        Agent Handoff Contract (Phase 2)
      </h2>
      <pre className="whitespace-pre-wrap leading-relaxed">
        {JSON.stringify(
          {
            from: 'lesson_designer',
            to: 'quiz_agent',
            payload: {
              lesson_id: lessonId,
              subject: quizContext.subject,
              grade_level: quizContext.grade_level,
              misconception_tags: misconceptionTags,
              suggested_question_count: quizContext.suggested_question_count,
            },
          },
          null,
          2
        )}
      </pre>
    </section>
  );
}
