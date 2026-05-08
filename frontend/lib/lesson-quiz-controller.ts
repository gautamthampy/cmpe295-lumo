import { useCallback, useState } from "react";

import type { LessonQuizPayload } from "@/lib/lessons";

type AttemptResult = {
  quiz: LessonQuizPayload;
  answers: Record<string, string>;
  attemptNumber: number;
  score: number;
  total: number;
  shouldRetry: boolean;
  excludeQuestionIds: string[];
};

type RestoredQuizState = {
  quiz: LessonQuizPayload | null;
  attemptNumber: number;
  submitted: boolean;
  answers: Record<string, string>;
  retryQuiz: LessonQuizPayload | null;
  lastScore?: { score: number; total: number } | null;
};

type GenerateQuizFn = (attemptNumber: number, excludeQuestionIds: string[]) => Promise<LessonQuizPayload>;

type UseTwoAttemptQuizControllerParams = {
  generateQuiz?: GenerateQuizFn;
  onAttemptStart?: (attemptNumber: number, quiz: LessonQuizPayload) => void;
  onAttemptComplete?: (result: AttemptResult) => void | Promise<void>;
};

function buildQuizScore(quiz: LessonQuizPayload, answers: Record<string, string>) {
  let correct = 0;
  for (const question of quiz.questions) {
    const correctOption = question.options.find((option) => !option.is_distractor);
    if (correctOption && answers[question.question_id] === correctOption.option_id) {
      correct += 1;
    }
  }
  return correct;
}

export function useTwoAttemptQuizController(params: UseTwoAttemptQuizControllerParams = {}) {
  const { generateQuiz, onAttemptStart, onAttemptComplete } = params;
  const [quiz, setQuiz] = useState<LessonQuizPayload | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [retryQuiz, setRetryQuiz] = useState<LessonQuizPayload | null>(null);
  const [retryPending, setRetryPending] = useState(false);
  const [lastScore, setLastScore] = useState<{ score: number; total: number } | null>(null);

  const startQuizAttempt = useCallback((nextQuiz: LessonQuizPayload, attempt: number) => {
    setQuiz(nextQuiz);
    setAttemptNumber(attempt);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setRetryQuiz(null);
    setLastScore(null);
    onAttemptStart?.(attempt, nextQuiz);
  }, [onAttemptStart]);

  const resetQuizState = useCallback(() => {
    setQuiz(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setAttemptNumber(1);
    setRetryQuiz(null);
    setRetryPending(false);
    setLastScore(null);
  }, []);

  const restoreQuizState = useCallback((state: RestoredQuizState) => {
    setQuiz(state.quiz);
    setAttemptNumber(state.attemptNumber);
    setQuizAnswers(state.answers);
    setQuizSubmitted(state.submitted);
    setRetryQuiz(state.retryQuiz ?? null);
    setLastScore(state.lastScore ?? null);
  }, []);

  const submitQuiz = useCallback(async (): Promise<AttemptResult | null> => {
    if (!quiz) return null;
    setQuizSubmitted(true);
    const score = buildQuizScore(quiz, quizAnswers);
    const total = quiz.questions.length;
    const excludeQuestionIds = quiz.questions.map((question) => question.question_id);
    const shouldRetry = attemptNumber === 1 && total > 0 && score < 3;

    const result: AttemptResult = {
      quiz,
      answers: quizAnswers,
      attemptNumber,
      score,
      total,
      shouldRetry,
      excludeQuestionIds,
    };

    setLastScore({ score, total });
    await onAttemptComplete?.(result);

    if (shouldRetry && generateQuiz) {
      setRetryPending(true);
      try {
        const nextQuiz = await generateQuiz(2, excludeQuestionIds);
        setRetryQuiz(nextQuiz);
      } finally {
        setRetryPending(false);
      }
    }

    return result;
  }, [attemptNumber, generateQuiz, onAttemptComplete, quiz, quizAnswers]);

  const startRetryAttempt = useCallback(() => {
    if (!retryQuiz) return;
    startQuizAttempt(retryQuiz, 2);
  }, [retryQuiz, startQuizAttempt]);

  return {
    quiz,
    quizAnswers,
    quizSubmitted,
    attemptNumber,
    retryQuiz,
    retryPending,
    lastScore,
    setQuizAnswers,
    startQuizAttempt,
    resetQuizState,
    restoreQuizState,
    submitQuiz,
    startRetryAttempt,
  };
}
