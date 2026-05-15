import { NextResponse } from "next/server";
import { z } from "zod";

import { LESSON_SPEC_SCHEMA } from "@/lib/story-studio/lesson-spec";
import {
  readJsonCache,
  withInFlightDedup,
  writeJsonCache,
} from "@/lib/story-studio/server/gemini-cache";
import { getServerLlmProvider, ollamaGenerateText } from "@/lib/story-studio/server/llm-provider";
import { redactPii } from "@/lib/story-studio/server/pii-redaction";

export const runtime = "nodejs";

const QUIZ_OPTION_SCHEMA = z.object({
  option_id: z.string().min(1),
  option_text: z.string().min(1).max(400),
  is_distractor: z.boolean(),
  misconception_type: z.string().nullable().optional(),
});

const QUIZ_QUESTION_SCHEMA = z.object({
  question_id: z.string().min(1),
  question_text: z.string().min(1).max(500),
  options: z.array(QUIZ_OPTION_SCHEMA).min(2).max(6),
});

const HINT_REQUEST_SCHEMA = z.object({
  action: z.literal("hint"),
  lesson: LESSON_SPEC_SCHEMA,
  question: QUIZ_QUESTION_SCHEMA,
  hintLevel: z.number().int().min(1).max(3),
});

const EXPLANATION_REQUEST_SCHEMA = z.object({
  action: z.literal("explanation"),
  lesson: LESSON_SPEC_SCHEMA,
  question: QUIZ_QUESTION_SCHEMA,
  selectedAnswer: z.string().min(1).max(400),
  correctAnswer: z.string().min(1).max(400),
  misconceptionType: z.string().nullable().optional(),
});

const REQUEST_SCHEMA = z.discriminatedUnion("action", [
  HINT_REQUEST_SCHEMA,
  EXPLANATION_REQUEST_SCHEMA,
]);

const HINT_RESPONSE_SCHEMA = z.object({
  hint_text: z.string().min(1).max(260),
  hint_level: z.number().int().min(1).max(3),
  question_id: z.string().min(1),
  is_fallback: z.boolean().default(false),
});

const EXPLANATION_RESPONSE_SCHEMA = z.object({
  explanation: z.string().min(1).max(420),
  motivational_message: z.string().min(1).max(180),
  question_id: z.string().min(1),
  is_fallback: z.boolean().default(false),
});

const HINT_RESPONSE_GEMINI_SCHEMA = {
  type: "object",
  required: ["hint_text"],
  properties: {
    hint_text: { type: "string" },
  },
} as const;

const EXPLANATION_RESPONSE_GEMINI_SCHEMA = {
  type: "object",
  required: ["explanation", "motivational_message"],
  properties: {
    explanation: { type: "string" },
    motivational_message: { type: "string" },
  },
} as const;

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

type QuizFeedbackRequest = z.infer<typeof REQUEST_SCHEMA>;
type HintRequest = z.infer<typeof HINT_REQUEST_SCHEMA>;
type ExplanationRequest = z.infer<typeof EXPLANATION_REQUEST_SCHEMA>;
type HintResponse = z.infer<typeof HINT_RESPONSE_SCHEMA>;
type ExplanationResponse = z.infer<typeof EXPLANATION_RESPONSE_SCHEMA>;

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

function answerChoices(question: QuizFeedbackRequest["question"]) {
  return question.options.map((option) => option.option_text).join(" | ");
}

function buildHintPrompt(params: HintRequest) {
  return JSON.stringify({
    childName: redactPii(params.lesson.childName),
    gradeLevel: params.lesson.gradeLevel,
    subject: params.lesson.subject,
    unit: params.lesson.unitOrModule,
    concept: params.lesson.conceptFamily,
    lessonGoal: params.lesson.sceneSpec.title,
    helperText: params.lesson.sceneSpec.helperText,
    question: redactPii(params.question.question_text),
    answerChoices: redactPii(answerChoices(params.question)),
    hintLevel: params.hintLevel,
    rules: {
      role: "elementary Socratic tutor",
      level1: "Give a light clue and ask the student what they notice.",
      level2: "Point to the key concept without naming the answer.",
      level3: "Give a strong clue but still let the student choose.",
      doNotRevealCorrectAnswer: true,
      maxSentences: 2,
      tone: "warm, simple, encouraging",
    },
  });
}

