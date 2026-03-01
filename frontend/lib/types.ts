// ---- Lessons ----

export interface LessonResponse {
  lesson_id: string;
  title: string;
  subject: string;
  grade_level: number;
  content_mdx: string;
  misconception_tags: string[];
  prerequisites: string[];
  status: string;
  version: number;
  parent_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizContext {
  lesson_id: string;
  misconception_tags: string[];
  subject: string;
  grade_level: number;
  suggested_question_count: number;
}

export interface AccessibilityIssue {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface RenderedLessonResponse {
  lesson_id: string;
  html_content: string;
  estimated_time_minutes: number;
  accessibility_score: number;
  accessibility_issues: AccessibilityIssue[];
  misconception_tags: string[];
  prerequisites: string[];
  prerequisites_met: boolean;
  next_lesson_id: string | null;
  quiz_context: QuizContext;
}

// ---- Quiz ----

export interface QuizOption {
  option_id: string;
  option_text: string;
  is_distractor: boolean;
  misconception_type: string | null;
}

export interface QuizQuestion {
  question_id: string;
  question_text: string;
  options: QuizOption[];
  difficulty: string;
}

export interface QuizResponse {
  quiz_id: string;
  lesson_id: string;
  questions: QuizQuestion[];
  generated_at: string;
}

// ---- Analytics ----

export interface AnalyticsEvent {
  event_type: string;
  user_id: string;
  session_id: string;
  event_data: Record<string, unknown>;
}

export interface LessonCompletionEvent extends AnalyticsEvent {
  event_type: 'lesson_completed';
  event_data: {
    lesson_id: string;
    sections_completed: number;
    quiz_score: number;
    quiz_passed: boolean;
    time_spent_seconds: number;
  };
}

// ---- Lesson Generator ----

export interface LessonGenerateRequest {
  topic: string;
  grade_level?: number;
  subject?: string;
  save_as_draft?: boolean;
}

export interface LessonGenerateResponse {
  topic: string;
  grade_level: number;
  subject: string;
  generated_mdx: string;
  html_preview: string;
  accessibility_score: number;
  accessibility_issues: AccessibilityIssue[];
  saved_lesson_id: string | null;
  gemini_used: boolean;
}
