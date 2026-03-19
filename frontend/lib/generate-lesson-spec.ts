import type { LessonSpec, ParentInput } from "./lesson-spec";
import { buildSeedLesson } from "./seed-lessons";

export interface GenerateLessonResponse {
  lesson: LessonSpec;
  source: "live" | "seed";
  warnings: string[];
  errors: string[];
}

export async function generateLessonSpec(
  input: ParentInput
): Promise<GenerateLessonResponse> {
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Generation request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as GenerateLessonResponse;
    return payload;
  } catch {
    return {
      lesson: buildSeedLesson(input),
      source: "seed",
      warnings: ["API unavailable. Using seeded lesson."],
      errors: [],
    };
  }
}
