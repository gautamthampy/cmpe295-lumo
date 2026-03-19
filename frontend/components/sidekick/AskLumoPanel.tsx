"use client";

import { useEffect, useState } from "react";
import { getLearningCoachReply } from "@/lib/generate-learning-coach";
import type { LessonSpec } from "@/lib/lesson-spec";

interface AskLumoPanelProps {
  lesson: LessonSpec;
  hintText?: string;
}

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

function buildCoachBubbleText(params: {
  coachReply: string;
  nextStep: string;
  reflectionQuestion: string;
  blockedDirectAnswer: boolean;
}) {
  const guardrailLine = params.blockedDirectAnswer
    ? "I will not give the final answer, but I will help you think it through."
    : "";
  return [guardrailLine, params.coachReply, `Next step: ${params.nextStep}`, `Think: ${params.reflectionQuestion}`]
    .filter(Boolean)
    .join(" ");
}

function getSimpleTopicSummary(lesson: LessonSpec) {
  switch (lesson.conceptFamily) {
    case "habitats_and_survival":
    case "animal_discoveries":
      return "We are learning which body helpers keep animals safe and warm in the homes where they live.";
    case "past_and_present":
    case "changes_over_time":
      return "We are learning how things from long ago changed into the tools and machines we use now.";
    case "government_and_community":
    case "community_difference":
    case "buyers_and_sellers":
      return "We are learning how helpers in a town work together to fix problems and keep people safe.";
    case "place_value_to_1000":
    case "compare_to_1000":
      return "We are learning how big numbers are built from hundreds, tens, and ones.";
    case "even_odd_arrays_equal_groups":
    case "addition_subtraction_20":
      return "We are learning how rows and groups can help us see totals quickly.";
    case "states_of_matter":
      return "We are learning how heat can change something from ice to water to steam.";
    case "earth_systems_wind_water":
    case "ecosystems_pollination_seed_dispersal":
      return "We are learning how water, soil, rocks, and plants change the land.";
    default:
      return "We are learning by playing, watching what changes, and unlocking new facts.";
  }
}

function getLookForHint(lesson: LessonSpec, hintText?: string) {
  if (hintText) return hintText;

  switch (lesson.conceptFamily) {
    case "habitats_and_survival":
    case "animal_discoveries":
      return "Look for the body part that helps the creature stay warm in a cold place.";
    case "past_and_present":
    case "changes_over_time":
      return "Look for what the old object does, then think about what tool does that job today.";
    case "government_and_community":
    case "community_difference":
    case "buyers_and_sellers":
      return "Look for which town helper would be best at solving the problem you picked.";
    case "place_value_to_1000":
    case "compare_to_1000":
      return "Look at the giant parts first, then the medium parts, then the tiny parts.";
    case "even_odd_arrays_equal_groups":
    case "addition_subtraction_20":
      return "Look at the number of rows and the number in each row before counting all.";
    case "states_of_matter":
      return "Watch what happens as the heat goes up. Does it keep its shape, flow, or float away?";
    case "earth_systems_wind_water":
    case "ecosystems_pollination_seed_dispersal":
      return "Look for tools that make the ground stronger when water rushes by.";
    default:
      return "Look closely at what changes after each move. The change is your clue.";
  }
}

function getFunFact(lesson: LessonSpec) {
  switch (lesson.conceptFamily) {
    case "habitats_and_survival":
    case "animal_discoveries":
      return "A polar bear looks white, but each hair is clear and helps trap warmth.";
    case "past_and_present":
    case "changes_over_time":
      return "Before washing machines, some families spent most of a whole day washing clothes.";
    case "government_and_community":
    case "community_difference":
    case "buyers_and_sellers":
      return "A town works best when many helpers do different jobs, like a team in a big game.";
    case "place_value_to_1000":
    case "compare_to_1000":
      return "The number 342 means 3 giant hundreds, 4 tens, and 2 ones all working together.";
    case "even_odd_arrays_equal_groups":
    case "addition_subtraction_20":
      return "Gardeners and builders both use rows because rows make counting faster.";
    case "states_of_matter":
      return "Steam is still water, but now the tiny bits are moving so fast they spread into the air.";
    case "earth_systems_wind_water":
    case "ecosystems_pollination_seed_dispersal":
      return "Plant roots act like tiny hands that help hold soil in place.";
    default:
      return "When you play and notice a pattern, your brain is doing real scientist work.";
  }
}

