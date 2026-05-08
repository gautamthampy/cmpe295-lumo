'use client';

import { useEffect, useState } from 'react';

import { clsx } from 'clsx';

import {
  type AttentionDailySummary,
  type AttentionPeaksResponse,
  fetchAttentionPeaks,
  fetchAttentionSummary,
} from '@/lib/analytics-api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function scoreToColor(score: number): string {
  if (score >= 0.8) return 'bg-emerald-500';
  if (score >= 0.6) return 'bg-amber-400';
  if (score >= 0.4) return 'bg-amber-500';
  return 'bg-red-400';
}

type Props = {
  userId: string;
  /** Smaller padding when embedded in parent student cards */
  compact?: boolean;
};

export default function AttentionInsightPanels({ userId, compact }: Props) {
  const [summary, setSummary] = useState<AttentionDailySummary | null>(null);
  const [peaks, setPeaks] = useState<AttentionPeaksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchAttentionSummary(userId, 14),
      fetchAttentionPeaks(userId, { windowDays: 28, minSamples: 2, topK: 10 }),
    ])
      .then(([sum, pk]) => {
        if (!cancelled) {
          setSummary(sum);
          setPeaks(pk);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load attention data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const peakMap = new Map<string, number>();
  if (peaks?.windows) {
    for (const w of peaks.windows) {
      peakMap.set(`${w.day_of_week}-${w.hour_of_day}`, w.score);
    }
  }

  if (loading) {
    return (
      <p className={clsx('text-slate-400 text-sm', compact && 'py-2')} role="status">
        Loading focus analytics…
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2 border border-red-100" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className={clsx('space-y-4', compact && 'text-sm')}>
      <section className="rounded-[1.25rem] bg-white/90 p-4 border border-violet-100 shadow-sm" aria-label="Attention trend">
        <h3 className="font-bold text-slate-800 mb-2">Attention trend (14 days)</h3>
        {summary?.daily_avg?.length ? (
          <div className="flex items-end gap-1 h-24">
            {summary.daily_avg.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className={`w-full rounded-t min-h-[4px] max-h-full ${scoreToColor(d.score)}`}
                  style={{ height: `${Math.max(4, d.score * 100)}%` }}
                  title={`${d.date}: ${(d.score * 100).toFixed(0)}%`}
                />
                <span className="text-[9px] text-slate-400 truncate w-full text-center">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm py-2">No daily attention samples yet.</p>
        )}
        {summary && summary.drift_count > 0 ? (
          <p className="text-amber-600 text-xs mt-2 font-medium">
            {summary.drift_count} low-focus moment{summary.drift_count !== 1 ? 's' : ''} in this period
          </p>
        ) : null}
      </section>

      <section className="rounded-[1.25rem] bg-white/90 p-4 border border-violet-100 shadow-sm" aria-label="Focus heatmap">
        <h3 className="font-bold text-slate-800 mb-2">Focus heatmap (28 days)</h3>
        <p className="text-slate-500 text-xs mb-2">Hour × weekday — darker is higher average attention.</p>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <div className="inline-block min-w-0">
            <div className="flex mb-1">
              <div className="w-8 flex-shrink-0" aria-hidden />
              {WEEKDAYS.map((d) => (
                <div key={d} className="w-5 h-4 text-center text-[9px] text-slate-500 font-medium">
                  {d.slice(0, 2)}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-px">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="flex items-center gap-px">
                  <span className="w-8 flex-shrink-0 text-[9px] text-slate-400 text-right pr-1">{hour}h</span>
                  <div className="flex gap-px">
                    {Array.from({ length: 7 }, (_, dayOfWeek) => {
                      const score = peakMap.get(`${dayOfWeek}-${hour}`);
                      return (
                        <div
                          key={`${dayOfWeek}-${hour}`}
                          className={`w-5 h-4 rounded-sm flex-shrink-0 ${
                            score != null ? scoreToColor(score) : 'bg-slate-100'
                          }`}
                          title={
                            score != null
                              ? `${WEEKDAYS[dayOfWeek]} ${hour}:00 — ${(score * 100).toFixed(0)}%`
                              : `${WEEKDAYS[dayOfWeek]} ${hour}:00 — no data`
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {!peaks?.windows?.length ? (
          <p className="text-slate-400 text-xs mt-2">Not enough data for a heatmap yet.</p>
        ) : null}
      </section>
    </div>
  );
}
