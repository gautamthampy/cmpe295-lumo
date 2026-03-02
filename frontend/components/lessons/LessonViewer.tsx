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

function parseContentSegments(
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
            className={`prose prose-lg max-w-none ${fontSizeClass} ${highContrast ? 'prose-invert' : 'prose-violet'}`}
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
      <div className="px-4 py-12 text-center text-slate-500">
        No sections found in this lesson.
      </div>
    );
  }

  const bg = highContrast ? 'bg-black text-white' : '';
  const cardBg = highContrast ? 'bg-gray-900 border-gray-700' : 'bg-white border-2 border-violet-50';
  const mutedText = highContrast ? 'text-gray-300' : 'text-slate-500';

  return (
    <div className={`${bg}`}>
      <a
        href="#lesson-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-xl focus:font-semibold"
      >
        Skip to lesson content
      </a>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {`Section ${currentSection + 1} of ${sections.length}: ${sections[currentSection].title}`}
      </div>

      {/* Header */}
      <header role="banner" className={`sticky top-0 z-10 rounded-[1.25rem] shadow-sm mb-4 ${cardBg}`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-violet-700 truncate">{title}</h1>
              <p className={`text-sm ${mutedText} mt-0.5`}>
                {subject} · Grade {gradeLevel} · {estimatedMinutes} min read
                {accessibilityScore !== undefined && (
                  <span className="ml-3 tag-pill text-[10px] inline-flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    A11y {Math.round(accessibilityScore * 100)}%
                  </span>
                )}
              </p>
            </div>

            <button
              ref={a11yTriggerRef}
              onClick={() => setShowA11yMenu((v) => !v)}
              aria-expanded={showA11yMenu}
              aria-haspopup="dialog"
              aria-label="Accessibility settings"
              className={`ml-3 p-2 rounded-xl transition-colors ${highContrast ? 'hover:bg-gray-800' : 'hover:bg-violet-50'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>

            {showA11yMenu && (
              <div
                role="dialog"
                aria-label="Accessibility settings"
                className={`absolute right-4 top-16 w-64 rounded-2xl shadow-lg p-5 z-50 ${highContrast ? 'bg-gray-900 border border-gray-700' : 'bg-white border-2 border-violet-100'}`}
              >
                <h2 className="font-bold mb-4 text-sm uppercase tracking-wide">Accessibility</h2>
                <div className="space-y-4">
                  <fieldset>
                    <legend className="text-sm font-medium mb-2">Text Size</legend>
                    <div className="flex gap-2">
                      {(['normal', 'large', 'x-large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setFontSize(size)}
                          aria-pressed={fontSize === size}
                          className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
                            fontSize === size
                              ? 'bg-violet-600 text-white'
                              : highContrast
                              ? 'bg-gray-800 hover:bg-gray-700 text-white'
                              : 'bg-violet-50 hover:bg-violet-100 text-slate-700'
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
                      className="w-4 h-4 accent-violet-600"
                    />
                    <span className="text-sm font-medium">High Contrast</span>
                  </label>
                </div>

                <p className={`text-xs mt-4 ${mutedText}`}>Tip: Use ← → keys to navigate</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className={`flex justify-between text-xs mb-1.5 ${mutedText} font-medium`}>
              <span>Section {currentSection + 1} of {sections.length}</span>
              <span>{progressPct}% complete</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Lesson progress: ${progressPct}%`}
              className={`w-full h-3 rounded-full overflow-hidden ${highContrast ? 'bg-gray-800' : 'bg-violet-100'}`}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, var(--color-primary-base), var(--color-accent-pink))',
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="px-2">
        <div className="flex gap-4">
          {/* Section sidebar */}
          <aside className="w-48 flex-shrink-0 hidden lg:block">
            <nav
              role="navigation"
              aria-label="Lesson sections"
              className={`sticky top-24 rounded-2xl p-4 ${cardBg}`}
            >
              <h2 className={`text-xs font-bold uppercase tracking-wide mb-3 ${mutedText}`}>Sections</h2>
              <ul className="space-y-1">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <button
                      onClick={() => setCurrentSection(index)}
                      aria-current={currentSection === index ? 'step' : undefined}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${
                        currentSection === index
                          ? 'bg-violet-100 text-violet-800 font-bold'
                          : completedIds.has(section.id)
                          ? 'text-violet-600 bg-violet-50'
                          : highContrast
                          ? 'hover:bg-gray-800'
                          : 'hover:bg-violet-50 text-slate-600'
                      }`}
                    >
                      {completedIds.has(section.id) ? (
                        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-violet-200 flex-shrink-0" aria-hidden="true" />
                      )}
                      <span className="truncate">{section.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Content */}
          <main id="lesson-content" className="flex-1 min-w-0" aria-label="Lesson content">
            <article className={`rounded-2xl p-8 ${cardBg}`}>
              <h2
                ref={sectionHeadingRef}
                tabIndex={-1}
                className="text-2xl font-black mb-6 text-violet-700 outline-none"
              >
                {sections[currentSection].title}
              </h2>

              <SectionContent
                html={sections[currentSection].content}
                activities={interactiveActivities}
                fontSizeClass={fontSizeClass}
                highContrast={highContrast}
                onActivityResult={handleActivityResult}
              />

              <div className="flex items-center justify-between mt-10 pt-6 border-t border-violet-50">
                <button
                  onClick={goPrev}
                  disabled={currentSection === 0}
                  aria-label="Previous section"
                  className={`px-6 py-3 rounded-full font-bold transition-all ${
                    currentSection === 0
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : highContrast
                      ? 'bg-gray-800 hover:bg-gray-700 text-white'
                      : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                  }`}
                >
                  ← Previous
                </button>

                <button
                  onClick={goNext}
                  aria-label={currentSection === sections.length - 1 ? 'Complete lesson' : 'Next section'}
                  className="btn-primary px-6 py-3 flex items-center gap-2"
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
