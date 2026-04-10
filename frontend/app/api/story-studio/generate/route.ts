import { NextResponse } from "next/server";

import { getCurriculumEntry } from "@/lib/story-studio/kindergarten-curriculum";
import {
  LESSON_SPEC_SCHEMA,
  PARENT_INPUT_SCHEMA,
  type LessonSpecDraft,
} from "@/lib/story-studio/lesson-spec";
import {
  PLANNER_SYSTEM_PROMPT,
  buildPlannerUserPrompt,
} from "@/lib/story-studio/planner-prompts";
import { buildSeedLesson } from "@/lib/story-studio/seed-lessons";
import {
  SCENE_SPEC_SCHEMA,
  buildSeedSceneSpec,
} from "@/lib/story-studio/scene-spec";
import {
  readJsonCache,
  withInFlightDedup,
  writeJsonCache,
} from "@/lib/story-studio/server/gemini-cache";
import { getServerLlmProvider, ollamaGenerateText } from "@/lib/story-studio/server/llm-provider";
import { validateLessonSpec } from "@/lib/story-studio/validate-lesson-spec";

export const runtime = "nodejs";

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
  cachedContentTokenCount?: number;
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

function parseModelJson<T>(rawText: string): T | null {
  const jsonText = extractJsonObject(rawText) ?? rawText;
  if (!jsonText) return null;

  try {
    return JSON.parse(jsonText) as T;
  } catch {
    try {
      return JSON.parse(sanitizeModelJson(jsonText)) as T;
    } catch {
      return null;
    }
  }
}

function buildSceneSpecPrompt(lesson: LessonSpecDraft): string {
  return JSON.stringify({
    child: lesson.childName,
    subject: lesson.subject,
    unit: lesson.unitOrModule,
    concept: lesson.conceptFamily,
    theme: lesson.theme,
    mechanic: lesson.mechanicId,
    rules: {
      returnJsonOnly: true,
      gameFeel: "play_first_discovery",
      noQuizLanguage: true,
      studentAge: "grade_2",
      outcomePattern: "action_visual_change_fact_unlock",
    },
  });
}

function normalizeDraft(
  draft: LessonSpecDraft,
  params: {
    district: "SJUSD" | "ESD";
    subject: "ela" | "math" | "science" | "social_studies";
    curriculumCode: string;
    childName: string;
    defaultUnit: string;
    defaultConceptFamily: LessonSpecDraft["conceptFamily"];
    defaultVocabulary: "low" | "medium";
    defaultMaxWords: number;
    defaultTheme: string;
    defaultMechanic: "count_and_compare" | "sort_and_match" | "predict_and_test";
    allowedMechanics: Array<"count_and_compare" | "sort_and_match" | "predict_and_test">;
  }
): LessonSpecDraft {
  const sourceDraft =
    draft && "lesson" in draft && typeof draft.lesson === "object"
      ? ((draft.lesson as LessonSpecDraft | undefined) ?? draft)
      : draft;
  const normalizedMechanic = params.allowedMechanics.includes(sourceDraft.mechanicId)
    ? sourceDraft.mechanicId
    : params.defaultMechanic;

  return {
    ...sourceDraft,
    lessonId: sourceDraft.lessonId ?? `live-${params.curriculumCode}-${Date.now()}`,
    gradeLevel: 2,
    district: params.district,
    subject: params.subject,
    curriculumCode: params.curriculumCode,
    unitOrModule: sourceDraft.unitOrModule ?? params.defaultUnit,
    conceptFamily: params.defaultConceptFamily,
    theme: sourceDraft.theme ?? params.defaultTheme,
    childName: params.childName,
    mechanicId: normalizedMechanic,
    difficultyBand: sourceDraft.difficultyBand ?? "core",
    vocabularyLevel: sourceDraft.vocabularyLevel ?? params.defaultVocabulary,
    maxWordsPerPrompt: sourceDraft.maxWordsPerPrompt ?? params.defaultMaxWords,
    misconceptionProbe:
      sourceDraft.misconceptionProbe ?? {
        signal: "confusion_on_core_concept",
        checkPrompt: "Tell me your thinking in one short sentence.",
        expectedConfusion: "mixing categories or steps",
      },
    blocks:
      sourceDraft.blocks?.map((block, index) => ({
        id: block.id ?? `block-${index + 1}`,
        type: block.type ?? "micro_explainer",
        title: block.title ?? "Learning Step",
        prompt: block.prompt ?? "Let's continue learning.",
        payload: block.payload ?? {},
      })) ?? [],
    sceneSpec: sourceDraft.sceneSpec,
    hintLadder:
      sourceDraft.hintLadder?.length
        ? sourceDraft.hintLadder
        : [
            { level: 1, strategy: "visual_cue", text: "Look at the visual clues first." },
            { level: 2, strategy: "guided_question", text: "Which key detail helps the most?" },
            {
              level: 3,
              strategy: "example_then_try",
              text: "Try one guided example, then your own.",
            },
          ],
    parentSummary:
      sourceDraft.parentSummary ??
      `${params.childName} practiced the target concept with guided supports.`,
    validationStatus: sourceDraft.validationStatus ?? {
      schemaValid: true,
      curriculumAligned: true,
      mechanicAllowed: true,
      assetRefsValid: true,
      moderationPassed: true,
      fallbackUsed: false,
      warnings: [],
    },
  };
}