function getNextMove(lesson: LessonSpec) {
  switch (lesson.conceptFamily) {
    case "habitats_and_survival":
    case "animal_discoveries":
      return "Try the body helper that feels the most warm and cozy for a snowy place.";
    case "past_and_present":
    case "changes_over_time":
      return "Tap an old object and watch what modern tool it changes into.";
    case "government_and_community":
    case "community_difference":
    case "buyers_and_sellers":
      return "Pick one town problem first, then choose the helper team that fits best.";
    case "place_value_to_1000":
    case "compare_to_1000":
      return "Slide the hundreds, tens, and ones, then bring your monster to life.";
    case "even_odd_arrays_equal_groups":
    case "addition_subtraction_20":
      return "Choose rows and columns, then plant the seeds to see the full array bloom.";
    case "states_of_matter":
      return "Move the heat slider slowly and watch when ice becomes water and then steam.";
    case "earth_systems_wind_water":
    case "ecosystems_pollination_seed_dispersal":
      return "Place roots, rocks, or logs until the riverbank feels strong and safe.";
    default:
      return "Try one move, watch what changes, and use that change as your clue.";
  }
}

function explainWord(word: string) {
  const normalized = word.trim().toLowerCase();
  const dictionary: Record<string, string> = {
    habitat: "A habitat is an animal's home.",
    biome: "Biome means a big kind of place, like a desert or snowy land. You can think of it as a kind of home area.",
    adaptation: "An adaptation is a body helper that helps a living thing stay safe.",
    blubber: "Blubber is a warm fat layer under the skin that helps some animals stay warm.",
    fur: "Fur is hair on an animal's body.",
    scales: "Scales are hard little plates on some animals.",
    array: "An array is objects lined up in rows and columns.",
    row: "A row goes across.",
    rows: "Rows go across.",
    column: "A column goes up and down.",
    columns: "Columns go up and down.",
    solid: "A solid keeps its shape.",
    liquid: "A liquid can pour and flow.",
    gas: "A gas spreads out in the air.",
    steam: "Steam is water that got hot and turned into gas.",
    erosion: "Erosion is when water or wind carries soil away.",
    roots: "Roots are the parts of a plant that grow under the ground.",
    government: "Government is a group of people who help run a town, city, or country.",
    community: "A community is a group of people who live and work in the same place.",
    present: "Present means now, today.",
    past: "Past means long ago.",
  };

  return (
    dictionary[normalized] ??
    `I do not know that word yet, but we can use clues from the picture and the game to figure it out together.`
  );
}

