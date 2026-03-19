"use client";

import { useMemo, useState } from "react";
import type { LessonSpec, TypedSceneSpec } from "@/lib/lesson-spec";

interface SceneMissionPlayerProps {
  lesson: LessonSpec;
  onResult: (params: { correct: boolean; askedForHint?: boolean; event: string }) => void;
}

const PALETTE_CLASS_MAP: Record<TypedSceneSpec["paletteKey"], string> = {
  frost:
    "border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 shadow-[0_18px_45px_-30px_rgba(14,116,144,0.5)]",
  sunset:
    "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-[0_18px_45px_-30px_rgba(217,119,6,0.45)]",
  garden:
    "border-lime-200 bg-gradient-to-br from-lime-50 via-white to-emerald-50 shadow-[0_18px_45px_-30px_rgba(101,163,13,0.45)]",
  cosmos:
    "border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-pink-50 shadow-[0_18px_45px_-30px_rgba(217,70,239,0.45)]",
  river:
    "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 shadow-[0_18px_45px_-30px_rgba(5,150,105,0.45)]",
  lab:
    "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50 shadow-[0_18px_45px_-30px_rgba(2,132,199,0.45)]",
  town:
    "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-[0_18px_45px_-30px_rgba(79,70,229,0.45)]",
};

function Frame({
  spec,
  badge,
  children,
}: {
  spec: TypedSceneSpec;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <article className={`rounded-[2rem] border-4 p-4 sm:p-5 ${PALETTE_CLASS_MAP[spec.paletteKey]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-600">{badge}</p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">{spec.title}</h3>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
            {spec.instruction}
          </p>
        </div>
        <div className="rounded-full border border-white/80 bg-white/85 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-700">
          Play to unlock
        </div>
      </div>
      {children}
    </article>
  );
}

export function SceneMissionPlayer({ lesson, onResult }: SceneMissionPlayerProps) {
  const spec = lesson.sceneSpec;

  switch (spec.kind) {
    case "choice_transform":
      return <ChoiceTransformMission spec={spec} onResult={onResult} />;
    case "transform_grid":
      return <TransformGridMission spec={spec} onResult={onResult} />;
    case "dispatch_board":
      return <DispatchBoardMission spec={spec} onResult={onResult} />;
    case "number_builder":
      return <NumberBuilderMission spec={spec} onResult={onResult} />;
    case "array_garden":
      return <ArrayGardenMission spec={spec} onResult={onResult} />;
    case "state_slider":
      return <StateSliderMission spec={spec} onResult={onResult} />;
    case "tool_meter":
      return <ToolMeterMission spec={spec} onResult={onResult} />;
    case "fallback_tap":
      return <FallbackTapMission spec={spec} onResult={onResult} />;
    default:
      return null;
  }
}

function ChoiceTransformMission({
  spec,
  onResult,
}: {
  spec: Extract<TypedSceneSpec, { kind: "choice_transform" }>;
  onResult: SceneMissionPlayerProps["onResult"];
}) {
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const currentChoice = spec.choices.find((choice) => choice.id === choiceId) ?? null;
  const isSuccess = Boolean(currentChoice?.isCorrect);

  function choose(nextChoiceId: string) {
    const nextChoice = spec.choices.find((choice) => choice.id === nextChoiceId);
    if (!nextChoice) return;
    setChoiceId(nextChoiceId);
    onResult({
      correct: nextChoice.isCorrect,
      event: nextChoice.isCorrect ? "scene_choice_unlock" : "scene_choice_retry",
    });
  }

  return (
    <Frame spec={spec} badge="Agentic Scene Spec">
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="rounded-3xl border-2 border-white/80 bg-white/90 p-4 text-center">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{spec.surfaceLabel}</p>
          <div className={`mt-3 text-7xl ${isSuccess ? "animate-pulse" : ""}`}>
            {isSuccess ? spec.successEmoji : spec.idleEmoji}
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            {isSuccess ? spec.successMessage : spec.helperText}
          </p>
        </div>
        <div className="grid gap-2">
          {spec.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => choose(choice.id)}
              className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold transition ${
                choiceId === choice.id
                  ? "border-slate-900 bg-slate-100 text-slate-900"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="mr-2 text-lg">{choice.emoji}</span>
              {choice.label}
            </button>
          ))}
        </div>
      </div>
      {choiceId ? (
        <div
          className={`mt-4 rounded-2xl border-2 px-4 py-3 text-sm font-semibold ${
            isSuccess
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {isSuccess ? spec.rewardFact : spec.failureMessage}
        </div>
      ) : null}
    </Frame>
  );
}