function buildExplanationPrompt(params: ExplanationRequest) {
  return JSON.stringify({
    childName: redactPii(params.lesson.childName),
    gradeLevel: params.lesson.gradeLevel,
    subject: params.lesson.subject,
    unit: params.lesson.unitOrModule,
    concept: params.lesson.conceptFamily,
    lessonGoal: params.lesson.sceneSpec.title,
    helperText: params.lesson.sceneSpec.helperText,
    question: redactPii(params.question.question_text),
    answerChoices: redactPii(answerChoices(params.question)),
    selectedAnswer: redactPii(params.selectedAnswer),
    correctAnswer: redactPii(params.correctAnswer),
    misconceptionType: params.misconceptionType ?? null,
    rules: {
      role: "elementary quiz feedback tutor",
      explainSelectedAnswer: "Explain why the selected answer does not fit.",
      explainCorrectAnswer: "Explain why the correct answer fits.",
      motivationalMessage: "Add one short growth-mindset encouragement sentence.",
      maxExplanationSentences: 3,
      tone: "warm, simple, encouraging",
      avoidWords: ["stupid", "fail", "bad"],
    },
  });
}

function fallbackHint(params: HintRequest): HintResponse {
  const hints: Record<number, string> = {
    1: "Look closely at the question and the answer choices. Which choice matches the main idea from the mission?",
    2: `Think about ${params.lesson.sceneSpec.helperText}. Which answer connects best to that clue?`,
    3: "Try crossing out the choice that does not match the lesson, then pick the one that explains the idea best.",
  };

  return {
    hint_text: hints[params.hintLevel] ?? hints[1]!,
    hint_level: params.hintLevel,
    question_id: params.question.question_id,
    is_fallback: true,
  };
}

function fallbackExplanation(params: ExplanationRequest): ExplanationResponse {
  return {
    explanation: `The answer "${params.correctAnswer}" fits best because it matches the lesson idea from this mission. "${params.selectedAnswer}" does not match that idea as closely.`,
    motivational_message: "Nice effort. Each try helps your brain learn the pattern.",
    question_id: params.question.question_id,
    is_fallback: true,
  };
}

async function callGemini(params: {
  model: string;
  apiKey: string;
  system: string;
  prompt: string;
  responseSchema: typeof HINT_RESPONSE_GEMINI_SCHEMA | typeof EXPLANATION_RESPONSE_GEMINI_SCHEMA;
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": params.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: params.system }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: params.prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 800,
          responseMimeType: "application/json",
          responseSchema: params.responseSchema,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini quiz feedback failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: GeminiUsageMetadata;
  };

  if (payload.usageMetadata) {
    console.info("gemini:/api/story-studio/quiz-feedback", payload.usageMetadata);
  }

  const rawText =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";
  if (!rawText) {
    throw new Error("Gemini quiz feedback returned no text.");
  }

  return extractJsonObject(rawText) ?? rawText;
}

