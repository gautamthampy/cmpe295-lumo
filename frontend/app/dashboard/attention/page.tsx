'use client';

import { useEffect, useState } from 'react';
import MiniTestPanel from '@/components/attention/MiniTestPanel';
import SelfReportPanel from '@/components/attention/SelfReportPanel';
import { analyticsAPI } from '@/lib/api';

const DEFAULT_USER_ID = '11111111-1111-1111-1111-111111111111';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DailyAvg = { date: string; score: number };
type SummaryResponse = {
  user_id: string;
  range_days: number;
  daily_avg: DailyAvg[];
  drift_count: number;
};

type PeakWindow = { day_of_week: number; hour_of_day: number; score: number; samples?: number };
type PeaksResponse = { user_id: string; windows: PeakWindow[] };

function scoreToColor(score: number): string {
  if (score >= 0.8) return 'bg-emerald-500';
  if (score >= 0.6) return 'bg-amber-400';
  if (score >= 0.4) return 'bg-amber-500';
  return 'bg-red-400';
}

export default function AttentionDashboardPage() {
  const [userId] = useState(DEFAULT_USER_ID);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [peaks, setPeaks] = useState<PeaksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      analyticsAPI.getAttentionSummary(userId, { range_days: 14 }).then((r) => r.data as SummaryResponse),
      analyticsAPI.getAttentionPeaks(userId, { window_days: 28, min_samples: 2, top_k: 10 }).then((r) => r.data as PeaksResponse),
    ])
      .then(([sum, pk]) => {
        setSummary(sum);
        setPeaks(pk);
      })
      .catch(() => setError('Could not load attention data. Is the backend running?'))
      .finally(() => setLoading(false));
  }, [userId]);

  const peakMap = new Map<string, number>();
  if (peaks?.windows) {
    for (const w of peaks.windows) {
      peakMap.set(`${w.day_of_week}-${w.hour_of_day}`, w.score);
    }
  }

  return (
    <>
      <header className="bg-white rounded-[1.75rem] w-full mb-5 p-5 px-8 shadow-sm border-2 border-violet-50">
        <h1 className="text-2xl font-black">
          <span className="text-gradient">Focus & Attention</span> 📈
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Attention trend and when you focus best (hour × weekday)
        </p>
      </header>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <MiniTestPanel userId={userId} />
          <SelfReportPanel userId={userId} />
        </div>

        {loading && (
          <p className="text-slate-400 text-center py-12" role="status" aria-live="polite">
            Loading attention data…
          </p>
        )}

        {error && (
          <div role="alert" className="bg-red-50 rounded-2xl p-6 text-center border border-red-200">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Attention trend: simple bar chart of daily_avg */}
            <section className="bg-white rounded-[1.75rem] p-6 shadow-sm border-2 border-violet-50" aria-label="Attention trend">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Attention trend (last 14 days)</h2>
              {summary?.daily_avg?.length ? (
                <div className="flex items-end gap-1 h-32">
                  {summary.daily_avg.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <div
                        className={`w-full rounded-t min-h-[4px] max-h-full ${scoreToColor(d.score)}`}
                        style={{ height: `${Math.max(4, d.score * 100)}%` }}
                        title={`${d.date}: ${(d.score * 100).toFixed(0)}%`}
                        role="img"
                        aria-label={`${d.date} score ${(d.score * 100).toFixed(0)}%`}
                      />
                      <span className="text-[10px] text-slate-400 truncate w-full text-center">
                        {d.date.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm py-4">No attention data in this range. Complete some activities to see your trend.</p>
              )}
              {summary?.drift_count != null && summary.drift_count > 0 && (
                <p className="text-amber-600 text-xs mt-2 font-medium">
                  {summary.drift_count} low-focus moment{summary.drift_count !== 1 ? 's' : ''} in this period
                </p>
              )}
            </section>

            {/* Focus heatmap: hour (rows) × weekday (cols), cells from peaks */}
            <section className="bg-white rounded-[1.75rem] p-6 shadow-sm border-2 border-violet-50" aria-label="Focus heatmap">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Focus heatmap (best times, last 28 days)</h2>
              <p className="text-slate-500 text-sm mb-4">
                Rows = hour of day (0–23), columns = day of week. Darker = higher average attention.
              </p>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-0">
                  {/* Header row: weekday labels */}
                  <div className="flex mb-1">
                    <div className="w-10 flex-shrink-0" aria-hidden="true" />
                    {WEEKDAYS.map((d) => (
                      <div key={d} className="w-6 h-5 text-center text-[10px] text-slate-500 font-medium">
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Grid: 24 rows × 7 cols */}
                  <div className="flex flex-col gap-px">
                    {Array.from({ length: 24 }, (_, hour) => (
                      <div key={hour} className="flex items-center gap-1">
                        <span className="w-10 flex-shrink-0 text-[10px] text-slate-400 text-right pr-1">
                          {hour}h
                        </span>
                        <div className="flex gap-px">
                          {Array.from({ length: 7 }, (_, dayOfWeek) => {
                            const score = peakMap.get(`${dayOfWeek}-${hour}`);
                            return (
                              <div
                                key={`${dayOfWeek}-${hour}`}
                                className={`w-6 h-5 rounded-sm flex-shrink-0 ${
                                  score != null ? scoreToColor(score) : 'bg-slate-100'
                                }`}
                                title={
                                  score != null
                                    ? `${WEEKDAYS[dayOfWeek]} ${hour}:00 – ${(score * 100).toFixed(0)}%`
                                    : `${WEEKDAYS[dayOfWeek]} ${hour}:00 – no data`
                                }
                                aria-label={
                                  score != null
                                    ? `${WEEKDAYS[dayOfWeek]} ${hour}:00, score ${(score * 100).toFixed(0)}%`
                                    : `${WEEKDAYS[dayOfWeek]} ${hour}:00, no data`
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
              {(!peaks?.windows?.length) && (
                <p className="text-slate-400 text-sm mt-4">Not enough data for heatmap yet. Keep learning to see your focus patterns.</p>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
