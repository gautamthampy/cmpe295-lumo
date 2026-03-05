'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';

type StudentProfile = {
  student_id: string;
  display_name: string;
  avatar_id: string;
};

const AVATAR_EMOJIS: Record<string, string> = {
  'avatar-01': '🦁', 'avatar-02': '🐯', 'avatar-03': '🐻', 'avatar-04': '🦊',
  'avatar-05': '🐼', 'avatar-06': '🦋', 'avatar-07': '🐬', 'avatar-08': '🦄',
};

export default function StudentLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [parentLoading, setParentLoading] = useState(true);

  useEffect(() => {
    // Load student list for this parent
    authAPI.getMe()
      .then((res) => {
        setStudents(res.data.students || []);
      })
      .catch(() => {
        setStudents([]);
      })
      .finally(() => setParentLoading(false));
  }, []);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) setPin((p) => p + digit);
  };

  const handleBackspace = () => setPin((p) => p.slice(0, -1));

  const handleLogin = async () => {
    if (!selectedStudent || pin.length !== 4) return;
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.loginStudent(selectedStudent.student_id, pin);
      login(res.data.access_token, 'student', selectedStudent.display_name);
      router.push('/learn');
    } catch {
      setError('Wrong PIN. Try again!');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && selectedStudent) {
      handleLogin();
    }
  }, [pin]);

  if (parentLoading) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-8 rounded-2xl shadow-xl">
      <div className="text-center mb-6">
        <span className="text-4xl font-bold text-gradient">LUMO</span>
        <p className="text-lg font-medium text-gray-700 mt-2">Who's learning today?</p>
      </div>

      {/* Avatar grid */}
      {!selectedStudent && (
        <div className="grid grid-cols-2 gap-3">
          {students.map((student) => (
            <button
              key={student.student_id}
              onClick={() => { setSelectedStudent(student); setPin(''); setError(''); }}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all focus:outline-none focus:ring-2 focus:ring-violet-400"
              aria-label={`Login as ${student.display_name}`}
            >
              <span className="text-5xl" aria-hidden="true">
                {AVATAR_EMOJIS[student.avatar_id] ?? '🌟'}
              </span>
              <span className="font-semibold text-gray-800">{student.display_name}</span>
            </button>
          ))}
          {students.length === 0 && (
            <div className="col-span-2 text-center text-gray-500 py-8">
              <p>No student profiles yet.</p>
              <p className="text-sm mt-1">Ask a parent to set one up!</p>
            </div>
          )}
        </div>
      )}

      {/* PIN entry */}
      {selectedStudent && (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-6xl">{AVATAR_EMOJIS[selectedStudent.avatar_id] ?? '🌟'}</span>
            <p className="text-lg font-semibold text-gray-800">Hi, {selectedStudent.display_name}!</p>
            <p className="text-sm text-gray-500">Enter your PIN</p>
          </div>

          {/* PIN dots */}
          <div className="flex justify-center gap-4" aria-label="PIN entry" role="group">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full border-2 transition-colors ${
                  i < pin.length ? 'bg-violet-500 border-violet-500' : 'border-gray-300'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>

          {error && (
            <p role="alert" className="text-center text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <button
                key={d}
                onClick={() => handlePinInput(String(d))}
                disabled={loading}
                className="py-4 text-2xl font-bold rounded-2xl bg-gray-100 hover:bg-violet-100 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50"
                aria-label={`Digit ${d}`}
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => { setSelectedStudent(null); setPin(''); setError(''); }}
              className="py-4 text-sm text-gray-500 rounded-2xl bg-gray-100 hover:bg-gray-200 transition-all"
              aria-label="Go back"
            >
              ←
            </button>
            <button
              onClick={() => handlePinInput('0')}
              disabled={loading}
              className="py-4 text-2xl font-bold rounded-2xl bg-gray-100 hover:bg-violet-100 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50"
              aria-label="Digit 0"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="py-4 text-xl text-gray-500 rounded-2xl bg-gray-100 hover:bg-gray-200 transition-all"
              aria-label="Delete last digit"
            >
              ⌫
            </button>
          </div>

          {loading && (
            <p className="text-center text-sm text-violet-600 animate-pulse">Signing in...</p>
          )}
        </div>
      )}
    </div>
  );
}
