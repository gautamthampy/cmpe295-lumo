'use client';

import { useCallback, useEffect, useState } from 'react';
import { analyticsAPI, sessionsAPI } from '@/lib/api';

export default function SelfReportPanel({
  userId,
  sessionId: externalSessionId,
}: {
  userId: string;
  sessionId?: string | null;
}) {
  const [level, setLevel] = useState(0.75);
  const [sessionId, setSessionId] = useState<string | null>(externalSessionId ?? null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (externalSessionId) {
      setSessionId(externalSessionId);
    }
  }, [externalSessionId]);

  const ensureSession = useCallback(async () => {
    if (externalSessionId) return externalSessionId;
    if (sessionId) return sessionId;
    const res = await sessionsAPI.create(userId);
    const sid = res.data.session_id as string;
    setSessionId(sid);
    return sid;
  }, [externalSessionId, sessionId, userId]);

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const sid = await ensureSession();
      await analyticsAPI.ingestEvent({
        event_type: 'attention_self_report',
        timestamp: new Date().toISOString(),
        user_id: userId,
        session_id: sid,
        data: { focus_level: level, label: 'slider' },
      });
      setStatus('Thanks — saved.');
    } catch {
      setStatus('Could not save (is the backend running?)');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="bg-white rounded-[1.75rem] p-6 shadow-sm border-2 border-violet-50"
      aria-label="Self-report focus"
    >
      <h2 className="text-lg font-bold text-slate-800 mb-2">How focused do you feel?</h2>
      <p className="text-slate-500 text-sm mb-4">Move the slider and tap Save (optional check-in).</p>
      <div className="flex items-center gap-4 mb-4">
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(level * 100)}
          onChange={(e) => setLevel(Number(e.target.value) / 100)}
          className="flex-1 accent-violet-600"
          aria-valuetext={`${Math.round(level * 100)} percent`}
        />
        <span className="text-sm font-bold text-slate-700 w-12">{Math.round(level * 100)}%</span>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="btn-secondary text-sm px-5 py-2.5 disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save check-in'}
      </button>
      {status && <p className="text-sm mt-2 text-slate-600">{status}</p>}
    </section>
  );
}
