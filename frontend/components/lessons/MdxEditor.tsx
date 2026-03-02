/**
 * MdxEditor — side-by-side MDX textarea + live HTML preview with real-time
 * accessibility score via debounced API calls.
 *
 * WCAG 2.1 AA:
 *   - Textarea has explicit label (SC 1.3.1)
 *   - Score communicated as text, not colour alone (SC 1.4.1)
 *   - Status updates announced with aria-live (SC 4.1.3)
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { lessonsAPI } from '@/lib/api';
import type { AccessibilityIssue, InteractiveActivity, ActivityResult } from '@/lib/types';
import InteractiveBlock from '@/components/interactive/InteractiveBlock';

interface MdxEditorProps {
  value: string;
  onChange: (mdx: string) => void;
  gradeLevel?: number;
  /** Debounce delay in ms before triggering a preview render */
  debounceMs?: number;
}

interface PreviewState {
  html: string;
  score: number;
  issues: AccessibilityIssue[];
  activities: InteractiveActivity[];
  loading: boolean;
  error: string | null;
}

/** Parse interactive placeholders from preview HTML and split into segments. */
function parsePreviewSegments(
  html: string,
  activities: InteractiveActivity[],
): Array<{ kind: 'html'; html: string } | { kind: 'interactive'; activity: InteractiveActivity }> {
  const activityById = Object.fromEntries(activities.map((a) => [a.id, a]));
  const parts = html.split(/(<div\s+data-interactive="[^"]*"\s+class="interactive-placeholder"><\/div>)/);
  const segments: Array<{ kind: 'html'; html: string } | { kind: 'interactive'; activity: InteractiveActivity }> = [];
  for (const part of parts) {
    const match = part.match(/data-interactive="([^"]+)"/);
    if (match) {
      try {
        const decoded = JSON.parse(atob(match[1])) as { id: string } & InteractiveActivity;
        const activity = activityById[decoded.id] ?? decoded;
        segments.push({ kind: 'interactive', activity });
      } catch {
        segments.push({ kind: 'html', html: part });
      }
    } else if (part) {
      segments.push({ kind: 'html', html: part });
    }
  }
  return segments;
}

const SCORE_COLOR = (score: number) => {
  if (score >= 0.8) return 'text-green-700';
  if (score >= 0.5) return 'text-amber-600';
  return 'text-red-600';
};

export default function MdxEditor({
  value,
  onChange,
  gradeLevel = 3,
  debounceMs = 800,
}: MdxEditorProps) {
  const [preview, setPreview] = useState<PreviewState>({
    html: '',
    score: 0,
    issues: [],
    activities: [],
    loading: false,
    error: null,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveRegionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!value.trim()) {
      setPreview({ html: '', score: 0, issues: [], activities: [], loading: false, error: null });
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    setPreview((p) => ({ ...p, loading: true, error: null }));

    timerRef.current = setTimeout(async () => {
      try {
        const res = await lessonsAPI.preview({ content_mdx: value, grade_level: gradeLevel });
        const data = res.data as { html: string; accessibility_score: number; issues: AccessibilityIssue[]; interactive_activities?: InteractiveActivity[] };
        setPreview({
          html: data.html,
          score: data.accessibility_score,
          issues: data.issues,
          activities: data.interactive_activities ?? [],
          loading: false,
          error: null,
        });
      } catch {
        setPreview((p) => ({ ...p, loading: false, error: 'Preview unavailable' }));
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, gradeLevel, debounceMs]);

  return (
    <div className="flex flex-col gap-4">
      {/* Editor + Preview columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
        {/* MDX Input */}
        <div className="flex flex-col">
          <label
            htmlFor="mdx-editor-textarea"
            className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2"
          >
            MDX Source
          </label>
          <textarea
            id="mdx-editor-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 w-full min-h-[360px] font-mono text-sm bg-slate-900 text-slate-100 rounded-xl p-4 resize-y border border-slate-700 focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--color-primary-base)' } as React.CSSProperties}
            placeholder={`## What Is Your Topic?\n\nStart writing your lesson here...\n\n## Key Takeaway\n\nSummarise the main idea.`}
            spellCheck={false}
            aria-describedby="mdx-editor-hint"
          />
          <p id="mdx-editor-hint" className="text-xs text-slate-400 mt-1">
            Use ## for sections · Scaffold:{' '}
            <code className="bg-slate-100 px-1 rounded text-slate-600">{`<!-- scaffold -->...<!-- /scaffold -->`}</code>
            {' '}· Interactive:{' '}
            <code className="bg-slate-100 px-1 rounded text-slate-600">{`<!-- interactive -->{...}<!-- /interactive -->`}</code>
          </p>
        </div>

        {/* HTML Preview */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Preview
            </span>
            {preview.score > 0 && (
              <span
                className={`text-xs font-bold ${SCORE_COLOR(preview.score)}`}
                aria-label={`Accessibility score: ${Math.round(preview.score * 100)} percent`}
              >
                A11y: {Math.round(preview.score * 100)}%
              </span>
            )}
            {preview.loading && (
              <span className="text-xs text-slate-400" role="status" aria-live="polite">
                Checking…
              </span>
            )}
          </div>

          <div
            className="flex-1 min-h-[360px] bg-white/70 border border-white/50 rounded-xl p-4 overflow-y-auto prose prose-sm max-w-none"
            aria-label="Lesson HTML preview"
          >
            {preview.html ? (
              <div>
                {parsePreviewSegments(preview.html, preview.activities).map((seg, i) =>
                  seg.kind === 'html' ? (
                    <div key={i} dangerouslySetInnerHTML={{ __html: seg.html }} />
                  ) : (
                    <InteractiveBlock
                      key={seg.activity.id}
                      activity={seg.activity}
                      onResult={(_r: ActivityResult) => {/* preview-only, no-op */}}
                    />
                  )
                )}
              </div>
            ) : preview.loading ? (
              <p className="text-slate-400 text-sm italic">Rendering…</p>
            ) : preview.error ? (
              <p className="text-red-400 text-sm italic">{preview.error}</p>
            ) : value.trim() ? (
              <p className="text-slate-400 text-sm italic">Preview will appear after a moment…</p>
            ) : (
              <p className="text-slate-400 text-sm italic">
                Your lesson preview will appear here as you type…
              </p>
            )}
          </div>

          {/* Accessibility issues */}
          {preview.issues.length > 0 && (
            <ul className="mt-2 space-y-1" aria-label="Accessibility issues">
              {preview.issues.map((issue) => (
                <li
                  key={issue.rule}
                  className={`text-xs px-2 py-1 rounded ${
                    issue.severity === 'error'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-yellow-50 text-yellow-700'
                  }`}
                >
                  [{issue.severity}] {issue.rule}: {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Status announcer for screen readers */}
      <p
        ref={liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
    </div>
  );
}
