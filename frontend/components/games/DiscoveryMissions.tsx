"use client";

import { useMemo, useState } from "react";
import type { LessonSpec } from "@/lib/lesson-spec";

interface DiscoveryMissionsProps {
  lesson: LessonSpec;
  onResult: (params: { correct: boolean; askedForHint?: boolean; event: string }) => void;
}

interface MissionProps {
  lesson: LessonSpec;
  onResult: (params: { correct: boolean; askedForHint?: boolean; event: string }) => void;
}

const RIVER_TOOLS = [
  { id: "roots", label: "Tree Roots", emoji: "🌱", reduction: 35 },
  { id: "rocks", label: "Heavy Rocks", emoji: "🪨", reduction: 30 },
  { id: "logs", label: "River Logs", emoji: "🪵", reduction: 20 },
] as const;

export function DiscoveryMissions({ lesson, onResult }: DiscoveryMissionsProps) {
  if (lesson.conceptFamily === "habitats_and_survival" || lesson.conceptFamily === "animal_discoveries") {
    return <CreatureCrafterMission lesson={lesson} onResult={onResult} />;
  }
  if (lesson.conceptFamily === "past_and_present" || lesson.conceptFamily === "changes_over_time") {
    return <MagicAtticMission lesson={lesson} onResult={onResult} />;
  }
  if (
    lesson.conceptFamily === "government_and_community" ||
    lesson.conceptFamily === "community_difference" ||
    lesson.conceptFamily === "buyers_and_sellers"
  ) {
    return <TownFixerMission lesson={lesson} onResult={onResult} />;
  }
  if (lesson.conceptFamily === "place_value_to_1000" || lesson.conceptFamily === "compare_to_1000") {
    return <MonsterFactoryMission lesson={lesson} onResult={onResult} />;
  }
  if (
    lesson.conceptFamily === "even_odd_arrays_equal_groups" ||
    lesson.conceptFamily === "addition_subtraction_20"
  ) {
    return <MagicGardenMission lesson={lesson} onResult={onResult} />;
  }
  if (lesson.conceptFamily === "states_of_matter") {
    return <AlchemistPotMission lesson={lesson} onResult={onResult} />;
  }
  if (
    lesson.conceptFamily === "earth_systems_wind_water" ||
    lesson.conceptFamily === "ecosystems_pollination_seed_dispersal"
  ) {
    return <RiverRescueMission lesson={lesson} onResult={onResult} />;
  }

  return <DiscoveryFallbackMission lesson={lesson} onResult={onResult} />;
}

