"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GenerationStage } from "@/components/GenerationStage";
import { ParentPromptForm } from "@/components/ParentPromptForm";
import { INITIAL_PROGRESS } from "@/lib/adaptation";
import { generateLessonSpec } from "@/lib/generate-lesson-spec";
import type { LessonSpec, ParentInput } from "@/lib/lesson-spec";
import {
  clearStoryExperience,
  readGeneratedLesson,
  readStoredParentInput,
  readStoredSource,
  saveGeneratedLesson,
  saveStudentState,
} from "@/lib/session-state";

export default function ParentPage() {
  const [parentInput, setParentInput] = useState<ParentInput | null>(null);
  const [lesson, setLesson] = useState<LessonSpec | null>(null);
  const [source, setSource] = useState<"live" | "seed" | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const hydrateTimeoutId = window.setTimeout(() => {
      const storedLesson = readGeneratedLesson();
      const storedParentInput = readStoredParentInput();
      const storedSource = readStoredSource();
      if (storedLesson) setLesson(storedLesson);
      if (storedParentInput) setParentInput(storedParentInput);
      if (storedSource) setSource(storedSource);
    }, 0);
    return () => window.clearTimeout(hydrateTimeoutId);
  }, []);

  async function handleGenerate(input: ParentInput) {
    setParentInput(input);
    setIsGenerating(true);
    clearStoryExperience();

    const payload = await generateLessonSpec(input);
    setLesson(payload.lesson);
    setSource(payload.source);
    setWarnings(payload.warnings);
    setIsGenerating(false);
    saveGeneratedLesson({
      lesson: payload.lesson,
      parentInput: input,
      source: payload.source,
    });
    saveStudentState({
      activeMechanicId: payload.lesson.mechanicId,
      progress: INITIAL_PROGRESS,
      hintText: "",
      adaptationReason: "",
      eventLog: [],
      storyCompleted: false,
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#c4b5fd,transparent_30%),radial-gradient(circle_at_92%_18%,#67e8f9,transparent_26%),radial-gradient(circle_at_82%_88%,#fde68a,transparent_22%),linear-gradient(152deg,#0f172a,#1e1b4b_42%,#1f2937)] px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <main className="mx-auto max-w-5xl space-y-4">
        <section className="space-y-4">
          <header className="relative overflow-hidden rounded-[2.2rem] border border-white/25 bg-white/10 p-6 shadow-[0_30px_90px_-42px_rgba(59,130,246,0.75)] backdrop-blur-md">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-cyan-300/35 blur-2xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-fuchsia-300/30 blur-2xl"
            />
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
              Lesson Studio
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-white">
              Generate the story, narration, and discovery game
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-200">
              Choose the unit, generate the lesson, and launch the student experience. This page
              is intentionally focused on creation, not analytics.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-200/40 bg-cyan-200/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
              AI lesson planner • multimodal story • discovery gameplay
            </div>
          </header>

          <ParentPromptForm isLoading={isGenerating} onSubmit={handleGenerate} />

          {isGenerating ? (
            <GenerationStage childName={parentInput?.childName ?? "Learner"} />
          ) : null}

          {!isGenerating && lesson ? (
            <section className="rounded-[2rem] border border-emerald-200/50 bg-white/90 p-5 text-slate-900 shadow-[0_22px_55px_-34px_rgba(16,185,129,0.45)]">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                Experience Ready
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Story + mission prepared</h2>
              <p className="mt-2 text-sm font-medium text-slate-700">
                <strong>{lesson.unitOrModule}</strong> ({lesson.district} - {lesson.subject})
              </p>
              <p className="mt-3 text-sm font-medium text-slate-700">
                The student flow opens with an illustrated story, offers optional narration, and
                then unlocks the discovery game.
              </p>
              <p className="mt-2 text-sm text-slate-700">{lesson.parentSummary}</p>
              <div className="mt-4 grid gap-3 rounded-[1.5rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-white/90 p-3 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    Source
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{source}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-white/90 p-3 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    Theme
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{lesson.theme}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-white/90 p-3 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    Discovery Focus
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {lesson.conceptFamily.replaceAll("_", " ")}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/student"
                  className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-sm transition hover:from-indigo-700 hover:to-cyan-700"
                >
                  Open Student Interface
                </Link>
                <button
                  type="button"
                  onClick={() => window.open("/student", "_blank")}
                  className="rounded-2xl border-2 border-indigo-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-wide text-indigo-700 transition hover:bg-indigo-50"
                >
                  Open Student in New Tab
                </button>
              </div>
            </section>
          ) : null}

          {!lesson && !isGenerating ? (
            <section className="rounded-[2rem] border border-white/25 bg-white/10 p-6 text-sm font-semibold text-slate-200 backdrop-blur-sm">
              Generate a lesson to build the storybook intro, narration, and student mission.
            </section>
          ) : null}

          {warnings.length > 0 ? (
            <section className="rounded-[2rem] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
                Generation Notes
              </p>
              <ul className="mt-2 list-disc pl-5">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </section>
      </main>
    </div>
  );
}
