"use client";

import { Sparkles } from "lucide-react";

import type { LessonSpec } from "@/lib/story-studio/lesson-spec";

import { AskLumoPanel } from "./ask-lumo-panel";
import { SceneMissionPlayer } from "./scene-mission-player";

interface LessonRendererProps {
  lesson: LessonSpec;
  hintText: string;
  onInteraction: (params: { correct: boolean; askedForHint?: boolean; event: string }) => void;
}

export function LessonRenderer({ lesson, hintText, onInteraction }: LessonRendererProps) {
  const introBlock = lesson.blocks.find((block) => block.type === "intro_card");
  const explainerBlock = lesson.blocks.find((block) => block.type === "micro_explainer");

  return (
    <section className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-[2rem] border-2 border-white/80 bg-white/88 p-5 shadow-[0_20px_40px_rgba(36,28,12,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Mission Deck</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">{lesson.sceneSpec.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
                {introBlock?.prompt ?? lesson.sceneSpec.instruction}
              </p>
            </div>
            <div className="rounded-full bg-fuchsia-100 p-3 text-fuchsia-700">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-cyan-100 bg-cyan-50/80 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Big Idea</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {explainerBlock?.prompt ?? lesson.sceneSpec.helperText}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/80 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Fact to Unlock</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">{lesson.sceneSpec.rewardFact}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-700">
              {lesson.subject}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-amber-800">
              {lesson.theme}
            </span>
            <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-fuchsia-800">
              {lesson.mechanicId.replaceAll("_", " ")}
            </span>
          </div>
        </section>

        <AskLumoPanel key={lesson.lessonId} lesson={lesson} hintText={hintText} />
      </div>

      <SceneMissionPlayer lesson={lesson} onResult={onInteraction} />
    </section>
  );
}