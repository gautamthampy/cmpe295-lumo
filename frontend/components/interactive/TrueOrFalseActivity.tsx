'use client';
import { useState } from 'react';
import type { TrueOrFalseActivity, ActivityResult } from '@/lib/types';

interface Props {
  activity: TrueOrFalseActivity;
  onResult: (r: ActivityResult) => void;
}

export default function TrueOrFalseActivity({ activity, onResult }: Props) {
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const startRef = useState(() => Date.now())[0];

  function handleAnswer(chosen: boolean) {
    if (answered !== null) return;
    const isCorrect = chosen === activity.data.correct;
    setAnswered(chosen);
    setCorrect(isCorrect);
    onResult({
      activityId: activity.id,
      correct: isCorrect,
      attempts: 1,
      misconceptionTag: activity.misconception_tag,
      timeSpentMs: Date.now() - startRef,
    });
  }

  const btnBase = 'flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all border-2';

  return (
    <div className="glass rounded-2xl p-6 my-4" role="group" aria-labelledby={`tof-instruction-${activity.id}`}>
      <p id={`tof-instruction-${activity.id}`} className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
        {activity.instruction}
      </p>
      <p className="text-base font-medium text-slate-800 mb-5">{activity.data.statement}</p>

      <div className="flex gap-3">
        {[true, false].map((val) => {
          let cls = btnBase;
          if (answered !== null) {
            if (val === activity.data.correct) cls += ' bg-emerald-100 border-emerald-400 text-emerald-800';
            else if (answered === val) cls += ' bg-red-100 border-red-400 text-red-700';
            else cls += ' bg-slate-100 border-slate-200 text-slate-400';
          } else {
            cls += ' bg-white/70 border-white/50 hover:border-indigo-400 text-slate-700 hover:shadow-sm';
          }
          return (
            <button
              key={String(val)}
              onClick={() => handleAnswer(val)}
              disabled={answered !== null}
              className={cls}
              aria-pressed={answered === val ? true : undefined}
            >
              {val ? 'True' : 'False'}
            </button>
          );
        })}
      </div>

      {answered !== null && (
        <div
          className={`mt-4 p-3 rounded-xl text-sm ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}
          role="status"
          aria-live="polite"
        >
          <span className="font-semibold">{correct ? 'Correct! ' : 'Not quite. '}</span>
          {activity.data.explanation}
        </div>
      )}
    </div>
  );
}