export function AskLumoPanel({ lesson, hintText }: AskLumoPanelProps) {
  const welcomeMessage: Message = {
    id: "welcome",
    role: "assistant",
    text: `Hi! I am Lumo. Tap a help chip for quick help, or ask Coach Mode when you are stuck. I guide your thinking and do not give final answers.`,
  };
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [wordInput, setWordInput] = useState("");
  const [coachInput, setCoachInput] = useState("");
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function addExchange(userText: string, assistantText: string) {
    setMessages((current) => {
      const userMessage: Message = {
        id: `user-${Date.now()}-${current.length}`,
        role: "user",
        text: userText,
      };
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}-${current.length + 1}`,
        role: "assistant",
        text: assistantText,
      };
      const nextMessages: Message[] = [
        ...current,
        userMessage,
        assistantMessage,
      ].slice(-5);
      return nextMessages;
    });
  }

  function handleChip(id: "easy" | "look" | "fact" | "next") {
    if (id === "easy") {
      addExchange("Say it in easy words", getSimpleTopicSummary(lesson));
      return;
    }
    if (id === "look") {
      addExchange("What should I look for?", getLookForHint(lesson, hintText));
      return;
    }
    if (id === "fact") {
      addExchange("Tell me a fun fact", getFunFact(lesson));
      return;
    }
    addExchange("What should I try next?", getNextMove(lesson));
  }

  async function handleCoachAsk() {
    const trimmedPrompt = coachInput.trim();
    if (!trimmedPrompt || isCoachLoading) return;

    setCoachError("");
    setIsCoachLoading(true);
    try {
      const coachReply = await getLearningCoachReply({
        lesson,
        studentMessage: trimmedPrompt,
        mode: "mission_help",
      });
      addExchange(
        trimmedPrompt,
        buildCoachBubbleText({
          coachReply: coachReply.coachReply,
          nextStep: coachReply.nextStep,
          reflectionQuestion: coachReply.reflectionQuestion,
          blockedDirectAnswer: coachReply.blockedDirectAnswer,
        })
      );
      setCoachInput("");
    } catch (error) {
      setCoachError(
        error instanceof Error
          ? error.message
          : "Coach mode is unavailable right now. Try a quick chip hint."
      );
    } finally {
      setIsCoachLoading(false);
    }
  }

  function handleWordExplain() {
    const trimmed = wordInput.trim();
    if (!trimmed) return;
    addExchange(`What does "${trimmed}" mean?`, explainWord(trimmed));
    setWordInput("");
  }

  function speakLatestAnswer() {
    if (!("speechSynthesis" in window)) return;
    const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
    if (!latestAssistantMessage) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(latestAssistantMessage.text);
    utterance.rate = 0.95;
    utterance.pitch = 1.08;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border-2 border-fuchsia-200 bg-[radial-gradient(circle_at_10%_10%,#fdf2f8,transparent_28%),radial-gradient(circle_at_95%_90%,#dbeafe,transparent_34%),linear-gradient(150deg,#fffaf5,#ffffff_48%,#f5f3ff)] p-4 shadow-[0_24px_55px_-34px_rgba(192,38,211,0.52)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-7 top-4 h-16 w-16 rounded-full bg-fuchsia-200/45 blur-xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 bottom-3 h-20 w-20 rounded-full bg-cyan-200/55 blur-xl"
      />
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] border border-fuchsia-200 bg-gradient-to-br from-fuchsia-100 to-cyan-100 text-3xl shadow-[inset_0_-6px_14px_rgba(255,255,255,0.8)]">
          ✨
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-700">
            Ask Lumo
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-900">Magic helper + coach mode</h3>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
            Lumo stays on this mission and nudges thinking without handing out final answers.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { id: "easy" as const, label: "Easy words" },
          { id: "look" as const, label: "What to look for" },
          { id: "fact" as const, label: "Fun fact" },
          { id: "next" as const, label: "What next?" },
        ].map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => handleChip(chip.id)}
            className="rounded-full border border-fuchsia-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-fuchsia-800 transition hover:border-fuchsia-300 hover:bg-fuchsia-50"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2 rounded-[1.5rem] border border-white/85 bg-white/65 p-2 backdrop-blur-sm">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-[1.4rem] px-4 py-3 text-sm font-semibold leading-relaxed ${
              message.role === "assistant"
                ? "bg-white text-slate-700 shadow-sm"
                : "ml-6 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white"
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-cyan-200 bg-cyan-50/80 p-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-800">Coach mode</p>
        <p className="mt-1 text-xs font-semibold text-cyan-900">
          Tell Lumo what you are stuck on. Lumo gives clues, strategy, and a thinking question.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={coachInput}
            onChange={(event) => setCoachInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCoachAsk();
              }
            }}
            placeholder="I am stuck because..."
            className="flex-1 rounded-2xl border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none ring-0 transition focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={() => void handleCoachAsk()}
            disabled={isCoachLoading || coachInput.trim().length === 0}
            className="rounded-2xl bg-cyan-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCoachLoading ? "Thinking..." : "Coach me"}
          </button>
        </div>
        {coachError ? (
          <p className="mt-2 text-xs font-semibold text-rose-700">{coachError}</p>
        ) : null}
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white/90 p-3">
        <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Ask about one word
        </label>
        <div className="mt-2 flex gap-2">
          <input
            value={wordInput}
            onChange={(event) => setWordInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleWordExplain();
              }
            }}
            placeholder="Type a word like habitat"
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none ring-0 transition focus:border-fuchsia-300"
          />
          <button
            type="button"
            onClick={handleWordExplain}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wide text-white"
          >
            Ask
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={speakLatestAnswer}
        className="mt-3 w-full rounded-2xl border-2 border-cyan-200 bg-gradient-to-r from-cyan-50 to-sky-100 px-4 py-3 text-sm font-black uppercase tracking-wide text-cyan-900"
      >
        {isSpeaking ? "Reading aloud..." : "Read latest answer aloud"}
      </button>
    </section>
  );
}
