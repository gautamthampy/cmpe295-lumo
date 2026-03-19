import { NextResponse } from "next/server";
import { LESSON_SPEC_SCHEMA, type LessonSpec } from "@/lib/lesson-spec";
import {
  readJsonCache,
  withInFlightDedup,
  writeJsonCache,
} from "@/lib/server/gemini-cache";
import {
  STORY_EXPERIENCE_RESPONSE_SCHEMA,
  STORY_PLAN_SCHEMA,
  buildNarrationTranscript,
  buildSeedStoryPlan,
  type StoryPlan,
} from "@/lib/story-experience";

export const runtime = "nodejs";

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
  cachedContentTokenCount?: number;
}

const STORY_PLAN_RESPONSE_SCHEMA = {
  type: "object",
  required: ["title", "introLine", "closingLine", "voiceStyle", "scenes"],
  properties: {
    title: { type: "string" },
    introLine: { type: "string" },
    closingLine: { type: "string" },
    voiceStyle: { type: "string" },
    scenes: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "title", "narration", "imagePrompt"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          narration: { type: "string" },
          imagePrompt: { type: "string" },
        },
      },
    },
  },
} as const;

function buildStoryCacheKey(lesson: LessonSpec) {
  return JSON.stringify({
    version: "story-experience-v2",
    district: lesson.district,
    subject: lesson.subject,
    curriculumCode: lesson.curriculumCode,
    unitOrModule: lesson.unitOrModule,
    conceptFamily: lesson.conceptFamily,
    theme: lesson.theme,
    childName: lesson.childName,
    mechanicId: lesson.mechanicId,
  });
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

function sanitizeModelJson(raw: string): string {
  let result = "";
  let inString = false;
  let isEscaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (isEscaped) {
      result += char;
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      isEscaped = true;
      continue;
    }

    if (char === '"') {
      result += char;
      inString = !inString;
      continue;
    }

    if (inString && (char === "\n" || char === "\r" || char === "\t")) {
      result += char === "\n" ? "\\n" : char === "\r" ? "\\r" : "\\t";
      continue;
    }

    result += char;
  }

  return result;
}

function buildStoryPlanPrompt(lesson: LessonSpec): string {
  return JSON.stringify({
    child: lesson.childName,
    unit: lesson.unitOrModule,
    concept: lesson.conceptFamily,
    mechanic: lesson.mechanicId,
    theme: lesson.theme,
    rules: {
      scenes: 2,
      totalNarrationWords: 95,
      noTextInImages: true,
      art: "polished 2d children educational game art",
      leadIntoGame: true,
    },
  });
}

async function generateStoryPlanWithGemini(
  lesson: LessonSpec
): Promise<{ plan: StoryPlan | null; error: string | null; usage: GeminiUsageMetadata | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { plan: null, error: "Missing GEMINI_API_KEY.", usage: null };

  const model =
    process.env.GEMINI_STORY_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
  const cacheKey = JSON.stringify({
    version: "story-plan-v2",
    model,
    prompt: buildStoryPlanPrompt(lesson),
  });
  const cachedPlan = await readJsonCache<StoryPlan>("story-plans", cacheKey);
  if (cachedPlan) {
    return { plan: cachedPlan, error: null, usage: null };
  }

  return withInFlightDedup("story-plans", cacheKey, async () => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "You are a children's storyboard planner for a Grade 2 educational game. Write vivid but concise story beats that are warm, visually rich, and safe for children. Return JSON only.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildStoryPlanPrompt(lesson) }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 700,
          responseMimeType: "application/json",
          responseSchema: STORY_PLAN_RESPONSE_SCHEMA,
          thinkingConfig: {
            thinkingLevel: "minimal",
          },
        },
      }),
    }
  );

  if (!response.ok) {
    return { plan: null, error: `Story planner HTTP ${response.status}.`, usage: null };
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: GeminiUsageMetadata;
  };
  const usage = payload.usageMetadata ?? null;
  const rawText =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";
  const jsonText = extractJsonObject(rawText) ?? rawText;
  if (!jsonText) {
    return { plan: null, error: "Story planner returned empty content.", usage };
  }

  try {
    const parsed = STORY_PLAN_SCHEMA.safeParse(JSON.parse(jsonText));
    if (parsed.success) {
      const plan = {
        ...parsed.data,
        scenes: parsed.data.scenes.slice(0, 2),
      };
      await writeJsonCache("story-plans", cacheKey, plan);
      return {
        plan,
        error: null,
        usage,
      };
    }
  } catch {
    try {
      const repaired = JSON.parse(sanitizeModelJson(jsonText));
      const parsed = STORY_PLAN_SCHEMA.safeParse(repaired);
      if (parsed.success) {
        const plan = {
          ...parsed.data,
          scenes: parsed.data.scenes.slice(0, 2),
        };
        await writeJsonCache("story-plans", cacheKey, plan);
        return {
          plan,
          error: null,
          usage,
        };
      }
    } catch {
      // Fall through to error below.
    }
  }

  return { plan: null, error: "Story planner returned malformed JSON.", usage };
  });
}

