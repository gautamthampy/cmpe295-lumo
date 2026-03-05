'use client';

import { useEffect, useRef, useState } from 'react';
import { analyticsAPI } from '@/lib/api';

interface AgentMessage {
  id: string;
  agent: string;
  agentIcon: string;
  bgClass: string;
  borderClass: string;
  labelColor: string;
  text: string;
  time: string;
}

const seedMessages: AgentMessage[] = [
  {
    id: '1',
    agent: 'Lumo Guide',
    agentIcon: '🦉',
    bgClass: 'bg-violet-50',
    borderClass: 'border-violet-100',
    labelColor: 'text-violet-600',
    text: "Hi there! I'm your study buddy. Pick a lesson and let's learn together!",
    time: '10:02 AM',
  },
  {
    id: '2',
    agent: 'Focus Coach',
    agentIcon: '⚡',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-100',
    labelColor: 'text-amber-600',
    text: "Great focus for 20 minutes! Time for a quick stretch break 🧘",
    time: '10:22 AM',
  },
  {
    id: '3',
    agent: 'Quiz Buddy',
    agentIcon: '🎯',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-100',
    labelColor: 'text-sky-600',
    text: "Ready for a quiz when you finish your lesson! You got this!",
    time: '10:30 AM',
  },
];

type AttentionSnapshot = {
  recorded_at: string;
  attention_score: number | null;
  avg_response_latency_ms: number | null;
  error_rate: number | null;
};

type AttentionSummary = {
  user_id: string;
  recent: AttentionSnapshot[];
  drift: boolean;
  recommended_action: string;
};

const DEFAULT_USER_ID = '11111111-1111-1111-1111-111111111111';

type PresenceStatus = 'idle' | 'checking' | 'done' | 'error';

// 30 seconds for testing; increase to 30 minutes for production.
const IDLE_THRESHOLD_MS = 30_000;

