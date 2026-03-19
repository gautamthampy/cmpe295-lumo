"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LessonRenderer } from "@/components/LessonRenderer";
import { StoryTheater } from "@/components/story/StoryTheater";
import { INITIAL_PROGRESS, deriveAdaptation, updateProgress, type StudentProgress } from "@/lib/adaptation";
import type { LessonSpec, TypedMechanicId } from "@/lib/lesson-spec";
import {
  readGeneratedLesson,
  readStudentState,
  saveStudentState,
} from "@/lib/session-state";

function getLearningLabel(lesson: LessonSpec) {
  if (
    lesson.conceptFamily === "habitats_and_survival" ||
    lesson.conceptFamily === "animal_discoveries"
  ) {
    return "animal body helpers";
  }
  if (
    lesson.conceptFamily === "past_and_present" ||
    lesson.conceptFamily === "changes_over_time"
  ) {
    return "then and now";
  }
  if (
    lesson.conceptFamily === "government_and_community" ||
    lesson.conceptFamily === "community_difference" ||
    lesson.conceptFamily === "buyers_and_sellers"
  ) {
    return "helpers in our town";
  }
  if (
    lesson.conceptFamily === "place_value_to_1000" ||
    lesson.conceptFamily === "compare_to_1000"
  ) {
    return "big numbers";
  }
  if (
    lesson.conceptFamily === "even_odd_arrays_equal_groups" ||
    lesson.conceptFamily === "addition_subtraction_20"
  ) {
    return "rows and groups";
  }
  if (lesson.conceptFamily === "states_of_matter") {
    return "how things change with heat";
  }
  if (
    lesson.conceptFamily === "earth_systems_wind_water" ||
    lesson.conceptFamily === "ecosystems_pollination_seed_dispersal"
  ) {
    return "water and land changes";
  }
  return lesson.subject;
}

