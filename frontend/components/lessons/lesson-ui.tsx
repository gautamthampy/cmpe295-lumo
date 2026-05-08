"use client";

import { Bell, BookOpen, ChevronLeft, ChevronRight, CircleUserRound, Grid2x2, HelpCircle, MoveRight, Sparkles, Trophy, Volume2 } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { type MutableRefObject, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { GeneratedMissionCallout } from "@/components/story-studio/generated-mission-callout";
import MiniTestPanel from "@/components/attention/MiniTestPanel";
import { type ExplanationResponse, type HintResponse, type MotivationResponse, requestExplanation, requestHint, requestMotivation } from "@/lib/feedback";
import SelfReportPanel from "@/components/attention/SelfReportPanel";
import {
  type AttentionDailySummary,
  type DashboardResponse,
  type QuestionAnsweredIngestResponse,
  createLearningSession,
  endLearningSession,
  fetchAttentionSummary,
  fetchDashboard,
  ingestAnalyticsEvent,
} from "@/lib/analytics-api";
import {
  type LessonActivity,
  type LessonAnalyticsMetric,
  type LessonAnalyticsSummary,
  type LessonQuizPayload,
  type LessonRenderPayload,
  type LessonSummary,
  PLAYFUL_FALLBACK_ANALYTICS,
  PLAYFUL_FALLBACK_LESSONS,
  fetchLessonAnalytics,
  fetchLessonRender,
  fetchLessonSummaries,
  filterLessonsBySubject,
  formatSubjectLabel,
  generateLessonQuiz,
  getFallbackLessonRender,
  logLessonEvent,
} from "@/lib/lessons";
import { useTwoAttemptQuizController } from "@/lib/lesson-quiz-controller";
import { useAuthStore } from "@/lib/store/auth";

export type NavSection = "learn" | "library" | "analytics" | "attention";

type ParsedSectionNode =
  | {
      type: "html";
      key: string;
      html: string;
    }
  | {
      type: "interactive";
      key: string;
      activity: LessonActivity;
    };

type ParsedSection = {
  key: string;
  title: string;
  nodes: ParsedSectionNode[];
};

function decodeInteractivePayload(encoded: string) {
  try {
    const json = typeof window === "undefined" ? Buffer.from(encoded, "base64").toString("utf-8") : atob(encoded);
    return JSON.parse(json) as LessonActivity;
  } catch {
    return null;
  }
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitLessonSections(lesson: LessonRenderPayload | null) {
  if (!lesson || typeof window === "undefined") {
    return [] as ParsedSection[];
  }

  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(lesson.html_content, "text/html");
  const sections: ParsedSection[] = [];
  const usedActivityIds = new Set<string>();
  let currentSection: ParsedSection = {
    key: "section-0",
    title: "Adventure Start",
    nodes: [],
  };

  const pushSection = () => {
    if (!currentSection.nodes.length) {
      return;
    }
    sections.push(currentSection);
  };

  for (const node of Array.from(documentFragment.body.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName === "H2") {
        pushSection();
        currentSection = {
          key: `section-${sections.length + 1}`,
          title: element.textContent?.trim() || `Section ${sections.length + 1}`,
          nodes: [],
        };
        continue;
      }

      if (element.dataset.interactive) {
        const activity = decodeInteractivePayload(element.dataset.interactive);
        if (activity) {
          usedActivityIds.add(activity.id);
          currentSection.nodes.push({
            type: "interactive",
            key: activity.id,
            activity,
          });
        }
        continue;
      }

      currentSection.nodes.push({
        type: "html",
        key: `${currentSection.key}-${currentSection.nodes.length}`,
        html: element.outerHTML,
      });
      continue;
    }

    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      currentSection.nodes.push({
        type: "html",
        key: `${currentSection.key}-${currentSection.nodes.length}`,
        html: `<p>${escapeHtml(node.textContent.trim())}</p>`,
      });
    }
  }

  pushSection();

  if (!sections.length) {
    sections.push({
      key: "section-fallback",
      title: "Adventure Start",
      nodes: [
        {
          type: "html",
          key: "section-fallback-copy",
          html: lesson.html_content || "<p>Let’s get started.</p>",
        },
      ],
    });
  }

  const leftovers = lesson.interactive_activities.filter((activity) => !usedActivityIds.has(activity.id));
  if (leftovers.length) {
    const finalSection = sections[sections.length - 1];
    leftovers.forEach((activity) => {
      finalSection.nodes.push({
        type: "interactive",
        key: `${activity.id}-leftover`,
        activity,
      });
    });
  }

  return sections;
}

