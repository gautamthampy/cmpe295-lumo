"use client";

import { useMemo, useState } from "react";

interface CountCompareGameProps {
  prompt: string;
  theme: string;
  onResult: (params: { correct: boolean; askedForHint?: boolean; event: string }) => void;
}

export function CountCompareGame({ prompt, theme, onResult }: CountCompareGameProps) {
  const [leftCount] = useState(3);
  const [rightCount] = useState(5);
  const [choice, setChoice] = useState<"left" | "right" | "same" | null>(null);

  const correct = useMemo(() => {
    if (leftCount === rightCount) return "same";
    return rightCount > leftCount ? "right" : "left";
  }, [leftCount, rightCount]);

  function renderIcons(total: number) {
    return Array.from({ length: total }).map((_, index) => (
      <span key={index} className="text-2xl">
        🌟
      </span>
    ));
  }

  return (
    <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <h3 className="text-lg font-semibold text-violet-900">Count and Compare</h3>
      <p className="mt-1 text-sm text-violet-900">{prompt}</p>
      <p className="text-xs text-violet-700">Theme token: {theme}</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-3 text-center">
          <p className="text-xs font-semibold text-slate-600">Group A</p>
          <div className="mt-2 flex flex-wrap justify-center gap-1">{renderIcons(leftCount)}</div>
        </div>
        <div className="rounded-xl bg-white p-3 text-center">
          <p className="text-xs font-semibold text-slate-600">Group B</p>
          <div className="mt-2 flex flex-wrap justify-center gap-1">{renderIcons(rightCount)}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setChoice("left")}
          className="rounded-lg border border-violet-300 bg-white px-3 py-1 text-sm"
        >
          Group A has more
        </button>
        <button
          type="button"
          onClick={() => setChoice("right")}
          className="rounded-lg border border-violet-300 bg-white px-3 py-1 text-sm"
        >
          Group B has more
        </button>
        <button
          type="button"
          onClick={() => setChoice("same")}
          className="rounded-lg border border-violet-300 bg-white px-3 py-1 text-sm"
        >
          They are the same
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onResult({ correct: false, askedForHint: true, event: "count_hint_requested" })}
          className="rounded-lg border border-violet-300 bg-white px-3 py-1 text-xs"
        >
          Hint
        </button>
        <button
          type="button"
          disabled={!choice}
          onClick={() =>
            onResult({
              correct: choice === correct,
              event: choice === correct ? "count_correct" : "count_incorrect",
            })
          }
          className="rounded-lg bg-violet-700 px-3 py-1 text-xs font-semibold text-white disabled:bg-violet-400"
        >
          Check
        </button>
      </div>
    </article>
  );
}
