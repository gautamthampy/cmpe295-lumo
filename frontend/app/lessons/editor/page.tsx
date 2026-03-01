/**
 * Lesson Editor — create/edit lessons with AI-assisted content generation.
 *
 * Features:
 *   - "Generate with AI" button: calls POST /lessons/generate with a topic prompt
 *   - MDX textarea with live preview via MdxEditor
 *   - Accessibility score shown after generation
 *   - Save as draft or publish (requires score >= 80%)
 *
 * WCAG 2.1 AA: all form controls have explicit labels, status updates use aria-live.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MdxEditor from '@/components/lessons/MdxEditor';
import { lessonsAPI } from '@/lib/api';
import type { LessonGenerateResponse } from '@/lib/types';

interface FormState {
  topic: string;
  subject: string;
  gradeLevel: number;
  title: string;
  mdxContent: string;
}

export default function LessonEditorPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    topic: '',
    subject: 'Mathematics',
    gradeLevel: 3,
    title: '',
    mdxContent: '',
  });

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genResult, setGenResult] = useState<LessonGenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!form.topic.trim()) {
      setError('Please enter a topic before generating.');
      return;
    }
    setGenerating(true);
    setError(null);
    setGenResult(null);

    try {
      const res = await lessonsAPI.generate({
        topic: form.topic,
        grade_level: form.gradeLevel,
        subject: form.subject,
        save_as_draft: false,
      });
      const data: LessonGenerateResponse = res.data;
      setGenResult(data);
      setForm((f) => ({
        ...f,
        mdxContent: data.generated_mdx,
        title: `[AI] ${form.topic}`,
      }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? 'Generation failed. Check that the backend is running.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!form.mdxContent.trim()) {
      setError('No content to save.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await lessonsAPI.create({
        title: form.title || form.topic || 'Untitled Lesson',
        subject: form.subject,
        grade_level: form.gradeLevel,
        content_mdx: form.mdxContent,
        misconception_tags: [],
        prerequisites: [],
      });
      setSuccessMessage(`Draft saved! Lesson ID: ${res.data.lesson_id}`);
    } catch {
      setError('Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!genResult?.saved_lesson_id && !form.mdxContent.trim()) {
      setError('Save a draft first before publishing.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // First create if not yet saved
      let lessonId = genResult?.saved_lesson_id;
      if (!lessonId) {
        const createRes = await lessonsAPI.create({
          title: form.title || form.topic || 'Untitled Lesson',
          subject: form.subject,
          grade_level: form.gradeLevel,
          content_mdx: form.mdxContent,
          misconception_tags: [],
          prerequisites: [],
        });
        lessonId = createRes.data.lesson_id;
      }
      await lessonsAPI.publish(lessonId!);
      setSuccessMessage('Published! Redirecting to lessons…');
      setTimeout(() => router.push('/lessons'), 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? 'Publish failed. Ensure accessibility score ≥ 80%.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/lessons" className="text-green-600 hover:text-green-700 text-sm font-medium">
            ← Back to Lessons
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Lesson Editor</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create a new lesson manually or generate content with AI, then review the accessibility score before publishing.
          </p>
        </div>

        {/* Status banners */}
        {error && (
          <div role="alert" className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div role="status" aria-live="polite" className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 font-medium">
            {successMessage}
          </div>
        )}

        {/* Topic / metadata form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Lesson Metadata</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label htmlFor="topic-input" className="block text-sm font-medium text-gray-700 mb-1">
                Topic / Title
              </label>
              <input
                id="topic-input"
                type="text"
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value, title: e.target.value }))}
                placeholder="e.g. Adding Fractions with Unlike Denominators"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label htmlFor="grade-input" className="block text-sm font-medium text-gray-700 mb-1">
                Grade Level
              </label>
              <select
                id="grade-input"
                value={form.gradeLevel}
                onChange={(e) => setForm((f) => ({ ...f, gradeLevel: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating || !form.topic.trim()}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg text-sm font-semibold transition-colors"
              aria-label="Generate lesson content using AI"
            >
              {generating ? 'Generating…' : '✨ Generate with AI'}
            </button>
            {genResult && (
              <span className="text-sm text-gray-600">
                Accessibility score:{' '}
                <strong className={genResult.accessibility_score >= 0.8 ? 'text-green-700' : 'text-amber-600'}>
                  {Math.round(genResult.accessibility_score * 100)}%
                </strong>
                {genResult.gemini_used ? ' (Gemini)' : ' (stub template)'}
              </span>
            )}
          </div>
        </div>

        {/* MDX Editor */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Content (MDX)</h2>
          <MdxEditor
            value={form.mdxContent}
            onChange={(mdx) => setForm((f) => ({ ...f, mdxContent: mdx }))}
            gradeLevel={form.gradeLevel}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={handleSaveDraft}
            disabled={saving || !form.mdxContent.trim()}
            className="px-5 py-2 bg-white hover:bg-gray-50 disabled:opacity-50 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={handlePublish}
            disabled={saving || !form.mdxContent.trim()}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
            aria-label="Publish lesson — requires accessibility score ≥ 80%"
          >
            {saving ? 'Publishing…' : 'Publish Lesson'}
          </button>
        </div>

        {/* Accessibility constraints reminder */}
        <p className="text-xs text-gray-400 text-right mt-2">
          Publishing requires accessibility score ≥ 80% (WCAG 2.1 AA guardrail)
        </p>
      </div>
    </main>
  );
}
