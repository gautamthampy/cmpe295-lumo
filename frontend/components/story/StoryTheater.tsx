"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { generateStoryNarration } from "@/lib/generate-story-narration";
import { generateStoryExperience } from "@/lib/generate-story-experience";
import type { LessonSpec } from "@/lib/lesson-spec";
import { readStoryExperience, saveStoryExperience } from "@/lib/session-state";
import type { StoryExperienceResponse } from "@/lib/story-experience";

interface StoryTheaterProps {
  lesson: LessonSpec;
  storyCompleted: boolean;
  onUnlockMission: () => void;
}

type StoryStatus = "idle" | "loading" | "ready" | "error";

const loadingSteps = [
  "Writing a warm-up adventure for the learner",
  "Painting story scenes with Gemini image generation",
  "Saving the story so repeat plays open faster",
];

const placeholderEmojis = ["🗺️", "🌿", "⭐"];

export function StoryTheater({
  lesson,
  storyCompleted,
  onUnlockMission,
}: StoryTheaterProps) {
  const [status, setStatus] = useState<StoryStatus>("idle");
  const [experience, setExperience] = useState<StoryExperienceResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isNarrating, setIsNarrating] = useState(false);
  const [isNarrationLoading, setIsNarrationLoading] = useState(false);
  const [narrationFinished, setNarrationFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const audioElement = audioRef.current;
    return () => {
      audioElement?.pause();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const hydrateTimeoutId = window.setTimeout(() => {
      const cachedExperience = readStoryExperience(lesson.lessonId);
      if (!cachedExperience) {
        setExperience(null);
        setStatus("idle");
        return;
      }
      setExperience(cachedExperience);
      setStatus("ready");
    }, 0);
    return () => window.clearTimeout(hydrateTimeoutId);
  }, [lesson.lessonId]);

  async function handleBeginStory() {
    const cachedExperience = readStoryExperience(lesson.lessonId);
    if (cachedExperience) {
      setExperience(cachedExperience);
      setStatus("ready");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    setNarrationFinished(false);

    try {
      const nextExperience = await generateStoryExperience(lesson);
      setExperience(nextExperience);
      saveStoryExperience(lesson.lessonId, nextExperience);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Story mode could not be generated right now."
      );
    }
  }

  function handleAudioEnded() {
    setIsNarrating(false);
    setNarrationFinished(true);
  }

  async function handlePlayNarration() {
    if (!experience) return;
    let playableExperience = experience;

    if (
      !playableExperience.narration.audioDataUrl &&
      playableExperience.narration.provider === "deferred"
    ) {
      try {
        setIsNarrationLoading(true);
        const narration = await generateStoryNarration({
          transcript: playableExperience.narration.transcript,
          voiceStyle: playableExperience.story.voiceStyle,
        });
        playableExperience = {
          ...playableExperience,
          narration: {
            transcript: narration.transcript,
            audioDataUrl: narration.audioDataUrl,
            provider: narration.provider,
            voiceName: narration.voiceName,
          },
          warnings: [...playableExperience.warnings, ...narration.warnings],
        };
        setExperience(playableExperience);
        saveStoryExperience(lesson.lessonId, playableExperience);
      } catch {
        // Fall through to browser speech below.
      } finally {
        setIsNarrationLoading(false);
      }
    }

    if (playableExperience.narration.audioDataUrl) {
      try {
        setIsNarrating(true);
        setNarrationFinished(false);
        await audioRef.current?.play();
        return;
      } catch {
        setIsNarrating(false);
      }
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(playableExperience.narration.transcript);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.onend = () => {
        setIsNarrating(false);
        setNarrationFinished(true);
      };
      utterance.onerror = () => {
        setIsNarrating(false);
      };
      utteranceRef.current = utterance;
      setIsNarrating(true);
      setNarrationFinished(false);
      window.speechSynthesis.speak(utterance);
    }
  }

  function handleStopNarration() {
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsNarrating(false);
  }

  if (storyCompleted) {
    return (
      <section className="rounded-[2rem] border-4 border-emerald-200 bg-[radial-gradient(circle_at_10%_8%,#bbf7d0,transparent_30%),radial-gradient(circle_at_95%_85%,#bfdbfe,transparent_28%),linear-gradient(140deg,#ecfdf5,#f0fdfa)] p-5 shadow-[0_20px_50px_-28px_rgba(16,185,129,0.5)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
              Storybook Complete
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Mission unlocked and ready to play
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-700">
              The student can jump straight into the interactive challenge below.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePlayNarration}
            disabled={!experience || isNarrationLoading}
            className="rounded-2xl border-2 border-emerald-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-wide text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isNarrationLoading ? "Preparing narration..." : "Replay narration"}
          </button>
        </div>
        {experience?.narration.audioDataUrl ? (
          <audio
            ref={audioRef}
            src={experience.narration.audioDataUrl}
            onEnded={handleAudioEnded}
            className="mt-4 w-full"
            controls
          />
        ) : null}
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border-4 border-fuchsia-200 bg-[radial-gradient(circle_at_8%_8%,#fae8ff,transparent_28%),radial-gradient(circle_at_92%_12%,#bfdbfe,transparent_30%),radial-gradient(circle_at_90%_90%,#fde68a,transparent_25%),linear-gradient(145deg,#fff7ed,#ffffff_48%,#eef2ff)] p-5 shadow-[0_30px_80px_-40px_rgba(168,85,247,0.62)] sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 top-4 h-16 w-16 rounded-full bg-fuchsia-200/45 blur-xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 bottom-3 h-20 w-20 rounded-full bg-cyan-200/45 blur-xl"
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-fuchsia-700">
            Story Mode
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">
            AI storybook, narration, then the mission game
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
            Before the challenge begins, the app creates a short illustrated story to set the
            scene and get {lesson.childName} excited about the concept.
          </p>
        </div>
        <div className="rounded-2xl border-2 border-fuchsia-200 bg-white/90 px-4 py-3 text-sm shadow-sm">
          <p className="font-black uppercase tracking-[0.15em] text-fuchsia-700">Now building</p>
          <p className="mt-1 font-semibold text-slate-700">
            Story scenes + narration for {lesson.theme}
          </p>
        </div>
      </div>

      {status === "idle" ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[1.75rem] border-2 border-white/80 bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
              Adventure Brief
            </p>
            <h3 className="mt-2 text-2xl font-black text-slate-900">
              Start with a cinematic learning moment
            </h3>
            <p className="mt-3 text-sm font-medium text-slate-700">
              The story will use Gemini-generated story panels and spoken narration to introduce{" "}
              <strong>{lesson.unitOrModule}</strong> before the hands-on activity begins.
            </p>
            <p className="mt-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900">
              Narration audio is prepared only when play is pressed, so repeat demos cost less.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleBeginStory}
                className="rounded-2xl bg-fuchsia-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-fuchsia-700"
              >
                Begin Adventure Story
              </button>
              <button
                type="button"
                onClick={onUnlockMission}
                className="rounded-2xl border-2 border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
              >
                Skip to Game
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {["Meet the learners", "See the world", "Hear the guide"].map((label, index) => (
              <div
                key={label}
                className="rounded-[1.5rem] border-2 border-white/80 bg-white/70 p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-fuchsia-100 text-2xl">
                    {placeholderEmojis[index]}
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-900">{label}</p>
                    <p className="text-xs font-medium text-slate-600">
                      Designed to feel like a real kid-facing adventure, not a plain worksheet.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {status === "loading" ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.75rem] border-2 border-white/80 bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
              Story Engine
            </p>
            <h3 className="mt-2 text-2xl font-black text-slate-900">
              Painting the adventure in real time
            </h3>
            <div className="mt-4 grid gap-3">
              {loadingSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 px-3 py-3 text-sm font-semibold text-slate-700"
                >
                  <span
                    className="inline-block h-3 w-3 animate-pulse rounded-full bg-cyan-500"
                    style={{ animationDelay: `${index * 150}ms` }}
                  />
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[1.5rem] border-2 border-white/80 bg-white/70 p-3"
              >
                <div className="h-36 animate-pulse rounded-[1.1rem] bg-gradient-to-br from-cyan-100 via-fuchsia-100 to-amber-100" />
                <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-2 h-3 w-full animate-pulse rounded-full bg-slate-100" />
                <div className="mt-2 h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="mt-5 rounded-[1.75rem] border-2 border-rose-200 bg-rose-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-700">
            Story Mode Error
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">The adventure needs another try</h3>
          <p className="mt-2 text-sm font-medium text-slate-700">{errorMessage}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBeginStory}
              className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white"
            >
              Try story again
            </button>
            <button
              type="button"
              onClick={onUnlockMission}
              className="rounded-2xl border-2 border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
            >
              Continue to Game
            </button>
          </div>
        </div>
      ) : null}

      {status === "ready" && experience ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-[1.75rem] border-2 border-white/80 bg-white/85 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-700">
                  {experience.source === "live" ? "Live Story" : "Fallback Story"}
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  {experience.story.title}
                </h3>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  {experience.story.introLine}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={isNarrating ? handleStopNarration : handlePlayNarration}
                  disabled={isNarrationLoading}
                  className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isNarrationLoading
                    ? "Preparing Narration..."
                    : isNarrating
                      ? "Stop Narration"
                      : "Play Narration"}
                </button>
                <button
                  type="button"
                  onClick={onUnlockMission}
                  className="rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-wide text-slate-700"
                >
                  {narrationFinished ? "Continue to Mission" : "Skip to Mission"}
                </button>
              </div>
            </div>

            {experience.narration.audioDataUrl ? (
              <audio
                ref={audioRef}
                src={experience.narration.audioDataUrl}
                onEnded={handleAudioEnded}
                className="mt-4 w-full"
                controls
              />
            ) : null}

            {!experience.narration.audioDataUrl ? (
              <p className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-900">
                Tap play when you want voice. If no audio is ready, the browser can still read it
                aloud.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {experience.story.scenes.map((scene, index) => (
              <article
                key={scene.id}
                className="overflow-hidden rounded-[1.7rem] border-2 border-white/80 bg-white/85 shadow-[0_18px_40px_-24px_rgba(79,70,229,0.35)]"
              >
                {scene.imageDataUrl ? (
                  <Image
                    src={scene.imageDataUrl}
                    alt={scene.title}
                    width={1280}
                    height={720}
                    unoptimized
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center bg-gradient-to-br from-cyan-100 via-fuchsia-100 to-amber-100 text-6xl">
                    {placeholderEmojis[index % placeholderEmojis.length]}
                  </div>
                )}
                <div className="p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
                    Scene {index + 1}
                  </p>
                  <h4 className="mt-2 text-xl font-black text-slate-900">{scene.title}</h4>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                    {scene.narration}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-[1.75rem] border-2 border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">{experience.story.closingLine}</p>
          </div>

          {experience.warnings.length > 0 ? (
            <div className="rounded-[1.5rem] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-black uppercase tracking-[0.2em]">Experience notes</p>
              <ul className="mt-2 list-disc pl-5">
                {experience.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
