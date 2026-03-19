"use client";

import { useMemo, useState } from "react";

interface QuizBlockProps {
  title: string;
  prompt: string;
  choices: string[];
  answer: string;
  onResult: (params: { correct: boolean; askedForHint?: boolean; event: string }) => void;
}

export function QuizBlock({
  title,
  prompt,
  choices,
  answer,
  onResult,
}: QuizBlockProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [checked, setChecked] = useState(false);

  const isCorrect = useMemo(() => selected === answer, [selected, answer]);

  return (
    <article className="rounded-[1.6rem] border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-100 p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
        Checkpoint
      </p>
      <h3 className="mt-1 text-xl font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm font-medium text-slate-700">{prompt}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => {
              setSelected(choice);
              setChecked(false);
            }}
            className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold transition ${
              selected === choice
                ? "border-emerald-700 bg-emerald-200 text-emerald-900"
                : "border-emerald-300 bg-white text-slate-800 hover:bg-emerald-100"
            }`}
          >
            {choice}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setShowHint(true);
            onResult({ correct: false, askedForHint: true, event: "quiz_hint_requested" });
          }}
          className="rounded-xl border-2 border-emerald-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-800"
        >
          Need a hint
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => {
            setChecked(true);
            onResult({
              correct: isCorrect,
              event: isCorrect ? "quiz_correct" : "quiz_incorrect",
            });
          }}
          className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:bg-emerald-400"
        >
          Check answer
        </button>
      </div>

      {checked ? (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${
            isCorrect
              ? "bg-emerald-700 text-white"
              : "bg-rose-100 text-rose-800"
          }`}
        >
          {isCorrect ? "⭐ Great thinking! You got it right." : "Good try. Take another look and test again."}
        </p>
      ) : null}

      {showHint ? (
        <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-700">
          Hint: Try naming what the object needs or what it shows before choosing.
        </p>
      ) : null}
    </article>
  );
}
