import { NextResponse } from "next/server";

import { LESSON_SPEC_SCHEMA, type LessonSpec } from "@/lib/story-studio/lesson-spec";
import {
  readJsonCache,
  withInFlightDedup,
  writeJsonCache,
} from "@/lib/story-studio/server/gemini-cache";
import { getServerLlmProvider, ollamaGenerateText } from "@/lib/story-studio/server/llm-provider";
import { redactPii } from "@/lib/story-studio/server/pii-redaction";
import {
  STORY_EXPERIENCE_RESPONSE_SCHEMA,
  STORY_PLAN_SCHEMA,
  buildNarrationTranscript,
  buildSeedStoryPlan,
  type StoryPlan,
} from "@/lib/story-studio/story-experience";

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

const STORY_PLAN_FALLBACK_WARNING = "Live story planner unavailable. Using backup story scenes.";
const STORY_IMAGE_FALLBACK_WARNING = "Illustration unavailable. Showing placeholder art.";

function getStoryPlannerModel() {
  return process.env.GEMINI_STORY_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
}

function getStoryImageModel() {
  return process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image-preview";
}

async function getGeminiErrorDetail(response: Response): Promise<string | null> {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string; status?: string };
    };
    if (payload.error?.message) return payload.error.message;
    if (payload.error?.status) return payload.error.status;
  } catch {
    return null;
  }

  try {
    const text = (await response.text()).trim();
    return text || null;
  } catch {
    return null;
  }
}

