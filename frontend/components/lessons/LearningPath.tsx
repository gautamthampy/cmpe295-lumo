/**
 * LearningPath — visual lesson sequence with prerequisite arrows and status badges.
 *
 * Displays lessons as nodes in a learning graph. Lessons with prerequisites
 * are connected by arrows. Completed lessons are shown in green.
 *
 * WCAG 2.1 AA:
 *   - Each node is a focusable link (SC 2.1.1)
 *   - Status communicated via text, not colour alone (SC 1.4.1)
 *   - Arrows described with aria-label (SC 1.3.1)
 */
'use client';

import Link from 'next/link';
import type { LessonResponse } from '@/lib/types';

interface LearningPathProps {
  lessons: LessonResponse[];
  completedLessonIds?: Set<string>;
}

function statusLabel(lesson: LessonResponse, completed: boolean) {
  if (completed) return { text: 'Completed', classes: 'bg-green-100 text-green-800 border-green-300' };
  if (lesson.status === 'draft') return { text: 'Draft', classes: 'bg-gray-100 text-gray-600 border-gray-300' };
  return { text: 'Available', classes: 'bg-blue-50 text-blue-700 border-blue-200' };
}

/**
 * Build an adjacency list: for each lesson, which lessons list it as a prerequisite?
 * Returns: Map<lessonId, successorLessonIds[]>
 */
function buildSuccessorMap(lessons: LessonResponse[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const lesson of lessons) {
    if (!map.has(lesson.lesson_id)) map.set(lesson.lesson_id, []);
  }
  for (const lesson of lessons) {
    for (const prereqId of lesson.prerequisites) {
      if (!map.has(prereqId)) map.set(prereqId, []);
      map.get(prereqId)!.push(lesson.lesson_id);
    }
  }
  return map;
}

export default function LearningPath({ lessons, completedLessonIds = new Set() }: LearningPathProps) {
  const lessonById = new Map(lessons.map((l) => [l.lesson_id, l]));
  const successors = buildSuccessorMap(lessons);

  // Roots: lessons with no prerequisites (or prereqs not in our set)
  const knownIds = new Set(lessons.map((l) => l.lesson_id));
  const roots = lessons.filter(
    (l) => l.prerequisites.length === 0 || l.prerequisites.every((p) => !knownIds.has(p))
  );

  // BFS traversal order for rendering
  const visited = new Set<string>();
  const ordered: LessonResponse[] = [];
  const queue = [...roots];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (visited.has(curr.lesson_id)) continue;
    visited.add(curr.lesson_id);
    ordered.push(curr);
    for (const succId of (successors.get(curr.lesson_id) ?? [])) {
      const succ = lessonById.get(succId);
      if (succ && !visited.has(succId)) queue.push(succ);
    }
  }
  // Append any not reached (isolated nodes)
  for (const l of lessons) {
    if (!visited.has(l.lesson_id)) ordered.push(l);
  }

  return (
    <section aria-label="Learning path">
      <ol className="relative" aria-label="Lesson sequence">
        {ordered.map((lesson, idx) => {
          const completed = completedLessonIds.has(lesson.lesson_id);
          const { text: statusText, classes: statusClasses } = statusLabel(lesson, completed);
          const hasSuccessors = (successors.get(lesson.lesson_id) ?? []).length > 0;
          const prereqTitles = lesson.prerequisites
            .map((id) => lessonById.get(id)?.title)
            .filter(Boolean) as string[];

          return (
            <li key={lesson.lesson_id} className="relative flex items-start gap-4 pb-8 last:pb-0">
              {/* Vertical connector line */}
              {hasSuccessors && (
                <div
                  aria-hidden="true"
                  className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200"
                />
              )}

              {/* Node circle */}
              <div
                className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                  completed
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-white border-gray-300 text-gray-500'
                }`}
                aria-hidden="true"
              >
                {completed ? '✓' : idx + 1}
              </div>

              {/* Lesson card */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/lessons/${lesson.lesson_id}`}
                  className="group block bg-white border border-gray-200 rounded-xl p-4 hover:border-green-400 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  aria-label={`${lesson.title} — ${statusText}${prereqTitles.length ? ` (requires: ${prereqTitles.join(', ')})` : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors truncate">
                        {lesson.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {lesson.subject} · Grade {lesson.grade_level}
                      </p>
                      {prereqTitles.length > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          Requires: {prereqTitles.join(', ')}
                        </p>
                      )}
                    </div>
                    <span
                      className={`flex-shrink-0 px-2.5 py-1 text-xs font-medium rounded-full border ${statusClasses}`}
                      aria-label={`Status: ${statusText}`}
                    >
                      {statusText}
                    </span>
                  </div>

                  {/* Misconception tags */}
                  {lesson.misconception_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {lesson.misconception_tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs border border-purple-100"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
