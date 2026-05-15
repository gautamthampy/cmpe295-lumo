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

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

const REQUEST_SCHEMA = z.object({
  lesson: LESSON_SPEC_SCHEMA,
  studentMessage: z.string().min(1).max(280),
  mode: z.enum(["mission_help", "worksheet_help"]).default("mission_help"),
});

const RESPONSE_SCHEMA = z.object({
  coachReply: z.string().min(1).max(220),
  nextStep: z.string().min(1).max(160),
  reflectionQuestion: z.string().min(1).max(160),
  blockedDirectAnswer: z.boolean(),
  warnings: z.array(z.string()),
});

const COACH_RESPONSE_SCHEMA = {
  type: "object",
  required: ["coachReply", "nextStep", "reflectionQuestion", "blockedDirectAnswer"],
  properties: {
    coachReply: { type: "string" },
    nextStep: { type: "string" },
    reflectionQuestion: { type: "string" },
    blockedDirectAnswer: { type: "boolean" },
  },
} as const;

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return raw.slice(start, end + 1);
}

function buildPrompt(params: z.infer<typeof REQUEST_SCHEMA>) {
  return JSON.stringify({
    childName: redactPii(params.lesson.childName),
    gradeLevel: params.lesson.gradeLevel,
    unit: params.lesson.unitOrModule,
    subject: params.lesson.subject,
    concept: params.lesson.conceptFamily,
    mode: params.mode,
    studentMessage: redactPii(params.studentMessage),
    rules: {
      doNotGiveFinalAnswer: true,
      keepVocabularyYoung: true,
      maxSentencesPerField: 2,
      style: "warm_socatic_coach",
    },
  });
}

function buildOfflineCoach(
  studentMessage: string,
  childName: string
): z.infer<typeof RESPONSE_SCHEMA> {
  const safeChildName = redactPii(childName);
  const lower = studentMessage.toLowerCase();
  const asksForAnswer =
    lower.includes("answer") ||
    lower.includes("just tell me") ||
    lower.includes("what is the exact") ||
    lower.includes("write it for me");

  if (asksForAnswer) {
    return {
      coachReply: `I will not give the final answer, ${safeChildName}, but I can help you think it through one clue at a time.`,
      nextStep: "Underline two key words in the question and tell what each word is asking you to find.",
      reflectionQuestion: "Which clue in the question gives you the strongest hint?",
      blockedDirectAnswer: true,
      warnings: ["Coach used offline guidance because live model was unavailable."],
    };
  }

  return {
    coachReply: `Great effort, ${safeChildName}. Let's solve this by steps so your brain does the hard work.`,
    nextStep: "Say what you already know, then choose one tiny step you can test right now.",
    reflectionQuestion: "After that step, what changed and what does it tell you?",
    blockedDirectAnswer: false,
    warnings: ["Coach used offline guidance because live model was unavailable."],
  };
}

export async function POST(request: Request) {
  const parsedRequest = REQUEST_SCHEMA.safeParse(await request.json());
  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Invalid learning coach payload.",
        issues: parsedRequest.error.issues,
      },
      { status: 400 }
    );
  }

  const params = parsedRequest.data;
  const provider = getServerLlmProvider();
  const geminiModel = process.env.GEMINI_COACH_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
  const ollamaModel = process.env.OLLAMA_COACH_MODEL ?? process.env.OLLAMA_MODEL ?? "llama3.2";
  const cacheKey = JSON.stringify({
    version: "learning-coach-v2",
    provider,
    model: provider === "ollama" ? ollamaModel : geminiModel,
    prompt: buildPrompt(params),
  });

  const cached = await readJsonCache<unknown>("learning-coach", cacheKey);
  if (cached) {
    const parsedCached = RESPONSE_SCHEMA.safeParse(cached);
    if (parsedCached.success) {
      return NextResponse.json(parsedCached.data);
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (provider !== "ollama" && !apiKey) {
    return NextResponse.json(buildOfflineCoach(params.studentMessage, params.lesson.childName));
  }

  const result = await withInFlightDedup("learning-coach", cacheKey, async () => {
    if (provider === "ollama") {
      const system =
        "You are an elementary Socratic tutor. Never give final answers, completed worksheet responses, or copyable submission text. Instead guide the student to discover the answer. Be warm and concise. Use child-friendly language. Respond with JSON only matching: coachReply, nextStep, reflectionQuestion, blockedDirectAnswer (boolean).";
      try {
        const rawText = await ollamaGenerateText({
          system,
          prompt: buildPrompt(params),
          temperature: 0.2,
          model: ollamaModel,
        });
        const jsonText = extractJsonObject(rawText) ?? rawText;
        const parsed = RESPONSE_SCHEMA.safeParse({
          ...(JSON.parse(jsonText || "{}") as object),
          warnings: [],
        });
        if (parsed.success) {
          await writeJsonCache("learning-coach", cacheKey, parsed.data);
          return parsed.data;
        }
      } catch {
        return buildOfflineCoach(params.studentMessage, params.lesson.childName);
      }
      return buildOfflineCoach(params.studentMessage, params.lesson.childName);
    }

    if (!apiKey) {
      return buildOfflineCoach(params.studentMessage, params.lesson.childName);
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
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
                  "You are an elementary Socratic tutor. Never give final answers, completed worksheet responses, or copyable submission text. Instead guide the student to discover the answer. Be warm and concise. Use child-friendly language.",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: buildPrompt(params) }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800,
            responseMimeType: "application/json",
            responseSchema: COACH_RESPONSE_SCHEMA,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!response.ok) {
      return buildOfflineCoach(params.studentMessage, params.lesson.childName);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
      usageMetadata?: GeminiUsageMetadata;
    };

    if (payload.usageMetadata) {
      console.info("gemini:/api/story-studio/learning-coach", payload.usageMetadata);
    }

    const rawText =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";
    const jsonText = extractJsonObject(rawText) ?? rawText;

    try {
      const parsed = RESPONSE_SCHEMA.safeParse({
        ...(JSON.parse(jsonText || "{}") as object),
        warnings: [],
      });
      if (parsed.success) {
        await writeJsonCache("learning-coach", cacheKey, parsed.data);
        return parsed.data;
      }
    } catch {
      return buildOfflineCoach(params.studentMessage, params.lesson.childName);
    }

    return buildOfflineCoach(params.studentMessage, params.lesson.childName);
  });

  const parsedResult = RESPONSE_SCHEMA.safeParse(result);
  if (!parsedResult.success) {
    return NextResponse.json(
      {
        error: "Learning coach response could not be validated.",
        issues: parsedResult.error.issues,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(parsedResult.data);
}