import { NextResponse } from "next/server";
import { getCurriculumEntry } from "@/lib/kindergarten-curriculum";
import {
  LESSON_SPEC_SCHEMA,
  PARENT_INPUT_SCHEMA,
  type LessonSpecDraft,
} from "@/lib/lesson-spec";
import { PLANNER_SYSTEM_PROMPT, buildPlannerUserPrompt } from "@/lib/planner-prompts";
import {
  readJsonCache,
  withInFlightDedup,
  writeJsonCache,
} from "@/lib/server/gemini-cache";
import { buildSeedLesson } from "@/lib/seed-lessons";
import {
  SCENE_SPEC_SCHEMA,
  buildSeedSceneSpec,
  type SceneSpec,
} from "@/lib/scene-spec";
import { validateLessonSpec } from "@/lib/validate-lesson-spec";

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

    if (inString) {
      if (char === "\n") {
        result += "\\n";
        continue;
      }
      if (char === "\r") {
        result += "\\r";
        continue;
      }
      if (char === "\t") {
        result += "\\t";
        continue;
      }
    }

    result += char;
  }

  return result;
}

const GEMINI_LESSON_RESPONSE_SCHEMA = {
  type: "object",
  required: [
    "unitOrModule",
    "conceptFamily",
    "theme",
    "mechanicId",
    "difficultyBand",
    "vocabularyLevel",
    "maxWordsPerPrompt",
    "misconceptionProbe",
    "blocks",
    "hintLadder",
    "parentSummary",
  ],
  properties: {
    lessonId: { type: "string" },
    gradeLevel: { type: "integer" },
    district: { type: "string", enum: ["SJUSD", "ESD"] },
    subject: { type: "string", enum: ["ela", "math", "science", "social_studies"] },
    curriculumCode: { type: "string" },
    unitOrModule: { type: "string" },
    conceptFamily: { type: "string" },
    theme: { type: "string" },
    childName: { type: "string" },
    mechanicId: {
      type: "string",
      enum: ["count_and_compare", "sort_and_match", "predict_and_test"],
    },
    difficultyBand: { type: "string", enum: ["support", "core", "stretch"] },
    vocabularyLevel: { type: "string", enum: ["low", "medium"] },
    maxWordsPerPrompt: { type: "integer" },
    misconceptionProbe: {
      type: "object",
      required: ["signal", "checkPrompt", "expectedConfusion"],
      properties: {
        signal: { type: "string" },
        checkPrompt: { type: "string" },
        expectedConfusion: { type: "string" },
      },
    },
    blocks: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "type", "title", "prompt", "payload"],
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: [
              "intro_card",
              "micro_explainer",
              "quiz_block",
              "mechanic_block",
              "hint_card",
              "parent_summary",
            ],
          },
          title: { type: "string" },
          prompt: { type: "string" },
          payload: { type: "object" },
        },
      },
    },
    hintLadder: {
      type: "array",
      items: {
        type: "object",
        required: ["level", "strategy", "text"],
        properties: {
          level: { type: "integer" },
          strategy: {
            type: "string",
            enum: ["visual_cue", "guided_question", "example_then_try"],
          },
          text: { type: "string" },
        },
      },
    },
    parentSummary: { type: "string" },
  },
} as const;

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
  const candidate = draft as LessonSpecDraft & { lesson?: LessonSpecDraft };
  const sourceDraft =
    candidate.lesson && typeof candidate.lesson === "object"
      ? candidate.lesson
      : candidate;

  const normalizedMechanic = params.allowedMechanics.includes(
    sourceDraft.mechanicId as "count_and_compare" | "sort_and_match" | "predict_and_test"
  )
    ? sourceDraft.mechanicId
    : params.defaultMechanic;
  const normalizedBlocks = Array.isArray(sourceDraft.blocks)
    ? sourceDraft.blocks.map((block, index) => {
        const normalizedType = block?.type ?? "micro_explainer";
        const basePayload =
          block?.payload && typeof block.payload === "object" && !Array.isArray(block.payload)
            ? block.payload
            : {};

        if (normalizedType === "quiz_block") {
          const choices = Array.isArray((basePayload as { choices?: unknown }).choices)
            ? ((basePayload as { choices: unknown[] }).choices.filter(
                (choice): choice is string => typeof choice === "string"
              ) as string[])
            : [];
          const answerFromPayload =
            typeof (basePayload as { answer?: unknown }).answer === "string"
              ? ((basePayload as { answer: string }).answer as string)
              : undefined;
          return {
            id: block?.id ?? `block-${index + 1}`,
            type: normalizedType,
            title: block?.title ?? "Quick Check",
            prompt: block?.prompt ?? "Choose the best answer.",
            payload: {
              choices: choices.length > 0 ? choices : ["Option A", "Option B", "Option C"],
              answer: answerFromPayload ?? choices[0] ?? "Option A",
            },
          };
        }

        if (normalizedType === "mechanic_block") {
          return {
            id: block?.id ?? `block-${index + 1}`,
            type: normalizedType,
            title: block?.title ?? "Try It",
            prompt: block?.prompt ?? "Let's try this interactive step.",
            payload: {
              mechanicId: normalizedMechanic,
            },
          };
        }

        return {
          id: block?.id ?? `block-${index + 1}`,
          type: normalizedType,
          title: block?.title ?? "Learning Step",
          prompt: block?.prompt ?? "Let's continue learning.",
          payload: basePayload,
        };
      })
    : [];
  const fallbackHints: LessonSpecDraft["hintLadder"] = [
    { level: 1, strategy: "visual_cue", text: "Look at the visual clues first." },
    { level: 2, strategy: "guided_question", text: "Which key detail helps the most?" },
    { level: 3, strategy: "example_then_try", text: "Try one guided example, then your own." },
  ];
  const normalizedHints =
    Array.isArray(sourceDraft.hintLadder) && sourceDraft.hintLadder.length > 0
      ? sourceDraft.hintLadder
      : fallbackHints;
  const normalizedProbe =
    sourceDraft.misconceptionProbe &&
    typeof sourceDraft.misconceptionProbe === "object" &&
    "signal" in sourceDraft.misconceptionProbe &&
    "checkPrompt" in sourceDraft.misconceptionProbe &&
    "expectedConfusion" in sourceDraft.misconceptionProbe
      ? sourceDraft.misconceptionProbe
      : {
          signal: "confusion_on_core_concept",
          checkPrompt: "Tell me your thinking in one short sentence.",
          expectedConfusion: "mixing categories or steps",
        };
  const normalizedSceneSpec = SCENE_SPEC_SCHEMA.safeParse(
    (sourceDraft as LessonSpecDraft & { sceneSpec?: unknown }).sceneSpec
  );

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
    misconceptionProbe: normalizedProbe,
    blocks: normalizedBlocks,
    sceneSpec:
      normalizedSceneSpec.success
        ? normalizedSceneSpec.data
        : buildSeedSceneSpec({
            childName: params.childName,
            subject: params.subject,
            conceptFamily: params.defaultConceptFamily,
            theme: sourceDraft.theme ?? params.defaultTheme,
          }),
    hintLadder: normalizedHints,
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

