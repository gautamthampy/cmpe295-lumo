"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { INITIAL_PROGRESS } from "@/lib/story-studio/adaptation";
import {
  generateLessonSpec,
  type GenerateLessonResponse,
} from "@/lib/story-studio/generate-lesson-spec";
import type { ParentInput } from "@/lib/story-studio/lesson-spec";
import {
  clearStoryExperience,
  readGeneratedLesson,
  readStoredParentInput,
  readStoredSource,
  saveGeneratedLesson,
  saveStudentState,
} from "@/lib/story-studio/session-state";

import { GenerationStage } from "./generation-stage";
import { ParentPromptForm } from "./parent-prompt-form";

type StoredResult = Pick<GenerateLessonResponse, "lesson" | "source"> & {
  warnings: string[];
  errors: string[];
};

function formatMechanicLabel(mechanicId: string) {
  return mechanicId
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PortalStoryStudio() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<StoredResult | null>(null);
  const [lastInput, setLastInput] = useState<ParentInput | null>(null);

  useEffect(() => {
    const storedLesson = readGeneratedLesson();
    const storedInput = readStoredParentInput();
    const storedSource = readStoredSource();

    if (storedLesson && storedInput && storedSource) {
      setResult({
        lesson: storedLesson,
        source: storedSource,
        warnings: storedLesson.validationStatus.warnings,
        errors: [],
      });
      setLastInput(storedInput);
    }
  }, []);

  async function handleSubmit(input: ParentInput) {
    setIsLoading(true);
    setLastInput(input);

    try {
      const nextResult = await generateLessonSpec(input);
      saveGeneratedLesson({
        lesson: nextResult.lesson,
        parentInput: input,
        source: nextResult.source,
      });
      clearStoryExperience();
      saveStudentState({
        activeMechanicId: nextResult.lesson.mechanicId,
        progress: { ...INITIAL_PROGRESS },
        hintText: "",
        adaptationReason: "",
        eventLog: [],
        storyCompleted: false,
      });
      setResult(nextResult);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2.1rem] bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34%),radial-gradient(circle_at_bottom_right,#fef3c7,transparent_28%),linear-gradient(145deg,#ffffff,#f8fafc)] p-6 shadow-[0_20px_50px_rgba(36,28,12,0.06)] md:p-7">
        <p className="font-label text-xs font-bold uppercase tracking-[0.28em] text-outline">Custom Story Studio</p>
        <h2 className="mt-2 font-headline text-3xl font-extrabold tracking-[-0.04em] text-on-surface">
          Build a short lesson that feels made for one learner
        </h2>
        <p className="mt-3 max-w-3xl font-body text-base leading-7 text-on-surface-variant">
          Choose a district, topic, learner name, and preferred style. LUMO prepares a story
          opening, a playful mission, and a student preview the learner can open from this device
          right away.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-surface-container-lowest px-3 py-2 font-label text-xs font-bold uppercase tracking-[0.16em] text-primary shadow-sm">
            Short story opening
          </span>
          <span className="rounded-full bg-surface-container-lowest px-3 py-2 font-label text-xs font-bold uppercase tracking-[0.16em] text-primary shadow-sm">
            Interactive mission
          </span>
          <span className="rounded-full bg-surface-container-lowest px-3 py-2 font-label text-xs font-bold uppercase tracking-[0.16em] text-primary shadow-sm">
            Student preview
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ParentPromptForm isLoading={isLoading} onSubmit={(input) => void handleSubmit(input)} />

        <div className="space-y-4">
          {isLoading ? (
            <GenerationStage childName={lastInput?.childName ?? "your learner"} />
          ) : result ? (
            <section className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-[0_20px_50px_rgba(36,28,12,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-label text-xs font-bold uppercase tracking-[0.28em] text-outline">
                    Ready To Review
                  </p>
                  <h3 className="mt-2 font-headline text-3xl font-extrabold tracking-[-0.04em] text-on-surface">
                    {result.lesson.unitOrModule}
                  </h3>
                  <p className="mt-2 font-body text-sm leading-7 text-on-surface-variant">
                    {result.lesson.childName}&apos;s lesson is ready with a short story opening,
                    supportive hints, and a hands-on activity the student can try right away.
                  </p>
                </div>
                <span className="rounded-full bg-primary-fixed px-3 py-1 font-label text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {result.source === "live" ? "AI tailored" : "Backup lesson ready"}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                  <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-outline">Theme</p>
                  <p className="mt-2 font-headline text-xl font-extrabold text-on-surface">{result.lesson.theme}</p>
                </div>
                <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                  <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-outline">Play style</p>
                  <p className="mt-2 font-headline text-xl font-extrabold text-on-surface">
                    {formatMechanicLabel(result.lesson.mechanicId)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] bg-surface-container-low p-4">
                <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-outline">Next step</p>
                <p className="mt-2 font-body text-sm leading-7 text-on-surface-variant">
                  Open the preview in this browser to review it first, or hand the device to the
                  learner so they can sign in and launch it from the student dashboard.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/lessons/generated"
                    className="rounded-xl bg-primary px-4 py-3 font-label font-semibold text-on-primary transition-colors hover:bg-primary-container"
                  >
                    Open student preview
                  </Link>
                  <Link
                    href="/student-login"
                    className="rounded-xl bg-surface-container-lowest px-4 py-3 font-label font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
                  >
                    Open student sign-in
                  </Link>
                </div>
              </div>

              {result.warnings.length > 0 ? (
                <div className="mt-5 rounded-[1.5rem] bg-secondary-container px-4 py-4 text-sm text-on-secondary-container">
                  <p className="font-label text-xs font-bold uppercase tracking-[0.2em]">Preparation notes</p>
                  <ul className="mt-2 list-disc pl-5 font-body">
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.errors.length > 0 ? (
                <div className="mt-5 rounded-[1.5rem] bg-error-container px-4 py-4 text-sm text-on-error-container">
                  <p className="font-label text-xs font-bold uppercase tracking-[0.2em]">Needs attention</p>
                  <ul className="mt-2 list-disc pl-5 font-body">
                    {result.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-[0_20px_50px_rgba(36,28,12,0.05)]">
              <p className="font-label text-xs font-bold uppercase tracking-[0.28em] text-outline">Preview Panel</p>
              <h3 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">Your next lesson will appear here</h3>
              <p className="mt-3 font-body text-sm leading-7 text-on-surface-variant">
                Fill out the setup form to create a story mission. Once it is ready, you will see a
                summary and a button to open the student preview.
              </p>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}