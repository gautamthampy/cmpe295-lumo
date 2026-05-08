import { NextResponse } from "next/server";
import { z } from "zod";

import { readJsonCache, withInFlightDedup, writeJsonCache } from "@/lib/story-studio/server/gemini-cache";
import { LESSON_SPEC_SCHEMA } from "@/lib/story-studio/lesson-spec";

export const runtime = "nodejs";

const STORY_QUIZ_REQUEST_SCHEMA = z.object({
  lesson: LESSON_SPEC_SCHEMA,
  excludeQuestionIds: z.array(z.string()).optional(),
  attemptNumber: z.number().optional().default(1),
});

export async function POST(request: Request) {
  const parsedRequest = STORY_QUIZ_REQUEST_SCHEMA.safeParse(await request.json());
  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Invalid story quiz payload.",
        issues: parsedRequest.error.issues,
      },
      { status: 400 }
    );
  }

  const { lesson, excludeQuestionIds = [], attemptNumber } = parsedRequest.data;
  const apiKey = process.env.GEMINI_API_KEY;
  const model = "gemini-2.5-flash";
  
  const cacheKey = JSON.stringify({
    version: "story-quiz-v1",
    model,
    lessonId: lesson.lessonId,
    attemptNumber,
    excludeQuestionIds,
  });

  const cached = await readJsonCache<unknown>("story-quizzes", cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const result = await withInFlightDedup("story-quizzes", cacheKey, async () => {
      if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY for quiz generation.");
      }

      const prompt = `You are an educational quiz generator for a Grade ${lesson.gradeLevel} student.
Create exactly 6 multiple-choice questions to test the student's understanding of this mission.

Lesson Context:
Subject: ${lesson.subject}
Theme: ${lesson.theme}
Goal: ${lesson.sceneSpec.title}
Helper Text: ${lesson.sceneSpec.helperText}
Reward Fact: ${lesson.sceneSpec.rewardFact}

Generate the response strictly as a JSON object matching this schema:
{
  "questions": [
    {
      "question_id": "string (unique id like q1, q2)",
      "question_text": "string (the question)",
      "options": [
        {
          "option_id": "a",
          "option_text": "string (the correct answer)",
          "is_distractor": false,
          "misconception_type": null
        },
        {
          "option_id": "b",
          "option_text": "string (the incorrect distractor)",
          "is_distractor": true,
          "misconception_type": "string (e.g., 'careless', 'attention-slip', 'focus-drift')"
        }
      ]
    }
  ]
}

The array must have exactly 6 questions. Each question must have exactly 2 options (one correct, one distractor).
The questions should be playful, encouraging, and related to the Lesson Context provided above.
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`LLM API returned status ${response.status}`);
      }

      const payload = await response.json();
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("LLM API returned no text");
      }

      let parsedQuestions;
      try {
        parsedQuestions = JSON.parse(text);
      } catch (e) {
        throw new Error("LLM API returned invalid JSON");
      }
      
      const questions = parsedQuestions.questions.map((q: any, i: number) => {
          return {
             ...q,
             question_id: `${lesson.lessonId}-llm-attempt${attemptNumber}-q${i + 1}`,
          };
      });

      const nextPayload = {
        quiz_id: `story-quiz-${lesson.lessonId}-${attemptNumber}-llm`,
        lesson_id: lesson.lessonId,
        questions: questions,
      };

      await writeJsonCache("story-quizzes", cacheKey, nextPayload);
      return nextPayload;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("LLM Quiz Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz." },
      { status: 500 }
    );
  }
}