async function generateSceneSpecWithGemini(
  lesson: LessonSpecDraft
): Promise<{ sceneSpec: SceneSpec | null; error: string | null; usage: GeminiUsageMetadata | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { sceneSpec: null, error: "Missing GEMINI_API_KEY.", usage: null };

  const model = process.env.GEMINI_SCENE_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
  const prompt = buildSceneSpecPrompt(lesson);
  const cacheKey = JSON.stringify({
    version: "scene-spec-v1",
    model,
    prompt,
  });

  const cached = await readJsonCache<unknown>("scene-specs", cacheKey);
  if (cached) {
    const parsedCached = SCENE_SPEC_SCHEMA.safeParse(cached);
    if (parsedCached.success) {
      return { sceneSpec: parsedCached.data, error: null, usage: null };
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
                text:
                  "You design one safe, playful grade-2 game scene spec. Return JSON only. Avoid quiz wording. The scene must teach through action, visual change, and a fact unlock.",
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
      return { sceneSpec: null, error: `Scene spec HTTP ${response.status}.`, usage: null };
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
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
      return { sceneSpec: null, error: "Scene spec model returned empty content.", usage };
    }

    try {
      const parsed = SCENE_SPEC_SCHEMA.safeParse(JSON.parse(jsonText));
      if (parsed.success) {
        await writeJsonCache("scene-specs", cacheKey, parsed.data);
        return { sceneSpec: parsed.data, error: null, usage };
      }
    } catch {
      try {
        const repaired = JSON.parse(sanitizeModelJson(jsonText));
        const parsed = SCENE_SPEC_SCHEMA.safeParse(repaired);
        if (parsed.success) {
          await writeJsonCache("scene-specs", cacheKey, parsed.data);
          return { sceneSpec: parsed.data, error: null, usage };
        }
      } catch {
        // fall through
      }
    }

    return { sceneSpec: null, error: "Scene spec model returned invalid JSON.", usage };
  });
}