export default function StudentPage() {
  const [lesson, setLesson] = useState<LessonSpec | null>(null);
  const [progress, setProgress] = useState<StudentProgress>(INITIAL_PROGRESS);
  const [activeMechanicId, setActiveMechanicId] = useState<TypedMechanicId>("sort_and_match");
  const [hintText, setHintText] = useState("");
  const [adaptationReason, setAdaptationReason] = useState("");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [storyCompleted, setStoryCompleted] = useState(false);

  useEffect(() => {
    function syncFromStorage() {
      const storedLesson = readGeneratedLesson();
      const storedStudentState = readStudentState();

      if (storedLesson) {
        setLesson(storedLesson);
        setActiveMechanicId(
          storedStudentState?.activeMechanicId ?? storedLesson.mechanicId
        );
      } else {
        setLesson(null);
        setActiveMechanicId("sort_and_match");
      }

      if (storedStudentState) {
        setProgress(storedStudentState.progress);
        setHintText(storedStudentState.hintText);
        setAdaptationReason(storedStudentState.adaptationReason);
        setStoryCompleted(storedStudentState.storyCompleted ?? false);
      } else {
        setProgress({ ...INITIAL_PROGRESS });
        setHintText("");
        setAdaptationReason("");
        setStoryCompleted(false);
      }
    }

    const hydrateTimeoutId = window.setTimeout(() => {
      syncFromStorage();
      setHasHydrated(true);
    }, 0);

    const handleFocus = () => syncFromStorage();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncFromStorage();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearTimeout(hydrateTimeoutId);
    };
  }, []);

  function persistState(next: {
    progress: StudentProgress;
    activeMechanicId: TypedMechanicId;
    hintText: string;
    adaptationReason: string;
    eventLog: string[];
    storyCompleted: boolean;
  }) {
    saveStudentState({
      progress: next.progress,
      activeMechanicId: next.activeMechanicId,
      hintText: next.hintText,
      adaptationReason: next.adaptationReason,
      eventLog: next.eventLog,
      storyCompleted: next.storyCompleted,
    });
  }

  function unlockMission() {
    if (!lesson || storyCompleted) return;
    setStoryCompleted(true);
    persistState({
      progress,
      activeMechanicId,
      hintText,
      adaptationReason,
      eventLog: [],
      storyCompleted: true,
    });
  }

  function handleInteraction(params: {
    correct: boolean;
    askedForHint?: boolean;
    event: string;
  }) {
    if (!lesson) return;

    const nextProgress = updateProgress(progress, {
      correct: params.correct,
      askedForHint: params.askedForHint,
    });
    setProgress(nextProgress);

    const adaptation = deriveAdaptation(lesson, activeMechanicId, nextProgress);
    const nextMechanic = adaptation.shouldAdapt
      ? adaptation.nextMechanicId
      : activeMechanicId;
    const nextHint = adaptation.shouldAdapt ? adaptation.hintText : hintText;
    const nextReason = adaptation.shouldAdapt ? adaptation.reason : adaptationReason;

    if (adaptation.shouldAdapt) {
      setActiveMechanicId(nextMechanic);
      setHintText(nextHint);
      setAdaptationReason(nextReason);
    }

    persistState({
      progress: nextProgress,
      activeMechanicId: nextMechanic,
      hintText: nextHint,
      adaptationReason: nextReason,
      eventLog: [],
      storyCompleted,
    });
  }

  const learningLabel = lesson ? getLearningLabel(lesson) : "new ideas";

  if (!hasHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_12%_8%,#f0abfc,transparent_35%),radial-gradient(circle_at_88%_15%,#67e8f9,transparent_30%),radial-gradient(circle_at_85%_84%,#fde68a,transparent_30%),linear-gradient(145deg,#eef2ff,#e0f2fe_45%,#fef3c7)] px-4">
        <section className="w-full max-w-lg rounded-[2rem] border-4 border-cyan-200 bg-white/90 p-8 text-center shadow-[0_20px_45px_-24px_rgba(14,116,144,0.6)]">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-700">
            Loading Adventure
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">Building your mission board...</h1>
          <p className="mt-3 text-sm font-medium text-slate-600">
            We are getting your saved lesson ready.
          </p>
        </section>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_12%_8%,#f0abfc,transparent_35%),radial-gradient(circle_at_88%_15%,#67e8f9,transparent_30%),radial-gradient(circle_at_85%_84%,#fde68a,transparent_30%),linear-gradient(145deg,#eef2ff,#e0f2fe_45%,#fef3c7)] px-4">
        <section className="w-full max-w-2xl rounded-[2rem] border-4 border-cyan-200 bg-white/90 p-8 text-center shadow-[0_20px_45px_-24px_rgba(14,116,144,0.6)]">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-700">
            Student Interface
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">No mission loaded yet</h1>
          <p className="mt-3 text-sm font-medium text-slate-600">
            No lesson found yet. Ask a parent to generate one first.
          </p>
          <Link
            href="/parent"
            className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-indigo-700"
          >
            Open Lesson Studio
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_8%_8%,#f0abfc,transparent_36%),radial-gradient(circle_at_92%_12%,#67e8f9,transparent_32%),radial-gradient(circle_at_90%_90%,#fde68a,transparent_28%),linear-gradient(147deg,#eef2ff,#e0f2fe_45%,#fef3c7)] px-4 py-5 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="relative overflow-hidden rounded-[2.1rem] border-4 border-cyan-200/90 bg-white/85 p-5 shadow-[0_28px_70px_-34px_rgba(3,105,161,0.68)] sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-200/50 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-fuchsia-200/55 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-[42%] top-4 h-16 w-16 animate-pulse rounded-full bg-amber-200/45 blur-2xl"
          />

          <div className="relative max-w-4xl">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-700">
                Student Adventure
              </p>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
                {lesson.childName}, explore, discover, and unlock surprising facts.
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {lesson.unitOrModule} • {lesson.district} • {lesson.subject}
              </p>
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">
              Play first
            </span>
            <span className="rounded-full border border-fuchsia-300 bg-fuchsia-50 px-3 py-1 text-xs font-bold text-fuchsia-800">
              Discovering: {learningLabel}
            </span>
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              Story: {storyCompleted ? "mission ready" : "story first"}
            </span>
          </div>
        </header>

        <StoryTheater
          lesson={lesson}
          storyCompleted={storyCompleted}
          onUnlockMission={unlockMission}
        />

        {storyCompleted ? (
          <LessonRenderer
            lesson={lesson}
            hintText={hintText}
            onInteraction={handleInteraction}
          />
        ) : (
          <section className="rounded-[2rem] border-4 border-slate-200 bg-white/85 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">
              Mission Locked
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              Finish story mode to open the hands-on challenge
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-700">
              The interactive game is ready next. Once the storybook finishes, the student can
              jump into the discovery game right away.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                "Animated story setup",
                "Narrated concept clues",
                "Playable mission game",
              ].map((label, index) => (
                <div
                  key={label}
                  className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700"
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Step {index + 1}
                  </p>
                  <p className="mt-2">{label}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
