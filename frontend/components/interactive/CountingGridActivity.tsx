'use client';
import { useRef, useState } from 'react';
import type { CountingGridActivity, ActivityResult } from '@/lib/types';

interface Props {
  activity: CountingGridActivity;
  onResult: (r: ActivityResult) => void;
}

export default function CountingGridActivity({ activity, onResult }: Props) {
  const { rows, cols, target_count, prompt } = activity.data;
  const [tapped, setTapped] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const startRef = useRef(Date.now());

  function toggleCell(key: string) {
    if (submitted) return;
    setTapped((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSubmit() {
    if (submitted) return;
    const isCorrect = tapped.size === target_count;
    setSubmitted(true);
    setCorrect(isCorrect);
    onResult({
      activityId: activity.id,
      correct: isCorrect,
      attempts: 1,
      misconceptionTag: activity.misconception_tag,
      timeSpentMs: Date.now() - startRef.current,
    });
  }

  const count = tapped.size;

  return (
    <div className="glass rounded-2xl p-6 my-4" role="group" aria-labelledby={`grid-instruction-${activity.id}`}>
      <p id={`grid-instruction-${activity.id}`} className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
        {activity.instruction}
      </p>
      <p className="text-sm text-slate-700 mb-1">{prompt}</p>
      <p className="text-xs text-slate-400 mb-4">Tap cells to fill them. Tap again to unfill.</p>

      {/* Counter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-slate-600">Filled:</span>
        <span className={`text-2xl font-bold ${count === target_count ? 'text-emerald-600' : 'text-indigo-600'}`}>{count}</span>
        <span className="text-sm text-slate-400">/ {target_count}</span>
      </div>

      {/* Grid */}
      <div
        className="inline-grid gap-1.5 mb-5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        role="grid"
        aria-label={`${rows} by ${cols} counting grid`}
      >
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const key = `${r}-${c}`;
            const isTapped = tapped.has(key);
            let cellCls = 'w-9 h-9 rounded-lg border-2 transition-all cursor-pointer';
            if (submitted) {
              cellCls += isTapped
                ? correct ? ' bg-emerald-400 border-emerald-500' : ' bg-red-400 border-red-500'
                : ' bg-slate-100 border-slate-200';
            } else {
              cellCls += isTapped
                ? ' bg-indigo-500 border-indigo-600 scale-95'
                : ' bg-white/70 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50';
            }
            return (
              <button
                key={key}
                onClick={() => toggleCell(key)}
                disabled={submitted}
                className={cellCls}
                aria-pressed={isTapped}
                aria-label={`Cell row ${r + 1} column ${c + 1}${isTapped ? ', filled' : ', empty'}`}
                role="gridcell"
              />
            );
          })
        )}
      </div>

      {!submitted && (
        <button onClick={handleSubmit}
          className="btn-primary px-5 py-2 rounded-xl text-sm">
          Check Count
        </button>
      )}

      {submitted && correct !== null && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
          role="status" aria-live="polite">
          {correct
            ? `Correct! You tapped exactly ${target_count} cells.`
            : `You tapped ${count} cells, but the answer is ${target_count}.`}
        </div>
      )}
    </div>
  );
}