async function generateWithGemini(prompt: string): Promise<{
  draft: LessonSpecDraft | null;
  error: string | null;
  usage: GeminiUsageMetadata | null;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { draft: null, error: "Missing GEMINI_API_KEY.", usage: null };
  const model = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";

  const attempt = async (
    includeResponseSchema: boolean
  ): Promise<{ draft: LessonSpecDraft | null; error: string | null; usage: GeminiUsageMetadata | null }> => {
    const generationConfig: Record<string, unknown> = {
      temperature: 0,
      maxOutputTokens: 1200,
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingLevel: "minimal",
      },
    };
    if (includeResponseSchema) {
      generationConfig.responseSchema = GEMINI_LESSON_RESPONSE_SCHEMA;
    }

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
          generationConfig,
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
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
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
      return { draft: null, error: "Gemini returned empty candidate text.", usage };
    }

    try {
      return { draft: JSON.parse(jsonText) as LessonSpecDraft, error: null, usage };
    } catch {
      try {
        const repaired = sanitizeModelJson(jsonText);
        return { draft: JSON.parse(repaired) as LessonSpecDraft, error: null, usage };
      } catch {
        return {
          draft: null,
          error: `Gemini JSON parse failed. Raw snippet: ${jsonText.slice(0, 220)}`,
          usage,
        };
      }
    }
  };

  const strictAttempt = await attempt(true);
  if (strictAttempt.draft) {
    return strictAttempt;
  }

  const fallbackAttempt = await attempt(false);
  if (fallbackAttempt.draft) {
    return fallbackAttempt;
  }

  return {
    draft: null,
    error: `Schema attempt failed: ${strictAttempt.error ?? "unknown"}. Plain JSON retry failed: ${fallbackAttempt.error ?? "unknown"}.`,
    usage: strictAttempt.usage ?? fallbackAttempt.usage,
  };
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
    version: "lesson-live-v3",
    model: process.env.GEMINI_MODEL ?? "gemini-3-flash-preview",
    prompt,
  });
  const cachedLiveResponse = await readJsonCache<unknown>("lessons-live", lessonCacheKey);
  if (cachedLiveResponse) {
    return NextResponse.json(cachedLiveResponse);
  }
  const generation = await generateWithGemini(prompt);
  if (generation.usage) {
    console.info("gemini:/api/generate", generation.usage);
  }
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
        ...(generation.usage?.promptTokenCount && generation.usage.promptTokenCount > 700
          ? [`Planner prompt exceeded target input budget (${generation.usage.promptTokenCount} tokens).`]
          : []),
        ...(generation.error ? [generation.error] : []),
      ],
      errors: generation.error ? [generation.error] : [],
    });
  }

  const sceneSpecGeneration = await generateSceneSpecWithGemini(plannedDraft);
  if (sceneSpecGeneration.usage) {
    console.info("gemini:/api/generate:scene-spec", sceneSpecGeneration.usage);
  }
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
    const draftKeys =
      enrichedDraft && typeof enrichedDraft === "object"
        ? Object.keys(enrichedDraft).join(", ")
        : "non-object";
    return NextResponse.json({
      lesson: seeded,
      source: "seed",
      warnings: [
        "Live model returned malformed lesson. Seeded fallback used.",
        ...(sceneSpecGeneration.error ? [sceneSpecGeneration.error] : []),
      ],
      errors: [...parsedLesson.error.issues.map((issue) => issue.message), `Draft keys: ${draftKeys}`],
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
