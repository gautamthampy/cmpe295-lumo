import { getAlternateMechanic } from "./mechanic-catalog";
import type { LessonSpec, TypedMechanicId } from "./lesson-spec";

export interface StudentProgress {
  attempts: number;
  correct: number;
  incorrect: number;
  hintRequests: number;
  consecutiveIncorrect: number;
}

export interface AdaptationUpdate {
  shouldAdapt: boolean;
  nextMechanicId: TypedMechanicId;
  hintText: string;
  reason: string;
}

export const INITIAL_PROGRESS: StudentProgress = {
  attempts: 0,
  correct: 0,
  incorrect: 0,
  hintRequests: 0,
  consecutiveIncorrect: 0,
};

export function updateProgress(
  current: StudentProgress,
  params: { correct: boolean; askedForHint?: boolean }
): StudentProgress {
  return {
    attempts: current.attempts + 1,
    correct: current.correct + (params.correct ? 1 : 0),
    incorrect: current.incorrect + (params.correct ? 0 : 1),
    hintRequests: current.hintRequests + (params.askedForHint ? 1 : 0),
    consecutiveIncorrect: params.correct ? 0 : current.consecutiveIncorrect + 1,
  };
}

export function deriveAdaptation(
  lesson: LessonSpec,
  currentMechanicId: TypedMechanicId,
  progress: StudentProgress
): AdaptationUpdate {
  const shouldAdapt = progress.consecutiveIncorrect >= 2 || progress.hintRequests >= 2;

  if (!shouldAdapt) {
    return {
      shouldAdapt: false,
      nextMechanicId: currentMechanicId,
      hintText: "",
      reason: "No adaptation needed yet.",
    };
  }

  const nextMechanicId = getAlternateMechanic(currentMechanicId, lesson.conceptFamily);
  const hintText =
    lesson.hintLadder[Math.min(progress.consecutiveIncorrect, lesson.hintLadder.length - 1)]?.text ||
    "Let's try one easier example together.";
  const reason =
    nextMechanicId !== currentMechanicId
      ? "Switched to a clearer mechanic after repeated confusion."
      : "Kept mechanic and increased scaffold support.";

  return {
    shouldAdapt: true,
    nextMechanicId,
    hintText,
    reason,
  };
}