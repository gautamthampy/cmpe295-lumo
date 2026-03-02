'use client';

import { useEffect, useState } from 'react';
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
      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${color}`}>
        {pct}%
      </span>
      <p className="text-xs text-slate-400 mt-1 font-medium">{label}</p>
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
    <>
      {/* Header */}
      <header className="bg-white rounded-[1.75rem] w-full mb-5 p-5 px-8 shadow-sm border-2 border-violet-50">
        <h1 className="text-2xl font-black">
          <span className="text-gradient">Analytics Dashboard</span> 📊
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Per-lesson engagement metrics · WCAG 2.1 AA scores · Quiz pass rates
        </p>
      </header>

      {/* Content */}
      <div className="bg-white rounded-[1.75rem] flex-1 p-6 overflow-y-auto shadow-sm border-2 border-violet-50">
        {loading && (
          <p className="text-slate-400 text-center py-20" role="status" aria-live="polite">
            Loading analytics…
          </p>
        )}

        {error && (
          <div role="alert" className="bg-red-50 rounded-2xl p-6 text-center border border-red-200">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {[
                { value: data.total_lessons, label: 'Active Lessons', icon: '📚', gradient: 'from-violet-400 to-purple-300' },
                { value: `${Math.round(data.avg_accessibility_score * 100)}%`, label: 'Avg A11y Score', icon: '♿', gradient: 'from-sky-400 to-cyan-300' },
                { value: `${Math.round((data.lessons.reduce((a, l) => a + l.quiz_pass_rate, 0) / (data.lessons.length || 1)) * 100)}%`, label: 'Avg Quiz Pass', icon: '🎯', gradient: 'from-amber-300 to-yellow-200' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-[1.75rem] p-5 border-2 border-violet-50 shadow-sm animate-fade-up flex items-center gap-4"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-xl shadow-sm flex-shrink-0`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Per-lesson cards */}
            <ul className="space-y-3" role="list" aria-label="Lesson metrics">
              {data.lessons.map((lesson) => (
                <li key={lesson.lesson_id} role="listitem">
                  <div className="glass-card">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="tag-pill text-[10px]">
                            {lesson.subject} · Gr. {lesson.grade_level}
                          </span>
                          <span className="text-xs text-slate-400">{lesson.total_views} views</span>
                        </div>
                        <h2 className="font-bold text-slate-800 leading-snug">{lesson.title}</h2>
                        {lesson.misconception_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {lesson.misconception_tags.map((tag) => (
                              <span key={tag} className="tag-pill text-[10px]">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-5 flex-shrink-0">
                        <ScoreBadge value={lesson.accessibility_score} label="A11y" />
                        <ScoreBadge value={lesson.completion_rate} label="Completion" />
                        <ScoreBadge value={lesson.quiz_pass_rate} label="Quiz Pass" />
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-700">{lesson.avg_time_minutes}m</p>
                          <p className="text-xs text-slate-400 mt-1 font-medium">Avg Time</p>
                        </div>
                      </div>
                    </div>

                    {lesson.issues_count > 0 && (
                      <div className="mt-3 pt-3 border-t border-violet-50">
                        <p className="text-xs text-amber-600 font-bold">
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
    </>
  );
}
