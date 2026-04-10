'use client';
import { useRef, useState } from 'react';
import type { NumberLineActivity, ActivityResult } from '@/lib/types';

interface Props {
  activity: NumberLineActivity;
  onResult: (r: ActivityResult) => void;
}

export default function NumberLineActivity({ activity, onResult }: Props) {
  const { min, max, divisions, target, label } = activity.data;
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const startRef = useRef(Date.now());

  const ticks: number[] = [];
  for (let i = 0; i <= divisions; i++) {
    ticks.push(min + (i / divisions) * (max - min));
  }

  function handleSelect(val: number) {
    if (submitted) return;
    setSelected(val);
  }

  function handleSubmit() {
    if (selected === null || submitted) return;
    const isCorrect = Math.abs(selected - target) < 0.001;
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

  function formatVal(v: number): string {
    // Show as fraction-like if divisions divides cleanly
    const dec = Math.round(v * 1000) / 1000;
    if (Number.isInteger(dec)) return String(dec);
    // Show numerator/denominator form when possible
    const num = Math.round(v * divisions);
    if (Math.abs(num / divisions - v) < 0.001 && num !== 0 && num !== divisions) {
      return `${num}/${divisions}`;
    }
    return dec.toFixed(2).replace(/\.?0+$/, '');
  }

  return (
    <div className="glass rounded-2xl p-6 my-4" role="group" aria-labelledby={`nl-instruction-${activity.id}`}>
      <p id={`nl-instruction-${activity.id}`} className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
        {activity.instruction}
      </p>
      {label && <p className="text-sm text-slate-600 mb-3">{label}</p>}
      <p className="text-xs text-slate-400 mb-5">Click on the correct position on the number line.</p>

      {/* Number line SVG */}
      <div className="relative mb-5" aria-label="Number line">
        <div className="flex items-center gap-0 relative">
          {/* Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-300 -translate-y-1/2" />
          {ticks.map((val, i) => {
            const isSelected = selected !== null && Math.abs(val - selected) < 0.001;
            const isTarget = submitted && Math.abs(val - target) < 0.001;
            const isSelectedWrong = submitted && isSelected && !isTarget;
            return (
              <div key={i} className="flex-1 flex flex-col items-center relative" style={{ minWidth: 0 }}>
                <button
                  onClick={() => handleSelect(val)}
                  disabled={submitted}
                  aria-label={`Position ${formatVal(val)}${isSelected ? ', selected' : ''}`}
                  className={`relative z-10 w-5 h-5 rounded-full border-2 transition-all ${
                    submitted
                      ? isTarget
                        ? 'bg-emerald-500 border-emerald-600 scale-125'
                        : isSelectedWrong
                        ? 'bg-red-500 border-red-600 scale-110'
                        : 'bg-white border-slate-300'
                      : isSelected
                      ? 'bg-indigo-500 border-indigo-600 scale-110'
                      : 'bg-white border-slate-400 hover:border-indigo-400 hover:scale-110'
                  }`}
                />
                <span className={`text-xs mt-1 ${i === 0 || i === ticks.length - 1 ? 'font-bold text-slate-700' : 'text-slate-500'}`}>
                  {formatVal(val)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {selected !== null && (
        <p className="text-sm text-slate-600 mb-3">
          Selected: <strong>{formatVal(selected)}</strong>
        </p>
      )}

      {!submitted && (
        <button onClick={handleSubmit} disabled={selected === null}
          className="btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-40">
          Place Marker
        </button>
      )}

      {submitted && correct !== null && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
          role="status" aria-live="polite">
          {correct
            ? `Correct! ${formatVal(target)} is in the right place.`
            : `Not quite. The correct position is ${formatVal(target)}.`}
        </div>
      )}
    </div>
  );
}
