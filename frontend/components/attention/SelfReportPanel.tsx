"use client";

import { useCallback, useState } from "react";
import {
  createLearningSession,
  ingestAnalyticsEvent,
} from "@/lib/analytics-api";

export default function SelfReportPanel({ userId }: { userId: string }) {
  const [level, setLevel] = useState(0.75);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const res = await createLearningSession(userId);
    const sid = res.session_id;
    setSessionId(sid);
    return sid;
  }, [sessionId, userId]);

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const sid = await ensureSession();
      await ingestAnalyticsEvent({
        event_type: "attention_self_report",
        timestamp: new Date().toISOString(),
        user_id: userId,
        session_id: sid,
        data: { focus_level: level, label: "slider" },
      });
      setStatus("Thanks — saved.");
    } catch {
      setStatus("Could not save (is the backend running?)");
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
      <p className="text-slate-500 text-sm mb-4">
        Move the slider and tap Save (optional check-in).
      </p>
      <div className="mb-4 flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(level * 100)}
          onChange={(e) => setLevel(Number(e.target.value) / 100)}
          className="flex-1 accent-violet-600"
          aria-valuetext={`${Math.round(level * 100)} percent`}
        />
        <span className="w-12 text-sm font-bold text-slate-700">
          {Math.round(level * 100)}%
        </span>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="rounded-xl border-2 border-violet-200 bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-50 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save check-in"}
      </button>
      {status && <p className="mt-2 text-sm text-slate-600">{status}</p>}
    </section>
  );
}
