'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { lessonsAPI } from '@/lib/api';
import type { LessonResponse } from '@/lib/types';

const statCards = [
  { key: 'lessons', label: 'Lessons Available', icon: '📚', gradient: 'from-violet-400 to-purple-300' },
  { key: 'completed', label: 'Completed', icon: '🏆', gradient: 'from-amber-300 to-yellow-200' },
  { key: 'score', label: 'Avg Quiz Score', icon: '⭐', gradient: 'from-sky-400 to-cyan-300' },
];

export default function DashboardPage() {
  const [lessons, setLessons] = useState<LessonResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    lessonsAPI
      .getAll()
      .then((res) => setLessons(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const recentLessons = lessons.slice(0, 3);
  const statValues: Record<string, string> = {
    lessons: String(lessons.length),
    completed: '3',
    score: '85%',
  };

  return (
    <>
      {/* Welcome Header */}
      <header className="bg-white rounded-[1.75rem] w-full mb-5 p-5 px-8 flex justify-between items-center shadow-sm border-2 border-violet-50">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Welcome back, <span className="text-gradient">Alex!</span> 👋
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Ready for your next math adventure?</p>
        </div>
        <div className="flex gap-3 items-center">
          <button className="bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold py-2 px-5 rounded-full shadow-sm transition-all border border-violet-100 text-sm">
            ⏸ Pause
          </button>
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-300 to-pink-300 shadow-md border-2 border-white cursor-pointer"
            aria-label="User avatar"
            role="img"
          />
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {statCards.map((card, i) => (
          <div
            key={card.key}
            className="bg-white rounded-[1.75rem] p-5 border-2 border-violet-50 shadow-sm animate-fade-up flex items-center gap-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-xl shadow-sm flex-shrink-0`}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{statValues[card.key]}</p>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Continue Learning */}
      <div className="bg-white rounded-[1.75rem] flex-1 flex flex-col shadow-sm border-2 border-violet-50 overflow-hidden">
        <div className="p-6 pb-4 flex justify-between items-center border-b border-violet-50">
          <div>
            <span className="inline-block px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              Your Lessons
            </span>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Continue Learning</h1>
          </div>
          <Link
            href="/lessons"
            className="px-4 py-2 text-sm font-bold text-violet-600 hover:text-violet-800 hover:bg-violet-50 rounded-xl transition-all"
          >
            View All →
          </Link>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <p className="text-slate-400 text-center py-12 text-lg" role="status" aria-live="polite">
              Loading lessons…
            </p>
          )}

          {!loading && lessons.length === 0 && (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-slate-600 text-lg font-semibold">No lessons found yet!</p>
              <p className="text-slate-400 text-sm mt-1">
                Run: <code className="bg-violet-50 px-2 py-0.5 rounded-lg text-violet-700 font-mono text-xs">python -m app.seed.seed_db</code>
              </p>
            </div>
          )}

          {recentLessons.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentLessons.map((lesson, i) => (
                <Link
                  key={lesson.lesson_id}
                  href={`/lessons/${lesson.lesson_id}`}
                  className="glass-card block animate-fade-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="tag-pill">
                      {lesson.subject} · Grade {lesson.grade_level}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      lesson.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {lesson.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 leading-snug mb-2">{lesson.title}</h3>
                  {lesson.misconception_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lesson.misconception_tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="tag-pill text-[10px]">{tag}</span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="p-5 border-t border-violet-50 flex justify-end gap-3">
          <Link href="/lessons/editor" className="btn-secondary text-sm px-5 py-2.5">
            ✨ Create a Lesson
          </Link>
          <Link href="/lessons" className="btn-primary text-sm px-6 py-2.5">
            Start Learning 🚀
          </Link>
        </div>
      </div>
    </>
  );
}
