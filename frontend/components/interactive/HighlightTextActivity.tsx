'use client';
import { useRef, useState } from 'react';
import type { HighlightTextActivity, ActivityResult } from '@/lib/types';

interface Props {
  activity: HighlightTextActivity;
  onResult: (r: ActivityResult) => void;
}

export default function HighlightTextActivity({ activity, onResult }: Props) {
  const { passage, targets, prompt } = activity.data;
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const startRef = useRef(Date.now());

  // Tokenise passage into words, preserving punctuation as separate tokens
  const tokens = passage.split(/(\s+)/).flatMap((t) =>
    t.match(/\s+/) ? [t] : t.split(/([^a-zA-Z'-]+)/).filter(Boolean)
  );

  function stripPunct(s: string) {
    return s.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
  }

  function toggleWord(word: string) {
    if (submitted) return;
    const key = stripPunct(word);
    if (!key) return;
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const targetSet = new Set(targets.map((t) => t.toLowerCase()));

  function handleSubmit() {
    if (submitted) return;
    const allFound = [...targetSet].every((t) => highlighted.has(t));
    const noFalsePositives = [...highlighted].every((h) => targetSet.has(h));
    const isCorrect = allFound && noFalsePositives;
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

  return (
    <div className="glass rounded-2xl p-6 my-4" role="group" aria-labelledby={`hl-instruction-${activity.id}`}>
      <p id={`hl-instruction-${activity.id}`} className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
        {activity.instruction}
      </p>
      <p className="text-sm text-slate-700 mb-1">{prompt}</p>
      <p className="text-xs text-slate-400 mb-5">Tap words to highlight them. Tap again to remove highlight.</p>

      <div className="text-base text-slate-800 leading-loose mb-5 p-4 bg-white/60 rounded-xl border border-white/30">
        {tokens.map((token, i) => {
          const key = stripPunct(token);
          if (!key || token.match(/^\s+$/)) return <span key={i}>{token}</span>;
          const isHighlighted = highlighted.has(key);
          const isTarget = targetSet.has(key);
          let cls = 'cursor-pointer rounded px-0.5 transition-all ';
          if (submitted) {
            if (isTarget && isHighlighted) cls += 'bg-emerald-200 text-emerald-900';
            else if (isTarget && !isHighlighted) cls += 'bg-amber-200 text-amber-900 underline decoration-wavy';
            else if (!isTarget && isHighlighted) cls += 'bg-red-200 text-red-900';
            else cls += '';
          } else {
            cls += isHighlighted ? 'bg-yellow-200 text-yellow-900' : 'hover:bg-slate-100';
          }
          return (
            <span key={i} onClick={() => toggleWord(token)}
              role="button" tabIndex={submitted ? -1 : 0}
              aria-pressed={isHighlighted}
              aria-label={`Word: ${token}${isHighlighted ? ', highlighted' : ''}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleWord(token); }}
              className={cls}>
              {token}
            </span>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 mb-3">
        Highlighted: {highlighted.size} word{highlighted.size !== 1 ? 's' : ''} · Target: {targets.length}
      </p>

      {!submitted && (
        <button onClick={handleSubmit} className="btn-primary px-5 py-2 rounded-xl text-sm">
          Check Highlights
        </button>
      )}

      {submitted && correct !== null && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
          role="status" aria-live="polite">
          {correct
            ? 'All correct! You found all the right words.'
            : `Not quite. Correct words: ${targets.join(', ')}. (Shown underlined above)`}
        </div>
      )}
    </div>
  );
}