async function generateSceneImage(
  prompt: string
): Promise<{ imageDataUrl: string | null; error: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { imageDataUrl: null, error: "Missing GEMINI_API_KEY." };

  const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image-preview";
  const cacheKey = JSON.stringify({
    version: "story-image-v2",
    model,
    prompt,
    size: "512",
    aspectRatio: "16:9",
  });
  const cachedImage = await readJsonCache<{ imageDataUrl: string }>("story-images", cacheKey);
  if (cachedImage?.imageDataUrl) {
    return { imageDataUrl: cachedImage.imageDataUrl, error: null };
  }

  return withInFlightDedup("story-images", cacheKey, async () => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "512",
          },
          thinkingConfig: {
            thinkingLevel: "minimal",
          },
        },
      }),
    }
  );

  if (!response.ok) {
    return { imageDataUrl: null, error: `Image model HTTP ${response.status}.` };
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
        }>;
      };
    }>;
  };

  const imagePart = payload.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data
  );
  if (!imagePart?.inlineData?.data) {
    return { imageDataUrl: null, error: "Image model returned no image data." };
  }

  const mimeType = imagePart.inlineData.mimeType ?? "image/png";
  const imageDataUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`;
  await writeJsonCache("story-images", cacheKey, { imageDataUrl });
  return {
    imageDataUrl,
    error: null,
  };
  });
}

export async function POST(request: Request) {
  const rawBody = (await request.json()) as { lesson?: unknown };
  const parsedLesson = LESSON_SPEC_SCHEMA.safeParse(rawBody.lesson);

  if (!parsedLesson.success) {
    return NextResponse.json(
      {
        error: "Invalid lesson payload.",
        issues: parsedLesson.error.issues,
      },
      { status: 400 }
    );
  }

  const lesson = parsedLesson.data;
  const responseCacheKey = buildStoryCacheKey(lesson);
  const cachedResponse = await readJsonCache<unknown>("story-experiences", responseCacheKey);
  if (cachedResponse) {
    const parsedCachedResponse = STORY_EXPERIENCE_RESPONSE_SCHEMA.safeParse(cachedResponse);
    if (parsedCachedResponse.success) {
      return NextResponse.json(parsedCachedResponse.data);
    }
  }

  const warnings: string[] = [];
  const plannedStory = await generateStoryPlanWithGemini(lesson);
  const storyPlan = plannedStory.plan ?? buildSeedStoryPlan(lesson);
  const source = plannedStory.plan ? "live" : "seed";
  if (plannedStory.usage) {
    console.info("gemini:/api/story-experience:plan", plannedStory.usage);
  }
  if (plannedStory.error) {
    warnings.push(plannedStory.error);
  }
  if (plannedStory.usage?.promptTokenCount && plannedStory.usage.promptTokenCount > 500) {
    warnings.push(
      `Story planner exceeded target input budget (${plannedStory.usage.promptTokenCount} tokens).`
    );
  }

  const imageResults = await Promise.allSettled(
    storyPlan.scenes.map((scene) => generateSceneImage(scene.imagePrompt))
  );
  const scenes = storyPlan.scenes.map((scene, index) => {
    const result = imageResults[index];
    if (result.status === "fulfilled") {
      if (result.value.error) warnings.push(`${scene.title}: ${result.value.error}`);
      return { ...scene, imageDataUrl: result.value.imageDataUrl };
    }
    warnings.push(`${scene.title}: image generation failed.`);
    return { ...scene, imageDataUrl: null };
  });

  const narrationTranscript = buildNarrationTranscript(storyPlan);

  const payload = {
    story: {
      ...storyPlan,
      scenes,
    },
    narration: {
      transcript: narrationTranscript,
      audioDataUrl: null,
      provider: "deferred" as const,
      voiceName: null,
    },
    source,
    warnings,
  };

  const parsedPayload = STORY_EXPERIENCE_RESPONSE_SCHEMA.safeParse(payload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error: "Story experience response could not be validated.",
        issues: parsedPayload.error.issues,
      },
      { status: 500 }
    );
  }

  await writeJsonCache("story-experiences", responseCacheKey, parsedPayload.data);
  return NextResponse.json(parsedPayload.data);
}
