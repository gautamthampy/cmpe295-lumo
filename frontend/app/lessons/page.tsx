'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { lessonsAPI } from '@/lib/api';
import type { LessonResponse } from '@/lib/types';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-gray-100 text-gray-600',
};

export default function LessonsPage() {
  const [lessons, setLessons] = useState<LessonResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lessonsAPI
      .getAll()
      .then((res) => setLessons(res.data))
      .catch(() => setError('Could not load lessons. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50" aria-label="Lesson library">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-green-600 hover:text-green-700 text-sm font-medium">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">Lesson Library</h1>
          <p className="text-gray-500 mt-1">
            Grade 3 Mathematics micro-lessons with misconception-aware quiz generation
          </p>
        </div>

        {/* States */}
        {loading && (
          <p className="text-gray-500 text-center py-20" role="status" aria-live="polite">
            Loading lessons…
          </p>
        )}

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
            <p className="text-red-500 text-sm mt-1">
              Run: <code className="bg-red-100 px-1 rounded">docker-compose up -d</code> then start
              the backend
            </p>
          </div>
        )}

        {!loading && !error && lessons.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No lessons found.</p>
            <p className="text-sm mt-1">
              Run: <code className="bg-gray-100 px-1 rounded">python -m app.seed.seed_db</code>
            </p>
          </div>
        )}

        {/* Lessons Grid */}
        {lessons.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
            {lessons.map((lesson) => (
              <li key={lesson.lesson_id} role="listitem">
                <Link
                  href={`/lessons/${lesson.lesson_id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-green-300 transition-all focus-visible:ring-2 focus-visible:ring-green-500"
                  aria-label={`${lesson.title}, Grade ${lesson.grade_level} ${lesson.subject}`}
                >
                  {/* Subject + Grade */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                      {lesson.subject} · Grade {lesson.grade_level}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        statusColors[lesson.status] ?? statusColors.draft
                      }`}
                    >
                      {lesson.status}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-bold text-gray-900 mb-3">{lesson.title}</h2>

                  {/* Misconception tags */}
                  {lesson.misconception_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lesson.misconception_tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-100"
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
