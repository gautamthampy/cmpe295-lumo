'use client';
import { useRef, useState } from 'react';
import type { FillInBlankActivity, ActivityResult } from '@/lib/types';

interface Props {
  activity: FillInBlankActivity;
  onResult: (r: ActivityResult) => void;
}

export default function FillInBlankActivity({ activity, onResult }: Props) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const attempts = useRef(0);
  const startRef = useRef(Date.now());

  const { prompt, answer, hint } = activity.data;

  // Split prompt on ___ to render input inline
  const parts = prompt.split('___');

  function handleSubmit() {
    if (submitted) return;
    attempts.current += 1;
    const isCorrect = value.trim().toLowerCase() === answer.trim().toLowerCase();
    if (isCorrect || attempts.current >= 3) {
      setSubmitted(true);
      setCorrect(isCorrect);
      onResult({
        activityId: activity.id,
        correct: isCorrect,
        attempts: attempts.current,
        misconceptionTag: activity.misconception_tag,
        timeSpentMs: Date.now() - startRef.current,
      });
    } else {
      setCorrect(false);
      setValue('');
    }
  }

  return (
    <div className="glass rounded-2xl p-6 my-4" role="group" aria-labelledby={`fib-instruction-${activity.id}`}>
      <p id={`fib-instruction-${activity.id}`} className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
        {activity.instruction}
      </p>

      <div className="flex flex-wrap items-center gap-1 text-base font-medium text-slate-800 mb-5">
        {parts.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            <span>{part}</span>
            {i < parts.length - 1 && (
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !submitted && handleSubmit()}
                disabled={submitted}
                aria-label="Your answer"
                className={`inline-block w-24 px-2 py-1 rounded-lg border-2 text-center font-bold transition-colors focus:outline-none ${
                  submitted
                    ? correct
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-red-400 bg-red-50 text-red-800'
                    : 'border-indigo-300 bg-white/80 focus:border-indigo-500'
                }`}
              />
            )}
          </span>
        ))}
      </div>

      {!submitted && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-40"
          >
            Check Answer
          </button>
          {hint && (
            <button
              onClick={() => setShowHint(true)}
              className="text-sm text-slate-500 underline hover:text-slate-700"
            >
              Need a hint?
            </button>
          )}
        </div>
      )}

      {showHint && hint && !submitted && (
        <p className="mt-3 text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-2" role="note">
          Hint: {hint}
        </p>
      )}

      {correct === false && !submitted && (
        <p className="mt-3 text-sm text-red-700" role="alert" aria-live="polite">
          Not quite — try again! ({3 - attempts.current} attempt{3 - attempts.current !== 1 ? 's' : ''} remaining)
        </p>
      )}

      {submitted && (
        <div
          className={`mt-3 p-3 rounded-xl text-sm ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}
          role="status"
          aria-live="polite"
        >
          {correct ? (
            <><span className="font-semibold">Correct!</span> Great work!</>
          ) : (
            <><span className="font-semibold">The answer is:</span> {answer}</>
          )}
        </div>
      )}
    </div>
  );
}