function buildStoryCacheKey(lesson: LessonSpec) {
  return JSON.stringify({
    version: "story-experience-v2",
    llmProvider: getServerLlmProvider(),
    district: lesson.district,
    subject: lesson.subject,
    curriculumCode: lesson.curriculumCode,
    unitOrModule: lesson.unitOrModule,
    conceptFamily: lesson.conceptFamily,
    theme: lesson.theme,
    childName: redactPii(lesson.childName),
    mechanicId: lesson.mechanicId,
    storyModel:
      getServerLlmProvider() === "ollama"
        ? (process.env.OLLAMA_STORY_MODEL ?? process.env.OLLAMA_MODEL ?? "llama3.2")
        : getStoryPlannerModel(),
    imageModel: getStoryImageModel(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
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
    child: redactPii(lesson.childName),
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

const STORY_PLANNER_SYSTEM_TEXT =
  "You are a children's storyboard planner for a Grade 2 educational game. Write vivid but concise story beats that are warm, visually rich, and safe for children. Return JSON only.";

async function generateStoryPlanWithOllama(
  lesson: LessonSpec
): Promise<{ plan: StoryPlan | null; error: string | null; usage: GeminiUsageMetadata | null }> {
  const model = process.env.OLLAMA_STORY_MODEL ?? process.env.OLLAMA_MODEL ?? "llama3.2";
  const cacheKey = JSON.stringify({
    version: "story-plan-v1",
    provider: "ollama",
    model,
    prompt: buildStoryPlanPrompt(lesson),
  });
  const cachedPlan = await readJsonCache<StoryPlan>("story-plans", cacheKey);
  if (cachedPlan) {
    return { plan: cachedPlan, error: null, usage: null };
  }

  return withInFlightDedup("story-plans", cacheKey, async () => {
    let rawText: string;
    try {
      rawText = await ollamaGenerateText({
        system: STORY_PLANNER_SYSTEM_TEXT,
        prompt: buildStoryPlanPrompt(lesson),
        temperature: 0.3,
        model,
      });
    } catch (error) {
      console.warn("ollama:/api/story-studio/story-experience:plan:error", { model, error });
      return { plan: null, error: STORY_PLAN_FALLBACK_WARNING, usage: null };
    }

    const jsonText = extractJsonObject(rawText) ?? rawText;

    try {
      const parsed = STORY_PLAN_SCHEMA.safeParse(JSON.parse(jsonText));
      if (parsed.success) {
        const plan = { ...parsed.data, scenes: parsed.data.scenes.slice(0, 2) };
        await writeJsonCache("story-plans", cacheKey, plan);
        return { plan, error: null, usage: null };
      }
    } catch {
      try {
        const repaired = JSON.parse(sanitizeModelJson(jsonText));
        const parsed = STORY_PLAN_SCHEMA.safeParse(repaired);
        if (parsed.success) {
          const plan = { ...parsed.data, scenes: parsed.data.scenes.slice(0, 2) };
          await writeJsonCache("story-plans", cacheKey, plan);
          return { plan, error: null, usage: null };
        }
      } catch {
        return { plan: null, error: "Story planner returned malformed JSON.", usage: null };
      }
    }

    return { plan: null, error: "Story planner returned malformed JSON.", usage: null };
  });
}

async function generateStoryPlan(
  lesson: LessonSpec
): Promise<{ plan: StoryPlan | null; error: string | null; usage: GeminiUsageMetadata | null }> {
  if (getServerLlmProvider() === "ollama") {
    return generateStoryPlanWithOllama(lesson);
  }
  return generateStoryPlanWithGemini(lesson);
}

async function generateStoryPlanWithGemini(
  lesson: LessonSpec
): Promise<{ plan: StoryPlan | null; error: string | null; usage: GeminiUsageMetadata | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { plan: null, error: STORY_PLAN_FALLBACK_WARNING, usage: null };

  const model = getStoryPlannerModel();
  const cacheKey = JSON.stringify({
    version: "story-plan-v1",
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
                text: STORY_PLANNER_SYSTEM_TEXT,
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
      const detail = await getGeminiErrorDetail(response);
      console.warn("gemini:/api/story-studio/story-experience:plan:error", {
        model,
        status: response.status,
        detail,
      });
      return { plan: null, error: STORY_PLAN_FALLBACK_WARNING, usage: null };
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

    try {
      const parsed = STORY_PLAN_SCHEMA.safeParse(JSON.parse(jsonText));
      if (parsed.success) {
        const plan = { ...parsed.data, scenes: parsed.data.scenes.slice(0, 2) };
        await writeJsonCache("story-plans", cacheKey, plan);
        return { plan, error: null, usage };
      }
    } catch {
      try {
        const repaired = JSON.parse(sanitizeModelJson(jsonText));
        const parsed = STORY_PLAN_SCHEMA.safeParse(repaired);
        if (parsed.success) {
          const plan = { ...parsed.data, scenes: parsed.data.scenes.slice(0, 2) };
          await writeJsonCache("story-plans", cacheKey, plan);
          return { plan, error: null, usage };
        }
      } catch {
        return { plan: null, error: "Story planner returned malformed JSON.", usage };
      }
    }

    return { plan: null, error: "Story planner returned malformed JSON.", usage };
  });
}

async function generateSceneImage(prompt: string): Promise<{ imageDataUrl: string | null; error: string | null }> {
  if (getServerLlmProvider() === "ollama") {
    return { imageDataUrl: null, error: STORY_IMAGE_FALLBACK_WARNING };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { imageDataUrl: null, error: STORY_IMAGE_FALLBACK_WARNING };

  const model = getStoryImageModel();
  const cacheKey = JSON.stringify({ version: "story-image-v1", model, prompt });
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
      const detail = await getGeminiErrorDetail(response);
      console.warn("gemini:/api/story-studio/story-experience:image:error", {
        model,
        status: response.status,
        detail,
        promptPreview: prompt.slice(0, 140),
      });
      return { imageDataUrl: null, error: STORY_IMAGE_FALLBACK_WARNING };
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
    return { imageDataUrl, error: null };
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
  const plannedStory = await generateStoryPlan(lesson);
  const storyPlan = plannedStory.plan ?? buildSeedStoryPlan(lesson);
  const source = plannedStory.plan ? "live" : "seed";
  if (plannedStory.error) {
    warnings.push(plannedStory.error);
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

  const payload = {
    story: {
      ...storyPlan,
      scenes,
    },
    narration: {
      transcript: buildNarrationTranscript(storyPlan),
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

  const shouldCacheResponse = plannedStory.plan !== null && scenes.every((scene) => scene.imageDataUrl);
  if (shouldCacheResponse) {
    await writeJsonCache("story-experiences", responseCacheKey, parsedPayload.data);
  }

  return NextResponse.json(parsedPayload.data);
}