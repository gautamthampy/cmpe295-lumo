"use client";

import { useState } from "react";

interface PushPullPredictGameProps {
  prompt: string;
  onResult: (params: { correct: boolean; askedForHint?: boolean; event: string }) => void;
}

export function PushPullPredictGame({
  prompt,
  onResult,
}: PushPullPredictGameProps) {
  const [choice, setChoice] = useState<"push" | "pull" | null>(null);
  const correctAnswer: "push" | "pull" = "pull";

  return (
    <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
      <h3 className="text-lg font-semibold text-rose-900">Predict and Test</h3>
      <p className="mt-1 text-sm text-rose-900">{prompt}</p>

      <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-900">
        A toy wagon is in front of you. You want it to come closer.
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setChoice("push")}
          className={`rounded-lg px-4 py-2 text-sm ${
            choice === "push" ? "bg-rose-700 text-white" : "bg-white text-rose-900"
          }`}
        >
          Push
        </button>
        <button
          type="button"
          onClick={() => setChoice("pull")}
          className={`rounded-lg px-4 py-2 text-sm ${
            choice === "pull" ? "bg-rose-700 text-white" : "bg-white text-rose-900"
          }`}
        >
          Pull
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onResult({ correct: false, askedForHint: true, event: "pushpull_hint_requested" })}
          className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs"
        >
          Hint
        </button>
        <button
          type="button"
          disabled={!choice}
          onClick={() =>
            onResult({
              correct: choice === correctAnswer,
              event: choice === correctAnswer ? "pushpull_correct" : "pushpull_incorrect",
            })
          }
          className="rounded-lg bg-rose-700 px-3 py-1 text-xs font-semibold text-white disabled:bg-rose-400"
        >
          Check
        </button>
      </div>
    </article>
  );
}
