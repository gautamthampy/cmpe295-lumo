'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI, diagnosticsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';

type Subject = { subject_id: string; name: string; slug: string };
type StudentProfile = {
  student_id: string;
  display_name: string;
  grade_level: number;
  avatar_id: string;
  consent_given: boolean;
  subjects: Subject[];
};

const AVATAR_EMOJIS: Record<string, string> = {
  'avatar-01': '🦁', 'avatar-02': '🐯', 'avatar-03': '🐻', 'avatar-04': '🦊',
  'avatar-05': '🐼', 'avatar-06': '🦋', 'avatar-07': '🐬', 'avatar-08': '🦄',
};

export default function StudentsPage() {
  const router = useRouter();
  const { isAuthenticated, role } = useAuthStore();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [diagnosticState, setDiagnosticState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isAuthenticated() || role !== 'parent') {
      router.push('/login');
      return;
    }
    authAPI.getMe()
      .then((res) => setStudents(res.data.students || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const requestDiagnostic = async (student: StudentProfile) => {
    if (!student.subjects.length) {
      alert(`${student.display_name} has no subjects enrolled yet.`);
      return;
    }
    setDiagnosticState((s) => ({ ...s, [student.student_id]: true }));
    try {
      const res = await diagnosticsAPI.generate({
        student_id: student.student_id,
        subject_id: student.subjects[0].subject_id,
      });
      const assessmentId = res.data.assessment_id;
      // Copy link to clipboard
      const link = `${window.location.origin}/diagnostic/${assessmentId}`;
      await navigator.clipboard.writeText(link);
      alert(`Diagnostic created! Share this link with ${student.display_name}:\n${link}`);
    } catch {
      alert('Failed to create diagnostic. Please try again.');
    } finally {
      setDiagnosticState((s) => ({ ...s, [student.student_id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400 animate-pulse">Loading students...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Students</h1>
        <Link
          href="/register?step=2"
          className="btn-primary px-4 py-2 rounded-xl text-sm font-medium"
        >
          + Add Student
        </Link>
      </div>

      {students.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center">
          <p className="text-4xl mb-3">👶</p>
          <p className="text-gray-600 font-medium">No students yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your child to get started</p>
          <Link href="/register" className="btn-primary mt-4 inline-block px-6 py-2 rounded-xl text-sm">
            Set up a profile
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {students.map((student) => (
            <div key={student.student_id} className="glass-panel p-5 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center text-3xl flex-shrink-0">
                  {AVATAR_EMOJIS[student.avatar_id] ?? '🌟'}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800">{student.display_name}</h2>
                  <p className="text-sm text-gray-500">Grade {student.grade_level}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {student.subjects.map((s) => (
                      <span key={s.subject_id} className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => requestDiagnostic(student)}
                  disabled={diagnosticState[student.student_id]}
                  className="flex-1 py-2 rounded-xl border border-violet-300 text-violet-700 text-sm font-medium hover:bg-violet-50 transition-colors disabled:opacity-50"
                >
                  {diagnosticState[student.student_id] ? 'Creating...' : '🔍 Find gaps'}
                </button>
                <Link
                  href={`/lessons/editor?student_id=${student.student_id}`}
                  className="flex-1 py-2 rounded-xl border border-cyan-300 text-cyan-700 text-sm font-medium hover:bg-cyan-50 transition-colors text-center"
                >
                  ✨ Generate lesson
                </Link>
                <Link
                  href={`/lessons/analytics?student_id=${student.student_id}`}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors text-center"
                >
                  📊 Progress
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