async function generateHint(params: HintRequest): Promise<HintResponse> {
  const provider = getServerLlmProvider();
  const geminiModel = process.env.GEMINI_FEEDBACK_MODEL ?? process.env.GEMINI_COACH_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const ollamaModel = process.env.OLLAMA_COACH_MODEL ?? process.env.OLLAMA_MODEL ?? "llama3.2";
  const prompt = buildHintPrompt(params);
  const cacheKey = JSON.stringify({
    version: "story-quiz-feedback-hint-v1",
    provider,
    model: provider === "ollama" ? ollamaModel : geminiModel,
    prompt,
  });

  const cached = await readJsonCache<unknown>("quiz-feedback", cacheKey);
  const parsedCached = HINT_RESPONSE_SCHEMA.safeParse(cached);
  if (parsedCached.success) {
    return parsedCached.data;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (provider !== "ollama" && !apiKey) {
    return fallbackHint(params);
  }

  return withInFlightDedup("quiz-feedback", cacheKey, async () => {
    try {
      const system = "You are a warm elementary Socratic tutor. Generate only JSON. Do not reveal final quiz answers in hints.";
      const jsonText =
        provider === "ollama"
          ? extractJsonObject(
              await ollamaGenerateText({
                system,
                prompt,
                temperature: 0.25,
                model: ollamaModel,
              })
            )
          : await callGemini({
              model: geminiModel,
              apiKey: apiKey!,
              system,
              prompt,
              responseSchema: HINT_RESPONSE_GEMINI_SCHEMA,
            });

      const parsed = HINT_RESPONSE_SCHEMA.safeParse({
        ...(JSON.parse(jsonText ?? "{}") as object),
        hint_level: params.hintLevel,
        question_id: params.question.question_id,
        is_fallback: false,
      });
      if (parsed.success) {
        await writeJsonCache("quiz-feedback", cacheKey, parsed.data);
        return parsed.data;
      }
    } catch {
      return fallbackHint(params);
    }

    return fallbackHint(params);
  });
}

async function generateExplanation(params: ExplanationRequest): Promise<ExplanationResponse> {
  const provider = getServerLlmProvider();
  const geminiModel = process.env.GEMINI_FEEDBACK_MODEL ?? process.env.GEMINI_COACH_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const ollamaModel = process.env.OLLAMA_COACH_MODEL ?? process.env.OLLAMA_MODEL ?? "llama3.2";
  const prompt = buildExplanationPrompt(params);
  const cacheKey = JSON.stringify({
    version: "story-quiz-feedback-explanation-v1",
    provider,
    model: provider === "ollama" ? ollamaModel : geminiModel,
    prompt,
  });

  const cached = await readJsonCache<unknown>("quiz-feedback", cacheKey);
  const parsedCached = EXPLANATION_RESPONSE_SCHEMA.safeParse(cached);
  if (parsedCached.success) {
    return parsedCached.data;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (provider !== "ollama" && !apiKey) {
    return fallbackExplanation(params);
  }

  return withInFlightDedup("quiz-feedback", cacheKey, async () => {
    try {
      const system = "You are a warm elementary quiz feedback tutor. Generate only JSON with a concise explanation and encouragement.";
      const jsonText =
        provider === "ollama"
          ? extractJsonObject(
              await ollamaGenerateText({
                system,
                prompt,
                temperature: 0.25,
                model: ollamaModel,
              })
            )
          : await callGemini({
              model: geminiModel,
              apiKey: apiKey!,
              system,
              prompt,
              responseSchema: EXPLANATION_RESPONSE_GEMINI_SCHEMA,
            });

      const parsed = EXPLANATION_RESPONSE_SCHEMA.safeParse({
        ...(JSON.parse(jsonText ?? "{}") as object),
        question_id: params.question.question_id,
        is_fallback: false,
      });
      if (parsed.success) {
        await writeJsonCache("quiz-feedback", cacheKey, parsed.data);
        return parsed.data;
      }
    } catch {
      return fallbackExplanation(params);
    }

    return fallbackExplanation(params);
  });
}

export async function POST(request: Request) {
  const parsedRequest = REQUEST_SCHEMA.safeParse(await request.json());
  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Invalid quiz feedback payload.",
        issues: parsedRequest.error.issues,
      },
      { status: 400 }
    );
  }

  const params = parsedRequest.data;
  if (params.action === "hint") {
    return NextResponse.json(await generateHint(params));
  }

  return NextResponse.json(await generateExplanation(params));
}