async function generateWithOllamaPlanner(prompt: string): Promise<{
  draft: LessonSpecDraft | null;
  error: string | null;
  usage: GeminiUsageMetadata | null;
}> {
  try {
    const raw = await ollamaGenerateText({
      system: PLANNER_SYSTEM_PROMPT,
      prompt,
      temperature: 0,
      model: process.env.OLLAMA_PLANNER_MODEL ?? process.env.OLLAMA_MODEL,
    });
    const draft = parseModelJson<LessonSpecDraft>(raw);
    return {
      draft,
      error: draft ? null : "Ollama returned text that did not parse to a lesson JSON object.",
      usage: null,
    };
  } catch (error) {
    return {
      draft: null,
      error: error instanceof Error ? error.message : "Ollama lesson generation failed.",
      usage: null,
    };
  }
}

async function generateWithGemini(prompt: string): Promise<{
  draft: LessonSpecDraft | null;
  error: string | null;
  usage: GeminiUsageMetadata | null;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { draft: null, error: "Missing GEMINI_API_KEY.", usage: null };
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
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
          parts: [{ text: PLANNER_SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingLevel: "minimal",
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return {
      draft: null,
      error: `Gemini HTTP ${response.status}: ${errorText.slice(0, 300)}`,
      usage: null,
    };
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
    usageMetadata?: GeminiUsageMetadata;
  };
  const rawText =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  return {
    draft: parseModelJson<LessonSpecDraft>(rawText),
    error: rawText ? null : "Gemini returned empty candidate text.",
    usage: payload.usageMetadata ?? null,
  };
}

async function generatePlannerDraft(prompt: string): Promise<{
  draft: LessonSpecDraft | null;
  error: string | null;
  usage: GeminiUsageMetadata | null;
}> {
  if (getServerLlmProvider() === "ollama") {
    return generateWithOllamaPlanner(prompt);
  }
  return generateWithGemini(prompt);
}

const SCENE_SYSTEM_PROMPT =
  "You design one safe, playful grade-2 game scene spec. Return JSON only. Avoid quiz wording. The scene must teach through action, visual change, and a fact unlock.";

async function generateSceneSpecWithOllama(
  lesson: LessonSpecDraft
): Promise<{ sceneSpec: LessonSpecDraft["sceneSpec"] | null; error: string | null }> {
  const prompt = buildSceneSpecPrompt(lesson);
  const model = process.env.OLLAMA_SCENE_MODEL ?? process.env.OLLAMA_MODEL;
  const cacheKey = JSON.stringify({ version: "scene-spec-v1", provider: "ollama", model, prompt });
  const cached = await readJsonCache<unknown>("scene-specs", cacheKey);
  if (cached) {
    const parsedCached = SCENE_SPEC_SCHEMA.safeParse(cached);
    if (parsedCached.success) {
      return { sceneSpec: parsedCached.data, error: null };
    }
  }

  return withInFlightDedup("scene-specs", cacheKey, async () => {
    try {
      const raw = await ollamaGenerateText({
        system: SCENE_SYSTEM_PROMPT,
        prompt,
        temperature: 0.2,
        model,
      });
      const parsed = SCENE_SPEC_SCHEMA.safeParse(parseModelJson<unknown>(raw));
      if (!parsed.success) {
        return { sceneSpec: null, error: "Scene spec model returned invalid JSON." };
      }
      await writeJsonCache("scene-specs", cacheKey, parsed.data);
      return { sceneSpec: parsed.data, error: null };
    } catch {
      return { sceneSpec: null, error: "Ollama scene spec generation failed." };
    }
  });
}

async function generateSceneSpecWithGemini(
  lesson: LessonSpecDraft
): Promise<{ sceneSpec: LessonSpecDraft["sceneSpec"] | null; error: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { sceneSpec: null, error: "Missing GEMINI_API_KEY." };
  }

  const model = process.env.GEMINI_SCENE_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
  const prompt = buildSceneSpecPrompt(lesson);
  const cacheKey = JSON.stringify({ version: "scene-spec-v1", model, prompt });
  const cached = await readJsonCache<unknown>("scene-specs", cacheKey);

  if (cached) {
    const parsedCached = SCENE_SPEC_SCHEMA.safeParse(cached);
    if (parsedCached.success) {
      return { sceneSpec: parsedCached.data, error: null };
    }
  }

  return withInFlightDedup("scene-specs", cacheKey, async () => {
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
                text: SCENE_SYSTEM_PROMPT,
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 900,
            responseMimeType: "application/json",
            thinkingConfig: {
              thinkingLevel: "minimal",
            },
          },
        }),
      }
    );

    if (!response.ok) {
      return { sceneSpec: null, error: `Scene spec HTTP ${response.status}.` };
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const rawText =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";
    const parsed = SCENE_SPEC_SCHEMA.safeParse(parseModelJson<unknown>(rawText));

    if (!parsed.success) {
      return { sceneSpec: null, error: "Scene spec model returned invalid JSON." };
    }

    await writeJsonCache("scene-specs", cacheKey, parsed.data);
    return { sceneSpec: parsed.data, error: null };
  });
}

