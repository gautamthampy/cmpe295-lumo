"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  INITIAL_PROGRESS,
  deriveAdaptation,
  updateProgress,
  type StudentProgress,
} from "@/lib/story-studio/adaptation";
import { createLearningSession, endLearningSession, ingestAnalyticsEvent } from "@/lib/analytics-api";
import { requestMotivation } from "@/lib/feedback";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { useTwoAttemptQuizController } from "@/lib/lesson-quiz-controller";
import type { LessonQuizPayload } from "@/lib/lessons";
import type { LessonSpec, TypedMechanicId } from "@/lib/story-studio/lesson-spec";
import { requestStoryQuizExplanation, requestStoryQuizHint } from "@/lib/story-studio/quiz-feedback";
import { generateStoryQuizLLM } from "@/lib/story-studio/story-quiz";
import {
  readGeneratedLesson,
  readStoredSource,
  readStudentState,
  saveStudentState,
} from "@/lib/story-studio/session-state";
import { useAuthStore } from "@/lib/store/auth";

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
  const userId = useAuthStore((state) => state.userId);
  const [lesson, setLesson] = useState<LessonSpec | null>(null);
  const [source, setSource] = useState<"live" | "seed" | null>(null);
  const [progress, setProgress] = useState<StudentProgress>(INITIAL_PROGRESS);
  const [activeMechanicId, setActiveMechanicId] = useState<TypedMechanicId>("sort_and_match");
  const [hintText, setHintText] = useState("");
  const [adaptationReason, setAdaptationReason] = useState("");
  const [hasHydrated, setHasHydrated] = useState(false);
  const [storyCompleted, setStoryCompleted] = useState(false);
  const [narrationCompleted, setNarrationCompleted] = useState(false);
  const [analyticsSessionId, setAnalyticsSessionId] = useState<string | null>(null);
  const analyticsSessionIdRef = useRef<string | null>(null);
  const [quizRunId, setQuizRunId] = useState<string | null>(null);
  const quizStartedAtRef = useRef<number | null>(null);
  const questionStartedAtRef = useRef<Record<string, number>>({});
  const answerSelectedAtRef = useRef<Record<string, number>>({});
  const [motivationMessage, setMotivationMessage] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explanationPending, setExplanationPending] = useState<string | null>(null);
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [hintLevels, setHintLevels] = useState<Record<string, number>>({});
  const [hintPending, setHintPending] = useState<string | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackHintLevel, setFeedbackHintLevel] = useState<number | undefined>(undefined);
  const [feedbackIsMotivation, setFeedbackIsMotivation] = useState(false);

  const newQuizRunId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const isUuid = (value: string | null | undefined): value is string => {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  };

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
        setNarrationCompleted(storedStudentState.narrationCompleted ?? false);
      } else {
        setProgress({ ...INITIAL_PROGRESS });
        setHintText("");
        setAdaptationReason("");
        setStoryCompleted(false);
        setNarrationCompleted(false);
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
    narrationCompleted: boolean;
    quizState: {
      attemptNumber: number;
      submitted: boolean;
      answers: Record<string, string>;
      quiz: LessonQuizPayload | null;
      retryQuiz: LessonQuizPayload | null;
      lastScore?: { score: number; total: number } | null;
    };
  }) {
    saveStudentState({
      progress: next.progress,
      activeMechanicId: next.activeMechanicId,
      hintText: next.hintText,
      adaptationReason: next.adaptationReason,
      eventLog: next.eventLog,
      storyCompleted: next.storyCompleted,
      narrationCompleted: next.narrationCompleted,
      quizState: next.quizState,
    });
  }

  const {
    quiz,
    quizAnswers,
    quizSubmitted,
    attemptNumber,
    retryQuiz,
    retryPending,
    lastScore,
    setQuizAnswers,
    startQuizAttempt,
    resetQuizState,
    restoreQuizState,
    submitQuiz,
    startRetryAttempt,
  } = useTwoAttemptQuizController({
    generateQuiz: async (attempt, excludeQuestionIds) => {
      if (!lesson) {
        throw new Error("Lesson is required to generate a quiz.");
      }
      return generateStoryQuizLLM(lesson, { attemptNumber: attempt, excludeQuestionIds });
    },
    onAttemptStart: () => {
      questionStartedAtRef.current = {};
      answerSelectedAtRef.current = {};
      quizStartedAtRef.current = Date.now();
      setQuizRunId(newQuizRunId());
      setMotivationMessage(null);
      setExplanations({});
      setHintLevels({});
    },
    onAttemptComplete: async (result) => {
      if (!lesson || !analyticsSessionId || !isUuid(userId)) {
        return;
      }

      const submitAt = Date.now();
      const elapsedMs = quizStartedAtRef.current ? Math.max(1, submitAt - quizStartedAtRef.current) : result.total * 2000;
      const orderedIds = result.quiz.questions.map((qu) => qu.question_id);

      for (let i = 0; i < result.quiz.questions.length; i++) {
        const qu = result.quiz.questions[i]!;
        const selectedAt = answerSelectedAtRef.current[qu.question_id] ?? submitAt;
        const startedAt = questionStartedAtRef.current[qu.question_id] ?? quizStartedAtRef.current ?? submitAt;
        const responseLatencyMs = Math.max(1, selectedAt - startedAt);
        let idleMs = 0;
        if (i === 0) {
          idleMs = Math.max(0, selectedAt - (quizStartedAtRef.current ?? selectedAt));
        } else {
          const prevId = orderedIds[i - 1]!;
          const prevAt = answerSelectedAtRef.current[prevId] ?? quizStartedAtRef.current ?? selectedAt;
          idleMs = Math.max(0, selectedAt - prevAt);
        }
        const correctOption = qu.options.find((opt) => !opt.is_distractor);
        const isCorrect = !!(correctOption && result.answers[qu.question_id] === correctOption.option_id);
        const chosen = qu.options.find((opt) => opt.option_id === result.answers[qu.question_id]);

        try {
          await ingestAnalyticsEvent({
            event_type: "question_answered",
            timestamp: new Date().toISOString(),
            user_id: userId,
            session_id: analyticsSessionId,
            data: {
              question_id: qu.question_id,
              answer: result.answers[qu.question_id] ?? "",
              is_correct: isCorrect,
              response_latency_ms: responseLatencyMs,
              idle_ms: idleMs,
              lesson_id: lesson.lessonId,
              misconception_type: chosen?.misconception_type ?? null,
              attempt_number: result.attemptNumber,
            },
          });
        } catch {
          /* ignore */
        }
      }

      try {
        await ingestAnalyticsEvent({
          event_type: "quiz_completed",
          timestamp: new Date().toISOString(),
          user_id: userId,
          session_id: analyticsSessionId,
          data: {
            quiz_id: quizRunId,
            score: result.score,
            total_questions: result.total,
            time_spent_ms: elapsedMs,
            lesson_id: lesson.lessonId,
            attempt_number: result.attemptNumber,
            lesson_title: lesson.unitOrModule,
            subject: lesson.subject,
          },
        });
      } catch {
        /* ignore */
      }
    },
  });

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
      narrationCompleted,
      quizState: {
        attemptNumber,
        submitted: quizSubmitted,
        answers: quizAnswers,
        quiz,
        retryQuiz,
        lastScore,
      },
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
      narrationCompleted,
      quizState: {
        attemptNumber,
        submitted: quizSubmitted,
        answers: quizAnswers,
        quiz,
        retryQuiz,
        lastScore,
      },
    });
  }

  useEffect(() => {
    if (!lesson) {
      return;
    }

    saveStudentState({
      progress,
      activeMechanicId,
      hintText,
      adaptationReason,
      eventLog: [],
      storyCompleted,
      narrationCompleted,
      quizState: {
        attemptNumber,
        submitted: quizSubmitted,
        answers: quizAnswers,
        quiz,
        retryQuiz,
        lastScore,
      },
    });
  }, [
    activeMechanicId,
    adaptationReason,
    attemptNumber,
    hintText,
    lastScore,
    lesson,
    narrationCompleted,
    progress,
    quiz,
    quizAnswers,
    quizSubmitted,
    retryQuiz,
    storyCompleted,
  ]);

  const learningLabel = lesson ? getLearningLabel(lesson) : "new ideas";

  useEffect(() => {
    if (!lesson || !isUuid(userId)) {
      return;
    }

    let active = true;
    createLearningSession(userId)
      .then((session) => {
        if (!active) {
          return;
        }
        analyticsSessionIdRef.current = session.session_id;
        setAnalyticsSessionId(session.session_id);
      })
      .catch(() => {
        if (active) {
          analyticsSessionIdRef.current = null;
          setAnalyticsSessionId(null);
        }
      });

    return () => {
      active = false;
      const sessionId = analyticsSessionIdRef.current;
      analyticsSessionIdRef.current = null;
      if (sessionId) {
        endLearningSession(sessionId).catch(() => {});
      }
      setAnalyticsSessionId(null);
    };
  }, [lesson, userId]);

  useEffect(() => {
    const storedState = readStudentState();
    if (!storedState?.quizState) {
      return;
    }

    restoreQuizState({
      quiz: (storedState.quizState.quiz as LessonQuizPayload | null) ?? null,
      attemptNumber: storedState.quizState.attemptNumber ?? 1,
      submitted: storedState.quizState.submitted ?? false,
      answers: storedState.quizState.answers ?? {},
      retryQuiz: (storedState.quizState.retryQuiz as LessonQuizPayload | null) ?? null,
      lastScore: storedState.quizState.lastScore ?? null,
    });
  }, [restoreQuizState]);

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

        <StoryTheater
          lesson={lesson}
          storyCompleted={storyCompleted}
          onUnlockMission={unlockMission}
          onNarrationComplete={() => setNarrationCompleted(true)}
        />

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

        {storyCompleted ? (
          <section className="rounded-[2rem] border-4 border-slate-200 bg-white/85 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">Quiz Time</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Check what you learned</h2>
            <p className="mt-2 text-sm font-medium text-slate-700">
              {narrationCompleted
                ? "Answer these six questions to finish the mission."
                : "Listen to the story narration before you begin the quiz."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!narrationCompleted || quizGenerating}
                onClick={async () => {
                  if (!lesson) return;
                  setQuizGenerating(true);
                  try {
                    const generated = await generateStoryQuizLLM(lesson, { attemptNumber: 1 });
                    startQuizAttempt(generated, 1);
                  } finally {
                    setQuizGenerating(false);
                  }
                }}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-wide text-white disabled:opacity-50"
              >
                {quizGenerating ? "Generating..." : "Start Quiz"}
              </button>
              <button
                type="button"
                onClick={() => resetQuizState()}
                className="rounded-2xl border-2 border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
              >
                Reset Quiz
              </button>
            </div>

            {quiz ? (
              <div className="mt-6 space-y-5">
                {quiz.questions.map((question, index) => {
                  const selectedOptionId = quizAnswers[question.question_id];
                  const correctOption = question.options.find((opt) => !opt.is_distractor);
                  const selectedOption = question.options.find((opt) => opt.option_id === selectedOptionId);
                  const isWrong = quizSubmitted && selectedOptionId && correctOption && selectedOptionId !== correctOption.option_id;

                  return (
                    <fieldset key={question.question_id} className="rounded-[1.5rem] bg-slate-50 p-5">
                      <legend className="text-sm font-black text-slate-900">{index + 1}. {question.question_text}</legend>
                      <div className="mt-3 space-y-2">
                        {question.options.map((option) => {
                          const selected = selectedOptionId === option.option_id;
                          const correct = !option.is_distractor;
                          return (
                            <label
                              key={option.option_id}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold ${
                                quizSubmitted && correct
                                  ? "bg-emerald-100 text-emerald-900"
                                  : quizSubmitted && selected && !correct
                                    ? "bg-rose-100 text-rose-900"
                                    : selected
                                      ? "bg-blue-100 text-blue-900"
                                      : "bg-white text-slate-900"
                              }`}
                            >
                              <input
                                type="radio"
                                name={question.question_id}
                                value={option.option_id}
                                checked={selected}
                                disabled={quizSubmitted}
                                onChange={() => {
                                  answerSelectedAtRef.current[question.question_id] = Date.now();
                                  if (!questionStartedAtRef.current[question.question_id]) {
                                    questionStartedAtRef.current[question.question_id] = Date.now();
                                  }
                                  setQuizAnswers((current) => ({
                                    ...current,
                                    [question.question_id]: option.option_id,
                                  }));
                                }}
                              />
                              <span>{option.option_text}</span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Hint button – available before submission, up to 3 levels */}
                      {!quizSubmitted && (hintLevels[question.question_id] ?? 1) <= 3 ? (
                        <button
                          type="button"
                          disabled={hintPending === question.question_id}
                          onClick={async () => {
                            const currentLevel = hintLevels[question.question_id] ?? 1;
                            if (currentLevel > 3) return;
                            setHintPending(question.question_id);
                            try {
                              const result = await requestStoryQuizHint({
                                lesson,
                                question,
                                hintLevel: currentLevel,
                              });
                              setHintLevels((prev) => ({ ...prev, [question.question_id]: Math.min(currentLevel + 1, 4) }));
                              setFeedbackTitle(`Hint (Level ${currentLevel})`);
                              setFeedbackContent(result.hint_text);
                              setFeedbackHintLevel(currentLevel);
                              setFeedbackIsMotivation(false);
                              setFeedbackModalOpen(true);
                            } finally {
                              setHintPending(null);
                            }
                          }}
                          className="mt-3 rounded-full bg-cyan-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-cyan-800"
                        >
                          {hintPending === question.question_id ? "Loading hint..." : `Get a Hint (${hintLevels[question.question_id] ?? 1}/3)`}
                        </button>
                      ) : null}

                      {isWrong ? (
                        <button
                          type="button"
                          disabled={explanationPending === question.question_id}
                          onClick={async () => {
                            setExplanationPending(question.question_id);
                            try {
                              const explanation = await requestStoryQuizExplanation({
                                lesson,
                                question,
                                selectedAnswer: selectedOption?.option_text ?? "",
                                correctAnswer: correctOption?.option_text ?? "",
                                misconceptionType: selectedOption?.misconception_type ?? null,
                              });
                              setExplanations((current) => ({
                                ...current,
                                [question.question_id]: `${explanation.explanation} ${explanation.motivational_message}`,
                              }));
                            } finally {
                              setExplanationPending(null);
                            }
                          }}
                          className="mt-3 rounded-full bg-amber-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-800"
                        >
                          {explanationPending === question.question_id ? "Loading..." : "Explain This"}
                        </button>
                      ) : null}

                      {explanations[question.question_id] ? (
                        <p className="mt-2 text-xs font-semibold text-slate-700">
                          {explanations[question.question_id]}
                        </p>
                      ) : null}
                    </fieldset>
                  );
                })}

                <button
                  type="button"
                  disabled={quizSubmitted || quiz.questions.some((q) => !quizAnswers[q.question_id])}
                  onClick={async () => {
                    const result = await submitQuiz();
                    if (result?.shouldRetry && lesson) {
                      try {
                        const motivation = await requestMotivation({
                          user_id: userId ?? "student",
                          session_id: analyticsSessionId ?? "session",
                          error_count: result.total - result.score,
                          question_context: lesson.subject,
                        });
                        setMotivationMessage(`You scored ${result.score} out of ${result.total}. ${motivation.message}`);
                      } catch {
                        setMotivationMessage(`You scored ${result.score} out of ${result.total}. Try a fresh quiz next.`);
                      }
                    }
                  }}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-wide text-white disabled:opacity-50"
                >
                  Submit Quiz
                </button>

                {quizSubmitted && lastScore ? (
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                    You scored {lastScore.score} out of {lastScore.total}.
                  </div>
                ) : null}

                {motivationMessage ? (
                  <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                    {motivationMessage}
                  </div>
                ) : null}

                {quizSubmitted && attemptNumber === 1 && lastScore?.score !== undefined && lastScore.score < 3 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={!retryQuiz || retryPending}
                      onClick={() => startRetryAttempt()}
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white disabled:opacity-50"
                    >
                      {retryPending ? "Preparing new quiz..." : "Start second quiz"}
                    </button>
                    <span className="text-xs font-semibold text-slate-600">Second attempt is final.</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Feedback Modal */}
        <FeedbackModal
          isOpen={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
          title={feedbackTitle}
          content={feedbackContent}
          hintLevel={feedbackHintLevel}
          isMotivation={feedbackIsMotivation}
        />
      </div>
    </main>
  );
}