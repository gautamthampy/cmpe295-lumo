import type { LessonSpec } from "./lesson-spec";
import type { StoryExperienceResponse } from "./story-experience";

export async function generateStoryExperience(
  lesson: LessonSpec
): Promise<StoryExperienceResponse> {
  const response = await fetch("/api/story-experience", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lesson }),
  });

  if (!response.ok) {
    throw new Error(`Story generation failed with status ${response.status}`);
  }

  return (await response.json()) as StoryExperienceResponse;
}