function percentageTone(score: number) {
  if (score >= 80) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (score >= 60) {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-rose-50 text-rose-700";
}

function lessonMood(subject: string) {
  switch (subject) {
    case "math":
      return { accent: "from-[#ffd694] to-[#ffefc5]", chip: "bg-[#fff0c8] text-[#8a5d00]", emoji: "🧮" };
    case "science":
      return { accent: "from-[#b8ffb3] to-[#e7ffd2]", chip: "bg-[#dafad3] text-[#176e22]", emoji: "🔬" };
    case "language-arts-writing":
      return { accent: "from-[#d1e8ff] to-[#edf6ff]", chip: "bg-[#e1efff] text-[#175b90]", emoji: "📖" };
    case "social-studies":
      return { accent: "from-[#d4ffd2] to-[#f2ffe8]", chip: "bg-[#e6ffd8] text-[#2e6d2c]", emoji: "🌍" };
    default:
      return { accent: "from-[#ffe0ee] to-[#fff1c7]", chip: "bg-[#fff0da] text-[#7c4b00]", emoji: "✨" };
  }
}

export function LessonTopBar({ active }: { active: NavSection }) {
  const navItems: Array<{ href: string; label: string; key: NavSection }> = [
    { href: "/learn", label: "My Lessons", key: "learn" },
    { href: "/lessons", label: "Library", key: "library" },
    { href: "/lessons/analytics", label: "Achievements", key: "analytics" },
    { href: "/dashboard/attention", label: "Focus", key: "attention" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#fff6d8]/90 backdrop-blur-xl shadow-[0_10px_30px_rgba(126,87,0,0.08)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/learn" className="font-['Plus_Jakarta_Sans'] text-3xl font-black tracking-[-0.06em] text-[#8a5d00]">
          Adventure Learn
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "font-['Plus_Jakarta_Sans'] text-base font-bold tracking-[-0.02em] transition-transform hover:scale-105",
                active === item.key ? "border-b-4 border-[#ffba38] pb-1 text-[#8a5d00]" : "text-[#6b5932]"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-[#8a5d00]">
          <button type="button" aria-label="Notifications" className="rounded-full bg-white/80 p-3 shadow-[0_8px_20px_rgba(126,87,0,0.08)]">
            <Bell className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Student profile" className="rounded-full bg-white/80 p-3 shadow-[0_8px_20px_rgba(126,87,0,0.08)]">
            <CircleUserRound className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function HeroBlock({ title, subtitle, bubble, accent }: { title: ReactNode; subtitle: string; bubble: string; accent?: ReactNode }) {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 pb-4 pt-10 sm:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="font-['Plus_Jakarta_Sans'] text-5xl font-black leading-[0.95] tracking-[-0.08em] text-[#8a5d00] sm:text-6xl lg:text-7xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl font-['Be_Vietnam_Pro'] text-lg font-medium leading-8 text-[#5b4c2c]">{subtitle}</p>
          {accent ? <div className="mt-5">{accent}</div> : null}
        </div>
        <div className="flex flex-col items-center gap-3 lg:items-end">
          <div className="relative rounded-[1.75rem] bg-white px-5 py-4 text-center shadow-[0_16px_36px_rgba(126,87,0,0.18)] ring-4 ring-[#8a5d00]/10">
            <p className="max-w-[220px] font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#8a5d00]">{bubble}</p>
            <div className="absolute -bottom-3 right-10 h-6 w-6 rotate-45 rounded-sm bg-white" />
          </div>
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#fff8e8] text-6xl shadow-[0_18px_40px_rgba(126,87,0,0.2)] ring-8 ring-white/60">
            <span aria-hidden="true">🦉</span>
            <div className="absolute bottom-1 right-0 rounded-full bg-[#8a5d00] p-2 text-white shadow-lg">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AlertCard({ children }: { children: ReactNode }) {
  return <div role="alert" className="rounded-[2rem] bg-[#fff4cf] px-5 py-4 font-['Be_Vietnam_Pro'] text-sm leading-7 text-[#7e5700] shadow-[0_12px_32px_rgba(126,87,0,0.15)]">{children}</div>;
}

function StatusPill({ children }: { children: ReactNode }) {
  return <p role="status" className="inline-flex rounded-full bg-white/85 px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#8a5d00] shadow-[0_10px_24px_rgba(126,87,0,0.12)]">{children}</p>;
}

function ScoreBadge({ score }: { score: number }) {
  return <span className={clsx("rounded-full px-3 py-1 text-sm font-bold", percentageTone(score))}>{score}%</span>;
}

function LibraryCard({ lesson }: { lesson: LessonSummary }) {
  const mood = lessonMood(lesson.subject);

  return (
    <Link
      href={`/lessons/${lesson.lesson_id}`}
      className={clsx(
        "glass-card group flex h-full flex-col rounded-[2rem] bg-white/88 p-6 shadow-[0_18px_40px_rgba(60,53,18,0.12)] transition-transform duration-200 hover:-translate-y-1",
        "bg-gradient-to-br",
        mood.accent
      )}
    >
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-5xl shadow-inner">{mood.emoji}</div>
      <div className="flex flex-wrap gap-2">
        <span className={clsx("rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.2em]", mood.chip)}>{formatSubjectLabel(lesson.subject)}</span>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-[#5b4c2c]">Grade {lesson.grade_level}</span>
      </div>
      <h3 className="mt-4 font-['Plus_Jakarta_Sans'] text-3xl font-black tracking-[-0.05em] text-[#1f1b00]">{lesson.title}</h3>
      <p className="mt-3 font-['Be_Vietnam_Pro'] text-sm font-semibold text-[#5b4c2c]">Status: {lesson.status}</p>
      <p className="mt-auto pt-6 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#8a5d00]">Tap to open lesson</p>
    </Link>
  );
}

function LearningPathView({ lessons }: { lessons: LessonSummary[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {lessons.map((lesson, index) => {
        const mood = lessonMood(lesson.subject);
        return (
          <div key={lesson.lesson_id} className="relative rounded-[2rem] bg-white/78 p-5 shadow-[0_14px_30px_rgba(60,53,18,0.12)]">
            {index < lessons.length - 1 ? <div className="pointer-events-none absolute left-10 top-full hidden h-10 w-1 rounded-full bg-[#ffcd67] lg:block" /> : null}
            <div className="flex items-start gap-4">
              <div className={clsx("flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-3xl shadow-inner", mood.accent)}>{mood.emoji}</div>
              <div className="min-w-0 flex-1">
                <p className="font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.24em] text-[#8a5d00]">Step {index + 1}</p>
                <h3 className="mt-1 font-['Plus_Jakarta_Sans'] text-2xl font-black tracking-[-0.04em] text-[#1f1b00]">{lesson.title}</h3>
                <p className="mt-2 font-['Be_Vietnam_Pro'] text-sm font-semibold text-[#5b4c2c]">{formatSubjectLabel(lesson.subject)} · Grade {lesson.grade_level}</p>
                <Link href={`/lessons/${lesson.lesson_id}`} className="mt-4 inline-flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm font-black text-[#8a5d00]">
                  Start this step
                  <MoveRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderMetricSubtitle(metric: LessonAnalyticsMetric) {
  return `${formatSubjectLabel(metric.subject)} · Gr. ${metric.grade_level}`;
}

function QuizResultCard({ score, total }: { score: number; total: number }) {
  return (
    <div aria-live="assertive" className="rounded-[1.5rem] bg-[#fff5cf] px-5 py-4 text-[#7e5700] shadow-[0_10px_26px_rgba(126,87,0,0.12)]">
      <p className="font-['Plus_Jakarta_Sans'] text-xl font-black tracking-[-0.04em]">{score} / {total} correct</p>
      <p className="mt-1 font-['Be_Vietnam_Pro'] text-sm font-medium">You finished the quiz. Peek at the green choices to see the right answers.</p>
    </div>
  );
}

function ActivityFrame({ activity, instructionId, children, feedback }: { activity: LessonActivity; instructionId: string; children: ReactNode; feedback?: string | null }) {
  return (
    <div role="group" aria-labelledby={instructionId} className="glass-card rounded-[1.75rem] bg-white/88 p-5 shadow-[0_14px_32px_rgba(60,53,18,0.1)]">
      <p id={instructionId} className="mb-4 font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.3em] text-[#8a5d00]">
        {activity.instruction}
      </p>
      {children}
      {feedback ? <p role="status" className="mt-4 rounded-[1rem] bg-[#f5f0d2] px-4 py-3 font-['Be_Vietnam_Pro'] text-sm font-semibold text-[#5b4c2c]">{feedback}</p> : null}
    </div>
  );
}

function MultipleChoiceActivity({ activity }: { activity: LessonActivity }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const options = Array.isArray(activity.data?.options) ? activity.data.options : [];
  const question = String(activity.data?.question ?? "Choose the best answer.");
  const instructionId = `mc-instruction-${activity.id}`;

  return (
    <ActivityFrame activity={activity} instructionId={instructionId} feedback={feedback}>
      <fieldset className="space-y-3">
        <legend className="font-['Plus_Jakarta_Sans'] text-xl font-black tracking-[-0.03em] text-[#1f1b00]">{question}</legend>
        {options.map((option: any) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-[1.25rem] bg-white/80 px-4 py-3 text-[#1f1b00] shadow-sm">
            <input
              type="radio"
              name={`mc-${activity.id}`}
              value={option.id}
              checked={selected === option.id}
              onChange={() => setSelected(option.id)}
            />
            <span className="font-['Be_Vietnam_Pro'] text-base font-semibold">{option.text}</span>
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        disabled={!selected}
        onClick={() => {
          const correctId = activity.data?.correct_id as string | undefined;
          setFeedback(selected === correctId ? "Nice job! That answer matches the lesson idea." : "Not quite yet. Try looking for the clue that matches the lesson.");
        }}
        className="mt-4 rounded-full bg-[#8a5d00] px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-black text-white disabled:opacity-40"
      >
        Check Answer
      </button>
    </ActivityFrame>
  );
}

function TrueOrFalseActivity({ activity }: { activity: LessonActivity }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const statement = String(activity.data?.statement ?? "Read the statement.");
  const correct = Boolean(activity.data?.correct);
  const instructionId = `tf-instruction-${activity.id}`;

  return (
    <ActivityFrame activity={activity} instructionId={instructionId} feedback={feedback}>
      <p className="font-['Plus_Jakarta_Sans'] text-xl font-black tracking-[-0.03em] text-[#1f1b00]">{statement}</p>
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => setFeedback(correct ? "Correct!" : "Good try. This one is false.")} className="rounded-full bg-[#baf0b6] px-5 py-3 font-['Plus_Jakarta_Sans'] font-black text-[#0f5a17]">True</button>
        <button type="button" onClick={() => setFeedback(!correct ? "Correct!" : "Close. This one is true.")} className="rounded-full bg-[#cae6ff] px-5 py-3 font-['Plus_Jakarta_Sans'] font-black text-[#175b90]">False</button>
      </div>
    </ActivityFrame>
  );
}

function FillInBlankActivity({ activity }: { activity: LessonActivity }) {
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const template = String(activity.data?.template ?? "Fill in the blank.");
  const answer = String(activity.data?.answer ?? "").trim().toLowerCase();
  const instructionId = `fib-instruction-${activity.id}`;

  return (
    <ActivityFrame activity={activity} instructionId={instructionId} feedback={feedback}>
      <p className="font-['Plus_Jakarta_Sans'] text-xl font-black tracking-[-0.03em] text-[#1f1b00]">{template}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-w-[220px] rounded-full bg-white px-4 py-3 font-['Be_Vietnam_Pro'] font-semibold text-[#1f1b00] shadow-inner outline-none ring-2 ring-transparent focus:ring-[#ffcd67]"
          placeholder="Type your answer"
        />
        <button
          type="button"
          disabled={!value.trim()}
          onClick={() => setFeedback(value.trim().toLowerCase() === answer ? "You got it!" : "Almost there. Try another answer.")}
          className="rounded-full bg-[#8a5d00] px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-black text-white disabled:opacity-40"
        >
          Check Answer
        </button>
      </div>
    </ActivityFrame>
  );
}

function DragToSortActivity({ activity }: { activity: LessonActivity }) {
  const initialItems = Array.isArray(activity.data?.items) ? [...activity.data.items] : [];
  const [items, setItems] = useState<string[]>(initialItems);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <ActivityFrame activity={activity} instructionId={`drag-instruction-${activity.id}`} feedback={feedback}>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} role="listitem" className="rounded-[1rem] bg-white/75 p-2">
            <button
              type="button"
              onClick={() => {
                if (selectedIndex === null) {
                  setSelectedIndex(index);
                  return;
                }
                const nextItems = [...items];
                const [selectedItem] = nextItems.splice(selectedIndex, 1);
                nextItems.splice(index, 0, selectedItem);
                setItems(nextItems);
                setSelectedIndex(null);
              }}
              className={clsx(
                "flex w-full items-center justify-between rounded-[0.9rem] px-4 py-3 text-left font-['Plus_Jakarta_Sans'] font-black text-[#1f1b00]",
                selectedIndex === index ? "bg-[#ffe9b4]" : "bg-white"
              )}
            >
              <span>{item}</span>
              <MoveRight className="h-4 w-4 text-[#8a5d00]" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          const correctOrder = Array.isArray(activity.data?.correct_order) ? activity.data.correct_order : [];
          setFeedback(JSON.stringify(items) === JSON.stringify(correctOrder) ? "Perfect order!" : "Try swapping the cards to make the order match.");
        }}
        className="mt-4 rounded-full bg-[#8a5d00] px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-black text-white"
      >
        Check Order
      </button>
    </ActivityFrame>
  );
}

function MatchPairsActivity({ activity }: { activity: LessonActivity }) {
  const pairs = Array.isArray(activity.data?.pairs) ? activity.data.pairs : [];

  return (
    <ActivityFrame activity={activity} instructionId={`match-instruction-${activity.id}`}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          {pairs.map((pair: any) => (
            <button key={`left-${pair.left}`} type="button" className="w-full rounded-[1rem] bg-[#fff0c8] px-4 py-3 text-left font-['Plus_Jakarta_Sans'] font-black text-[#8a5d00]">
              {pair.left}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {pairs.map((pair: any) => (
            <button key={`right-${pair.right}`} type="button" className="w-full rounded-[1rem] bg-[#dff2ff] px-4 py-3 text-left font-['Plus_Jakarta_Sans'] font-black text-[#175b90]">
              {pair.right}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="mt-4 rounded-full bg-[#8a5d00] px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-black text-white">Check Matches</button>
    </ActivityFrame>
  );
}

function CategorySortActivity({ activity }: { activity: LessonActivity }) {
  const categories = Array.isArray(activity.data?.categories) ? activity.data.categories : [];
  const allItems = categories.flatMap((category: any) => (Array.isArray(category.items) ? category.items : []));

  return (
    <ActivityFrame activity={activity} instructionId={`category-instruction-${activity.id}`}>
      <div className="mb-4 flex flex-wrap gap-2">
        {allItems.map((item: string) => (
          <span key={item} className="rounded-full bg-white px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-black text-[#5b4c2c] shadow-sm">{item}</span>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {categories.map((category: any) => (
          <div key={category.name} className="rounded-[1.25rem] bg-white/80 p-4 shadow-inner">
            <p className="font-['Plus_Jakarta_Sans'] text-lg font-black text-[#1f1b00]">{category.name}</p>
            <div className="mt-3 flex min-h-24 flex-wrap gap-2 rounded-[1rem] bg-[#fbf5df] p-3">
              {(Array.isArray(category.items) ? category.items : []).map((item: string) => (
                <span key={`${category.name}-${item}`} className="rounded-full bg-[#fff4cf] px-3 py-2 font-['Be_Vietnam_Pro'] text-sm font-semibold text-[#7e5700]">{item}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ActivityFrame>
  );
}

function NumberLineActivity({ activity }: { activity: LessonActivity }) {
  const min = Number(activity.data?.min ?? 0);
  const max = Number(activity.data?.max ?? 1);
  const divisions = Number(activity.data?.divisions ?? 4);
  const target = Number(activity.data?.target ?? 0);
  const positions = Array.from({ length: divisions + 1 }, (_, index) => Number((min + ((max - min) / divisions) * index).toFixed(2)));
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <ActivityFrame activity={activity} instructionId={`nl-instruction-${activity.id}`} feedback={feedback}>
      <p className="font-['Plus_Jakarta_Sans'] text-xl font-black tracking-[-0.03em] text-[#1f1b00]">{String(activity.data?.label ?? "Place the marker")}</p>
      <div className="mt-4 flex items-center gap-3 overflow-x-auto">
        {positions.map((position) => (
          <button
            key={position}
            type="button"
            aria-label={`Position ${position}`}
            disabled={submitted}
            onClick={() => setSelected(position)}
            className={clsx(
              "flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[#d8ecff] font-['Plus_Jakarta_Sans'] text-sm font-black text-[#175b90] shadow-sm disabled:opacity-50",
              selected === position && "bg-[#8dcdff]"
            )}
          >
            {position}
          </button>
        ))}
      </div>
      {selected !== null ? <p className="mt-3 font-['Be_Vietnam_Pro'] text-sm font-semibold text-[#5b4c2c]">Selected: {selected}</p> : null}
      {selected !== null ? (
        <button
          type="button"
          onClick={() => {
            setSubmitted(true);
            setFeedback(Math.abs(selected - target) < 0.001 ? "Correct! You placed the marker in the right spot." : "Not quite. Try the position that matches the fraction.");
          }}
          className="mt-4 rounded-full bg-[#8a5d00] px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-black text-white"
        >
          Place Marker
        </button>
      ) : null}
    </ActivityFrame>
  );
}

function CountingGridActivity({ activity }: { activity: LessonActivity }) {
  const rows = Number(activity.data?.rows ?? 2);
  const cols = Number(activity.data?.cols ?? 3);
  const [selectedCells, setSelectedCells] = useState<number[]>([]);
  const total = rows * cols;

  return (
    <ActivityFrame activity={activity} instructionId={`counting-instruction-${activity.id}`}>
      <div role="grid" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }, (_, index) => {
          const selected = selectedCells.includes(index);
          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              aria-selected={selected}
              onClick={() =>
                setSelectedCells((current) => (current.includes(index) ? current.filter((value) => value !== index) : [...current, index]))
              }
              className={clsx("aspect-square rounded-[1rem] border-4 border-white shadow-sm", selected ? "bg-[#ffdeac]" : "bg-white")}
            />
          );
        })}
      </div>
      <p className="mt-4 font-['Be_Vietnam_Pro'] text-sm font-semibold text-[#5b4c2c]">Count: {selectedCells.length}</p>
    </ActivityFrame>
  );
}

function WordBankActivity({ activity }: { activity: LessonActivity }) {
  const bank = Array.isArray(activity.data?.bank) ? activity.data.bank : [];

  return (
    <ActivityFrame activity={activity} instructionId={`wordbank-instruction-${activity.id}`}>
      <p className="font-['Plus_Jakarta_Sans'] text-xl font-black tracking-[-0.03em] text-[#1f1b00]">{String(activity.data?.passage ?? "Choose words from the bank")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {bank.map((word: string) => (
          <button key={word} type="button" className="rounded-full bg-[#fff0c8] px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-black text-[#8a5d00] shadow-sm">
            {word}
          </button>
        ))}
      </div>
    </ActivityFrame>
  );
}

function HighlightTextActivity({ activity }: { activity: LessonActivity }) {
  const passage = String(activity.data?.passage ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const tokens = passage.split(/(\s+)/).filter(Boolean);

  return (
    <ActivityFrame activity={activity} instructionId={`highlight-instruction-${activity.id}`}>
      <div className="flex flex-wrap gap-2">
        {tokens.map((token, index) => {
          if (/^\s+$/.test(token)) {
            return <span key={`${token}-${index}`} className="w-2" />;
          }

          const active = selected.includes(`${token}-${index}`);
          return (
            <button
              key={`${token}-${index}`}
              type="button"
              aria-pressed={active}
              onClick={() =>
                setSelected((current) => (current.includes(`${token}-${index}`) ? current.filter((value) => value !== `${token}-${index}`) : [...current, `${token}-${index}`]))
              }
              className={clsx(
                "rounded-full px-3 py-2 font-['Be_Vietnam_Pro'] text-base font-semibold transition-colors",
                active ? "bg-[#cae6ff] text-[#004b70]" : "bg-white text-[#1f1b00]"
              )}
            >
              {token.replace(/[.,!?]/g, "")}
            </button>
          );
        })}
      </div>
    </ActivityFrame>
  );
}

function renderActivity(activity: LessonActivity) {
  switch (activity.type) {
    case "MultipleChoice":
      return <MultipleChoiceActivity activity={activity} />;
    case "TrueOrFalse":
      return <TrueOrFalseActivity activity={activity} />;
    case "FillInBlank":
      return <FillInBlankActivity activity={activity} />;
    case "DragToSort":
      return <DragToSortActivity activity={activity} />;
    case "MatchPairs":
      return <MatchPairsActivity activity={activity} />;
    case "CategorySort":
      return <CategorySortActivity activity={activity} />;
    case "NumberLine":
      return <NumberLineActivity activity={activity} />;
    case "CountingGrid":
      return <CountingGridActivity activity={activity} />;
    case "WordBank":
      return <WordBankActivity activity={activity} />;
    case "HighlightText":
      return <HighlightTextActivity activity={activity} />;
    default:
      return (
        <ActivityFrame activity={activity} instructionId={`activity-instruction-${activity.id}`}>
          <p className="font-['Be_Vietnam_Pro'] text-sm font-semibold text-[#5b4c2c]">This activity style is not ready yet, but the lesson space is ready for it.</p>
        </ActivityFrame>
      );
  }
}

export function LessonsLibraryExperience() {
  const searchParams = useSearchParams();
  const subjectFilter = searchParams.get("subject");
  const subjectLabel = subjectFilter ? formatSubjectLabel(subjectFilter) : null;
  const [view, setView] = useState<"grid" | "path">("grid");
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchLessonSummaries(subjectFilter ?? undefined)
      .then((result) => {
        if (!cancelled) {
          setLessons(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLessons(filterLessonsBySubject(PLAYFUL_FALLBACK_LESSONS, subjectFilter));
          setError("We could not load lessons from the backend right now. Start the lesson services with docker-compose up, or explore the starter cards below.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [subjectFilter]);

  const hasLessons = lessons.length > 0;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#ffd4dd_0%,#fff5ba_52%,#bfe8ff_100%)]">
      <LessonTopBar active="library" />
      <HeroBlock
        title={
          <>
            Lesson <span className="text-[#0f6ca8]">Library</span>
          </>
        }
        subtitle={subjectLabel ? `Choose a playful ${subjectLabel.toLowerCase()} path and jump into quick lesson missions.` : "Pick a magical path, tap a lesson card, and keep your learning streak sparkling."}
        bubble={subjectLabel ? `Ready to explore ${subjectLabel.toLowerCase()}? Pick a card to begin!` : "Choose a lesson card and let’s learn with short, bright adventures!"}
        accent={subjectLabel ? <span className="inline-flex rounded-full bg-white/75 px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-black uppercase tracking-[0.24em] text-[#8a5d00]">Filtered by {subjectLabel}</span> : null}
      />

      <div className="mx-auto max-w-7xl px-5 pb-6 sm:px-8">
        <GeneratedMissionCallout
          title="A custom story mission is waiting"
          description="If someone created a Story Studio lesson on this device, you can open it here before jumping into the regular library cards."
          secondaryHref={null}
        />
      </div>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="mb-6 flex flex-col gap-4 rounded-[2rem] bg-white/78 p-5 shadow-[0_18px_36px_rgba(60,53,18,0.12)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-3xl font-black tracking-[-0.05em] text-[#1f1b00]">Choose Your Path</h2>
            <p className="mt-2 font-['Be_Vietnam_Pro'] text-sm font-semibold text-[#5b4c2c]">Tap a card for a quick win, or switch to the learning path to follow the trail.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={clsx("inline-flex items-center gap-2 rounded-full px-4 py-3 font-['Plus_Jakarta_Sans'] text-sm font-black", view === "grid" ? "bg-[#8a5d00] text-white" : "bg-white text-[#8a5d00]")}>
              <Grid2x2 className="h-4 w-4" />
              Grid
            </button>
            <button type="button" aria-pressed={view === "path"} onClick={() => setView("path")} className={clsx("inline-flex items-center gap-2 rounded-full px-4 py-3 font-['Plus_Jakarta_Sans'] text-sm font-black", view === "path" ? "bg-[#8a5d00] text-white" : "bg-white text-[#8a5d00]")}>
              <BookOpen className="h-4 w-4" />
              Learning Path
            </button>
          </div>
        </div>

        {loading ? <StatusPill>Loading your lessons...</StatusPill> : null}
        {error ? <div className="mb-6"><AlertCard>{error}</AlertCard></div> : null}

        {!loading && !hasLessons ? (
          <div className="rounded-[2rem] bg-white/82 p-8 text-center shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
            <h3 className="font-['Plus_Jakarta_Sans'] text-4xl font-black tracking-[-0.06em] text-[#8a5d00]">No lessons found</h3>
            <p className="mt-4 font-['Be_Vietnam_Pro'] text-base font-semibold leading-7 text-[#5b4c2c]">Try seeding the lesson catalog with python -m app.seed.seed_db, then refresh this page.</p>
          </div>
        ) : view === "grid" ? (
          <ul role="list" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {lessons.map((lesson) => (
              <li key={lesson.lesson_id} role="listitem">
                <LibraryCard lesson={lesson} />
              </li>
            ))}
          </ul>
        ) : (
          <LearningPathView lessons={lessons} />
        )}
      </section>
    </div>
  );
}

export function LessonsAnalyticsExperience() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("student_id") ?? undefined;
  const [summary, setSummary] = useState<LessonAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attentionSummary, setAttentionSummary] = useState<AttentionDailySummary | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchLessonAnalytics(studentId)
      .then((result) => {
        if (!cancelled) {
          setSummary(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(PLAYFUL_FALLBACK_ANALYTICS);
          setError("We could not load analytics from the backend right now, so this dashboard is showing the starter summary cards instead.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    if (studentId) {
      fetchAttentionSummary(studentId).then((result) => {
        if (!cancelled) setAttentionSummary(result);
      }).catch(() => {});
      fetchDashboard(studentId).then((result) => {
        if (!cancelled) setDashboard(result);
      }).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const metrics = summary?.lessons ?? [];

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#fff4cf_0%,#ffedc0_45%,#d5edff_100%)]">
      <LessonTopBar active="analytics" />
      <HeroBlock
        title={
          <>
            Analytics <span className="text-[#0f6ca8]">Dashboard</span>
          </>
        }
        subtitle="A bright snapshot of how the lesson journey is going, with quick scores that are easy to scan."
        bubble={studentId ? "Here is your learner's progress map!" : "Want to see your progress sparkle? Let’s peek!"}
      />

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-['Plus_Jakarta_Sans'] text-4xl font-black tracking-[-0.06em] text-[#8a5d00]">Progress Snapshot</h2>
          <Link href="/lessons" className="rounded-full bg-white/80 px-4 py-3 font-['Plus_Jakarta_Sans'] text-sm font-black text-[#8a5d00] shadow-[0_10px_24px_rgba(126,87,0,0.1)]">Back</Link>
        </div>

        {loading ? <StatusPill>Loading your dashboard...</StatusPill> : null}
        {error ? <div className="mb-6"><AlertCard>{error}</AlertCard></div> : null}

        {summary ? (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[2rem] bg-white/84 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
                <p className="font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.28em] text-[#8a5d00]">Active Lessons</p>
                <p className="mt-3 text-3xl font-black text-[#1f1b00]">{summary.total_lessons}</p>
              </div>
              <div className="rounded-[2rem] bg-white/84 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
                <p className="font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.28em] text-[#8a5d00]">Avg Quiz</p>
                <p className="mt-3 text-3xl font-black text-[#1f1b00]">{summary.avg_quiz_pass}%</p>
              </div>
            </div>

            <div className="mt-8 rounded-[2rem] bg-white/82 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
              <div className="mb-5 flex items-center gap-3">
                <Trophy className="h-5 w-5 text-[#8a5d00]" />
                <h3 className="font-['Plus_Jakarta_Sans'] text-3xl font-black tracking-[-0.05em] text-[#1f1b00]">Lesson Metrics</h3>
              </div>
              <ul aria-label="Lesson metrics" className="space-y-4">
                {metrics.map((metric) => (
                  <li key={metric.lesson_id} className="flex flex-col gap-4 rounded-[1.5rem] bg-[#fff9e8] p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-['Plus_Jakarta_Sans'] text-2xl font-black tracking-[-0.04em] text-[#1f1b00]">{metric.title}</p>
                      <p className="mt-1 font-['Be_Vietnam_Pro'] text-sm font-semibold text-[#5b4c2c]">{renderMetricSubtitle(metric)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ScoreBadge score={metric.quiz_pass_rate} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}

        {/* Attention Tracking Section */}
        <div className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[#8a5d00]" />
            <h3 className="font-['Plus_Jakarta_Sans'] text-3xl font-black tracking-[-0.05em] text-[#1f1b00]">Attention Tracking</h3>
          </div>

          {dashboard ? (
            <div className="mb-6 grid gap-5 md:grid-cols-3">
              <div className="rounded-[2rem] bg-white/84 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
                <p className="font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.28em] text-[#8a5d00]">Lessons Completed</p>
                <p className="mt-3 text-3xl font-black text-[#1f1b00]">{dashboard.lessons_completed}</p>
              </div>
              <div className="rounded-[2rem] bg-white/84 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
                <p className="font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.28em] text-[#8a5d00]">Quizzes Taken</p>
                <p className="mt-3 text-3xl font-black text-[#1f1b00]">{dashboard.quizzes_taken}</p>
              </div>
              <div className="rounded-[2rem] bg-white/84 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
                <p className="font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.28em] text-[#8a5d00]">Avg Attention</p>
                <p className="mt-3 text-3xl font-black text-[#1f1b00]">
                  {dashboard.attention_summary.average_attention_score > 0
                    ? `${Math.round(dashboard.attention_summary.average_attention_score * 100)}%`
                    : "—"}
                </p>
              </div>
            </div>
          ) : null}

          {dashboard?.quiz_focus ? (
            <div className="mb-6 grid gap-5 md:grid-cols-3">
              <div className="rounded-[2rem] bg-white/84 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
                <p className="font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.28em] text-[#8a5d00]">Quiz Attempts</p>
                <p className="mt-3 text-3xl font-black text-[#1f1b00]">{dashboard.quiz_focus.attempts}</p>
              </div>
              <div className="rounded-[2rem] bg-white/84 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
                <p className="font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.28em] text-[#8a5d00]">Quiz Focus Avg</p>
                <p className="mt-3 text-3xl font-black text-[#1f1b00]">
                  {dashboard.quiz_focus.average_attention_score > 0
                    ? `${Math.round(dashboard.quiz_focus.average_attention_score * 100)}%`
                    : "—"}
                </p>
              </div>
              <div className="rounded-[2rem] bg-white/84 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
                <p className="font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.28em] text-[#8a5d00]">Low Focus Attempts</p>
                <p className="mt-3 text-3xl font-black text-[#1f1b00]">{dashboard.quiz_focus.low_focus_attempts}</p>
              </div>
            </div>
          ) : null}

          {attentionSummary && attentionSummary.daily_avg.length > 0 ? (
            <div className="mb-6 rounded-[2rem] bg-white/82 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
              <h4 className="mb-4 font-['Plus_Jakarta_Sans'] text-xl font-black text-[#1f1b00]">Daily Attention Trend</h4>
              <div className="flex items-end gap-1.5" style={{ height: 120 }}>
                {attentionSummary.daily_avg.map((day) => {
                  const pct = Math.round(day.score * 100);
                  return (
                    <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-500">{pct}%</span>
                      <div
                        className={clsx("w-full rounded-t-lg", pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-rose-400")}
                        style={{ height: `${Math.max(pct, 4)}%` }}
                      />
                      <span className="text-[9px] text-slate-400">{day.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
              {attentionSummary.drift_count > 0 && (
                <p className="mt-3 text-sm text-amber-700">
                  {attentionSummary.drift_count} drift event{attentionSummary.drift_count > 1 ? "s" : ""} detected this week
                </p>
              )}
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            {studentId ? (
              <>
                <MiniTestPanel userId={studentId} />
                <SelfReportPanel userId={studentId} />
              </>
            ) : (
              <div className="col-span-2 rounded-[2rem] bg-white/82 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
                <p className="font-['Be_Vietnam_Pro'] text-sm text-[#5b4c2c]">
                  Pass a <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">?student_id=UUID</code> to enable
                  attention mini-test and self-report panels.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionNavigation({ sections, currentSection, onSelect }: { sections: ParsedSection[]; currentSection: number; onSelect: (index: number) => void }) {
  return (
    <nav aria-label="Lesson sections" className="hidden rounded-[2rem] bg-white/82 p-5 shadow-[0_18px_36px_rgba(60,53,18,0.12)] lg:block">
      <p className="font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.28em] text-[#8a5d00]">Lesson sections</p>
      <div className="mt-4 space-y-3">
        {sections.map((section, index) => {
          const active = index === currentSection;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onSelect(index)}
              className={clsx(
                "w-full rounded-[1.25rem] px-4 py-3 text-left font-['Plus_Jakarta_Sans'] text-sm font-black transition-colors",
                active ? "bg-[#ffefc5] text-[#8a5d00]" : "bg-[#f7f1de] text-[#5b4c2c]"
              )}
            >
              <span className="flex items-center justify-between gap-3">
                <span>{section.title}</span>
                {active ? <span aria-current="step" className="rounded-full bg-[#8a5d00] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white">Now</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function LessonSectionContent({ section }: { section: ParsedSection }) {
  return (
    <div className="space-y-5">
      {section.nodes.map((node) =>
        node.type === "html" ? (
          <div
            key={node.key}
            className="lesson-prose rounded-[1.5rem] bg-white/75 px-5 py-4 font-['Be_Vietnam_Pro'] text-base leading-8 text-[#3f341d] shadow-[0_10px_24px_rgba(60,53,18,0.08)]"
            dangerouslySetInnerHTML={{ __html: node.html }}
          />
        ) : (
          <div key={node.key}>{renderActivity(node.activity)}</div>
        )
      )}
    </div>
  );
}

function buildQuizScore(quiz: LessonQuizPayload, answers: Record<string, string>) {
  let correct = 0;
  for (const question of quiz.questions) {
    const correctOption = question.options.find((option) => !option.is_distractor);
    if (correctOption && answers[question.question_id] === correctOption.option_id) {
      correct += 1;
    }
  }
  return correct;
}

function QuizQuestionMountTracker({
  questionId,
  startedRef,
}: {
  questionId: string;
  startedRef: MutableRefObject<Record<string, number>>;
}) {
  useEffect(() => {
    if (startedRef.current[questionId] == null) {
      startedRef.current[questionId] = Date.now();
    }
  }, [questionId, startedRef]);
  return null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function newQuizRunUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function LessonViewerExperience({ lessonId }: { lessonId: string }) {
  const searchParams = useSearchParams();
  const storeUserId = useAuthStore((s) => s.userId);
  const queryStudentId = searchParams.get("student_id");
  const effectiveUserId = queryStudentId ?? storeUserId ?? undefined;
  const logWithUser = useCallback(
    (body: Record<string, unknown>) => {
      void logLessonEvent({
        ...body,
        ...(effectiveUserId ? { user_id: effectiveUserId } : {}),
      });
    },
    [effectiveUserId],
  );

  const [analyticsSessionId, setAnalyticsSessionId] = useState<string | null>(null);
  const analyticsSessionIdRef = useRef<string | null>(null);
  const [quizRunId, setQuizRunId] = useState<string | null>(null);
  const lessonOpenedAtRef = useRef<number | null>(null);
  const quizStartedAtRef = useRef<number | null>(null);
  const quizStartedIngestKeyRef = useRef<string | null>(null);
  const questionStartedAtRef = useRef<Record<string, number>>({});
  const answerSelectedAtRef = useRef<Record<string, number>>({});

  const [driftBanner, setDriftBanner] = useState<{ action: string; rationale: string } | null>(null);
  const [lesson, setLesson] = useState<LessonRenderPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [a11yOpen, setA11yOpen] = useState(false);
  const [fontSize, setFontSize] = useState<"A" | "A+" | "A++">("A");
  const [highContrast, setHighContrast] = useState(false);
  const [quizPending, setQuizPending] = useState(false);

  // ── Feedback Agent state ──────────────────────────────────────
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackHintLevel, setFeedbackHintLevel] = useState<number | undefined>(undefined);
  const [feedbackIsMotivation, setFeedbackIsMotivation] = useState(false);
  const [hintLevels, setHintLevels] = useState<Record<string, number>>({});
  const [hintPending, setHintPending] = useState<string | null>(null);
  const [explanationPending, setExplanationPending] = useState<string | null>(null);

  const showFeedback = useCallback((title: string, content: string, opts?: { hintLevel?: number; isMotivation?: boolean }) => {
    setFeedbackTitle(title);
    setFeedbackContent(content);
    setFeedbackHintLevel(opts?.hintLevel);
    setFeedbackIsMotivation(opts?.isMotivation ?? false);
    setFeedbackModalOpen(true);
  }, []);

  const feedbackUserId = effectiveUserId && isUuid(effectiveUserId) ? effectiveUserId : "student";
  const feedbackSessionId = analyticsSessionId ?? "session";

  const handleHintRequest = useCallback(async (questionId: string, questionText: string) => {
    const currentLevel = hintLevels[questionId] ?? 1;
    if (currentLevel > 3) return;
    setHintPending(questionId);
    const result = await requestHint({
      question_id: questionId,
      question_text: questionText,
      user_id: feedbackUserId,
      session_id: feedbackSessionId,
      hint_level: currentLevel,
    });
    setHintLevels((prev) => ({ ...prev, [questionId]: Math.min(currentLevel + 1, 4) }));
    showFeedback(`Hint (Level ${currentLevel})`, result.hint_text, { hintLevel: currentLevel });
    setHintPending(null);
  }, [feedbackSessionId, feedbackUserId, hintLevels, showFeedback]);

  const handleExplanationRequest = useCallback(async (questionId: string, questionText: string, userAnswer: string, correctAnswer: string, misconceptionType?: string | null) => {
    setExplanationPending(questionId);
    const result = await requestExplanation({
      question_id: questionId,
      question_text: questionText,
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      user_id: feedbackUserId,
      session_id: feedbackSessionId,
      misconception_type: misconceptionType,
    });
    showFeedback("Let's review this question", `${result.explanation}\n\n${result.motivational_message}`);
    setExplanationPending(null);
  }, [feedbackSessionId, feedbackUserId, showFeedback]);

  useEffect(() => {
    if (!lesson || !effectiveUserId || !isUuid(effectiveUserId)) {
      return;
    }

    let active = true;
    createLearningSession(effectiveUserId)
      .then((session) => {
        if (!active) {
          return;
        }
        analyticsSessionIdRef.current = session.session_id;
        setAnalyticsSessionId(session.session_id);
        if (lessonOpenedAtRef.current === null) {
          lessonOpenedAtRef.current = Date.now();
        }
      })
      .catch(() => {
        if (active) {
          analyticsSessionIdRef.current = null;
          setAnalyticsSessionId(null);
        }
      });

    return () => {
      active = false;
      const sessionId = analyticsSessionIdRef.current;
      analyticsSessionIdRef.current = null;
      if (sessionId) {
        endLearningSession(sessionId).catch(() => {});
      }
      setAnalyticsSessionId(null);
    };
  }, [effectiveUserId, lesson]);

  const logBreakDecision = useCallback(
    async (eventType: "break_accepted" | "break_declined") => {
      if (!analyticsSessionId || !effectiveUserId || !isUuid(effectiveUserId)) return;
      await ingestAnalyticsEvent({
        event_type: eventType,
        timestamp: new Date().toISOString(),
        user_id: effectiveUserId,
        session_id: analyticsSessionId,
        data: { reason: "lesson_viewer_drift_banner" },
      }).catch(() => {});
      setDriftBanner(null);
    },
    [analyticsSessionId, effectiveUserId],
  );

  const {
    quiz,
    quizAnswers,
    quizSubmitted,
    attemptNumber,
    retryQuiz,
    retryPending,
    lastScore,
    setQuizAnswers,
    startQuizAttempt,
    resetQuizState,
    submitQuiz,
    startRetryAttempt,
  } = useTwoAttemptQuizController({
    generateQuiz: async (attempt, excludeQuestionIds) => {
      if (!lesson) {
        throw new Error("Lesson is required to generate a quiz.");
      }
      return generateLessonQuiz(lesson, { attemptNumber: attempt, excludeQuestionIds });
    },
    onAttemptStart: () => {
      setHintLevels({});
      questionStartedAtRef.current = {};
      answerSelectedAtRef.current = {};
      quizStartedAtRef.current = Date.now();
      quizStartedIngestKeyRef.current = null;
      setQuizRunId(newQuizRunUuid());
    },
    onAttemptComplete: async (result) => {
      if (!lesson) return;
      const { score, total, attemptNumber: attempt, quiz: completedQuiz, answers } = result;
      const sessionPayload =
        analyticsSessionId && isUuid(effectiveUserId)
          ? { session_id: analyticsSessionId }
          : {};

      logWithUser({
        event: "quiz_submit",
        lesson_id: lesson.lesson_id,
        answers,
        quiz_score: score,
        quiz_total: total,
        attempt_number: attempt,
        ...sessionPayload,
      });
      logWithUser({
        event: "quiz_completed",
        lesson_id: lesson.lesson_id,
        quiz_score: score,
        quiz_total: total,
        attempt_number: attempt,
        lesson_title: lesson.title ?? "Unknown Lesson",
        subject: lesson.quiz_context?.subject ?? "math",
        grade_level: lesson.quiz_context?.grade_level ?? 0,
        ...sessionPayload,
      });

      if (
        analyticsSessionId &&
        effectiveUserId &&
        isUuid(effectiveUserId) &&
        quizRunId &&
        isUuid(quizRunId)
      ) {
        const submitAt = Date.now();
        const elapsedMs =
          quizStartedAtRef.current !== null
            ? Math.max(1, submitAt - quizStartedAtRef.current)
            : total * 2000;
        const lessonMs = Math.max(1, submitAt - (lessonOpenedAtRef.current ?? submitAt));
        const orderedIds = completedQuiz.questions.map((qu) => qu.question_id);

        for (let i = 0; i < completedQuiz.questions.length; i++) {
          const qu = completedQuiz.questions[i]!;
          const selectedAt = answerSelectedAtRef.current[qu.question_id] ?? submitAt;
          const startedAt = questionStartedAtRef.current[qu.question_id] ?? quizStartedAtRef.current ?? submitAt;
          const responseLatencyMs = Math.max(1, selectedAt - startedAt);
          let idleMs = 0;
          if (i === 0) {
            idleMs = Math.max(0, selectedAt - (quizStartedAtRef.current ?? selectedAt));
          } else {
            const prevId = orderedIds[i - 1]!;
            const prevAt = answerSelectedAtRef.current[prevId] ?? quizStartedAtRef.current ?? selectedAt;
            idleMs = Math.max(0, selectedAt - prevAt);
          }
          const correctOption = qu.options.find((opt) => !opt.is_distractor);
          const isCorrect = !!(correctOption && answers[qu.question_id] === correctOption.option_id);
          const chosen = qu.options.find((opt) => opt.option_id === answers[qu.question_id]);
          try {
            const raw = await ingestAnalyticsEvent({
              event_type: "question_answered",
              timestamp: new Date().toISOString(),
              user_id: effectiveUserId,
              session_id: analyticsSessionId,
              data: {
                question_id: qu.question_id,
                answer: answers[qu.question_id] ?? "",
                is_correct: isCorrect,
                response_latency_ms: responseLatencyMs,
                idle_ms: idleMs,
                lesson_id: lesson.lesson_id,
                misconception_type: chosen?.misconception_type ?? null,
                attempt_number: attempt,
              },
            });
            const res = raw as QuestionAnsweredIngestResponse;
            if (res.drift === true) {
              setDriftBanner({
                action: String(res.recommended_action ?? "continue"),
                rationale: String(res.rationale ?? ""),
              });
            }
          } catch {
            /* ignore */
          }
        }

        await ingestAnalyticsEvent({
          event_type: "quiz_completed",
          timestamp: new Date().toISOString(),
          user_id: effectiveUserId,
          session_id: analyticsSessionId,
          data: {
            quiz_id: quizRunId,
            score,
            total_questions: total,
            time_spent_ms: elapsedMs,
            lesson_id: lesson.lesson_id,
            attempt_number: attempt,
            difficulty_band:
              total > 0 && score / total >= 0.8
                ? "hard"
                : total > 0 && score / total <= 0.4
                  ? "easy"
                  : "medium",
          },
        }).catch(() => {});

        await ingestAnalyticsEvent({
          event_type: "lesson_completed",
          timestamp: new Date().toISOString(),
          user_id: effectiveUserId,
          session_id: analyticsSessionId,
          data: {
            lesson_id: lesson.lesson_id,
            time_spent_ms: lessonMs,
          },
        }).catch(() => {});
      }
    },
  });

  const handleQuizSubmit = useCallback(async () => {
    if (!lesson) return;
    const result = await submitQuiz();
    if (!result || !result.shouldRetry) {
      return;
    }

    try {
      const motivation = await requestMotivation({
        user_id: feedbackUserId,
        session_id: feedbackSessionId,
        error_count: result.total - result.score,
        question_context: lesson.quiz_context.subject,
      });
      showFeedback(
        "Let's try a new quiz",
        `You scored ${result.score} out of ${result.total}. ${motivation.message}`,
        { isMotivation: true },
      );
    } catch {
      showFeedback("Let's try a new quiz", `You scored ${result.score} out of ${result.total}. Try again with a fresh set of questions.`, { isMotivation: true });
    }
  }, [feedbackSessionId, feedbackUserId, lesson, showFeedback, submitQuiz]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setShowFallback(false);

    fetchLessonRender(lessonId)
      .then((result) => {
        if (!cancelled) {
          setLesson(result);
        }
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        const fallback = getFallbackLessonRender(lessonId);
        if (fallback) {
          setLesson(fallback);
          setShowFallback(true);
          setError(requestError instanceof Error ? `${requestError.message} Showing the starter lesson version instead.` : "Showing the starter lesson version instead.");
          return;
        }

        setLesson(null);
        setError(requestError instanceof Error ? requestError.message : "Could not load this lesson.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const sections = useMemo(() => splitLessonSections(lesson), [lesson]);
  const title = lesson?.title ?? `${lesson?.quiz_context.subject ?? "Lesson"} Adventure`;
  const progress = sections.length > 1 ? Math.round((currentSection / (sections.length - 1)) * 100) : sections.length === 1 ? 100 : 0;
  const currentQuizScore = quiz && quizSubmitted ? buildQuizScore(quiz, quizAnswers) : 0;

  useEffect(() => {
    setCurrentSection(0);
    resetQuizState();
    quizStartedAtRef.current = null;
    quizStartedIngestKeyRef.current = null;
    questionStartedAtRef.current = {};
    answerSelectedAtRef.current = {};
    setQuizRunId(null);
    lessonOpenedAtRef.current = null;
    setDriftBanner(null);
  }, [lessonId]);

  useEffect(() => {
    if (currentSection >= sections.length && sections.length) {
      setCurrentSection(sections.length - 1);
    }
  }, [currentSection, sections.length]);

  useEffect(() => {
    setDriftBanner(null);
  }, [currentSection]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
        return;
      }

      if (event.key === "Escape") {
        setA11yOpen(false);
        return;
      }

      if (event.key === "ArrowRight") {
        setCurrentSection((value) => Math.min(value + 1, Math.max(sections.length - 1, 0)));
      }

      if (event.key === "ArrowLeft") {
        setCurrentSection((value) => Math.max(value - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sections.length]);

  useEffect(() => {
    if (!lesson || !sections[currentSection]) {
      return;
    }

    void logLessonEvent({
      event: "section_view",
      lesson_id: lesson.lesson_id,
      section: sections[currentSection].title,
    });
  }, [currentSection, lesson, sections]);

  const fontClass = fontSize === "A" ? "text-base" : fontSize === "A+" ? "text-lg" : "text-xl";

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,#fff4cf_0%,#ffedc0_45%,#d5edff_100%)]">
        <LessonTopBar active="library" />
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <StatusPill>Loading your lesson adventure...</StatusPill>
        </section>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,#fff4cf_0%,#ffedc0_45%,#d5edff_100%)]">
        <LessonTopBar active="library" />
        <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
          <AlertCard>{error ?? "Could not load this lesson."}</AlertCard>
          <div className="mt-6">
            <Link href="/lessons" className="inline-flex items-center gap-2 rounded-full bg-white/85 px-5 py-3 font-['Plus_Jakarta_Sans'] font-black text-[#8a5d00] shadow-[0_10px_24px_rgba(126,87,0,0.1)]">
              <ChevronLeft className="h-4 w-4" />
              Back to Lessons
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const answeredAllQuestions = quiz ? quiz.questions.every((question) => quizAnswers[question.question_id]) : false;
  const failedFirstAttempt = lastScore?.total && attemptNumber === 1 ? lastScore.score < 3 : false;

  return (
    <div className={clsx("min-h-screen bg-[linear-gradient(135deg,#fff4cf_0%,#ffedc0_45%,#d5edff_100%)]", highContrast && "bg-black text-white")}>
      <LessonTopBar active="library" />
      <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8">
        <a href="#lesson-content" className="inline-flex rounded-full bg-white/85 px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-black text-[#8a5d00] shadow-[0_8px_20px_rgba(126,87,0,0.1)]">
          Skip to lesson content
        </a>

        {error ? <div className="mt-5"><AlertCard>{error}</AlertCard></div> : null}

        <header role="banner" className="mt-5 rounded-[2rem] bg-white/84 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Link href="/lessons" className="inline-flex items-center gap-2 rounded-full bg-[#fff4cf] px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-black text-[#8a5d00]">
                <ChevronLeft className="h-4 w-4" />
                Back to Lessons
              </Link>
              <div>
                <p className="font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.3em] text-[#8a5d00]">{lesson.quiz_context.subject} · Grade {lesson.quiz_context.grade_level}</p>
                <h1 className="mt-3 font-['Plus_Jakarta_Sans'] text-4xl font-black tracking-[-0.06em] text-[#1f1b00]">{showFallback ? `${lesson.quiz_context.subject} Adventure` : title}</h1>
                <p className="mt-3 font-['Be_Vietnam_Pro'] text-base font-semibold leading-7 text-[#5b4c2c]">Short, colorful sections keep this lesson light, focused, and easy to finish.</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 lg:items-end">
              <div
                role="progressbar"
                aria-label="Lesson progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="w-full max-w-xs rounded-full bg-[#f4ead0] p-2 shadow-inner"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#7bdc77] via-[#ffcd67] to-[#8dcdff]" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="font-['Plus_Jakarta_Sans'] text-sm font-black text-[#8a5d00]">{progress}%</span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Accessibility settings"
                aria-expanded={a11yOpen}
                onClick={() => setA11yOpen((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full bg-[#cae6ff] px-4 py-3 font-['Plus_Jakarta_Sans'] text-sm font-black text-[#004b70]"
              >
                <Volume2 className="h-4 w-4" />
                Accessibility Settings
              </button>
            </div>
          </div>

          {a11yOpen ? (
            <div id="lesson-accessibility-panel" role="dialog" aria-label="Accessibility settings" className="mt-5 rounded-[1.5rem] bg-[#fff8e8] p-5 shadow-inner">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-['Plus_Jakarta_Sans'] text-sm font-black uppercase tracking-[0.24em] text-[#8a5d00]">Text size</p>
                  <div className="mt-3 flex gap-2">
                    {(["A", "A+", "A++"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={fontSize === option}
                        onClick={() => setFontSize(option)}
                        className={clsx("rounded-full px-4 py-2 font-['Plus_Jakarta_Sans'] text-sm font-black", fontSize === option ? "bg-[#8a5d00] text-white" : "bg-white text-[#8a5d00]")}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-3 rounded-full bg-white px-4 py-3 font-['Plus_Jakarta_Sans'] text-sm font-black text-[#1f1b00]">
                  <input type="checkbox" checked={highContrast} onChange={(event) => setHighContrast(event.target.checked)} aria-label="High contrast" />
                  High contrast
                </label>
              </div>
            </div>
          ) : null}
        </header>

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {sections[currentSection] ? `Now reading ${sections[currentSection].title}` : "Lesson ready"}
        </div>

        <main id="lesson-content" aria-label="Lesson content" className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <SectionNavigation sections={sections} currentSection={currentSection} onSelect={setCurrentSection} />

          <article className={clsx("space-y-6", fontClass)}>
            {driftBanner ? (
              <div
                role="alert"
                className="rounded-[2rem] border-2 border-amber-200 bg-[#fff8e8] px-5 py-4 shadow-[0_12px_32px_rgba(126,87,0,0.12)]"
              >
                <p className="font-['Plus_Jakarta_Sans'] text-sm font-black text-[#7e5700]">Focus check-in</p>
                {driftBanner.action === "recap" ? (
                  <p className="mt-2 font-['Be_Vietnam_Pro'] text-sm leading-7 text-[#5b4c2c]">
                    Looks like focus has dipped — want a quick recap before the next section?
                  </p>
                ) : driftBanner.action === "break" ? (
                  <p className="mt-2 font-['Be_Vietnam_Pro'] text-sm leading-7 text-[#5b4c2c]">
                    You&apos;ve been working hard — a short break will help you come back stronger.
                  </p>
                ) : (
                  <p className="mt-2 font-['Be_Vietnam_Pro'] text-sm leading-7 text-[#5b4c2c]">
                    {driftBanner.rationale || "Take a breath — steady pacing helps learning stick."}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {driftBanner.action === "recap" ? (
                    <button
                      type="button"
                      className="rounded-full bg-[#8a5d00] px-4 py-2 font-['Plus_Jakarta_Sans'] text-xs font-black text-white"
                      onClick={() => {
                        setCurrentSection(0);
                        setDriftBanner(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Take a Recap
                    </button>
                  ) : null}
                  {driftBanner.action === "break" ? (
                    <>
                      <button
                        type="button"
                        className="rounded-full bg-amber-500 px-4 py-2 font-['Plus_Jakarta_Sans'] text-xs font-black text-white"
                        onClick={() => void logBreakDecision("break_accepted")}
                      >
                        Take a Break
                      </button>
                      <button
                        type="button"
                        className="rounded-full bg-white px-4 py-2 font-['Plus_Jakarta_Sans'] text-xs font-black text-[#8a5d00] ring-2 ring-[#ffba38]"
                        onClick={() => void logBreakDecision("break_declined")}
                      >
                        Keep Going
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-full bg-white/90 px-4 py-2 font-['Plus_Jakarta_Sans'] text-xs font-black text-[#5b4c2c] ring-1 ring-[#e8dfc8]"
                    onClick={() => setDriftBanner(null)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}

            <div className="rounded-[2rem] bg-white/84 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
              <h2 className="font-['Plus_Jakarta_Sans'] text-3xl font-black tracking-[-0.05em] text-[#1f1b00]">{sections[currentSection]?.title ?? "Adventure Start"}</h2>
              <div className="mt-5">
                {sections[currentSection] ? <LessonSectionContent section={sections[currentSection]} /> : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] bg-white/82 p-5 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
              <button
                type="button"
                aria-label="Previous section"
                disabled={currentSection === 0}
                onClick={() => setCurrentSection((value) => Math.max(value - 1, 0))}
                className="inline-flex items-center gap-2 rounded-full bg-[#f5efe0] px-5 py-3 font-['Plus_Jakarta_Sans'] text-sm font-black text-[#5b4c2c] disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Section
              </button>
              <button
                type="button"
                aria-label={currentSection === sections.length - 1 ? "Complete lesson" : "Next section"}
                onClick={() => setCurrentSection((value) => Math.min(value + 1, Math.max(sections.length - 1, 0)))}
                className="inline-flex items-center gap-2 rounded-full bg-[#8a5d00] px-5 py-3 font-['Plus_Jakarta_Sans'] text-sm font-black text-white"
              >
                {currentSection === sections.length - 1 ? "Complete Lesson" : "Next Section"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <section className="rounded-[2rem] bg-white/84 p-6 shadow-[0_18px_36px_rgba(60,53,18,0.12)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.28em] text-[#8a5d00]">Quick check</p>
                  <h3 className="mt-2 font-['Plus_Jakarta_Sans'] text-3xl font-black tracking-[-0.05em] text-[#1f1b00]">Quiz Time</h3>
                </div>
                <button
                  type="button"
                  aria-label="Generate quiz for this lesson"
                  onClick={async () => {
                    setQuizPending(true);
                    const generatedQuiz = await generateLessonQuiz(lesson, { attemptNumber: 1 });
                    startQuizAttempt(generatedQuiz, 1);
                    setQuizPending(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-[#cae6ff] px-5 py-3 font-['Plus_Jakarta_Sans'] text-sm font-black text-[#004b70]"
                >
                  {quizPending ? "Generating Quiz..." : "Start Quiz"}
                </button>
              </div>

              {quiz ? (
                <div className="mt-6 space-y-5">
                  <h4 className="font-['Plus_Jakarta_Sans'] text-2xl font-black tracking-[-0.04em] text-[#1f1b00]">Quiz — {quiz.questions.length} questions</h4>
                  {quiz.questions.map((question, questionIndex) => {
                    const selectedOptionId = quizAnswers[question.question_id];
                    const correctOption = question.options.find((opt) => !opt.is_distractor);
                    const selectedOption = question.options.find((opt) => opt.option_id === selectedOptionId);
                    const isWrong = quizSubmitted && selectedOptionId && correctOption && selectedOptionId !== correctOption.option_id;
                    const currentHintLevel = hintLevels[question.question_id] ?? 1;

                    return (
                      <fieldset key={question.question_id} className="rounded-[1.5rem] bg-[#fff9e8] p-5 shadow-sm">
                        <legend className="font-['Plus_Jakarta_Sans'] text-lg font-black text-[#1f1b00]">{questionIndex + 1}. {question.question_text}</legend>
                        <QuizQuestionMountTracker questionId={question.question_id} startedRef={questionStartedAtRef} />
                        <div className="mt-4 space-y-3">
                          {question.options.map((option) => {
                            const selected = selectedOptionId === option.option_id;
                            const correct = !option.is_distractor;
                            return (
                              <label
                                key={option.option_id}
                                className={clsx(
                                  "flex cursor-pointer items-center gap-3 rounded-[1rem] px-4 py-3 font-['Be_Vietnam_Pro'] text-base font-semibold text-[#1f1b00] shadow-sm",
                                  quizSubmitted && correct && "bg-emerald-50 text-emerald-900",
                                  quizSubmitted && selected && !correct && "bg-rose-50 text-rose-900",
                                  !quizSubmitted && selected && "bg-[#e8f3ff]",
                                  !selected && !quizSubmitted && "bg-white"
                                )}
                              >
                                <input
                                  type="radio"
                                  name={question.question_id}
                                  value={option.option_id}
                                  checked={selected}
                                  disabled={quizSubmitted}
                                  onChange={() => {
                                    answerSelectedAtRef.current[question.question_id] = Date.now();
                                    setQuizAnswers((current) => ({ ...current, [question.question_id]: option.option_id }));
                                  }}
                                />
                                <span>{option.option_text}</span>
                              </label>
                            );
                          })}
                        </div>

                        {/* Hint button – available before submission, up to 3 levels */}
                        {!quizSubmitted && currentHintLevel <= 3 ? (
                          <button
                            type="button"
                            disabled={hintPending === question.question_id}
                            onClick={() => void handleHintRequest(question.question_id, question.question_text)}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#e8f3ff] px-4 py-2 font-['Plus_Jakarta_Sans'] text-xs font-black text-[#175b90] transition-colors hover:bg-[#d1e8ff] disabled:opacity-50"
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                            {hintPending === question.question_id ? "Loading hint..." : `Get a Hint (${currentHintLevel}/3)`}
                          </button>
                        ) : null}

                        {/* Explain button – visible after submission for wrong answers */}
                        {isWrong ? (
                          <button
                            type="button"
                            disabled={explanationPending === question.question_id}
                            onClick={() => void handleExplanationRequest(
                              question.question_id,
                              question.question_text,
                              selectedOption?.option_text ?? "",
                              correctOption?.option_text ?? "",
                              selectedOption?.misconception_type,
                            )}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#ffefc5] px-4 py-2 font-['Plus_Jakarta_Sans'] text-xs font-black text-[#8a5d00] transition-colors hover:bg-[#ffd694] disabled:opacity-50"
                          >
                            {explanationPending === question.question_id ? "Loading..." : "Explain This"}
                          </button>
                        ) : null}
                      </fieldset>
                    );
                  })}

                  <button
                    type="button"
                    disabled={!answeredAllQuestions || quizSubmitted}
                    onClick={() => void handleQuizSubmit()}
                    className="rounded-full bg-[#8a5d00] px-5 py-3 font-['Plus_Jakarta_Sans'] text-sm font-black text-white disabled:opacity-40"
                  >
                    Submit Quiz
                  </button>

                  {quizSubmitted ? <QuizResultCard score={currentQuizScore} total={quiz.questions.length} /> : null}

                  {quizSubmitted && failedFirstAttempt ? (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={!retryQuiz || retryPending}
                        onClick={() => {
                          if (!retryQuiz) return;
                          startRetryAttempt();
                        }}
                        className="rounded-full bg-[#1f6feb] px-5 py-3 font-['Plus_Jakarta_Sans'] text-sm font-black text-white disabled:opacity-50"
                      >
                        {retryPending ? "Preparing new quiz..." : "Start second quiz"}
                      </button>
                      <span className="font-['Be_Vietnam_Pro'] text-sm font-semibold text-[#5b4c2c]">
                        This is your last attempt.
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {effectiveUserId && isUuid(effectiveUserId) && analyticsSessionId ? (
                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  <MiniTestPanel userId={effectiveUserId} sessionId={analyticsSessionId} />
                  <SelfReportPanel userId={effectiveUserId} sessionId={analyticsSessionId} />
                </div>
              ) : null}
            </section>

            {lesson.next_lesson_id ? (
              <Link href={`/lessons/${lesson.next_lesson_id}`} className="inline-flex items-center gap-2 rounded-full bg-white/85 px-5 py-3 font-['Plus_Jakarta_Sans'] text-sm font-black text-[#8a5d00] shadow-[0_10px_24px_rgba(126,87,0,0.1)]">
                Next Lesson
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null}
          </article>
        </main>

        {/* Feedback Modal */}
        <FeedbackModal
          isOpen={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
          title={feedbackTitle}
          content={feedbackContent}
          hintLevel={feedbackHintLevel}
          isMotivation={feedbackIsMotivation}
        />
      </div>
    </div>
  );
}

export function LessonViewerRoute() {
  const params = useParams<{ id: string }>();
  const lessonId = typeof params.id === "string" ? params.id : "";
  if (!lessonId) {
    return null;
  }

  return <LessonViewerExperience lessonId={lessonId} />;
}