function CreatureCrafterMission({ lesson, onResult }: MissionProps) {
  const [adaptation, setAdaptation] = useState<string | null>(null);
  const [unlockedFact, setUnlockedFact] = useState("");

  const isSafeAdaptation = adaptation === "thick_fur" || adaptation === "blubber";
  const animalEmoji = isSafeAdaptation ? "🐻‍❄️" : adaptation ? "🥶" : "🐾";

  function applyAdaptation(nextAdaptation: string) {
    setAdaptation(nextAdaptation);
    if (nextAdaptation === "thick_fur" || nextAdaptation === "blubber") {
      setUnlockedFact(
        "Unlocked: Thick fur and blubber trap heat, like wearing a winter jacket in icy weather."
      );
      onResult({ correct: true, event: "creature_crafter_unlock" });
      return;
    }

    setUnlockedFact(
      "That body helper does not keep the creature warm here. Try something cozy."
    );
    onResult({ correct: false, event: "creature_crafter_retry" });
  }

  return (
    <article
      data-testid="lumo-creature-crafter-mission"
      className="rounded-[2rem] border-4 border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-5 shadow-[0_18px_45px_-30px_rgba(14,116,144,0.5)]"
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">ELA Discovery</p>
      <h3 className="mt-2 text-2xl font-black text-slate-900">Creature Crafter</h3>
      <p className="mt-2 text-sm font-medium text-slate-700">
        Help the creature stay warm in its snowy home by adding the best body helper.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl border-2 border-cyan-200 bg-white/90 p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">Snowy Home</p>
          <div className={`mt-3 text-7xl ${isSafeAdaptation ? "animate-pulse" : ""}`}>{animalEmoji}</div>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            {isSafeAdaptation
              ? `${lesson.childName}'s creature is warm and active! ⭐`
              : "Try another body helper."}
          </p>
        </div>

        <div className="grid gap-2">
          {[
            { id: "scales", label: "Scales", emoji: "🦎" },
            { id: "thick_fur", label: "Thick Fur", emoji: "🧥" },
            { id: "blubber", label: "Blubber Layer", emoji: "🫧" },
            { id: "thin_skin", label: "Thin Skin", emoji: "🍃" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => applyAdaptation(option.id)}
              className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold transition ${
                adaptation === option.id
                  ? "border-cyan-500 bg-cyan-100 text-cyan-900"
                  : "border-slate-200 bg-white hover:border-cyan-300"
              }`}
            >
              <span className="mr-2 text-lg">{option.emoji}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {unlockedFact ? (
        <div
          className={`mt-4 rounded-2xl border-2 px-4 py-3 text-sm font-semibold ${
            isSafeAdaptation
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {unlockedFact}
        </div>
      ) : null}
    </article>
  );
}

function MagicAtticMission({ onResult }: MissionProps) {
  const [revealedIds, setRevealedIds] = useState<string[]>([]);

  const artifacts = [
    {
      id: "washboard",
      oldLabel: "Washboard",
      oldEmoji: "🪵",
      newLabel: "Washing Machine",
      newEmoji: "🧺",
      fact: "Before electric washers, families scrubbed clothes by hand for hours.",
    },
    {
      id: "candle",
      oldLabel: "Candle",
      oldEmoji: "🕯️",
      newLabel: "LED Streetlight",
      newEmoji: "💡",
      fact: "Electric lighting made streets safer and homes brighter at night.",
    },
    {
      id: "carriage",
      oldLabel: "Horse Carriage",
      oldEmoji: "🛻",
      newLabel: "School Bus",
      newEmoji: "🚌",
      fact: "Modern transport helps more people travel safely and quickly each day.",
    },
  ];

  function revealArtifact(id: string) {
    if (revealedIds.includes(id)) return;
    setRevealedIds((current) => [...current, id]);
    onResult({ correct: true, event: "magic_attic_unlock" });
  }

  return (
    <article className="rounded-[2rem] border-4 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-[0_18px_45px_-30px_rgba(217,119,6,0.45)]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">ELA Discovery</p>
      <h3 className="mt-2 text-2xl font-black text-slate-900">The Magic Attic</h3>
      <p className="mt-2 text-sm font-medium text-slate-700">
        Tap an old object to transform it and unlock how life changed over time.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {artifacts.map((artifact) => {
          const revealed = revealedIds.includes(artifact.id);
          return (
            <button
              key={artifact.id}
              type="button"
              onClick={() => revealArtifact(artifact.id)}
              className={`rounded-3xl border-2 p-4 text-left transition ${
                revealed
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                {revealed ? "Present" : "Past"}
              </p>
              <p className="mt-2 text-4xl">{revealed ? artifact.newEmoji : artifact.oldEmoji}</p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {revealed ? artifact.newLabel : artifact.oldLabel}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-700">
                {revealed ? artifact.fact : "Press to transform with sparkles"}
              </p>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function TownFixerMission({ onResult }: MissionProps) {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [resolved, setResolved] = useState<string[]>([]);
  const [message, setMessage] = useState("Choose a town problem, then dispatch the right team.");

  const issues = [
    {
      id: "pothole",
      label: "Road pothole",
      emoji: "🕳️",
      service: "Public Works",
      fact: "Local government uses community taxes to repair roads and keep travel safe.",
    },
    {
      id: "streetlight",
      label: "Dark street corner",
      emoji: "🌃",
      service: "City Electric Crew",
      fact: "City crews keep public lights working so neighborhoods stay safer at night.",
    },
    {
      id: "tree_rescue",
      label: "Cat in a tree",
      emoji: "🌳",
      service: "Fire Department",
      fact: "Emergency teams protect people and animals in unexpected situations.",
    },
  ];

  function dispatch(service: string) {
    if (!selectedIssue) {
      setMessage("Pick a town issue first.");
      onResult({ correct: false, event: "town_fixer_no_issue_selected" });
      return;
    }
    const issue = issues.find((item) => item.id === selectedIssue);
    if (!issue) return;

    if (issue.service === service) {
      if (!resolved.includes(issue.id)) {
        setResolved((current) => [...current, issue.id]);
      }
      setMessage(`Fixed! ${issue.fact}`);
      onResult({ correct: true, event: "town_fixer_issue_resolved" });
      return;
    }

    setMessage("That team is not the best match for this issue. Try another dispatch.");
    onResult({ correct: false, event: "town_fixer_mismatch" });
  }

  return (
    <article className="rounded-[2rem] border-4 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-[0_18px_45px_-30px_rgba(79,70,229,0.45)]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-700">Social Studies Discovery</p>
      <h3 className="mt-2 text-2xl font-black text-slate-900">Town Fixer Dispatch</h3>
      <p className="mt-2 text-sm font-medium text-slate-700">
        Help the community by sending the right team to each problem.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="grid gap-2">
          {issues.map((issue) => {
            const done = resolved.includes(issue.id);
            return (
              <button
                key={issue.id}
                type="button"
                onClick={() => setSelectedIssue(issue.id)}
                className={`rounded-2xl border-2 px-4 py-3 text-left transition ${
                  done
                    ? "border-emerald-300 bg-emerald-50"
                    : selectedIssue === issue.id
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-indigo-300"
                }`}
              >
                <p className="text-sm font-bold text-slate-900">
                  <span className="mr-2">{issue.emoji}</span>
                  {issue.label}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-600">
                  {done ? "Resolved" : `Need: ${issue.service}`}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl border-2 border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Dispatch Radio</p>
          <div className="mt-3 grid gap-2">
            {["Public Works", "City Electric Crew", "Fire Department"].map((service) => (
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
    </article>
  );
}

function MonsterFactoryMission({ lesson, onResult }: MissionProps) {
  const [hundreds, setHundreds] = useState(3);
  const [tens, setTens] = useState(4);
  const [ones, setOnes] = useState(2);
  const [built, setBuilt] = useState(false);

  const totalValue = hundreds * 100 + tens * 10 + ones;
  const blockSummary = `${hundreds} hundreds + ${tens} tens + ${ones} ones`;

  function buildMonster() {
    setBuilt(true);
    onResult({ correct: true, event: "monster_factory_built" });
  }

  return (
    <article className="rounded-[2rem] border-4 border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-pink-50 p-5 shadow-[0_18px_45px_-30px_rgba(217,70,239,0.45)]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-700">Math Discovery</p>
      <h3 className="mt-2 text-2xl font-black text-slate-900">Monster Factory</h3>
      <p className="mt-2 text-sm font-medium text-slate-700">
        Build a friendly number monster by controlling hundreds, tens, and ones.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-3 rounded-3xl border-2 border-slate-200 bg-white p-4">
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
            onClick={buildMonster}
            className="mt-2 w-full rounded-2xl bg-fuchsia-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-fuchsia-700"
          >
            Bring Monster to Life
          </button>
        </div>

        <div className="rounded-3xl border-2 border-slate-200 bg-white p-4 text-center">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Factory Output</p>
          <p className="mt-2 text-7xl">{built ? "👾" : "🧩"}</p>
          <p className="mt-2 text-4xl font-black text-slate-900">{totalValue}</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">{blockSummary}</p>
          {built ? (
            <p className="mt-3 rounded-2xl bg-fuchsia-50 px-3 py-2 text-sm font-semibold text-fuchsia-900">
              Unlocked: The monster says, &quot;I am {totalValue}! I can feel the size of place value
              from my giant hundreds to tiny ones.&quot;
            </p>
          ) : null}
          <p className="mt-3 text-xs font-medium text-slate-500">Theme hint: {lesson.theme}</p>
        </div>
      </div>
    </article>
  );
}

function MagicGardenMission({ onResult }: MissionProps) {
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(4);
  const [planted, setPlanted] = useState(false);

  const totalFlowers = rows * columns;

  function plantArray() {
    setPlanted(true);
    onResult({ correct: true, event: "magic_garden_array_planted" });
  }

  return (
    <article className="rounded-[2rem] border-4 border-lime-200 bg-gradient-to-br from-lime-50 via-white to-emerald-50 p-5 shadow-[0_18px_45px_-30px_rgba(101,163,13,0.45)]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-lime-700">Math Discovery</p>
      <h3 className="mt-2 text-2xl font-black text-slate-900">Magic Garden Arrays</h3>
      <p className="mt-2 text-sm font-medium text-slate-700">
        Grow rows and columns. The glowing flower count appears as a game reward.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <div className="space-y-3 rounded-3xl border-2 border-slate-200 bg-white p-4">
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
            onClick={plantArray}
            className="w-full rounded-2xl bg-lime-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-lime-700"
          >
            Plant Seeds
          </button>
        </div>

        <div className="rounded-3xl border-2 border-slate-200 bg-white p-4">
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
                {planted ? "🌼" : "•"}
              </div>
            ))}
          </div>
          {planted ? (
            <p className="mt-3 rounded-2xl bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-900">
              Unlocked: {rows} groups of {columns} makes an array of {totalFlowers} flowers.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function AlchemistPotMission({ onResult }: MissionProps) {
  const [temperature, setTemperature] = useState(10);
  const [unlocked, setUnlocked] = useState<{ solid: boolean; liquid: boolean; gas: boolean }>({
    solid: true,
    liquid: false,
    gas: false,
  });

  const state = temperature < 33 ? "solid" : temperature < 70 ? "liquid" : "gas";

  function updateTemperature(nextTemperature: number) {
    setTemperature(nextTemperature);

    if (nextTemperature >= 33 && !unlocked.liquid) {
      setUnlocked((current) => ({ ...current, liquid: true }));
      onResult({ correct: true, event: "alchemist_liquid_unlocked" });
    }
    if (nextTemperature >= 70 && !unlocked.gas) {
      setUnlocked((current) => ({ ...current, gas: true }));
      onResult({ correct: true, event: "alchemist_gas_unlocked" });
    }
  }

  return (
    <article
      data-testid="lumo-alchemist-mission"
      className="rounded-[2rem] border-4 border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 shadow-[0_18px_45px_-30px_rgba(2,132,199,0.45)]"
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-700">Science Discovery</p>
      <h3 className="mt-2 text-2xl font-black text-slate-900">The Alchemist&apos;s Pot</h3>
      <p className="mt-2 text-sm font-medium text-slate-700">
        Drag temperature upward and watch matter transform in real time.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-4">
          <label className="block">
            <div className="mb-1 flex items-center justify-between text-sm font-bold text-slate-700">
              <span>Temperature</span>
              <span>{temperature}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={temperature}
              onChange={(event) => updateTemperature(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-sky-500"
            />
          </label>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current state: {state}
          </p>
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-center text-7xl">
            {state === "solid" ? "🧊" : state === "liquid" ? "💧" : "☁️"}
          </div>
        </div>

        <div className="rounded-3xl border-2 border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Lab Notes Unlocked</p>
          <div className="mt-3 grid gap-2">
            <div className={`rounded-2xl px-3 py-2 text-sm font-semibold ${unlocked.solid ? "bg-blue-50 text-blue-900" : "bg-slate-100 text-slate-500"}`}>
              Solid: Particles are packed tightly and hold shape.
            </div>
            <div className={`rounded-2xl px-3 py-2 text-sm font-semibold ${unlocked.liquid ? "bg-cyan-50 text-cyan-900" : "bg-slate-100 text-slate-500"}`}>
              Liquid unlocked: Heat makes particles move faster and flow.
            </div>
            <div className={`rounded-2xl px-3 py-2 text-sm font-semibold ${unlocked.gas ? "bg-emerald-50 text-emerald-900" : "bg-slate-100 text-slate-500"}`}>
              Gas unlocked: High heat spreads particles far apart into vapor.
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function RiverRescueMission({ onResult }: MissionProps) {
  const [placedTools, setPlacedTools] = useState<string[]>([]);
  const [message, setMessage] = useState("Place tools on the riverbank before erosion removes the soil.");

  const erosionRisk = useMemo(() => {
    const reduction = RIVER_TOOLS
      .filter((tool) => placedTools.includes(tool.id))
      .reduce((total, tool) => total + tool.reduction, 0);
    return Math.max(5, 100 - reduction);
  }, [placedTools]);

  function placeTool(toolId: string) {
    if (placedTools.includes(toolId)) return;
    const nextTools = [...placedTools, toolId];
    setPlacedTools(nextTools);
    onResult({ correct: true, event: "river_rescue_tool_placed" });

    const nextReduction = RIVER_TOOLS
      .filter((tool) => nextTools.includes(tool.id))
      .reduce((total, tool) => total + tool.reduction, 0);
    const nextRisk = Math.max(5, 100 - nextReduction);
    if (nextRisk <= 20) {
      setMessage(
        "Unlocked: Roots and rocks hold soil in place, so rushing water cannot wash the bank away."
      );
      onResult({ correct: true, event: "river_rescue_erosion_stopped" });
      return;
    }
    setMessage("Great placement! Keep reinforcing the bank to reduce erosion risk.");
  }

  return (
    <article className="rounded-[2rem] border-4 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-5 shadow-[0_18px_45px_-30px_rgba(5,150,105,0.45)]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Science Discovery</p>
      <h3 className="mt-2 text-2xl font-black text-slate-900">River Rescue</h3>
      <p className="mt-2 text-sm font-medium text-slate-700">
        Reinforce the riverbank with natural barriers and watch erosion risk drop.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Toolbox</p>
          <div className="mt-3 grid gap-2">
            {RIVER_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => placeTool(tool.id)}
                disabled={placedTools.includes(tool.id)}
                className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-bold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="mr-2">{tool.emoji}</span>
                {tool.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border-2 border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Bank Stability Meter</p>
          <div className="mt-3 h-5 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${
                erosionRisk <= 20
                  ? "bg-emerald-500"
                  : erosionRisk <= 50
                    ? "bg-amber-500"
                    : "bg-rose-500"
              }`}
              style={{ width: `${erosionRisk}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-700">Erosion Risk: {erosionRisk}%</p>
          <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
            {message}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            {placedTools.map((toolId) => {
              const tool = RIVER_TOOLS.find((item) => item.id === toolId);
              return (
                <span key={toolId} className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-900">
                  {tool?.emoji} {tool?.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}

function DiscoveryFallbackMission({ lesson, onResult }: MissionProps) {
  const [activated, setActivated] = useState(false);

  function activate() {
    setActivated(true);
    onResult({ correct: true, event: "discovery_fallback_unlocked" });
  }

  return (
    <article className="rounded-[2rem] border-4 border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-600">Discovery Mission</p>
      <h3 className="mt-2 text-2xl font-black text-slate-900">Interactive Concept Explorer</h3>
      <p className="mt-2 text-sm font-medium text-slate-700">
        Trigger the concept reveal to unlock a concise learning insight through play.
      </p>

      <div className="mt-4 rounded-3xl border-2 border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">
          Concept: <strong>{lesson.conceptFamily.replaceAll("_", " ")}</strong>
        </p>
        <button
          type="button"
          onClick={activate}
          className="mt-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-wide text-white"
        >
          Trigger Discovery
        </button>
        {activated ? (
          <p className="mt-3 rounded-2xl bg-cyan-50 px-3 py-3 text-sm font-semibold text-cyan-900">
            Unlocked: Exploring systems through playful actions helps us notice patterns faster.
          </p>
        ) : null}
      </div>
    </article>
  );
}
