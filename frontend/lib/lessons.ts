import { authRequest } from "@/lib/auth";

export type LessonSummary = {
  lesson_id: string;
  title: string;
  subject: string;
  grade_level: number;
  status: string;
  prerequisites: string[];
  misconception_tags: string[];
};

export type LessonActivity = {
  type: string;
  id: string;
  instruction: string;
  misconception_tag?: string | null;
  difficulty?: string;
  data: any;
};

export type LessonRenderPayload = {
  lesson_id: string;
  title?: string;
  html_content: string;
  interactive_activities: LessonActivity[];
  misconception_tags: string[];
  accessibility_score: number;
  accessibility_issues: string[];
  estimated_time_minutes: number;
  quiz_context: {
    subject: string;
    grade_level: number;
  };
  next_lesson_id: string | null;
  prerequisites_met: boolean;
};

export type LessonQuizOption = {
  option_id: string;
  option_text: string;
  is_distractor: boolean;
  misconception_type: string | null;
};

export type LessonQuizQuestion = {
  question_id: string;
  question_text: string;
  options: LessonQuizOption[];
};

export type LessonQuizPayload = {
  quiz_id: string;
  lesson_id: string;
  questions: LessonQuizQuestion[];
};

export type LessonAnalyticsMetric = {
  lesson_id: string;
  title: string;
  subject: string;
  grade_level: number;

  quiz_pass_rate: number;
  status: string;
};

export type LessonAnalyticsSummary = {
  total_lessons: number;
  avg_quiz_pass: number;
  lessons: LessonAnalyticsMetric[];
};

export const PLAYFUL_FALLBACK_LESSONS: LessonSummary[] = [
  {
    lesson_id: "lesson-001",
    title: "Introduction to Fractions",
    subject: "math",
    grade_level: 3,
    status: "active",
    prerequisites: [],
    misconception_tags: ["part-whole", "fraction-size"],
  },
  {
    lesson_id: "lesson-002",
    title: "Multiplication Tables",
    subject: "math",
    grade_level: 3,
    status: "active",
    prerequisites: [],
    misconception_tags: ["skip-counting", "equal-groups"],
  },
  {
    lesson_id: "lesson-003",
    title: "Plant Detectives",
    subject: "science",
    grade_level: 2,
    status: "active",
    prerequisites: [],
    misconception_tags: ["living-things"],
  },
  {
    lesson_id: "lesson-004",
    title: "Story Builders",
    subject: "language-arts-writing",
    grade_level: 2,
    status: "active",
    prerequisites: [],
    misconception_tags: ["sequencing", "details"],
  },
  {
    lesson_id: "lesson-005",
    title: "Community Helpers",
    subject: "social-studies",
    grade_level: 2,
    status: "active",
    prerequisites: [],
    misconception_tags: ["citizenship"],
  },
  {
    lesson_id: "lesson-006",
    title: "Weather Watchers",
    subject: "science",
    grade_level: 2,
    status: "active",
    prerequisites: [],
    misconception_tags: ["observation"],
  },
];

export const PLAYFUL_FALLBACK_ANALYTICS: LessonAnalyticsSummary = {
  total_lessons: PLAYFUL_FALLBACK_LESSONS.length,
  avg_quiz_pass: 84,
  lessons: PLAYFUL_FALLBACK_LESSONS.map((lesson, index) => ({
    lesson_id: lesson.lesson_id,
    title: lesson.title,
    subject: lesson.subject,
    grade_level: lesson.grade_level,

    quiz_pass_rate: 72 + (index % 5) * 5,
    status: lesson.status,
  })),
};

export function formatSubjectLabel(subject: string) {
  switch (subject) {
    case "math":
      return "Math";
    case "science":
      return "Science";
    case "language-arts-writing":
      return "Reading";
    case "social-studies":
      return "Social Studies";
    default:
      return subject
        .split(/[-_]/g)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(" ");
  }
}

export function filterLessonsBySubject(lessons: LessonSummary[], subject: string | null) {
  if (!subject) {
    return lessons;
  }

  return lessons.filter((lesson) => lesson.subject === subject);
}

function buildFallbackLessonRender(summary: LessonSummary, index: number): LessonRenderPayload {
  return {
    lesson_id: summary.lesson_id,
    title: summary.title,
    html_content: [
      `<h2>Warm Up</h2><p>Welcome to ${formatSubjectLabel(summary.subject)}. Today we are playing with ${summary.title.toLowerCase()}.</p>`,
      `<h2>Try It</h2><p>This lesson helps you practice ${summary.misconception_tags.join(", ") || "today's big idea"} in a short, playful way.</p>`,
      `<h2>Remember</h2><p>Take your time, look for patterns, and celebrate each tiny win as you go.</p>`,
    ].join(""),
    interactive_activities: [],
    misconception_tags: summary.misconception_tags,
    accessibility_score: 0.92,
    accessibility_issues: [],
    estimated_time_minutes: 6 + (index % 3) * 2,
    quiz_context: {
      subject: formatSubjectLabel(summary.subject),
      grade_level: summary.grade_level,
    },
    next_lesson_id: PLAYFUL_FALLBACK_LESSONS[index + 1]?.lesson_id ?? null,
    prerequisites_met: true,
  };
}

