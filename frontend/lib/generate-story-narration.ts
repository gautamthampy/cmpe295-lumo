import type { StoryNarrationResponse } from "./story-experience";

export async function generateStoryNarration(params: {
  transcript: string;
  voiceStyle: string;
}): Promise<StoryNarrationResponse> {
  const response = await fetch("/api/story-narration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Story narration failed with status ${response.status}`);
  }

  return (await response.json()) as StoryNarrationResponse;
}
