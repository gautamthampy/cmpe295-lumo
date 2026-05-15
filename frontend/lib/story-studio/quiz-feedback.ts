import type { ExplanationResponse, HintResponse } from "@/lib/feedback";
import type { LessonQuizQuestion } from "@/lib/lessons";
import type { LessonSpec } from "@/lib/story-studio/lesson-spec";

export async function requestStoryQuizHint(params: {
  lesson: LessonSpec;
  question: LessonQuizQuestion;
  hintLevel: number;
}): Promise<HintResponse> {
  const response = await fetch("/api/story-studio/quiz-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "hint",
      lesson: params.lesson,
      question: params.question,
      hintLevel: params.hintLevel,
    }),
  });

  if (!response.ok) {
    throw new Error(`Story quiz hint failed with status ${response.status}`);
  }

  return (await response.json()) as HintResponse;
}

export async function requestStoryQuizExplanation(params: {
  lesson: LessonSpec;
  question: LessonQuizQuestion;
  selectedAnswer: string;
  correctAnswer: string;
  misconceptionType?: string | null;
}): Promise<ExplanationResponse> {
  const response = await fetch("/api/story-studio/quiz-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "explanation",
      lesson: params.lesson,
      question: params.question,
      selectedAnswer: params.selectedAnswer,
      correctAnswer: params.correctAnswer,
      misconceptionType: params.misconceptionType ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Story quiz explanation failed with status ${response.status}`);
  }

  return (await response.json()) as ExplanationResponse;
}
