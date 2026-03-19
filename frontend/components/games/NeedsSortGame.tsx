"use client";

import { useEffect, useState, type DragEvent } from "react";

interface NeedsSortGameProps {
  prompt: string;
  theme?: string;
  childName?: string;
  onResult: (params: { correct: boolean; askedForHint?: boolean; event: string }) => void;
}

const HABITATS = [
  {
    id: "redwood_forest",
    name: "Redwood Forest",
    emoji: "🌲",
    clue: "Cool shade, tall trees, and fresh streams",
    tone: "from-emerald-100 to-lime-100",
    border: "border-emerald-300",
  },
  {
    id: "kelp_forest",
    name: "Kelp Forest",
    emoji: "🌊",
    clue: "Ocean water with giant kelp and gentle waves",
    tone: "from-cyan-100 to-sky-100",
    border: "border-cyan-300",
  },
  {
    id: "mojave_desert",
    name: "Mojave Desert",
    emoji: "🏜️",
    clue: "Dry heat, sand, and cactus plants",
    tone: "from-amber-100 to-orange-100",
    border: "border-amber-300",
  },
] as const;

const ANIMAL_CARDS = [
  { id: "bear", name: "Black Bear", icon: "🐻", habitatId: "redwood_forest" },
  { id: "otter", name: "Sea Otter", icon: "🦦", habitatId: "kelp_forest" },
  { id: "tortoise", name: "Desert Tortoise", icon: "🐢", habitatId: "mojave_desert" },
] as const;

type HabitatId = (typeof HABITATS)[number]["id"];

function getHabitatName(habitatId: HabitatId): string {
  return HABITATS.find((habitat) => habitat.id === habitatId)?.name ?? "Unknown Habitat";
}

