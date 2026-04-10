import { authRequest } from "@/lib/auth";

// ── Types ──────────────────────────────────────────────────────────

export type HintRequest = {
  question_id: string;
  question_text: string;
  user_id: string;
  session_id: string;
  hint_level: number;
  misconception_type?: string | null;
};

export type HintResponse = {
  hint_text: string;
  hint_level: number;
  question_id: string;
  misconception_type?: string | null;
  is_fallback?: boolean;
};

export type ExplanationRequest = {
  question_id: string;
  question_text: string;
  user_answer: string;
  correct_answer: string;
  user_id?: string;
  session_id?: string | null;
  misconception_type?: string | null;
};

export type ExplanationResponse = {
  explanation: string;
  motivational_message: string;
  question_id: string;
  is_fallback?: boolean;
};

export type MotivationRequest = {
  user_id: string;
  session_id?: string | null;
  error_count: number;
  question_context?: string | null;
};

export type MotivationResponse = {
  message: string;
  error_count: number;
  is_fallback?: boolean;
};

// ── Fallback helpers ───────────────────────────────────────────────

const FALLBACK_HINTS: Record<number, string> = {
  1: "Think about what you already know about this topic. What clues can you find?",
  2: "Look at the key words in the question. Which concept do they connect to?",
  3: "You're very close! The answer relates directly to the main idea of the lesson.",
};

function fallbackHint(questionId: string, level: number): HintResponse {
  return {
    hint_text: FALLBACK_HINTS[level] ?? "Take another careful look at the question.",
    hint_level: level,
    question_id: questionId,
    is_fallback: true,
  };
}

function fallbackExplanation(questionId: string, correctAnswer: string): ExplanationResponse {
  return {
    explanation: `The correct answer is "${correctAnswer}". Let's review this concept together so it clicks next time.`,
    motivational_message: "Every mistake is a step toward learning! You've got this.",
    question_id: questionId,
    is_fallback: true,
  };
}

function fallbackMotivation(errorCount: number): MotivationResponse {
  const messages: Record<number, string> = {
    1: "Great effort! One small slip is totally normal. Let's try again!",
    2: "You're working really hard, and that's what matters most. Keep going!",
    3: "Learning takes time, and you're being so brave by sticking with it!",
  };
  return {
    message: messages[Math.min(errorCount, 3)] ?? messages[3]!,
    error_count: errorCount,
    is_fallback: true,
  };
}

// ── API functions ──────────────────────────────────────────────────

export async function requestHint(payload: HintRequest): Promise<HintResponse> {
  try {
    return await authRequest<HintResponse>("/feedback/hint", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    return fallbackHint(payload.question_id, payload.hint_level);
  }
}

export async function requestExplanation(payload: ExplanationRequest): Promise<ExplanationResponse> {
  try {
    return await authRequest<ExplanationResponse>("/feedback/explanation", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    return fallbackExplanation(payload.question_id, payload.correct_answer);
  }
}

export async function requestMotivation(payload: MotivationRequest): Promise<MotivationResponse> {
  try {
    return await authRequest<MotivationResponse>("/feedback/motivation", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    return fallbackMotivation(payload.error_count);
  }
}
