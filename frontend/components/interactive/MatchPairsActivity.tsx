'use client';
import { useRef, useState } from 'react';
import type { MatchPairsActivity, ActivityResult } from '@/lib/types';

interface Props {
  activity: MatchPairsActivity;
  onResult: (r: ActivityResult) => void;
}

export default function MatchPairsActivity({ activity, onResult }: Props) {
  const { pairs } = activity.data;
  // Shuffle right items
  const [rightItems] = useState<string[]>(() => [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5));
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, string>>({}); // leftIndex -> rightItem
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const startRef = useRef(Date.now());

  function handleLeftClick(i: number) {
    if (submitted) return;
    setSelectedLeft(i === selectedLeft ? null : i);
  }

  function handleRightClick(rightItem: string) {
    if (submitted || selectedLeft === null) return;
    setMatches((prev) => ({ ...prev, [selectedLeft]: rightItem }));
    setSelectedLeft(null);
  }

  const allMatched = Object.keys(matches).length === pairs.length;

  function handleSubmit() {
    if (!allMatched || submitted) return;
    const isCorrect = pairs.every((pair, i) => matches[i] === pair.right);
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

  const matchedRights = new Set(Object.values(matches));

  return (
    <div className="glass rounded-2xl p-6 my-4" role="group" aria-labelledby={`mp-instruction-${activity.id}`}>
      <p id={`mp-instruction-${activity.id}`} className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
        {activity.instruction}
      </p>
      <p className="text-xs text-slate-400 mb-4">Click a left item, then click its match on the right.</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Left column */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 mb-2">Items</p>
          {pairs.map((pair, i) => {
            const isSelected = selectedLeft === i;
            const isMatched = i in matches;
            const matchCorrect = submitted && matches[i] === pair.right;
            const matchWrong = submitted && isMatched && matches[i] !== pair.right;
            let cls = 'px-3 py-2 rounded-xl border-2 text-sm font-medium cursor-pointer transition-all text-center';
            if (submitted) {
              cls += matchCorrect ? ' bg-emerald-50 border-emerald-400 text-emerald-800'
                : matchWrong ? ' bg-red-50 border-red-400 text-red-700'
                : ' bg-slate-50 border-slate-200 text-slate-500';
            } else if (isSelected) {
              cls += ' bg-indigo-100 border-indigo-400 text-indigo-800';
            } else if (isMatched) {
              cls += ' bg-blue-50 border-blue-300 text-blue-700';
            } else {
              cls += ' bg-white/70 border-white/40 hover:border-indigo-300 text-slate-700';
            }
            return (
              <button key={i} onClick={() => handleLeftClick(i)} className={cls + ' w-full'}
                aria-pressed={isSelected} aria-label={`Left item: ${pair.left}${isMatched ? `, matched to ${matches[i]}` : ''}`}>
                {pair.left}
                {isMatched && !submitted && <span className="ml-1 text-blue-500">→ {matches[i]}</span>}
              </button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 mb-2">Matches</p>
          {rightItems.map((item) => {
            const isUsed = matchedRights.has(item) && !submitted;
            let cls = 'px-3 py-2 rounded-xl border-2 text-sm font-medium text-center transition-all';
            if (submitted) {
              const leftIdx = Object.entries(matches).find(([, v]) => v === item)?.[0];
              const correct = leftIdx !== undefined && pairs[Number(leftIdx)].right === item;
              cls += correct ? ' bg-emerald-50 border-emerald-400 text-emerald-800'
                : ' bg-red-50 border-red-400 text-red-700';
            } else if (isUsed) {
              cls += ' bg-blue-50 border-blue-200 text-blue-600 opacity-60 cursor-default';
            } else if (selectedLeft !== null) {
              cls += ' bg-white/70 border-indigo-200 hover:border-indigo-400 text-slate-700 cursor-pointer';
            } else {
              cls += ' bg-white/60 border-white/40 text-slate-600';
            }
            return (
              <button key={item} onClick={() => handleRightClick(item)}
                disabled={isUsed || submitted}
                className={cls + ' w-full'}
                aria-label={`Right item: ${item}${isUsed ? ', already matched' : ''}`}>
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {!submitted && (
        <button onClick={handleSubmit} disabled={!allMatched}
          className="btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-40">
          Check Matches
        </button>
      )}

      {submitted && correct !== null && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
          role="status" aria-live="polite">
          {correct ? 'All matches correct! Great job!' : 'Some matches were wrong. Check the highlighted items.'}
        </div>
      )}
    </div>
  );
}
