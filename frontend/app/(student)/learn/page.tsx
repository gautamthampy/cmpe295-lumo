'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { lessonsAPI, authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';

type Lesson = {
  lesson_id: string;
  title: string;
  subject: string;
  grade_level: number;
  status: string;
};

type Subject = {
  subject_id: string;
  name: string;
  slug: string;
};

const SUBJECT_ICONS: Record<string, string> = {
  math: '🔢',
  english: '📖',
  science: '🔬',
  history: '🏛️',
  art: '🎨',
};

export default function StudentLearnPage() {
  const router = useRouter();
  const { displayName, isAuthenticated, role } = useAuthStore();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated() || role !== 'student') {
      router.push('/student-login');
      return;
    }
    Promise.all([
      lessonsAPI.getAll({ grade_level: 3 }),
      authAPI.listSubjects(),
    ]).then(([lessonsRes, subjectsRes]) => {
      setLessons(lessonsRes.data.filter((l: Lesson) => l.status === 'active').slice(0, 6));
      setSubjects(subjectsRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-cyan-50">
        <p className="text-2xl text-violet-500 animate-pulse font-semibold">Loading your lessons...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Greeting */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌟</div>
          <h1 className="text-3xl font-bold text-gray-800">
            Hi, {displayName || 'there'}!
          </h1>
          <p className="text-gray-500 mt-1 text-lg">What do you want to learn today?</p>
        </div>

        {/* Subjects */}
        {subjects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Your subjects</h2>
            <div className="grid grid-cols-3 gap-3">
              {subjects.map((s) => (
                <button
                  key={s.subject_id}
                  onClick={() => router.push(`/learn?subject=${s.slug}`)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white shadow-sm hover:shadow-md hover:scale-105 transition-all border border-gray-100"
                >
                  <span className="text-3xl">{SUBJECT_ICONS[s.slug] ?? '📚'}</span>
                  <span className="text-sm font-medium text-gray-700 text-center">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent lessons */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            {lessons.length > 0 ? 'Ready to explore' : 'No lessons yet'}
          </h2>
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <Link
                key={lesson.lesson_id}
                href={`/lessons/${lesson.lesson_id}`}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.01] transition-all border border-gray-100"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-2xl flex-shrink-0">
                  {SUBJECT_ICONS[lesson.subject?.toLowerCase()] ?? '📝'}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{lesson.title}</p>
                  <p className="text-sm text-gray-400">{lesson.subject} · Grade {lesson.grade_level}</p>
                </div>
                <span className="ml-auto text-violet-400 text-xl">→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              useAuthStore.getState().logout();
              router.push('/student-login');
            }}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