export function NeedsSortGame({ prompt, theme, childName, onResult }: NeedsSortGameProps) {
  const [placements, setPlacements] = useState<Record<string, HabitatId | undefined>>({});
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [earnedStars, setEarnedStars] = useState(0);
  const [feedback, setFeedback] = useState("Drag an animal to the habitat where it belongs.");
  const [burstAnimalId, setBurstAnimalId] = useState<string | null>(null);
  const [missionComplete, setMissionComplete] = useState(false);

  useEffect(() => {
    if (!burstAnimalId) return;
    const timeoutId = window.setTimeout(() => setBurstAnimalId(null), 900);
    return () => window.clearTimeout(timeoutId);
  }, [burstAnimalId]);

  function placeAnimal(animalId: string, habitatId: HabitatId) {
    const animal = ANIMAL_CARDS.find((item) => item.id === animalId);
    if (!animal) return;

    const isCorrect = animal.habitatId === habitatId;
    const wasAlreadyCorrect = placements[animal.id] === animal.habitatId;
    const nextPlacements = { ...placements, [animal.id]: habitatId };
    const nextMatchedCount = ANIMAL_CARDS.filter(
      (item) => nextPlacements[item.id] === item.habitatId
    ).length;
    setPlacements(nextPlacements);
    setSelectedAnimalId(null);

    if (isCorrect) {
      if (!wasAlreadyCorrect) {
        setEarnedStars((current) => Math.min(current + 1, ANIMAL_CARDS.length));
      }
      setBurstAnimalId(animal.id);
      setFeedback(`Great match! ${animal.name} belongs in the ${getHabitatName(habitatId)}.`);
      onResult({ correct: true, event: "habitat_match_correct" });
      if (!missionComplete && nextMatchedCount === ANIMAL_CARDS.length) {
        setMissionComplete(true);
        setFeedback("Amazing! Every animal found the right home. You earned all stars! ⭐");
        onResult({ correct: true, event: "habitat_mission_complete" });
      }
      return;
    }

    setFeedback(`Not yet. ${animal.name} needs a different habitat. Try another zone.`);
    onResult({ correct: false, event: "habitat_match_incorrect" });
  }

  function handleDrop(event: DragEvent<HTMLElement>, habitatId: HabitatId) {
    event.preventDefault();
    const animalId = event.dataTransfer.getData("text/plain");
    if (!animalId) return;
    placeAnimal(animalId, habitatId);
  }

  function requestHint() {
    const unresolved = ANIMAL_CARDS.find((animal) => placements[animal.id] !== animal.habitatId);
    if (!unresolved) {
      setFeedback("You already solved every match. Great focus!");
      return;
    }
    setFeedback(
      `Hint: Think about what ${unresolved.name} needs every day (water, shade, or dry heat).`
    );
    onResult({ correct: false, askedForHint: true, event: "habitat_hint_requested" });
  }

  function resetMission() {
    setPlacements({});
    setSelectedAnimalId(null);
    setEarnedStars(0);
    setBurstAnimalId(null);
    setMissionComplete(false);
    setFeedback("Mission reset. Match each animal to the best habitat.");
  }

  return (
    <article className="relative overflow-hidden rounded-[2rem] border-4 border-sky-200 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4 shadow-[0_20px_45px_-22px_rgba(14,116,144,0.55)] sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-200/40 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-amber-200/40 blur-2xl"
      />

      <header className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
            Habitat Match Mission
          </p>
          <h3 className="mt-1 text-2xl font-black text-slate-900">Find each animal&apos;s home</h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-700">{prompt}</p>
        </div>
        <div className="rounded-2xl border-2 border-amber-200 bg-white px-4 py-2 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Stars</p>
          <p className="text-2xl font-black text-amber-600">{earnedStars} / {ANIMAL_CARDS.length}</p>
        </div>
      </header>

      <div className="mt-4 rounded-2xl border border-cyan-200 bg-white/90 p-3 text-sm text-slate-700">
        <strong>{childName ?? "Explorer"}</strong>, drag an animal card to a habitat.
        On touch devices, tap an animal first, then tap a habitat to place it.
        {theme ? <span className="ml-1 font-semibold text-cyan-800">Theme: {theme}.</span> : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <section className="rounded-3xl border-2 border-slate-200 bg-white/95 p-4">
          <h4 className="text-sm font-black uppercase tracking-wide text-slate-700">
            Animal Cards
          </h4>
          <div className="mt-3 grid gap-3">
            {ANIMAL_CARDS.map((animal) => {
              const placedHabitat = placements[animal.id];
              const isCorrect = placedHabitat === animal.habitatId;
              const isSelected = selectedAnimalId === animal.id;
              return (
                <button
                  key={animal.id}
                  type="button"
                  draggable={!isCorrect}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", animal.id);
                    event.dataTransfer.effectAllowed = "move";
                    setSelectedAnimalId(animal.id);
                  }}
                  onClick={() => {
                    if (!isCorrect) setSelectedAnimalId(animal.id);
                  }}
                  className={`relative flex items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left transition ${
                    isCorrect
                      ? "cursor-default border-emerald-300 bg-emerald-50"
                      : isSelected
                        ? "border-fuchsia-400 bg-fuchsia-50"
                        : "border-slate-200 bg-slate-50 hover:border-cyan-300 hover:bg-cyan-50"
                  }`}
                >
                  <span className="text-3xl" aria-hidden>
                    {animal.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block text-base font-extrabold text-slate-900">{animal.name}</span>
                    <span className="block text-xs text-slate-600">
                      {placedHabitat
                        ? `Placed in ${getHabitatName(placedHabitat)}`
                        : "Not placed yet"}
                    </span>
                  </span>
                  {isCorrect ? (
                    <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
                      Matched
                    </span>
                  ) : null}
                  {burstAnimalId === animal.id ? (
                    <span className="absolute -right-2 -top-2 animate-bounce text-2xl">⭐</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          {HABITATS.map((habitat) => {
            const occupants = ANIMAL_CARDS.filter(
              (animal) => placements[animal.id] === habitat.id
            );
            return (
              <button
                key={habitat.id}
                type="button"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => handleDrop(event, habitat.id)}
                onClick={() => {
                  if (selectedAnimalId) {
                    placeAnimal(selectedAnimalId, habitat.id);
                    return;
                  }
                  setFeedback("Pick an animal card first, then tap a habitat.");
                }}
                className={`w-full rounded-3xl border-2 bg-gradient-to-br p-4 text-left shadow-sm transition hover:scale-[1.01] hover:shadow-md ${habitat.tone} ${habitat.border}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-700">
                      Habitat Zone
                    </p>
                    <h4 className="mt-1 text-xl font-black text-slate-900">{habitat.name}</h4>
                    <p className="mt-1 text-xs text-slate-700">{habitat.clue}</p>
                  </div>
                  <span className="text-3xl" aria-hidden>
                    {habitat.emoji}
                  </span>
                </div>
                <div className="mt-3 min-h-11 rounded-2xl border border-white/80 bg-white/75 p-2">
                  {occupants.length === 0 ? (
                    <p className="text-xs font-semibold text-slate-500">
                      Drop an animal card here
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {occupants.map((animal) => {
                        const correct = animal.habitatId === habitat.id;
                        return (
                          <span
                            key={animal.id}
                            className={`rounded-xl px-2 py-1 text-xs font-bold ${
                              correct
                                ? "bg-emerald-600 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {animal.icon} {animal.name} {correct ? "✓" : "✗"}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </section>
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3">
        <p className="text-sm font-semibold text-slate-700">{feedback}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={requestHint}
            className="rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan-800"
          >
            Need Hint
          </button>
          <button
            type="button"
            onClick={resetMission}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700"
          >
            Reset Mission
          </button>
        </div>
      </footer>
    </article>
  );
}