function TransformGridMission({
  spec,
  onResult,
}: {
  spec: Extract<TypedSceneSpec, { kind: "transform_grid" }>;
  onResult: SceneMissionPlayerProps["onResult"];
}) {
  const [revealed, setRevealed] = useState<string[]>([]);

  function reveal(id: string) {
    if (revealed.includes(id)) return;
    setRevealed((current) => [...current, id]);
    onResult({ correct: true, event: "scene_transform_unlock" });
  }

  return (
    <Frame spec={spec} badge="Agentic Scene Spec">
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {spec.cards.map((card) => {
          const isRevealed = revealed.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => reveal(card.id)}
              className={`rounded-3xl border-2 p-4 text-left transition ${
                isRevealed
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                {isRevealed ? "Now" : "Long ago"}
              </p>
              <p className="mt-2 text-4xl">{isRevealed ? card.afterEmoji : card.beforeEmoji}</p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {isRevealed ? card.afterLabel : card.beforeLabel}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-700">
                {isRevealed ? card.fact : spec.helperText}
              </p>
            </button>
          );
        })}
      </div>
      {revealed.length > 0 ? (
        <div className="mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          {spec.rewardFact}
        </div>
      ) : null}
    </Frame>
  );
}

function DispatchBoardMission({
  spec,
  onResult,
}: {
  spec: Extract<TypedSceneSpec, { kind: "dispatch_board" }>;
  onResult: SceneMissionPlayerProps["onResult"];
}) {
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [message, setMessage] = useState(spec.startMessage);

  function dispatch(service: string) {
    if (!selectedProblemId) {
      setMessage(spec.helperText);
      onResult({ correct: false, event: "scene_dispatch_waiting" });
      return;
    }

    const problem = spec.problems.find((item) => item.id === selectedProblemId);
    if (!problem) return;

    if (problem.service === service) {
      if (!resolvedIds.includes(problem.id)) {
        setResolvedIds((current) => [...current, problem.id]);
      }
      setMessage(problem.fact);
      onResult({ correct: true, event: "scene_dispatch_resolved" });
      return;
    }

    setMessage(spec.mismatchMessage);
    onResult({ correct: false, event: "scene_dispatch_retry" });
  }

  return (
    <Frame spec={spec} badge="Agentic Scene Spec">
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="grid gap-2">
          {spec.problems.map((problem) => {
            const done = resolvedIds.includes(problem.id);
            return (
              <button
                key={problem.id}
                type="button"
                onClick={() => setSelectedProblemId(problem.id)}
                className={`rounded-2xl border-2 px-4 py-3 text-left transition ${
                  done
                    ? "border-emerald-300 bg-emerald-50"
                    : selectedProblemId === problem.id
                      ? "border-slate-900 bg-slate-100"
                      : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-bold text-slate-900">
                  <span className="mr-2">{problem.emoji}</span>
                  {problem.label}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  {done ? "Fixed" : "Needs a helper team"}
                </p>
              </button>
            );
          })}
        </div>
        <div className="rounded-3xl border-2 border-white/80 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Helper Radio</p>
          <div className="mt-3 grid gap-2">
            {spec.services.map((service) => (
              <button
                key={service}
                type="button"
                onClick={() => dispatch(service)}
                className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-900 hover:bg-indigo-100"
              >
                {service}
              </button>
            ))}
          </div>
          <p className="mt-4 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
            {message}
          </p>
        </div>
      </div>
    </Frame>
  );
}

