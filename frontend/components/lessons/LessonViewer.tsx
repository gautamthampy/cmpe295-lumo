/**
 * LessonViewer — Phase 2 (Gautam)
 *
 * WCAG 2.1 Level AA features implemented:
 * - Skip-to-content link (SC 2.4.1)
 * - Semantic landmarks: banner, navigation, main (SC 1.3.1)
 * - aria-current on active section (SC 2.4.3)
 * - role="progressbar" with aria-valuenow/max (SC 4.1.2)
 * - aria-live region for section transitions (SC 4.1.3)
 * - Focus management: h2 receives focus on section change (SC 2.4.3)
 * - Keyboard navigation: Arrow keys + Escape (SC 2.1.1)
 * - aria-expanded on accessibility menu (SC 4.1.2)
 * - prefers-reduced-motion respected via globals.css (SC 2.3.3)
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { InteractiveActivity, ActivityResult } from '@/lib/types';
import InteractiveBlock from '@/components/interactive/InteractiveBlock';

export interface LessonSection {
  id: string;
  title: string;
  content: string;
  completed: boolean;
}

interface LessonViewerProps {
  lessonId: string;
  title: string;
  subject: string;
  gradeLevel: number;
  sections: LessonSection[];
  estimatedMinutes: number;
  accessibilityScore?: number;
  interactiveActivities?: InteractiveActivity[];
  onComplete?: () => void;
  onSectionComplete?: (sectionId: string) => void;
  onActivityResult?: (result: ActivityResult) => void;
}

/** Parse a rendered HTML string into HTML segments and interactive placeholders. */
function parseContentSegments(
  html: string,
  activities: InteractiveActivity[],
): Array<{ kind: 'html'; html: string } | { kind: 'interactive'; activity: InteractiveActivity }> {
  const activityById = Object.fromEntries(activities.map((a) => [a.id, a]));
  // Split on <div data-interactive="..." class="interactive-placeholder"></div>
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
        // Fall through to render as HTML (error placeholder from backend)
        segments.push({ kind: 'html', html: part });
      }
    } else if (part) {
      segments.push({ kind: 'html', html: part });
    }
  }
  return segments;
}

interface SectionContentProps {
  html: string;
  activities: InteractiveActivity[];
  fontSizeClass: string;
  highContrast: boolean;
  onActivityResult: (r: ActivityResult) => void;
}

function SectionContent({ html, activities, fontSizeClass, highContrast, onActivityResult }: SectionContentProps) {
  const segments = parseContentSegments(html, activities);

  return (
    <>
      {segments.map((seg, i) =>
        seg.kind === 'html' ? (
          <div
            key={i}
            className={`prose prose-lg max-w-none ${fontSizeClass} ${highContrast ? 'prose-invert' : 'prose-green'}`}
            dangerouslySetInnerHTML={{ __html: seg.html }}
          />
        ) : (
          <InteractiveBlock key={seg.activity.id} activity={seg.activity} onResult={onActivityResult} />
        )
      )}
    </>
  );
}

