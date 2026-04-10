'use client';

import { useState } from 'react';
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

const ACTIVITY_TEMPLATES: { label: string; template: string }[] = [
  {
    label: 'Fill in Blank',
    template: `\n<!-- interactive -->\n{"type":"FillInBlank","id":"act-1","instruction":"Complete the sentence","misconception_tag":null,"difficulty":"standard","data":{"prompt":"The answer is ___","answer":"your answer","hint":"optional hint"}}\n<!-- /interactive -->\n`,
  },
  {
    label: 'True / False',
    template: `\n<!-- interactive -->\n{"type":"TrueOrFalse","id":"act-2","instruction":"True or false?","misconception_tag":null,"difficulty":"standard","data":{"statement":"This statement is true.","correct":true,"explanation":"Explanation shown after answering."}}\n<!-- /interactive -->\n`,
  },
  {
    label: 'Multiple Choice',
    template: `\n<!-- interactive -->\n{"type":"MultipleChoice","id":"act-3","instruction":"Choose the correct answer","misconception_tag":null,"difficulty":"standard","data":{"question":"Your question here?","options":[{"id":"a","text":"Option A"},{"id":"b","text":"Option B"},{"id":"c","text":"Option C"}],"correct_id":"a"}}\n<!-- /interactive -->\n`,
  },
  {
    label: 'Drag to Sort',
    template: `\n<!-- interactive -->\n{"type":"DragToSort","id":"act-4","instruction":"Put these in the correct order","misconception_tag":null,"difficulty":"standard","data":{"items":["Item C","Item A","Item B"],"correct_order":["Item A","Item B","Item C"]}}\n<!-- /interactive -->\n`,
  },
  {
    label: 'Match Pairs',
    template: `\n<!-- interactive -->\n{"type":"MatchPairs","id":"act-5","instruction":"Match each item to its pair","misconception_tag":null,"difficulty":"standard","data":{"pairs":[{"left":"Left 1","right":"Right 1"},{"left":"Left 2","right":"Right 2"}]}}\n<!-- /interactive -->\n`,
  },
  {
    label: 'Number Line',
    template: `\n<!-- interactive -->\n{"type":"NumberLine","id":"act-6","instruction":"Place the value on the number line","misconception_tag":null,"difficulty":"standard","data":{"min":0,"max":1,"divisions":4,"target":0.5,"label":"Place 1/2 on the number line"}}\n<!-- /interactive -->\n`,
  },
];

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
    <>
      {/* Header */}
      <header className="bg-white rounded-[1.75rem] w-full mb-5 p-5 px-8 shadow-sm border-2 border-violet-50">
        <h1 className="text-2xl font-black">
          <span className="text-gradient">Lesson Editor</span> ✏️
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Create a new lesson manually or generate content with AI
        </p>
      </header>

      {/* Banners */}
      {error && (
        <div role="alert" className="mb-4 bg-red-50 rounded-2xl px-5 py-3 text-sm text-red-600 font-medium border border-red-200">
          {error}
        </div>
      )}
      {successMessage && (
        <div role="status" aria-live="polite" className="mb-4 bg-emerald-50 rounded-2xl px-5 py-3 text-sm text-emerald-700 font-medium border border-emerald-200">
          {successMessage}
        </div>
      )}

      {/* Metadata */}
      <div className="bg-white rounded-[1.75rem] p-6 mb-4 border-2 border-violet-50 shadow-sm">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Lesson Metadata</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="sm:col-span-2">
            <label htmlFor="topic-input" className="block text-sm font-semibold text-slate-700 mb-1">
              Topic / Title
            </label>
            <input
              id="topic-input"
              type="text"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value, title: e.target.value }))}
              placeholder="e.g. Adding Fractions with Unlike Denominators"
              className="w-full px-4 py-2.5 bg-violet-50/60 border border-violet-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-slate-800 placeholder-slate-400"
            />
          </div>
          <div>
            <label htmlFor="grade-input" className="block text-sm font-semibold text-slate-700 mb-1">
              Grade Level
            </label>
            <select
              id="grade-input"
              value={form.gradeLevel}
              onChange={(e) => setForm((f) => ({ ...f, gradeLevel: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 bg-violet-50/60 border border-violet-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-slate-800"
            >
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating || !form.topic.trim()}
            className="btn-primary px-6 py-2.5 text-sm disabled:opacity-40"
            aria-label="Generate lesson content using AI"
          >
            {generating ? 'Generating…' : '✨ Generate with AI'}
          </button>
          {genResult && (
            <span className="text-sm text-slate-600">
              A11y score:{' '}
              <strong className={genResult.accessibility_score >= 0.8 ? 'text-emerald-600' : 'text-amber-600'}>
                {Math.round(genResult.accessibility_score * 100)}%
              </strong>
              <span className="text-slate-400 ml-1 text-xs">
                {genResult.gemini_used ? '(Gemini)' : '(stub template)'}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* MDX Editor */}
      <div className="bg-white rounded-[1.75rem] p-6 mb-4 flex-1 border-2 border-violet-50 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Content (MDX)</h2>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-xs text-slate-400 mr-1">Insert:</span>
            {ACTIVITY_TEMPLATES.map(({ label, template }) => (
              <button
                key={label}
                onClick={() => setForm((f) => ({ ...f, mdxContent: f.mdxContent + template }))}
                className="px-2.5 py-1 text-xs rounded-full bg-violet-50 border border-violet-100 text-violet-600 hover:bg-violet-100 hover:text-violet-700 transition-colors font-semibold"
                aria-label={`Insert ${label} activity template`}
              >
                + {label}
              </button>
            ))}
          </div>
        </div>
        <MdxEditor
          value={form.mdxContent}
          onChange={(mdx) => setForm((f) => ({ ...f, mdxContent: mdx }))}
          gradeLevel={form.gradeLevel}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end mb-2">
        <button
          onClick={handleSaveDraft}
          disabled={saving || !form.mdxContent.trim()}
          className="btn-secondary text-sm px-5 py-2.5 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button
          onClick={handlePublish}
          disabled={saving || !form.mdxContent.trim()}
          className="btn-primary text-sm px-6 py-2.5 disabled:opacity-40"
          aria-label="Publish lesson — requires accessibility score ≥ 80%"
        >
          {saving ? 'Publishing…' : 'Publish Lesson'}
        </button>
      </div>
      <p className="text-xs text-slate-400 text-right">
        Publishing requires accessibility score ≥ 80% (WCAG 2.1 AA guardrail)
      </p>
    </>
  );
}
