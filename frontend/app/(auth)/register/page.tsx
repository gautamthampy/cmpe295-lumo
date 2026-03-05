'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';

type Subject = { subject_id: string; name: string; slug: string };

const AVATARS = [
  'avatar-01', 'avatar-02', 'avatar-03', 'avatar-04',
  'avatar-05', 'avatar-06', 'avatar-07', 'avatar-08',
];

const AVATAR_EMOJIS: Record<string, string> = {
  'avatar-01': '🦁', 'avatar-02': '🐯', 'avatar-03': '🐻', 'avatar-04': '🦊',
  'avatar-05': '🐼', 'avatar-06': '🦋', 'avatar-07': '🐬', 'avatar-08': '🦄',
};

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Step 1 — parent account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [parentName, setParentName] = useState('');

  // Step 2 — child profile
  const [childName, setChildName] = useState('');
  const [gradeLevel, setGradeLevel] = useState(3);
  const [pin, setPin] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar-01');
  const [consentGiven, setConsentGiven] = useState(false);

  // Step 3 — subjects
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Temp storage between steps
  const [parentToken, setParentToken] = useState('');
  const [studentId, setStudentId] = useState('');

  useEffect(() => {
    authAPI.listSubjects().then((res) => setSubjects(res.data)).catch(() => {});
  }, []);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.registerParent({ email, password, display_name: parentName });
      setParentToken(res.data.access_token);
      login(res.data.access_token, 'parent', parentName);
      setStep(2);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail ?? 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) { setError('Please confirm parental consent to continue.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.createStudent({
        display_name: childName,
        grade_level: gradeLevel,
        pin,
        avatar_id: selectedAvatar,
        consent_given: consentGiven,
      });
      setStudentId(res.data.student_id);
      setStep(3);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail ?? 'Failed to create student profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await Promise.all(
        selectedSubjects.map((sid) => authAPI.enrollSubject(studentId, sid))
      );
      router.push('/');
    } catch {
      // Non-fatal — continue to dashboard anyway
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 rounded-2xl shadow-xl">
      <div className="text-center mb-6">
        <span className="text-4xl font-bold text-gradient">LUMO</span>
        <p className="text-sm text-gray-500 mt-1">Set up your family account</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
              s === step
                ? 'bg-violet-500 text-white'
                : s < step
                ? 'bg-violet-200 text-violet-700'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Step 1: Parent account */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Create your account</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input
              type="text" value={parentName} onChange={(e) => setParentName(e.target.value)}
              required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={8} autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="At least 8 characters"
            />
          </div>
          {error && <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 rounded-xl font-medium disabled:opacity-60">
            {loading ? 'Creating account...' : 'Continue'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-600 hover:underline">Sign in</Link>
          </p>
        </form>
      )}

      {/* Step 2: Add child */}
      {step === 2 && (
        <form onSubmit={handleStep2} className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Add your child</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Child's name</label>
            <input
              type="text" value={childName} onChange={(e) => setChildName(e.target.value)}
              required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="Alex"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <select
              value={gradeLevel} onChange={(e) => setGradeLevel(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">4-digit PIN for your child</label>
            <input
              type="text" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              required pattern="\d{4}" inputMode="numeric"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-violet-400 text-center text-2xl tracking-widest"
              placeholder="• • • •"
            />
          </div>

          {/* Avatar picker */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">Choose an avatar</legend>
            <div className="grid grid-cols-4 gap-2">
              {AVATARS.map((av) => (
                <label key={av} className="cursor-pointer">
                  <input
                    type="radio" name="avatar" value={av}
                    checked={selectedAvatar === av}
                    onChange={() => setSelectedAvatar(av)}
                    className="sr-only"
                  />
                  <div className={`flex items-center justify-center w-full aspect-square rounded-xl text-3xl transition-all ${
                    selectedAvatar === av
                      ? 'ring-2 ring-violet-500 bg-violet-50 scale-110'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}>
                    {AVATAR_EMOJIS[av]}
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox" checked={consentGiven} onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-1 w-4 h-4 accent-violet-500"
            />
            <span className="text-sm text-gray-600">
              I consent to my child using LUMO and to their learning data being processed to personalise their experience.
            </span>
          </label>

          {error && <p role="alert" className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 rounded-xl font-medium disabled:opacity-60">
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      )}

      {/* Step 3: Pick subjects */}
      {step === 3 && (
        <form onSubmit={handleStep3} className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">What does {childName} study?</h2>
          <p className="text-sm text-gray-500">Select the subjects to unlock personalised lessons and diagnostics.</p>
          <div className="grid grid-cols-2 gap-2">
            {subjects.map((s) => (
              <label key={s.subject_id} className="cursor-pointer">
                <input
                  type="checkbox"
                  value={s.subject_id}
                  checked={selectedSubjects.includes(s.subject_id)}
                  onChange={(e) =>
                    setSelectedSubjects((prev) =>
                      e.target.checked ? [...prev, s.subject_id] : prev.filter((id) => id !== s.subject_id)
                    )
                  }
                  className="sr-only"
                />
                <div className={`p-3 rounded-xl border-2 text-center text-sm font-medium transition-all ${
                  selectedSubjects.includes(s.subject_id)
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}>
                  {s.name}
                </div>
              </label>
            ))}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 rounded-xl font-medium disabled:opacity-60">
            {loading ? 'Setting up...' : "Let's go!"}
          </button>
          <button type="button" onClick={() => router.push('/')} className="w-full text-sm text-gray-400 hover:text-gray-600">
            Skip for now
          </button>
        </form>
      )}
    </div>
  );
}
