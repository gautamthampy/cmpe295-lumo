import type { LessonSpec } from "./lesson-spec";

export interface LearningCoachResponse {
  coachReply: string;
  nextStep: string;
  reflectionQuestion: string;
  blockedDirectAnswer: boolean;
  warnings: string[];
}

export async function getLearningCoachReply(params: {
  lesson: LessonSpec;
  studentMessage: string;
  mode?: "mission_help" | "worksheet_help";
}): Promise<LearningCoachResponse> {
  const response = await fetch("/api/story-studio/learning-coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lesson: params.lesson,
      studentMessage: params.studentMessage,
      mode: params.mode ?? "mission_help",
    }),
  });

  if (!response.ok) {
    throw new Error(`Learning coach failed with status ${response.status}`);
  }

  return (await response.json()) as LearningCoachResponse;
}