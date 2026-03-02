'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LessonViewer, { type LessonSection } from '@/components/lessons/LessonViewer';
import { lessonsAPI, mockAPI } from '@/lib/api';
import type { RenderedLessonResponse, QuizResponse, AccessibilityIssue, ActivityResult } from '@/lib/types';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_SESSION_ID = '00000000-0000-0000-0000-000000000002';
const QUIZ_PASS_THRESHOLD = 0.7;

function parseSections(html: string): LessonSection[] {
  const parts = html.split(/(<h2[^>]*>)/);
  const sections: LessonSection[] = [];

  for (let i = 1; i < parts.length; i += 2) {
    const rest = parts[i + 1] ?? '';
    const closingIdx = rest.indexOf('</h2>');
    if (closingIdx === -1) continue;

    const titleHtml = rest.substring(0, closingIdx);
    const titleText = titleHtml.replace(/<[^>]+>/g, '').trim();
    const bodyHtml = rest.substring(closingIdx + 5).trim();

    sections.push({
      id: titleText.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      title: titleText,
      content: bodyHtml,
      completed: false,
    });
  }

  if (sections.length === 0 && html.trim()) {
    sections.push({ id: 'content', title: 'Lesson Content', content: html, completed: false });
  }

  return sections;
}

export default function LessonDetailPage() {
  const params = useParams();
  const lessonId = params.lessonId as string;
  const startTimeRef = useRef<number>(Date.now());

  const [rendered, setRendered] = useState<RenderedLessonResponse | null>(null);
  const [sections, setSections] = useState<LessonSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quizResult, setQuizResult] = useState<QuizResponse | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [lessonDone, setLessonDone] = useState(false);
  const activityResults = useRef<ActivityResult[]>([]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    lessonsAPI
      .render(lessonId, DEMO_USER_ID)
      .then((res) => {
        const data: RenderedLessonResponse = res.data;
        setRendered(data);
        setSections(parseSections(data.html_content));

        mockAPI.ingestEvent({
          event_type: 'lesson_started',
          user_id: DEMO_USER_ID,
          session_id: DEMO_SESSION_ID,
          event_data: { lesson_id: lessonId },
        }).catch(() => {});
      })
      .catch((err) => setError(err.response?.data?.detail ?? 'Failed to load lesson'))
      .finally(() => setLoading(false));
  }, [lessonId]);

  const handleStartQuiz = async () => {
    if (!rendered) return;
    setQuizLoading(true);
    setSelectedAnswers({});
    setQuizResult(null);
    setQuizSubmitted(false);
    try {
      const res = await mockAPI.generateQuiz({
        lesson_id: lessonId,
        user_id: DEMO_USER_ID,
        misconception_tags: rendered.misconception_tags,
      });
      setQuizResult(res.data);
    } catch {
      setError('Failed to generate quiz');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSubmitQuiz = () => {
    if (!quizResult) return;
    setQuizSubmitted(true);

    const correctCount = quizResult.questions.filter((q) => {
      const chosen = selectedAnswers[q.question_id];
      const opt = q.options.find((o) => o.option_id === chosen);
      return opt && !opt.is_distractor;
    }).length;

    const quizScore = quizResult.questions.length > 0
      ? correctCount / quizResult.questions.length
      : 0;

    const misconceptionsTriggered = activityResults.current
      .filter((r) => !r.correct && r.misconceptionTag)
      .map((r) => r.misconceptionTag as string);

    mockAPI.ingestEvent({
      event_type: 'lesson_completed',
      user_id: DEMO_USER_ID,
      session_id: DEMO_SESSION_ID,
      event_data: {
        lesson_id: lessonId,
        sections_completed: sections.length,
        quiz_score: quizScore,
        quiz_passed: quizScore >= QUIZ_PASS_THRESHOLD,
        time_spent_seconds: Math.round((Date.now() - startTimeRef.current) / 1000),
        activity_results: activityResults.current,
        misconceptions_triggered: [...new Set(misconceptionsTriggered)],
      },
    }).catch(() => {});

    setLessonDone(true);
  };

  const handleLessonComplete = () => {};

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400 text-lg" role="status" aria-live="polite">Loading lesson…</p>
      </div>
    );
  }

  if (error || !rendered) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm border-2 border-red-100 shadow-sm" role="alert">
          <p className="text-red-600 font-medium mb-4">{error ?? 'Lesson not found'}</p>
          <Link href="/lessons" className="text-sm font-bold text-violet-600 hover:text-violet-800">
            ← Back to Lessons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      {/* Lesson header */}
      <header className="bg-white rounded-[1.75rem] w-full mb-4 p-4 px-8 flex justify-between items-center shadow-sm border-2 border-violet-50">
        <div>
          <Link href="/lessons" className="text-xs font-semibold text-violet-500 hover:text-violet-700 transition-colors">
            ← Lesson Library
          </Link>
          <h1 className="text-lg font-bold text-slate-800 mt-1">
            {rendered.quiz_context.subject}: {rendered.misconception_tags[0]?.replace(/-/g, ' ')}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {rendered.accessibility_score !== undefined && (
            <span className="tag-pill">
              A11y {Math.round(rendered.accessibility_score * 100)}%
            </span>
          )}
        </div>
      </header>

      {/* LessonViewer */}
      <div className="flex-1">
        <LessonViewer
          lessonId={rendered.lesson_id}
          title={rendered.quiz_context.subject + ': ' + rendered.misconception_tags[0]?.replace(/-/g, ' ')}
          subject={rendered.quiz_context.subject}
          gradeLevel={rendered.quiz_context.grade_level}
          sections={sections}
          estimatedMinutes={rendered.estimated_time_minutes}
          accessibilityScore={rendered.accessibility_score}
          interactiveActivities={rendered.interactive_activities ?? []}
          onComplete={handleLessonComplete}
          onActivityResult={(r) => { activityResults.current.push(r); }}
        />
      </div>

      {/* Quiz section */}
      <div className="px-2 py-6">
        <div className="bg-white rounded-[1.75rem] p-6 border-2 border-violet-50 shadow-sm">
          {rendered.accessibility_issues.length > 0 && (
            <details className="mb-6">
              <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700">
                Accessibility score: {Math.round(rendered.accessibility_score * 100)}% —{' '}
                {rendered.accessibility_issues.length} issue(s) found
              </summary>
              <ul className="mt-3 space-y-2">
                {rendered.accessibility_issues.map((issue: AccessibilityIssue) => (
                  <li
                    key={issue.rule}
                    className={`text-xs px-3 py-2 rounded-xl ${
                      issue.severity === 'error'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <strong>[{issue.severity}]</strong> {issue.rule}: {issue.message}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Content Tags → Quiz Agent
            </h3>
            <div className="flex flex-wrap gap-2">
              {rendered.misconception_tags.map((tag) => (
                <span key={tag} className="tag-pill">{tag}</span>
              ))}
            </div>
          </div>

          {!quizResult && (
            <button
              onClick={handleStartQuiz}
              disabled={quizLoading}
              className="btn-primary w-full py-3"
              aria-label="Generate quiz for this lesson"
            >
              {quizLoading ? 'Generating Quiz…' : 'Start Quiz 🎯'}
            </button>
          )}

          {quizResult && (
            <div className="mt-2 border-t border-violet-50 pt-6" aria-live="polite">
              <h3 className="text-lg font-bold text-slate-800 mb-5">
                Quiz — {quizResult.questions.length} Questions
              </h3>
              <ol className="space-y-5">
                {quizResult.questions.map((q, i) => (
                  <li key={q.question_id} className="bg-violet-50/50 rounded-2xl p-5 border border-violet-100">
                    <p className="font-semibold text-slate-800 mb-4">
                      {i + 1}. {q.question_text}
                    </p>
                    <fieldset>
                      <legend className="sr-only">Choose an answer for question {i + 1}</legend>
                      <div className="space-y-2">
                        {q.options.map((opt) => {
                          const selected = selectedAnswers[q.question_id] === opt.option_id;
                          const isCorrect = !opt.is_distractor;
                          return (
                            <label
                              key={opt.option_id}
                              className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                                quizSubmitted
                                  ? isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
                                    : selected
                                    ? 'bg-red-50 border-red-200 text-red-700'
                                    : 'bg-white border-slate-100 text-slate-400'
                                  : selected
                                  ? 'bg-white border-violet-300 shadow-sm'
                                  : 'bg-white border-slate-100 hover:border-violet-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${q.question_id}`}
                                value={opt.option_id}
                                checked={selected}
                                disabled={quizSubmitted}
                                onChange={() =>
                                  setSelectedAnswers((prev) => ({
                                    ...prev,
                                    [q.question_id]: opt.option_id,
                                  }))
                                }
                                className="mt-0.5 accent-violet-600"
                              />
                              <span className="text-sm flex-1">
                                <span className="font-mono mr-1 text-violet-400">
                                  {opt.option_id.toUpperCase()}.
                                </span>
                                {opt.option_text}
                                {quizSubmitted && opt.is_distractor && opt.misconception_type && (
                                  <span className="block text-xs text-red-500 mt-0.5">
                                    Misconception: {opt.misconception_type}
                                  </span>
                                )}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  </li>
                ))}
              </ol>

              {!quizSubmitted ? (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(selectedAnswers).length < quizResult.questions.length}
                  className="btn-primary mt-6 w-full py-3 disabled:opacity-40"
                >
                  Submit Quiz
                </button>
              ) : (
                <div className="mt-6 p-5 bg-violet-50 rounded-2xl text-center border border-violet-100" aria-live="assertive">
                  <p className="font-bold text-lg text-slate-800">
                    {quizResult.questions.filter((q) => {
                      const opt = q.options.find((o) => o.option_id === selectedAnswers[q.question_id]);
                      return opt && !opt.is_distractor;
                    }).length}{' '}
                    / {quizResult.questions.length} correct
                  </p>
                  {lessonDone && rendered.next_lesson_id && (
                    <Link
                      href={`/lessons/${rendered.next_lesson_id}`}
                      className="btn-primary mt-3 inline-block px-6 py-2"
                    >
                      Next Lesson →
                    </Link>
                  )}
                  {lessonDone && !rendered.next_lesson_id && (
                    <p className="mt-2 text-sm text-emerald-700 font-medium">
                      You have completed all lessons in this path!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
