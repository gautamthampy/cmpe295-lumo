"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  INITIAL_PROGRESS,
  deriveAdaptation,
  updateProgress,
  type StudentProgress,
} from "@/lib/story-studio/adaptation";
import type { LessonSpec, TypedMechanicId } from "@/lib/story-studio/lesson-spec";
import {
  readGeneratedLesson,
  readStoredSource,
  readStudentState,
  saveStudentState,
} from "@/lib/story-studio/session-state";

import { LessonRenderer } from "./lesson-renderer";
import { StoryTheater } from "./story-theater";

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

export function GeneratedLessonPreview() {
  const router = useRouter();
  const missionSuccessRedirectRef = useRef(false);
  const [lesson, setLesson] = useState<LessonSpec | null>(null);
  const [source, setSource] = useState<"live" | "seed" | null>(null);
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

      setLesson(storedLesson);
      setSource(readStoredSource());

      if (storedLesson) {
        setActiveMechanicId(storedStudentState?.activeMechanicId ?? storedLesson.mechanicId);
      } else {
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

  useEffect(() => {
    missionSuccessRedirectRef.current = false;
  }, [lesson?.lessonId]);

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

  function handleInteraction(params: { correct: boolean; askedForHint?: boolean; event: string }) {
    if (!lesson) return;

    const nextProgress = updateProgress(progress, {
      correct: params.correct,
      askedForHint: params.askedForHint,
    });
    setProgress(nextProgress);

    const adaptation = deriveAdaptation(lesson, activeMechanicId, nextProgress);
    const nextMechanic = adaptation.shouldAdapt ? adaptation.nextMechanicId : activeMechanicId;
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

    if (
      params.correct &&
      params.event === "scene_choice_unlock" &&
      !missionSuccessRedirectRef.current
    ) {
      missionSuccessRedirectRef.current = true;
      window.setTimeout(() => {
        router.push("/learn");
      }, 1400);
    }
  }

  const learningLabel = lesson ? getLearningLabel(lesson) : "new ideas";

  if (!hasHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_12%_8%,#f0abfc,transparent_35%),radial-gradient(circle_at_88%_15%,#67e8f9,transparent_30%),radial-gradient(circle_at_85%_84%,#fde68a,transparent_30%),linear-gradient(145deg,#eef2ff,#e0f2fe_45%,#fef3c7)] px-4">
        <section className="w-full max-w-lg rounded-[2rem] border-4 border-cyan-200 bg-white/90 p-8 text-center shadow-[0_20px_45px_-24px_rgba(14,116,144,0.6)]">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-700">Loading Adventure</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">Building your mission board...</h1>
          <p className="mt-3 text-sm font-medium text-slate-600">We are getting your saved lesson ready.</p>
        </section>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_12%_8%,#f0abfc,transparent_35%),radial-gradient(circle_at_88%_15%,#67e8f9,transparent_30%),radial-gradient(circle_at_85%_84%,#fde68a,transparent_30%),linear-gradient(145deg,#eef2ff,#e0f2fe_45%,#fef3c7)] px-4">
        <section className="w-full max-w-2xl rounded-[2rem] border-4 border-cyan-200 bg-white/90 p-8 text-center shadow-[0_20px_45px_-24px_rgba(14,116,144,0.6)]">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-700">Generated Preview</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">No mission loaded yet</h1>
          <p className="mt-3 text-sm font-medium text-slate-600">
            No generated lesson was found in this browser. Open the portal to create one first, or head back to the student dashboard.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/learn"
              className="inline-block rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
            >
              Student dashboard
            </Link>
            <Link
              href="/portal"
              className="inline-block rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-indigo-700"
            >
              Open Story Studio
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_8%_8%,#f0abfc,transparent_36%),radial-gradient(circle_at_92%_12%,#67e8f9,transparent_32%),radial-gradient(circle_at_90%_90%,#fde68a,transparent_28%),linear-gradient(147deg,#eef2ff,#e0f2fe_45%,#fef3c7)] px-4 py-5 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="relative overflow-hidden rounded-[2.1rem] border-4 border-cyan-200/90 bg-white/85 p-5 shadow-[0_28px_70px_-34px_rgba(3,105,161,0.68)] sm:p-7">
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-700">Student Adventure Preview</p>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
                {lesson.childName}, explore, discover, and unlock surprising facts.
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {lesson.unitOrModule} • {lesson.district} • {lesson.subject}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/learn"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-700"
              >
                Student dashboard
              </Link>
              <Link
                href="/portal"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-700"
              >
                Back to portal
              </Link>
              <Link
                href="/lessons"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-700"
              >
                Lessons library
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">
              {source === "live" ? "Gemini generated" : "Seed fallback"}
            </span>
            <span className="rounded-full border border-fuchsia-300 bg-fuchsia-50 px-3 py-1 text-xs font-bold text-fuchsia-800">
              Discovering: {learningLabel}
            </span>
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              Story: {storyCompleted ? "mission ready" : "story first"}
            </span>
            {adaptationReason ? (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                {adaptationReason}
              </span>
            ) : null}
          </div>
        </header>

        <StoryTheater lesson={lesson} storyCompleted={storyCompleted} onUnlockMission={unlockMission} />

        {storyCompleted ? (
          <LessonRenderer lesson={lesson} hintText={hintText} onInteraction={handleInteraction} />
        ) : (
          <section className="rounded-[2rem] border-4 border-slate-200 bg-white/85 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">Mission Locked</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Finish story mode to open the hands-on challenge</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-700">
              The interactive game is ready next. Once the storybook finishes, the student can jump
              into the discovery game right away.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}