export default function LessonViewer({
  title,
  subject,
  gradeLevel,
  sections,
  estimatedMinutes,
  accessibilityScore,
  interactiveActivities = [],
  onComplete,
  onSectionComplete,
  onActivityResult,
}: LessonViewerProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'x-large'>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [showA11yMenu, setShowA11yMenu] = useState(false);

  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);
  const a11yTriggerRef = useRef<HTMLButtonElement>(null);

  const progressPct = sections.length > 0
    ? Math.round((completedIds.size / sections.length) * 100)
    : 0;

  const fontSizeClass = { normal: 'text-base', large: 'text-lg', 'x-large': 'text-xl' }[fontSize];

  useEffect(() => {
    sectionHeadingRef.current?.focus();
  }, [currentSection]);

  const goNext = useCallback(() => {
    const current = sections[currentSection];
    if (!completedIds.has(current.id)) {
      const next = new Set(completedIds);
      next.add(current.id);
      setCompletedIds(next);
      onSectionComplete?.(current.id);
    }
    if (currentSection < sections.length - 1) {
      setCurrentSection((i) => i + 1);
    } else {
      onComplete?.();
    }
  }, [currentSection, completedIds, sections, onSectionComplete, onComplete]);

  const goPrev = useCallback(() => {
    if (currentSection > 0) setCurrentSection((i) => i - 1);
  }, [currentSection]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'n') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft' || e.key === 'p') { e.preventDefault(); goPrev(); }
      else if (e.key === 'Escape' && showA11yMenu) {
        setShowA11yMenu(false);
        a11yTriggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, showA11yMenu]);

  function handleActivityResult(result: ActivityResult) {
    onActivityResult?.(result);
  }

  if (sections.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-gray-500">
        No sections found in this lesson.
      </div>
    );
  }

  const bg = highContrast ? 'bg-black text-white' : 'bg-gray-50 text-gray-900';
  const cardBg = highContrast ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200';
  const mutedText = highContrast ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Skip to main content (WCAG SC 2.4.1) */}
      <a
        href="#lesson-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-green-600 focus:text-white focus:rounded-lg focus:font-semibold"
      >
        Skip to lesson content
      </a>

      {/* ARIA live region for section transitions (SC 4.1.3) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {`Section ${currentSection + 1} of ${sections.length}: ${sections[currentSection].title}`}
      </div>

      {/* ---- Header (role="banner") ---- */}
      <header role="banner" className={`sticky top-0 z-10 border-b shadow-sm ${cardBg}`}>
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-green-600 truncate">{title}</h1>
              <p className={`text-sm ${mutedText} mt-0.5`}>
                {subject} · Grade {gradeLevel} · {estimatedMinutes} min read
                {accessibilityScore !== undefined && (
                  <span className="ml-3 inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    A11y {Math.round(accessibilityScore * 100)}%
                  </span>
                )}
              </p>
            </div>

            {/* Accessibility menu trigger */}
            <button
              ref={a11yTriggerRef}
              onClick={() => setShowA11yMenu((v) => !v)}
              aria-expanded={showA11yMenu}
              aria-haspopup="dialog"
              aria-label="Accessibility settings"
              className={`ml-3 p-2 rounded-lg transition-colors ${highContrast ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>

            {/* Accessibility menu panel */}
            {showA11yMenu && (
              <div
                role="dialog"
                aria-label="Accessibility settings"
                className={`absolute right-4 top-16 w-64 border rounded-xl shadow-lg p-5 z-50 ${cardBg}`}
              >
                <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide">Accessibility</h2>
                <div className="space-y-4">
                  <fieldset>
                    <legend className="text-sm font-medium mb-2">Text Size</legend>
                    <div className="flex gap-2">
                      {(['normal', 'large', 'x-large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setFontSize(size)}
                          aria-pressed={fontSize === size}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                            fontSize === size
                              ? 'bg-green-600 text-white'
                              : highContrast
                              ? 'bg-gray-800 hover:bg-gray-700 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {size === 'normal' ? 'A' : size === 'large' ? 'A+' : 'A++'}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={highContrast}
                      onChange={(e) => setHighContrast(e.target.checked)}
                      className="w-4 h-4 accent-green-600"
                    />
                    <span className="text-sm">High Contrast</span>
                  </label>
                </div>

                <p className={`text-xs mt-4 ${mutedText}`}>Tip: Use ← → keys to navigate sections</p>
              </div>
            )}
          </div>

          {/* Progress bar (role="progressbar", SC 4.1.2) */}
          <div className="mt-4">
            <div className={`flex justify-between text-xs mb-1 ${mutedText}`}>
              <span>Section {currentSection + 1} of {sections.length}</span>
              <span>{progressPct}% complete</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Lesson progress: ${progressPct}%`}
              className={`w-full h-2 rounded-full overflow-hidden ${highContrast ? 'bg-gray-800' : 'bg-gray-200'}`}
            >
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ---- Body ---- */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Sidebar navigation (role="navigation") */}
          <aside className="w-56 flex-shrink-0 hidden md:block">
            <nav
              role="navigation"
              aria-label="Lesson sections"
              className={`sticky top-24 rounded-xl border p-4 ${cardBg}`}
            >
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${mutedText}`}>Sections</h2>
              <ul className="space-y-1">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <button
                      onClick={() => setCurrentSection(index)}
                      aria-current={currentSection === index ? 'step' : undefined}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        currentSection === index
                          ? 'bg-green-100 text-green-800 font-semibold'
                          : completedIds.has(section.id)
                          ? 'text-green-700 bg-green-50'
                          : highContrast
                          ? 'hover:bg-gray-800'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {completedIds.has(section.id) ? (
                        <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" aria-hidden="true" />
                      )}
                      <span className="truncate">{section.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main content area */}
          <main id="lesson-content" className="flex-1 min-w-0" aria-label="Lesson content">
            <article className={`rounded-xl border p-8 ${cardBg}`}>
              {/* Section heading — receives focus on navigation (SC 2.4.3) */}
              <h2
                ref={sectionHeadingRef}
                tabIndex={-1}
                className="text-3xl font-bold mb-6 text-green-600 outline-none"
              >
                {sections[currentSection].title}
              </h2>

              {/* Section content — mixes HTML and interactive React components */}
              <SectionContent
                html={sections[currentSection].content}
                activities={interactiveActivities}
                fontSizeClass={fontSizeClass}
                highContrast={highContrast}
                onActivityResult={handleActivityResult}
              />

              {/* Section navigation buttons */}
              <div className="flex items-center justify-between mt-10 pt-6 border-t">
                <button
                  onClick={goPrev}
                  disabled={currentSection === 0}
                  aria-label="Previous section"
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    currentSection === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : highContrast
                      ? 'bg-gray-800 hover:bg-gray-700 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  ← Previous
                </button>

                <button
                  onClick={goNext}
                  aria-label={currentSection === sections.length - 1 ? 'Complete lesson' : 'Next section'}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {currentSection === sections.length - 1 ? (
                    <>
                      Complete Lesson
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </>
                  ) : (
                    <>
                      Next Section
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </article>
          </main>
        </div>
      </div>
    </div>
  );
}
