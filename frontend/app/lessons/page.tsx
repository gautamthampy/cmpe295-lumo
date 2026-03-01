'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { lessonsAPI } from '@/lib/api';
import type { LessonResponse } from '@/lib/types';
import LearningPath from '@/components/lessons/LearningPath';

type ViewMode = 'grid' | 'path';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  draft:  'bg-amber-100 text-amber-700 border border-amber-200',
  archived: 'bg-slate-100 text-slate-500 border border-slate-200',
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
    <main className="min-h-screen" aria-label="Lesson library">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold mt-3">
              <span className="text-gradient">Lesson Library</span>
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Grade 3 Mathematics · misconception-aware · WCAG 2.1 AA
            </p>
          </div>

          {/* View toggle + editor link */}
          {lessons.length > 0 && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <div role="group" aria-label="View mode" className="flex glass rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  style={viewMode === 'grid' ? {
                    background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-primary-dark))',
                  } : {}}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('path')}
                  aria-pressed={viewMode === 'path'}
                  className={`px-3 py-1.5 text-sm font-medium transition-all border-l border-white/30 ${
                    viewMode === 'path'
                      ? 'text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  style={viewMode === 'path' ? {
                    background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-primary-dark))',
                  } : {}}
                >
                  Learning Path
                </button>
              </div>
              <Link
                href="/lessons/analytics"
                className="px-3 py-1.5 text-sm font-semibold glass rounded-xl text-slate-600 hover:shadow-md transition-all"
              >
                📊 Analytics
              </Link>
              <Link
                href="/lessons/editor"
                className="px-3 py-1.5 text-sm font-semibold glass rounded-xl text-slate-600 hover:shadow-md transition-all"
              >
                ✨ Create with AI
              </Link>
            </div>
          )}
        </div>

        {/* States */}
        {loading && (
          <p className="text-slate-400 text-center py-20" role="status" aria-live="polite">
            Loading lessons…
          </p>
        )}

        {error && (
          <div role="alert" className="glass rounded-2xl p-6 text-center border border-red-200/50">
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-red-400 text-sm mt-1">
              Run: <code className="bg-red-50 px-1.5 py-0.5 rounded text-red-600">docker-compose up -d</code> then start the backend
            </p>
          </div>
        )}

        {!loading && !error && lessons.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg">No lessons found.</p>
            <p className="text-sm mt-1">
              Run: <code className="bg-slate-100 px-1.5 rounded">python -m app.seed.seed_db</code>
            </p>
          </div>
        )}

        {/* Learning Path view */}
        {lessons.length > 0 && viewMode === 'path' && (
          <div className="max-w-2xl">
            <LearningPath lessons={lessons} />
          </div>
        )}

        {/* Grid view */}
        {lessons.length > 0 && viewMode === 'grid' && (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" role="list">
            {lessons.map((lesson) => (
              <li key={lesson.lesson_id} role="listitem">
                <Link
                  href={`/lessons/${lesson.lesson_id}`}
                  className="block glass-card h-full"
                  aria-label={`${lesson.title}, Grade ${lesson.grade_level} ${lesson.subject}`}
                >
                  {/* Subject + Grade */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary-base)' }}>
                      {lesson.subject} · Gr. {lesson.grade_level}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[lesson.status] ?? statusColors.draft}`}>
                      {lesson.status}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-800 mb-3 leading-snug">{lesson.title}</h2>

                  {lesson.prerequisites.length > 0 && (
                    <p className="text-xs text-amber-500 mb-2 font-medium">↑ Has prerequisites</p>
                  )}

                  {lesson.misconception_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lesson.misconception_tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(107,102,232,0.08)', color: 'var(--color-primary-dark)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