export default function AgentPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [attention, setAttention] = useState<AttentionSummary | null>(null);
  const [attnLoading, setAttnLoading] = useState(false);
  const [attnError, setAttnError] = useState<string | null>(null);
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('idle');
  const [cameraAllowed, setCameraAllowed] = useState<boolean | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleRefreshAttention = async () => {
    setAttnLoading(true);
    setAttnError(null);
    try {
      const res = await analyticsAPI.getAttentionMetrics(userId);
      setAttention(res.data as AttentionSummary);
    } catch {
      setAttnError('Could not load attention. Is the backend running?');
    } finally {
      setAttnLoading(false);
    }
  };

  const latestScore =
    attention?.recent.find((s) => s.attention_score !== null && s.attention_score !== undefined)
      ?.attention_score ?? null;

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const maybeRequestCameraConsent = async () => {
    if (cameraAllowed !== null) return cameraAllowed;
    if (typeof window === 'undefined') return false;

    const accepted = window.confirm(
      "Can we occasionally use your camera to check if you're still present? This is optional, processed locally, and we won't save any video.",
    );
    setCameraAllowed(accepted);
    return accepted;
  };

  const runPresenceCheck = async () => {
    const allowed = await maybeRequestCameraConsent();
    if (!allowed || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }
    try {
      setPresenceStatus('checking');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setTimeout(() => {
        stopStream();
        setPresenceStatus('done');
      }, 3000);
    } catch {
      setPresenceStatus('error');
      setCameraAllowed(false);
    }
  };

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      void runPresenceCheck();
    }, IDLE_THRESHOLD_MS);
  };

  const handleActivity = () => {
    resetIdleTimer();
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    resetIdleTimer();

    const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'touchstart'];
    activityEvents.forEach((ev) => window.addEventListener(ev, handleActivity));

    const handleVisibility = () => {
      // Requirement 1: note when the learner changes tab or window.
      if (document.hidden) {
        setPresenceStatus('idle');
      } else {
        handleActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleActivity);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleActivity);
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center m-4 ml-0 gap-3 relative z-10">
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand agent panel"
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-pink-400 shadow-lg shadow-violet-200 animate-float flex items-center justify-center text-2xl transition-transform hover:scale-110"
        >
          🦉
        </button>
      </div>
    );
  }

  return (
    <aside
      className="w-80 flex flex-col m-4 ml-0 gap-3 relative z-10 transition-all flex-shrink-0"
      aria-label="Agent interaction panel"
    >
      {/* Active Agent Banner */}
      <div className="bg-white rounded-[1.75rem] p-4 flex items-center gap-4 border-2 border-violet-100 shadow-sm">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-pink-400 shadow-md shadow-violet-200 animate-float flex items-center justify-center text-2xl">
            🦉
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 leading-tight">Lumo Guide</h3>
          <p className="text-xs font-semibold text-violet-500">Your study buddy</p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Collapse agent panel"
          className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-xl hover:bg-violet-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Attention Snapshot */}
      <div className="bg-gradient-to-br from-violet-50 to-sky-50 rounded-[1.75rem] p-4 border-2 border-violet-100 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
              Focus snapshot
            </p>
            <p className="text-sm text-slate-500">Quick view of attention for this learner.</p>
          </div>
          <button
            type="button"
            onClick={handleRefreshAttention}
            disabled={attnLoading}
            className="text-xs px-3 py-1.5 rounded-full font-semibold border border-violet-200 text-violet-700 bg-white hover:bg-violet-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {attnLoading ? 'Checking…' : 'Check focus'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-[11px] font-medium text-slate-400 mb-0.5">Learner ID</p>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full text-xs bg-white border border-violet-100 rounded-full px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[11px] font-medium text-slate-400 mb-0.5">Attention score</p>
            <p className="text-2xl font-black text-slate-800">
              {latestScore === null ? '—' : `${Math.round(latestScore * 100)}%`}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {attention
                ? attention.drift
                  ? `Drift detected · ${attention.recommended_action}`
                  : `Stable · ${attention.recommended_action}`
                : 'No data yet'}
            </p>
          </div>
        </div>

        {attnError && (
          <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-1.5">
            {attnError}
          </p>
        )}
        {presenceStatus !== 'idle' && (
          <p className="text-[10px] text-slate-400">
            Camera check status:{' '}
            {presenceStatus === 'checking'
              ? 'Checking…'
              : presenceStatus === 'done'
              ? 'Checked'
              : 'Camera unavailable'}
          </p>
        )}
      </div>

      {/* Chat Feed */}
      <div className="bg-white/80 flex-1 rounded-[1.75rem] p-5 flex flex-col gap-3 overflow-y-auto border-2 border-violet-50">
        {seedMessages.map((msg) => (
          <div
            key={msg.id}
            className={`${msg.bgClass} ${msg.borderClass} rounded-2xl rounded-tl-sm p-4 border max-w-[92%] animate-fade-up`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base" aria-hidden="true">{msg.agentIcon}</span>
              <span className={`text-xs font-bold ${msg.labelColor}`}>{msg.agent}</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{msg.text}</p>
            <span className="text-[10px] text-slate-400 mt-2 block">{msg.time}</span>
          </div>
        ))}
        <div className="mt-auto" />
      </div>

      {/* Input */}
      <div className="bg-white rounded-[1.75rem] p-3 flex items-center gap-2 border-2 border-violet-100 shadow-sm">
        <button
          className="w-10 h-10 rounded-xl hover:bg-violet-50 flex items-center justify-center text-slate-400 transition-colors"
          aria-label="Voice input"
        >
          🎤
        </button>
        <input
          type="text"
          placeholder="Ask Lumo anything…"
          className="flex-1 bg-violet-50/60 border border-violet-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-slate-700 placeholder-slate-400"
        />
        <button
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 flex items-center justify-center text-white shadow-md shadow-violet-200 transition-all hover:shadow-lg"
          aria-label="Send message"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
