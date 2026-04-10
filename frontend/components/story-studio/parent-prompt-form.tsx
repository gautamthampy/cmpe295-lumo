"use client";

import { useEffect, useMemo, useState } from "react";

import {
  GRADE2_CURRICULUM,
  type DistrictId,
  type SubjectId,
} from "@/lib/story-studio/kindergarten-curriculum";
import { PARENT_INPUT_SCHEMA, type ParentInput } from "@/lib/story-studio/lesson-spec";

interface ParentPromptFormProps {
  isLoading: boolean;
  learners: Array<{
    studentId: string;
    displayName: string;
    gradeLevel: number;
  }>;
  onSubmit: (input: ParentInput) => void;
}

const DISTRICT_OPTIONS: Array<{ value: DistrictId; label: string }> = [
  { value: "SJUSD", label: "SJUSD" },
  { value: "ESD", label: "ESD" },
];
const SUBJECT_OPTIONS: Array<{ value: SubjectId; label: string }> = [
  { value: "science", label: "Science" },
  { value: "math", label: "Math" },
  { value: "ela", label: "ELA" },
  { value: "social_studies", label: "Social Studies" },
];

export function ParentPromptForm({ isLoading, learners, onSubmit }: ParentPromptFormProps) {
  const [district, setDistrict] = useState<DistrictId>("SJUSD");
  const [subject, setSubject] = useState<SubjectId>("ela");
  const [curriculumCode, setCurriculumCode] = useState("SJUSD-G2-ELA-U1");
  const [childName, setChildName] = useState(learners[0]?.displayName ?? "Ava");
  const [childInterestsText, setChildInterestsText] = useState("animals, nature");
  const [textStyle, setTextStyle] = useState<ParentInput["textStyle"]>("balanced");
  const [notes, setNotes] = useState(
    "Needs visual examples before independent problem solving."
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (learners.length === 0) {
      return;
    }

    const hasCurrentLearner = learners.some((learner) => learner.displayName === childName);
    if (!hasCurrentLearner) {
      setChildName(learners[0]?.displayName ?? "Ava");
    }
  }, [childName, learners]);

  const curriculumOptions = useMemo(
    () =>
      GRADE2_CURRICULUM.filter(
        (entry) => entry.district === district && entry.subject === subject
      ),
    [district, subject]
  );

  function handleSubjectOrDistrictChange(nextDistrict: DistrictId, nextSubject: SubjectId) {
    const options = GRADE2_CURRICULUM.filter(
      (entry) => entry.district === nextDistrict && entry.subject === nextSubject
    );
    setCurriculumCode(options[0]?.code ?? "");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsed = PARENT_INPUT_SCHEMA.safeParse({
      district,
      subject,
      curriculumCode,
      childName,
      childInterests: childInterestsText
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean),
      textStyle,
      notes,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please complete all fields.");
      return;
    }

    onSubmit(parsed.data);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] bg-surface-container-lowest p-6 shadow-[0_20px_50px_rgba(36,28,12,0.08)]"
    >
      <p className="font-label text-xs font-bold uppercase tracking-[0.28em] text-outline">
        Lesson Setup
      </p>
      <h2 className="mt-2 font-headline text-3xl font-extrabold tracking-[-0.04em] text-on-surface">
        Plan one learner&apos;s story mission
      </h2>
      <p className="mt-2 font-body text-sm leading-7 text-on-surface-variant">
        Pick a Grade 2 topic, add the learner&apos;s name and interests, and let LUMO turn that into a
        short story plus a playable activity.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-label font-semibold text-on-surface">District</span>
          <select
            value={district}
            onChange={(event) => {
              const next = event.target.value as DistrictId;
              setDistrict(next);
              handleSubjectOrDistrictChange(next, subject);
            }}
            className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body font-semibold text-on-surface"
          >
            {DISTRICT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-label font-semibold text-on-surface">Subject</span>
          <select
            value={subject}
            onChange={(event) => {
              const next = event.target.value as SubjectId;
              setSubject(next);
              handleSubjectOrDistrictChange(district, next);
            }}
            className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body font-semibold text-on-surface"
          >
            {SUBJECT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-label font-semibold text-on-surface">Topic</span>
        <select
          value={curriculumCode}
          onChange={(event) => setCurriculumCode(event.target.value)}
          className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body font-semibold text-on-surface"
        >
          {curriculumOptions.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.title}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-label font-semibold text-on-surface">Child Name</span>
          {learners.length > 0 ? (
            <select
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body font-semibold text-on-surface"
            >
              {learners.map((learner) => (
                <option key={learner.studentId} value={learner.displayName}>
                  {learner.displayName} (Grade {learner.gradeLevel})
                </option>
              ))}
            </select>
          ) : (
            <input
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body font-semibold text-on-surface"
              placeholder="Ava"
            />
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-label font-semibold text-on-surface">Learning Style</span>
          <select
            value={textStyle}
            onChange={(event) => setTextStyle(event.target.value as ParentInput["textStyle"])}
            className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body font-semibold text-on-surface"
          >
            <option value="visual_first">Visual first</option>
            <option value="balanced">Balanced</option>
            <option value="text_light">Very little text</option>
          </select>
        </label>
      </div>

      <label className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-label font-semibold text-on-surface">Child Interests</span>
        <input
          value={childInterestsText}
          onChange={(event) => setChildInterestsText(event.target.value)}
          className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body font-semibold text-on-surface"
          placeholder="animals, space, music"
        />
      </label>

      <label className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-label font-semibold text-on-surface">Notes for Lumo</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-24 rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body font-semibold text-on-surface"
          placeholder="Needs visual examples, likes short directions, enjoys animals or movement."
        />
      </label>

      {error ? (
        <p className="mt-3 rounded-2xl bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-5 w-full rounded-2xl bg-primary px-4 py-3 font-label text-sm font-bold uppercase tracking-[0.18em] text-on-primary transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Generating story + mission..." : "Generate Story + Mission"}
      </button>
    </form>
  );
}