function NumberBuilderMission({
  spec,
  onResult,
}: {
  spec: Extract<TypedSceneSpec, { kind: "number_builder" }>;
  onResult: SceneMissionPlayerProps["onResult"];
}) {
  const [hundreds, setHundreds] = useState(spec.hundreds);
  const [tens, setTens] = useState(spec.tens);
  const [ones, setOnes] = useState(spec.ones);
  const [built, setBuilt] = useState(false);
  const total = hundreds * 100 + tens * 10 + ones;

  function build() {
    setBuilt(true);
    onResult({ correct: true, event: "scene_number_built" });
  }

  return (
    <Frame spec={spec} badge="Agentic Scene Spec">
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3 rounded-3xl border-2 border-white/80 bg-white p-4">
          {[
            { label: "Hundreds", value: hundreds, set: setHundreds, color: "bg-blue-500" },
            { label: "Tens", value: tens, set: setTens, color: "bg-purple-500" },
            { label: "Ones", value: ones, set: setOnes, color: "bg-emerald-500" },
          ].map((control) => (
            <label key={control.label} className="block">
              <div className="mb-1 flex items-center justify-between text-sm font-bold text-slate-700">
                <span>{control.label}</span>
                <span>{control.value}</span>
              </div>
              <input
                type="range"
                min={0}
                max={9}
                value={control.value}
                onChange={(event) => control.set(Number(event.target.value))}
                className={`h-2 w-full cursor-pointer appearance-none rounded-full ${control.color}`}
              />
            </label>
          ))}
          <button
            type="button"
            onClick={build}
            className="w-full rounded-2xl bg-fuchsia-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-fuchsia-700"
          >
            {spec.actionLabel}
          </button>
        </div>
        <div className="rounded-3xl border-2 border-white/80 bg-white p-4 text-center">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Build Bay</p>
          <p className="mt-2 text-7xl">{built ? spec.successEmoji : spec.idleEmoji}</p>
          <p className="mt-2 text-4xl font-black text-slate-900">{total}</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {hundreds} hundreds + {tens} tens + {ones} ones
          </p>
          {built ? (
            <p className="mt-3 rounded-2xl bg-fuchsia-50 px-3 py-2 text-sm font-semibold text-fuchsia-900">
              {spec.responseLine} {spec.rewardFact}
            </p>
          ) : null}
        </div>
      </div>
    </Frame>
  );
}

