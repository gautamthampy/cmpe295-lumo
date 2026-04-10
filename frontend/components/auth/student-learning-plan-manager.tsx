"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  authRequest,
  authRoutes,
  type StudentLearningPlanPayload,
  type StudentLearningPlanUpdatePayload,
  type SubjectCatalogItem,
} from "@/lib/auth";

type StudentLearningPlanManagerProps = {
  studentId: string;
  gradeLevel: number;
};

type SelectionState = {
  selectedSlugs: Set<string>;
  selectedTopics: Record<string, Set<string>>;
  topicOptions: Record<string, string[]>;
};

function cloneSelectionState(state: SelectionState): SelectionState {
  return {
    selectedSlugs: new Set(state.selectedSlugs),
    selectedTopics: Object.fromEntries(
      Object.entries(state.selectedTopics).map(([slug, topics]) => [slug, new Set(topics)])
    ),
    topicOptions: Object.fromEntries(
      Object.entries(state.topicOptions).map(([slug, topics]) => [slug, [...topics]])
    ),
  };
}

export function StudentLearningPlanManager({ studentId, gradeLevel }: StudentLearningPlanManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [subjects, setSubjects] = useState<SubjectCatalogItem[]>([]);
  const [selection, setSelection] = useState<SelectionState>({
    selectedSlugs: new Set(),
    selectedTopics: {},
    topicOptions: {},
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const catalogPath = `${authRoutes.subjects}?grade_level=${gradeLevel}`;

    Promise.all([
      authRequest<SubjectCatalogItem[]>(catalogPath, { method: "GET", cache: "no-store" }),
      authRequest<StudentLearningPlanPayload>(authRoutes.studentLearningPlanFor(studentId), {
        method: "GET",
        cache: "no-store",
      }),
    ])
      .then(([catalog, plan]) => {
        if (cancelled) {
          return;
        }

        const selectedSlugs = new Set(plan.subjects.map((subject) => subject.slug));
        const selectedTopics: Record<string, Set<string>> = {};
        const topicOptions: Record<string, string[]> = {};

        for (const subject of plan.subjects) {
          selectedTopics[subject.slug] = new Set(subject.topics);
          topicOptions[subject.slug] =
            subject.availableTopics && subject.availableTopics.length ? subject.availableTopics : [...subject.topics];
        }

        for (const subject of catalog) {
          if (!topicOptions[subject.slug]) {
            topicOptions[subject.slug] = [];
          }
          if (!selectedTopics[subject.slug]) {
            selectedTopics[subject.slug] = new Set();
          }
        }

        setConfigured(plan.configured);
        setSubjects(catalog);
        setSelection({ selectedSlugs, selectedTopics, topicOptions });
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "Unable to load this student learning plan.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [gradeLevel, studentId]);

  const orderedSubjects = useMemo(() => subjects, [subjects]);

  function toggleSubject(slug: string) {
    setSelection((current) => {
      const next = cloneSelectionState(current);
      if (next.selectedSlugs.has(slug)) {
        next.selectedSlugs.delete(slug);
      } else {
        next.selectedSlugs.add(slug);
      }
      return next;
    });
  }

  function toggleTopic(slug: string, topic: string) {
    setSelection((current) => {
      const next = cloneSelectionState(current);
      const selectedForSubject = next.selectedTopics[slug] ?? new Set<string>();
      if (selectedForSubject.has(topic)) {
        selectedForSubject.delete(topic);
      } else {
        selectedForSubject.add(topic);
      }
      next.selectedTopics[slug] = selectedForSubject;
      return next;
    });
  }

  async function saveLearningPlan() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload: StudentLearningPlanUpdatePayload = {
      subjectSelections: Array.from(selection.selectedSlugs).map((slug) => ({
        slug,
        topics: Array.from(selection.selectedTopics[slug] ?? []),
      })),
    };

    try {
      const result = await authRequest<StudentLearningPlanPayload>(authRoutes.studentLearningPlanFor(studentId), {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setConfigured(result.configured);
      setMessage("Learning plan saved. This student will now see your selected subjects and topics.");
      startTransition(() => router.refresh());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save this learning plan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="font-body text-sm leading-6 text-on-surface-variant">Loading learning plan...</p>;
  }

  return (
    <div className="space-y-3 rounded-[1.2rem] bg-surface-container-low px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-label text-xs font-bold uppercase tracking-[0.22em] text-outline">Learning plan</p>
          <p className="mt-1 font-body text-xs leading-6 text-on-surface-variant">
            Choose which Grade {gradeLevel} subjects and topics show up on this learner&apos;s /learn page.
          </p>
        </div>
        <span className="rounded-full bg-surface-container-high px-3 py-1 font-label text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
          {configured ? "Configured" : "Using defaults"}
        </span>
      </div>

      {error ? <p role="alert" className="rounded-lg bg-error-container px-3 py-2 font-body text-xs text-error">{error}</p> : null}
      {message ? <p className="rounded-lg bg-primary-fixed px-3 py-2 font-body text-xs text-primary">{message}</p> : null}

      <div className="space-y-3">
        {orderedSubjects.map((subject) => {
          const isSelected = selection.selectedSlugs.has(subject.slug);
          const topicOptions = selection.topicOptions[subject.slug] ?? [];
          const selectedTopics = selection.selectedTopics[subject.slug] ?? new Set<string>();

          return (
            <div key={subject.subject_id} className="rounded-xl bg-surface-container-highest px-3 py-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSubject(subject.slug)}
                  className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary-fixed"
                />
                <span className="font-label text-sm font-semibold text-on-surface">{subject.name}</span>
              </label>

              {isSelected && topicOptions.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {topicOptions.map((topic) => {
                    const topicChecked = selectedTopics.has(topic);
                    return (
                      <label
                        key={`${subject.slug}-${topic}`}
                        className={`cursor-pointer rounded-full px-3 py-1 font-label text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                          topicChecked
                            ? "bg-primary-fixed text-primary"
                            : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={topicChecked}
                          onChange={() => toggleTopic(subject.slug, topic)}
                          className="sr-only"
                        />
                        {topic}
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={saveLearningPlan}
        className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 font-label text-sm font-semibold text-on-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save learning plan"}
      </button>
    </div>
  );
}
