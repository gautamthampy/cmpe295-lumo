import type { LessonQuizPayload } from "@/lib/lessons";
import type { LessonSpec } from "@/lib/story-studio/lesson-spec";

type StoryQuizOptions = {
  attemptNumber?: number;
  excludeQuestionIds?: string[];
};

type StoryQuizQuestionSeed = {
  idSuffix: string;
  text: (lesson: LessonSpec) => string;
  correct: (lesson: LessonSpec) => string;
  distractor: string;
  misconceptionType?: string | null;
};

const QUESTION_SEEDS: StoryQuizQuestionSeed[] = [
  {
    idSuffix: "subject",
    text: (lesson) => `Which subject is ${lesson.childName} exploring today?`,
    correct: (lesson) => lesson.subject,
    distractor: "Recess",
    misconceptionType: "attention-slip",
  },
  {
    idSuffix: "theme",
    text: (lesson) => `What theme is guiding this story mission?`,
    correct: (lesson) => lesson.theme,
    distractor: "Surprise party",
    misconceptionType: "focus-drift",
  },
  {
    idSuffix: "big-idea",
    text: (lesson) => `What should ${lesson.childName} focus on during the mission?`,
    correct: (lesson) => lesson.sceneSpec.helperText,
    distractor: "Skip the instructions",
    misconceptionType: "avoidance",
  },
  {
    idSuffix: "reward",
    text: (lesson) => `What is the mission reward fact about?`,
    correct: (lesson) => lesson.sceneSpec.rewardFact,
    distractor: "A random joke",
    misconceptionType: "careless",
  },
  {
    idSuffix: "strategy",
    text: () => "What is a good strategy when you feel stuck?",
    correct: () => "Ask for a hint and try again",
    distractor: "Give up right away",
    misconceptionType: "confidence-drop",
  },
  {
    idSuffix: "review",
    text: () => "How can you remember the story lesson later?",
    correct: () => "Explain it in your own words",
    distractor: "Ignore it and move on",
    misconceptionType: "forgetting",
  },
  {
    idSuffix: "goal",
    text: (lesson) => `What is the mission goal called?`,
    correct: (lesson) => lesson.sceneSpec.title,
    distractor: "Snack time",
    misconceptionType: "impulse",
  },
  {
    idSuffix: "voice",
    text: () => "What helps you keep learning even if it feels tricky?",
    correct: () => "Taking it step by step",
    distractor: "Rushing through",
    misconceptionType: "impulse",
  },
  {
    idSuffix: "fact",
    text: () => "What should you do before you finish the mission?",
    correct: () => "Check your answers once more",
    distractor: "Skip the review",
    misconceptionType: "careless",
  },
  {
    idSuffix: "mission",
    text: () => "Which choice shows a good learning habit?",
    correct: () => "Checking your work as you go",
    distractor: "Guessing without reading",
    misconceptionType: "impulse",
  },
];

function buildQuestions(lesson: LessonSpec, excludeIds: Set<string>, take: number) {
  const questions = [] as LessonQuizPayload["questions"];
  for (const seed of QUESTION_SEEDS) {
    const questionId = `${lesson.lessonId}-${seed.idSuffix}`;
    if (excludeIds.has(questionId)) {
      continue;
    }
    questions.push({
      question_id: questionId,
      question_text: seed.text(lesson),
      options: [
        {
          option_id: "a",
          option_text: seed.correct(lesson),
          is_distractor: false,
          misconception_type: null,
        },
        {
          option_id: "b",
          option_text: seed.distractor,
          is_distractor: true,
          misconception_type: seed.misconceptionType ?? null,
        },
      ],
    });
    if (questions.length >= take) {
      break;
    }
  }
  return questions;
}

export function buildStoryStudioQuiz(lesson: LessonSpec, options: StoryQuizOptions = {}): LessonQuizPayload {
  const excludeIds = new Set(options.excludeQuestionIds ?? []);
  const questions = buildQuestions(lesson, excludeIds, 6);

  return {
    quiz_id: `story-quiz-${lesson.lessonId}-${options.attemptNumber ?? 1}`,
    lesson_id: lesson.lessonId,
    questions,
  };
}

export async function generateStoryQuizLLM(
  lesson: LessonSpec,
  options: StoryQuizOptions = {}
): Promise<LessonQuizPayload> {
  try {
    const response = await fetch("/api/story-studio/story-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lesson,
        excludeQuestionIds: options.excludeQuestionIds,
        attemptNumber: options.attemptNumber,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate story quiz with status ${response.status}`);
    }

    return (await response.json()) as LessonQuizPayload;
  } catch (error) {
    console.error("LLM Quiz Generation failed, falling back to static questions.", error);
    return buildStoryStudioQuiz(lesson, options);
  }
}