function ArrayGardenMission({
  spec,
  onResult,
}: {
  spec: Extract<TypedSceneSpec, { kind: "array_garden" }>;
  onResult: SceneMissionPlayerProps["onResult"];
}) {
  const [rows, setRows] = useState(spec.rows);
  const [columns, setColumns] = useState(spec.columns);
  const [planted, setPlanted] = useState(false);
  const totalFlowers = rows * columns;

  function plant() {
    setPlanted(true);
    onResult({ correct: true, event: "scene_array_planted" });
  }

  return (
    <Frame spec={spec} badge="Agentic Scene Spec">
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-3 rounded-3xl border-2 border-white/80 bg-white p-4">
          <label className="block">
            <div className="mb-1 flex items-center justify-between text-sm font-bold text-slate-700">
              <span>Rows</span>
              <span>{rows}</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={rows}
              onChange={(event) => setRows(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-lime-500"
            />
          </label>
          <label className="block">
            <div className="mb-1 flex items-center justify-between text-sm font-bold text-slate-700">
              <span>Columns</span>
              <span>{columns}</span>
            </div>
            <input
              type="range"
              min={1}
              max={6}
              value={columns}
              onChange={(event) => setColumns(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-emerald-500"
            />
          </label>
          <button
            type="button"
            onClick={plant}
            className="w-full rounded-2xl bg-lime-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-lime-700"
          >
            {spec.actionLabel}
          </button>
        </div>
        <div className="rounded-3xl border-2 border-white/80 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Bloom Field</p>
          <div
            className="mt-3 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: totalFlowers }).map((_, index) => (
              <div
                key={index}
                className={`flex h-10 items-center justify-center rounded-xl text-xl ${
                  planted ? "bg-lime-100" : "bg-slate-100"
                }`}
              >
                {planted ? spec.bloomEmoji : "•"}
              </div>
            ))}
          </div>
          {planted ? (
            <p className="mt-3 rounded-2xl bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-900">
              {rows} rows of {columns} makes {totalFlowers}. {spec.rewardFact}
            </p>
          ) : null}
        </div>
      </div>
    </Frame>
  );
}

function StateSliderMission({
  spec,
  onResult,
}: {
  spec: Extract<TypedSceneSpec, { kind: "state_slider" }>;
  onResult: SceneMissionPlayerProps["onResult"];
}) {
  const [value, setValue] = useState(spec.initialValue);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([spec.stages[0]?.id ?? ""]);
  const currentStage = [...spec.stages]
    .reverse()
    .find((stage) => value >= stage.threshold) ?? spec.stages[0];

  function update(nextValue: number) {
    setValue(nextValue);
    spec.stages.forEach((stage, index) => {
      if (index > 0 && nextValue >= stage.threshold && !unlockedIds.includes(stage.id)) {
        setUnlockedIds((current) => [...current, stage.id]);
        onResult({ correct: true, event: `scene_state_${stage.id}` });
      }
    });
  }

  return (
    <Frame spec={spec} badge="Agentic Scene Spec">
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="rounded-3xl border-2 border-white/80 bg-white p-4">
          <label className="block">
            <div className="mb-1 flex items-center justify-between text-sm font-bold text-slate-700">
              <span>Heat</span>
              <span>{value}°</span>
            </div>
            <input
              type="range"
              min={spec.minValue}
              max={spec.maxValue}
              value={value}
              onChange={(event) => update(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-sky-500"
            />
          </label>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-center text-7xl">
            {currentStage.emoji}
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-slate-700">
            Now showing: {currentStage.label}
          </p>
        </div>
        <div className="rounded-3xl border-2 border-white/80 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Unlock Notes</p>
          <div className="mt-3 grid gap-2">
            {spec.stages.map((stage) => {
              const unlocked = unlockedIds.includes(stage.id);
              return (
                <div
                  key={stage.id}
                  className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
                    unlocked ? "bg-cyan-50 text-cyan-900" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {stage.label}: {unlocked ? stage.fact : "Keep exploring the slider."}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Frame>
  );
}

function ToolMeterMission({
  spec,
  onResult,
}: {
  spec: Extract<TypedSceneSpec, { kind: "tool_meter" }>;
  onResult: SceneMissionPlayerProps["onResult"];
}) {
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [message, setMessage] = useState(spec.startMessage);
  const risk = useMemo(() => {
    const reduction = spec.tools
      .filter((tool) => placedIds.includes(tool.id))
      .reduce((sum, tool) => sum + tool.reduction, 0);
    return Math.max(spec.floorValue, 100 - reduction);
  }, [placedIds, spec.floorValue, spec.tools]);

  function place(id: string) {
    if (placedIds.includes(id)) return;
    const nextIds = [...placedIds, id];
    setPlacedIds(nextIds);
    onResult({ correct: true, event: "scene_tool_placed" });

    const nextReduction = spec.tools
      .filter((tool) => nextIds.includes(tool.id))
      .reduce((sum, tool) => sum + tool.reduction, 0);
    const nextRisk = Math.max(spec.floorValue, 100 - nextReduction);

    if (nextRisk <= 20) {
      setMessage(spec.successMessage);
      onResult({ correct: true, event: "scene_tool_success" });
      return;
    }

    setMessage(spec.helperText);
  }

  return (
    <Frame spec={spec} badge="Agentic Scene Spec">
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-3xl border-2 border-white/80 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Toolbox</p>
          <div className="mt-3 grid gap-2">
            {spec.tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => place(tool.id)}
                disabled={placedIds.includes(tool.id)}
                className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-bold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="mr-2">{tool.emoji}</span>
                {tool.label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border-2 border-white/80 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">River Meter</p>
          <div className="mt-3 h-5 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${
                risk <= 20 ? "bg-emerald-500" : risk <= 50 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${risk}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-700">Risk: {risk}%</p>
          <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
            {message}
          </p>
          {risk <= 20 ? (
            <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
              {spec.rewardFact}
            </p>
          ) : null}
        </div>
      </div>
    </Frame>
  );
}

function FallbackTapMission({
  spec,
  onResult,
}: {
  spec: Extract<TypedSceneSpec, { kind: "fallback_tap" }>;
  onResult: SceneMissionPlayerProps["onResult"];
}) {
  const [active, setActive] = useState(false);

  function unlock() {
    setActive(true);
    onResult({ correct: true, event: "scene_fallback_unlock" });
  }

  return (
    <Frame spec={spec} badge="Agentic Scene Spec">
      <div className="mt-4 rounded-3xl border-2 border-white/80 bg-white p-4">
        <button
          type="button"
          onClick={unlock}
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-wide text-white"
        >
          {spec.buttonLabel}
        </button>
        {active ? (
          <p className="mt-3 rounded-2xl bg-cyan-50 px-3 py-3 text-sm font-semibold text-cyan-900">
            {spec.rewardFact}
          </p>
        ) : null}
      </div>
    </Frame>
  );
}
