'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { lessonsAPI } from '@/lib/api';

interface LessonMetric {
  lesson_id: string;
  title: string;
  subject: string;
  grade_level: number;
  accessibility_score: number;
  issues_count: number;
  completion_rate: number;
  avg_time_minutes: number;
  quiz_pass_rate: number;
  total_views: number;
  misconception_tags: string[];
}

interface SummaryResponse {
  total_lessons: number;
  avg_accessibility_score: number;
  lessons: LessonMetric[];
}

function ScoreBadge({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.8
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : value >= 0.6
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-red-700 bg-red-50 border-red-200';
  return (
    <div className="text-center">
      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${color}`}>
        {pct}%
      </span>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}

export default function LessonAnalyticsPage() {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lessonsAPI
      .analyticsSummary()
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load analytics. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen" aria-label="Lesson analytics dashboard">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/lessons"
            className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Back to Lesson Library
          </Link>
          <h1 className="text-3xl font-bold mt-3">
            <span className="text-gradient">Analytics Dashboard</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Per-lesson engagement metrics · WCAG 2.1 AA scores · Quiz pass rates
          </p>
        </div>

        {loading && (
          <p className="text-slate-400 text-center py-20" role="status" aria-live="polite">
            Loading analytics…
          </p>
        )}

        {error && (
          <div role="alert" className="glass rounded-2xl p-6 text-center border border-red-200/50">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              <div className="glass-card text-center">
                <p className="text-3xl font-bold text-gradient">{data.total_lessons}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Active Lessons</p>
              </div>
              <div className="glass-card text-center">
                <p
                  className="text-3xl font-bold"
                  style={{ color: data.avg_accessibility_score >= 0.8 ? 'var(--color-primary-base)' : '#d97706' }}
                >
                  {Math.round(data.avg_accessibility_score * 100)}%
                </p>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Avg A11y Score</p>
              </div>
              <div className="glass-card text-center col-span-2 sm:col-span-1">
                <p className="text-3xl font-bold" style={{ color: 'var(--color-secondary-base)' }}>
                  {Math.round(
                    (data.lessons.reduce((a, l) => a + l.quiz_pass_rate, 0) / (data.lessons.length || 1)) * 100
                  )}%
                </p>
                <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Avg Quiz Pass Rate</p>
              </div>
            </div>

            {/* Per-lesson cards */}
            <ul className="space-y-4" role="list" aria-label="Lesson metrics">
              {data.lessons.map((lesson) => (
                <li key={lesson.lesson_id} role="listitem">
                  <div className="glass-card">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Title block */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{ color: 'var(--color-primary-base)' }}
                          >
                            {lesson.subject} · Gr. {lesson.grade_level}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-400">{lesson.total_views} views</span>
                        </div>
                        <h2 className="font-bold text-slate-800 leading-snug">{lesson.title}</h2>
                        {lesson.misconception_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {lesson.misconception_tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-1.5 py-0.5 rounded-full"
                                style={{ background: 'rgba(107,102,232,0.08)', color: 'var(--color-primary-dark)' }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center gap-5 flex-shrink-0">
                        <ScoreBadge value={lesson.accessibility_score} label="A11y" />
                        <ScoreBadge value={lesson.completion_rate} label="Completion" />
                        <ScoreBadge value={lesson.quiz_pass_rate} label="Quiz Pass" />
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-700">{lesson.avg_time_minutes}m</p>
                          <p className="text-xs text-slate-400 mt-1">Avg Time</p>
                        </div>
                      </div>
                    </div>

                    {/* A11y issues bar */}
                    {lesson.issues_count > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/30">
                        <p className="text-xs text-amber-600 font-medium">
                          ⚠ {lesson.issues_count} accessibility issue{lesson.issues_count > 1 ? 's' : ''} — review before publishing
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
