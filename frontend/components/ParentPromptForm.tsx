"use client";

import { useMemo, useState } from "react";
import {
  GRADE2_CURRICULUM,
  type DistrictId,
  type SubjectId,
} from "@/lib/kindergarten-curriculum";
import { PARENT_INPUT_SCHEMA, type ParentInput } from "@/lib/lesson-spec";

interface ParentPromptFormProps {
  isLoading: boolean;
  onSubmit: (input: ParentInput) => void;
}

const DISTRICT_OPTIONS: DistrictId[] = ["SJUSD", "ESD"];
const SUBJECT_OPTIONS: SubjectId[] = ["science", "math", "ela", "social_studies"];

export function ParentPromptForm({ isLoading, onSubmit }: ParentPromptFormProps) {
  const [district, setDistrict] = useState<DistrictId>("SJUSD");
  const [subject, setSubject] = useState<SubjectId>("ela");
  const [curriculumCode, setCurriculumCode] = useState("SJUSD-G2-ELA-U1");
  const [childName, setChildName] = useState("Ava");
  const [childInterestsText, setChildInterestsText] = useState("animals, nature");
  const [textStyle, setTextStyle] = useState<ParentInput["textStyle"]>("balanced");
  const [notes, setNotes] = useState("Needs visual examples before independent problem solving.");
  const [error, setError] = useState("");

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
      className="rounded-[2rem] border-4 border-cyan-200 bg-white/90 p-6 shadow-[0_22px_55px_-34px_rgba(8,145,178,0.45)]"
    >
      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">Parent Setup</p>
      <h2 className="mt-2 text-3xl font-black text-slate-900">Design the learning adventure</h2>
      <p className="mt-2 text-sm font-medium text-slate-600">
        Pick a Grade 2 district unit or module and share a little context about your child.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-bold text-slate-700">District</span>
          <select
            value={district}
            onChange={(event) => {
              const next = event.target.value as DistrictId;
              setDistrict(next);
              handleSubjectOrDistrictChange(next, subject);
            }}
            className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-800"
          >
            {DISTRICT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-bold text-slate-700">Subject</span>
          <select
            value={subject}
            onChange={(event) => {
              const next = event.target.value as SubjectId;
              setSubject(next);
              handleSubjectOrDistrictChange(district, next);
            }}
            className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-800"
          >
            {SUBJECT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-bold text-slate-700">Unit or Module</span>
        <select
          value={curriculumCode}
          onChange={(event) => setCurriculumCode(event.target.value)}
          className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-800"
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
          <span className="font-bold text-slate-700">Child Name</span>
          <input
            value={childName}
            onChange={(event) => setChildName(event.target.value)}
            className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-800"
            placeholder="Ava"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-bold text-slate-700">Learning Style</span>
          <select
            value={textStyle}
            onChange={(event) =>
              setTextStyle(event.target.value as ParentInput["textStyle"])
            }
            className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-800"
          >
            <option value="visual_first">Visual first</option>
            <option value="balanced">Balanced</option>
            <option value="text_light">Very little text</option>
          </select>
        </label>
      </div>

      <label className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-bold text-slate-700">Child Interests (comma-separated)</span>
        <input
          value={childInterestsText}
          onChange={(event) => setChildInterestsText(event.target.value)}
          className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-800"
          placeholder="animals, vehicles, colors"
        />
      </label>

      <label className="mt-3 flex flex-col gap-1 text-sm">
        <span className="font-bold text-slate-700">Notes for the planner</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-24 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-800"
          placeholder="Short attention span, likes movement."
        />
      </label>

      {error ? (
        <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:from-cyan-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:from-cyan-300 disabled:to-indigo-300"
      >
        {isLoading ? "Generating story + lesson..." : "Generate Story + Mission"}
      </button>
    </form>
  );
}