const FALLBACK_LESSON_RENDERS = Object.fromEntries(
  PLAYFUL_FALLBACK_LESSONS.map((lesson, index) => [lesson.lesson_id, buildFallbackLessonRender(lesson, index)])
) as Record<string, LessonRenderPayload>;

export function getFallbackLessonRender(lessonId: string) {
  return FALLBACK_LESSON_RENDERS[lessonId] ?? null;
}

export function buildFallbackQuiz(lesson: LessonRenderPayload): LessonQuizPayload {
  const subject = lesson.quiz_context.subject;
  const grade = lesson.quiz_context.grade_level;

  return {
    quiz_id: `fallback-quiz-${lesson.lesson_id}`,
    lesson_id: lesson.lesson_id,
    questions: [
      {
        question_id: `${lesson.lesson_id}-q1`,
        question_text: `Which subject are you exploring in this Grade ${grade} lesson?`,
        options: [
          { option_id: "a", option_text: subject, is_distractor: false, misconception_type: null },
          { option_id: "b", option_text: "Recess", is_distractor: true, misconception_type: "attention-slip" },
        ],
      },
      {
        question_id: `${lesson.lesson_id}-q2`,
        question_text: "What should you do if the puzzle feels tricky?",
        options: [
          { option_id: "a", option_text: "Look for patterns and keep trying", is_distractor: false, misconception_type: null },
          { option_id: "b", option_text: "Give up right away", is_distractor: true, misconception_type: "confidence-drop" },
        ],
      },
      {
        question_id: `${lesson.lesson_id}-q3`,
        question_text: "Which choice shows a good learning habit?",
        options: [
          { option_id: "a", option_text: "Checking your work as you go", is_distractor: false, misconception_type: null },
          { option_id: "b", option_text: "Rushing without reading", is_distractor: true, misconception_type: "impulse" },
        ],
      },
      {
        question_id: `${lesson.lesson_id}-q4`,
        question_text: "When you are stuck, what is a helpful next step?",
        options: [
          { option_id: "a", option_text: "Ask for a hint and try again", is_distractor: false, misconception_type: null },
          { option_id: "b", option_text: "Quit the lesson", is_distractor: true, misconception_type: "avoidance" },
        ],
      },
      {
        question_id: `${lesson.lesson_id}-q5`,
        question_text: "How can you remember this lesson later?",
        options: [
          { option_id: "a", option_text: "Explain it in your own words", is_distractor: false, misconception_type: null },
          { option_id: "b", option_text: "Ignore it and move on", is_distractor: true, misconception_type: "forgetting" },
        ],
      },
      {
        question_id: `${lesson.lesson_id}-q6`,
        question_text: "What should you do before you finish the lesson?",
        options: [
          { option_id: "a", option_text: "Check your answers once more", is_distractor: false, misconception_type: null },
          { option_id: "b", option_text: "Skip the review", is_distractor: true, misconception_type: "careless" },
        ],
      },
    ],
  };
}

export async function fetchLessonSummaries(subject?: string) {
  const params = new URLSearchParams();
  if (subject) {
    params.set("subject", subject);
  }

  const query = params.toString();
  return authRequest<LessonSummary[]>(`/lessons${query ? `?${query}` : ""}`, {
    method: "GET",
    cache: "no-store",
  });
}

export async function fetchLessonRender(lessonId: string) {
  return authRequest<LessonRenderPayload>(`/lessons/${lessonId}/render`, {
    method: "GET",
    cache: "no-store",
  });
}

export async function fetchLessonAnalytics(studentId?: string) {
  const params = new URLSearchParams();
  if (studentId) {
    params.set("student_id", studentId);
  }

  return authRequest<LessonAnalyticsSummary>(`/lessons/analytics/summary${params.toString() ? `?${params.toString()}` : ""}`, {
    method: "GET",
    cache: "no-store",
  });
}

export async function generateLessonQuiz(
  lesson: LessonRenderPayload,
  options?: { attemptNumber?: number; excludeQuestionIds?: string[] },
) {
  try {
    return await authRequest<LessonQuizPayload>(`/lessons/${lesson.lesson_id}/quiz`, {
      method: "POST",
      body: JSON.stringify({
        lesson_id: lesson.lesson_id,
        quiz_context: lesson.quiz_context,
        misconception_tags: lesson.misconception_tags,
        attempt_number: options?.attemptNumber,
        exclude_question_ids: options?.excludeQuestionIds ?? [],
      }),
    });
  } catch {
    return buildFallbackQuiz(lesson);
  }
}

export async function logLessonEvent(payload: Record<string, unknown>) {
  try {
    await authRequest<Record<string, never>>("/lessons/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    return;
  }
}