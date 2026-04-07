'use client';
import { useRef, useState } from 'react';
import type { WordBankActivity, ActivityResult } from '@/lib/types';

interface Props {
  activity: WordBankActivity;
  onResult: (r: ActivityResult) => void;
}

export default function WordBankActivity({ activity, onResult }: Props) {
  const { passage = '', bank = [], answers = [] } = activity.data ?? {};
  const parts = passage.split('___');
  const numBlanks = parts.length - 1;
  const [filled, setFilled] = useState<(string | null)[]>(Array(Math.max(numBlanks, 0)).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [selectedBlank, setSelectedBlank] = useState<number | null>(null);
  const startRef = useRef(Date.now());
  if (!activity.data?.passage) {
    return <div className="glass rounded-2xl p-6 my-4 text-sm text-slate-400">Invalid activity data.</div>;
  }

  const usedWords = new Set(filled.filter(Boolean) as string[]);

  function handleBankClick(word: string) {
    if (submitted) return;
    if (selectedBlank !== null) {
      const next = [...filled];
      // Return old word to bank
      next[selectedBlank] = word;
      setFilled(next);
      setSelectedBlank(null);
      setSelectedBank(null);
    } else {
      setSelectedBank(word === selectedBank ? null : word);
    }
  }

  function handleBlankClick(i: number) {
    if (submitted) return;
    if (selectedBank !== null) {
      const next = [...filled];
      next[i] = selectedBank;
      setFilled(next);
      setSelectedBank(null);
      // Clear old slot if moved from another blank
    } else if (filled[i]) {
      setSelectedBlank(i === selectedBlank ? null : i);
    }
  }

  const allFilled = filled.every(Boolean);

  function handleSubmit() {
    if (!allFilled || submitted) return;
    const isCorrect = filled.every((w, i) => w?.toLowerCase() === answers[i]?.toLowerCase());
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
    <div className="glass rounded-2xl p-6 my-4" role="group" aria-labelledby={`wb-instruction-${activity.id}`}>
      <p id={`wb-instruction-${activity.id}`} className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
        {activity.instruction}
      </p>
      <p className="text-xs text-slate-400 mb-4">Click a word from the bank, then click a blank to place it.</p>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2 mb-5 p-3 bg-white/40 rounded-xl border border-white/30">
        <p className="w-full text-xs font-semibold text-slate-500 mb-1">Word Bank:</p>
        {bank.map((word) => {
          const isUsed = usedWords.has(word);
          const isSelected = selectedBank === word;
          return (
            <button key={word} onClick={() => handleBankClick(word)}
              disabled={submitted || isUsed}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                isUsed ? 'opacity-30 cursor-default bg-slate-100 border-slate-200 text-slate-400'
                : isSelected ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                : 'bg-white/80 border-white/40 hover:border-indigo-300 text-slate-700'
              }`}
              aria-pressed={isSelected}
              aria-label={`Word: ${word}${isUsed ? ', used' : ''}`}>
              {word}
            </button>
          );
        })}
      </div>

      {/* Passage with blanks */}
      <div className="text-base text-slate-800 leading-loose mb-5">
        {parts.map((part, i) => (
          <span key={i}>
            <span>{part}</span>
            {i < parts.length - 1 && (
              <button
                onClick={() => handleBlankClick(i)}
                disabled={submitted}
                aria-label={`Blank ${i + 1}${filled[i] ? `: ${filled[i]}` : ', empty'}`}
                className={`inline-block min-w-[80px] mx-1 px-2 py-0.5 rounded border-b-2 font-bold text-center transition-all ${
                  submitted
                    ? filled[i]?.toLowerCase() === answers[i]?.toLowerCase()
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-red-500 bg-red-50 text-red-700'
                    : selectedBlank === i
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                    : filled[i]
                    ? 'border-blue-400 bg-blue-50 text-blue-800'
                    : 'border-slate-400 bg-transparent text-slate-400'
                }`}
              >
                {filled[i] ?? '_____'}
                {submitted && filled[i]?.toLowerCase() !== answers[i]?.toLowerCase() && (
                  <span className="block text-xs text-emerald-700 font-normal">{answers[i]}</span>
                )}
              </button>
            )}
          </span>
        ))}
      </div>

      {!submitted && (
        <button onClick={handleSubmit} disabled={!allFilled}
          className="btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-40">
          Check Answers
        </button>
      )}

      {submitted && correct !== null && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
          role="status" aria-live="polite">
          {correct ? 'All blanks correct!' : 'Some blanks were wrong — correct answers are shown above.'}
        </div>
      )}
    </div>
  );
}
