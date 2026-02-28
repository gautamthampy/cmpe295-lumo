// ---- Lessons ----

export interface LessonResponse {
  lesson_id: string;
  title: string;
  subject: string;
  grade_level: number;
  content_mdx: string;
  misconception_tags: string[];
  status: string;
  version: number;
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
