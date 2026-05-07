'use client';

import { useState } from 'react';
import { analyticsAPI, sessionsAPI } from '@/lib/api';

const QUESTIONS = [
  { prompt: 'What is 7 + 5?', options: ['10', '11', '12', '13'], correctIndex: 2 },
  { prompt: 'How many sides does a triangle have?', options: ['2', '3', '4', '5'], correctIndex: 1 },
  { prompt: 'What is 3 × 4?', options: ['7', '10', '12', '14'], correctIndex: 2 },
];

type Phase = 'idle' | 'running' | 'done';

export default function MiniTestPanel({
  userId,
  sessionId: externalSessionId,
}: {
  userId: string;
  /** When set (e.g. lesson analytics session), skip creating a new session. */
  sessionId?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    setResultMsg(null);
    try {
      let sid: string;
      if (externalSessionId) {
        sid = externalSessionId;
      } else {
        const res = await sessionsAPI.create(userId);
        sid = res.data.session_id as string;
      }
      setSessionId(sid);
      await analyticsAPI.ingestEvent({
        event_type: 'attention_mini_test_started',
        timestamp: new Date().toISOString(),
        user_id: userId,
        session_id: sid,
        data: { trigger: 'session_start' },
      });
      setStartedAt(Date.now());
      setStep(0);
      setCorrectCount(0);
      setPhase('running');
    } catch {
      setResultMsg('Could not start (backend running?)');
    } finally {
      setBusy(false);
    }
  };

  const choose = async (idx: number) => {
    if (phase !== 'running' || !sessionId) return;
    const q = QUESTIONS[step];
    const ok = idx === q.correctIndex;
    const nextCorrect = correctCount + (ok ? 1 : 0);
    setCorrectCount(nextCorrect);
    if (step + 1 < QUESTIONS.length) {
      setStep(step + 1);
      return;
    }
    const score = nextCorrect / QUESTIONS.length;
    const elapsed = startedAt ? Date.now() - startedAt : 0;
    setBusy(true);
    try {
      await analyticsAPI.ingestEvent({
        event_type: 'attention_mini_test_completed',
        timestamp: new Date().toISOString(),
        user_id: userId,
        session_id: sessionId,
        data: {
          score,
          correct_count: nextCorrect,
          total_questions: QUESTIONS.length,
          time_taken_ms: elapsed,
        },
      });
      setPhase('done');
      setResultMsg(`Score: ${Math.round(score * 100)}%. Saved to your session.`);
    } catch {
      setResultMsg('Could not save result.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="bg-white rounded-[1.75rem] p-6 shadow-sm border-2 border-violet-50"
      aria-label="Focus mini-test"
    >
      <h2 className="text-lg font-bold text-slate-800 mb-2">Quick focus mini-test</h2>
      <p className="text-slate-500 text-sm mb-4">Three short questions — helps calibrate attention signals.</p>
      {phase === 'idle' && (
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="btn-primary text-sm px-5 py-2.5 disabled:opacity-50"
        >
          {busy ? 'Starting…' : 'Start mini-test'}
        </button>
      )}
      {phase === 'running' && QUESTIONS[step] && (
        <div>
          <p className="font-medium text-slate-800 mb-3">{QUESTIONS[step].prompt}</p>
          <div className="flex flex-wrap gap-2">
            {QUESTIONS[step].options.map((opt, idx) => (
              <button
                key={opt}
                type="button"
                onClick={() => choose(idx)}
                disabled={busy}
                className="px-4 py-2 rounded-xl border-2 border-violet-100 hover:bg-violet-50 text-sm font-semibold text-slate-700"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
      {phase === 'done' && resultMsg && <p className="text-emerald-700 font-medium text-sm">{resultMsg}</p>}
    </section>
  );
}
