"use client";

import type { LessonSpec } from "@/lib/lesson-spec";
import { A2UIMissionDeck } from "./a2ui/A2UIMissionDeck";
import { SceneMissionPlayer } from "./games/SceneMissionPlayer";
import { AskLumoPanel } from "./sidekick/AskLumoPanel";

interface LessonRendererProps {
  lesson: LessonSpec;
  hintText: string;
  onInteraction: (params: { correct: boolean; askedForHint?: boolean; event: string }) => void;
}

export function LessonRenderer({
  lesson,
  hintText,
  onInteraction,
}: LessonRendererProps) {
  const introBlock = lesson.blocks.find((block) => block.type === "intro_card");
  const clueLine = introBlock?.prompt ?? lesson.sceneSpec.instruction;

  return (
    <section className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <A2UIMissionDeck lesson={lesson} clueLine={clueLine} />
        <AskLumoPanel key={lesson.lessonId} lesson={lesson} hintText={hintText} />
      </div>

      <SceneMissionPlayer lesson={lesson} onResult={onInteraction} />
    </section>
  );
}