async function generateSceneSpec(
  lesson: LessonSpecDraft
): Promise<{ sceneSpec: LessonSpecDraft["sceneSpec"] | null; error: string | null }> {
  if (getServerLlmProvider() === "ollama") {
    return generateSceneSpecWithOllama(lesson);
  }
  return generateSceneSpecWithGemini(lesson);
}

export async function POST(request: Request) {
  const parsedInput = PARENT_INPUT_SCHEMA.safeParse(await request.json());

  if (!parsedInput.success) {
    return NextResponse.json(
      {
        error: "Invalid parent input payload.",
        issues: parsedInput.error.issues,
      },
      { status: 400 }
    );
  }

  const parentInput = parsedInput.data;
  const entry = getCurriculumEntry(parentInput.curriculumCode);
  const seeded = buildSeedLesson(parentInput);

  if (!entry) {
    return NextResponse.json({
      lesson: seeded,
      source: "seed",
      warnings: ["Unknown curriculum code. Seeded fallback used."],
      errors: ["Curriculum entry not found."],
    });
  }

  const prompt = buildPlannerUserPrompt(parentInput, entry);
  const lessonCacheKey = JSON.stringify({
    version: "lesson-live-v1",
    provider: getServerLlmProvider(),
    model:
      getServerLlmProvider() === "ollama"
        ? (process.env.OLLAMA_MODEL ?? "llama3.2")
        : (process.env.GEMINI_MODEL ?? "gemini-3-flash-preview"),
    prompt,
  });
  const cachedLiveResponse = await readJsonCache<unknown>("lessons-live", lessonCacheKey);

  if (cachedLiveResponse) {
    return NextResponse.json(cachedLiveResponse);
  }

  const generation = await generatePlannerDraft(prompt);
  const plannedDraft = generation.draft
    ? normalizeDraft(generation.draft, {
        district: parentInput.district,
        subject: parentInput.subject,
        curriculumCode: parentInput.curriculumCode,
        childName: parentInput.childName,
        defaultUnit: entry.title,
        defaultConceptFamily: entry.conceptFamily,
        defaultVocabulary: entry.vocabularyLevel,
        defaultMaxWords: entry.maxWordsPerPrompt,
        defaultTheme: parentInput.childInterests[0] ?? "learning",
        defaultMechanic: entry.allowedMechanics[0] ?? "count_and_compare",
        allowedMechanics: entry.allowedMechanics,
      })
    : null;

  if (!plannedDraft) {
    return NextResponse.json({
      lesson: seeded,
      source: "seed",
      warnings: [
        "Live model unavailable or invalid output. Seeded fallback used.",
        ...(generation.error ? [generation.error] : []),
      ],
      errors: generation.error ? [generation.error] : [],
    });
  }

  const sceneSpecGeneration = await generateSceneSpec(plannedDraft);
  const enrichedDraft: LessonSpecDraft = {
    ...plannedDraft,
    sceneSpec:
      sceneSpecGeneration.sceneSpec ??
      buildSeedSceneSpec({
        childName: plannedDraft.childName,
        subject: plannedDraft.subject,
        conceptFamily: plannedDraft.conceptFamily,
        theme: plannedDraft.theme,
      }),
  };

  const parsedLesson = LESSON_SPEC_SCHEMA.safeParse(enrichedDraft);
  if (!parsedLesson.success) {
    return NextResponse.json({
      lesson: seeded,
      source: "seed",
      warnings: [
        "Live model returned malformed lesson. Seeded fallback used.",
        ...(sceneSpecGeneration.error ? [sceneSpecGeneration.error] : []),
      ],
      errors: parsedLesson.error.issues.map((issue) => issue.message),
    });
  }

  const result = validateLessonSpec(parsedLesson.data, { source: "live" });
  if (!result.valid) {
    return NextResponse.json({
      lesson: seeded,
      source: "seed",
      warnings: [
        "Live lesson failed validation checks. Seeded fallback used.",
        ...(sceneSpecGeneration.error ? [sceneSpecGeneration.error] : []),
        ...result.warnings,
      ],
      errors: result.errors,
    });
  }

  const liveResponse = {
    lesson: result.lesson,
    source: "live",
    warnings: result.warnings,
    errors: [],
  };
  await writeJsonCache("lessons-live", lessonCacheKey, liveResponse);

  return NextResponse.json(liveResponse);
}