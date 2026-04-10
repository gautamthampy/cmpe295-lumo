'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { lessonsAPI } from '@/lib/api';
import type { LessonResponse } from '@/lib/types';
import LearningPath from '@/components/lessons/LearningPath';

type ViewMode = 'grid' | 'path';

const statusColors: Record<string, string> = {
  active:   'bg-emerald-100 text-emerald-700 border border-emerald-200',
  draft:    'bg-amber-100 text-amber-700 border border-amber-200',
  archived: 'bg-slate-100 text-slate-600 border border-slate-200',
};

export default function LessonsPage() {
  const [lessons, setLessons] = useState<LessonResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    lessonsAPI
      .getAll()
      .then((res) => setLessons(res.data))
      .catch(() => setError('Could not load lessons. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Header */}
      <header className="bg-white rounded-[1.75rem] w-full mb-5 p-5 px-8 flex justify-between items-center shadow-sm border-2 border-violet-50">
        <div>
          <h1 className="text-2xl font-black">
            <span className="text-gradient">Lesson Library</span> 📖
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Grades 1–5 Math · Fun &amp; Interactive
          </p>
        </div>

        {lessons.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div role="group" aria-label="View mode" className="flex bg-violet-50 rounded-full overflow-hidden p-1">
              {(['grid', 'path'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  aria-pressed={viewMode === mode}
                  className={`px-4 py-1.5 text-sm font-bold rounded-full transition-all ${
                    viewMode === mode
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'text-slate-500 hover:text-violet-600'
                  }`}
                >
                  {mode === 'grid' ? 'Grid' : 'Learning Path'}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="bg-white rounded-[1.75rem] flex-1 p-6 overflow-y-auto shadow-sm border-2 border-violet-50">
        {loading && (
          <p className="text-slate-400 text-center text-lg font-medium py-20" role="status" aria-live="polite">
            Loading your lessons…
          </p>
        )}

        {error && (
          <div role="alert" className="bg-red-50 rounded-2xl p-6 text-center border border-red-200">
            <p className="text-red-700 font-bold text-base">{error}</p>
            <p className="text-red-600 text-sm mt-1">
              Run: <code className="bg-red-100 px-1.5 py-0.5 rounded text-red-700 font-mono text-xs">docker-compose up -d</code> then start the backend
            </p>
          </div>
        )}

        {!loading && !error && lessons.length === 0 && (
          <div className="text-center py-20">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-slate-600 text-lg font-semibold">No lessons found yet!</p>
            <p className="text-slate-400 text-sm mt-1">
              Run: <code className="bg-violet-50 px-2 py-0.5 rounded-lg text-violet-700 font-mono text-xs">python -m app.seed.seed_db</code>
            </p>
          </div>
        )}

        {lessons.length > 0 && viewMode === 'path' && (
          <div className="max-w-2xl">
            <LearningPath lessons={lessons} />
          </div>
        )}

        {lessons.length > 0 && viewMode === 'grid' && (
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" role="list">
            {lessons.map((lesson, i) => (
              <li key={lesson.lesson_id} role="listitem">
                <Link
                  href={`/lessons/${lesson.lesson_id}`}
                  className="block glass-card h-full animate-fade-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                  aria-label={`${lesson.title}, Grade ${lesson.grade_level} ${lesson.subject}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="tag-pill">
                      {lesson.subject} · Grade {lesson.grade_level}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${statusColors[lesson.status] ?? statusColors.draft}`}>
                      {lesson.status}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-800 mb-3 leading-snug">{lesson.title}</h2>

                  {lesson.prerequisites.length > 0 && (
                    <p className="text-xs text-amber-600 mb-2 font-bold">🔓 Unlock after earlier lessons</p>
                  )}

                  {lesson.misconception_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lesson.misconception_tags.map((tag) => (
                        <span key={tag} className="tag-pill text-[10px]">{tag}</span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
