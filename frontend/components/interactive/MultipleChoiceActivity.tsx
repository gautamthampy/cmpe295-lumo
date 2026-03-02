'use client';
import { useRef, useState } from 'react';
import type { MultipleChoiceActivity, ActivityResult } from '@/lib/types';

interface Props {
  activity: MultipleChoiceActivity;
  onResult: (r: ActivityResult) => void;
}

export default function MultipleChoiceActivity({ activity, onResult }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const startRef = useRef(Date.now());

  const { question, options, correct_id } = activity.data;

  function handleSubmit() {
    if (!selected || submitted) return;
    setSubmitted(true);
    onResult({
      activityId: activity.id,
      correct: selected === correct_id,
      attempts: 1,
      misconceptionTag: activity.misconception_tag,
      timeSpentMs: Date.now() - startRef.current,
    });
  }

  return (
    <div className="glass rounded-2xl p-6 my-4" role="group" aria-labelledby={`mc-instruction-${activity.id}`}>
      <p id={`mc-instruction-${activity.id}`} className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
        {activity.instruction}
      </p>
      <p className="text-base font-medium text-slate-800 mb-4">{question}</p>

      <fieldset>
        <legend className="sr-only">Choose an answer</legend>
        <div className="space-y-2">
          {options.map((opt) => {
            const isChosen = selected === opt.id;
            const isCorrect = opt.id === correct_id;
            let labelCls = 'flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors';
            if (submitted) {
              if (isCorrect) labelCls += ' bg-emerald-50 border-emerald-400 text-emerald-800 font-medium';
              else if (isChosen) labelCls += ' bg-red-50 border-red-300 text-red-700';
              else labelCls += ' bg-slate-50 border-slate-200 text-slate-400';
            } else {
              labelCls += isChosen
                ? ' bg-white border-indigo-400 shadow-sm text-slate-800'
                : ' bg-white/60 border-white/40 hover:border-indigo-300 text-slate-700';
            }
            return (
              <label key={opt.id} className={labelCls}>
                <input
                  type="radio"
                  name={`mc-${activity.id}`}
                  value={opt.id}
                  checked={isChosen}
                  disabled={submitted}
                  onChange={() => setSelected(opt.id)}
                  className="accent-indigo-600"
                />
                <span className="text-sm flex-1">
                  <span className="font-mono mr-1">{opt.id.toUpperCase()}.</span>
                  {opt.text}
                  {submitted && isCorrect && <span className="ml-2 text-emerald-600 font-bold">✓</span>}
                  {submitted && isChosen && !isCorrect && <span className="ml-2 text-red-600 font-bold">✗</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!selected}
          className="btn-primary mt-4 px-5 py-2 rounded-xl text-sm disabled:opacity-40"
        >
          Check Answer
        </button>
      )}

      {submitted && (
        <p
          className={`mt-3 text-sm font-medium ${selected === correct_id ? 'text-emerald-700' : 'text-red-700'}`}
          role="status"
          aria-live="polite"
        >
          {selected === correct_id ? 'Correct! Well done!' : `The correct answer was ${correct_id.toUpperCase()}.`}
        </p>
      )}
    </div>
  );
}
