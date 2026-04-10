"use client";

import { Sparkles, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { LessonSpec } from "@/lib/story-studio/lesson-spec";
import { readGeneratedLesson, readStoredSource } from "@/lib/story-studio/session-state";

type GeneratedMissionCalloutProps = {
  title?: string;
  description?: string;
  secondaryHref?: string | null;
  secondaryLabel?: string;
};

export function GeneratedMissionCallout({
  title = "A fresh story mission is ready",
  description = "If a parent just created a custom story on this device, you can launch it from here.",
  secondaryHref = "/lessons",
  secondaryLabel = "Browse the library",
}: GeneratedMissionCalloutProps) {
  const [lesson, setLesson] = useState<LessonSpec | null>(null);
  const [source, setSource] = useState<"live" | "seed" | null>(null);

  useEffect(() => {
    function syncFromStorage() {
      setLesson(readGeneratedLesson());
      setSource(readStoredSource());
    }

    syncFromStorage();

    const handleFocus = () => syncFromStorage();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncFromStorage();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (!lesson) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,#fff3bd,transparent_34%),radial-gradient(circle_at_bottom_right,#bfe8ff,transparent_32%),linear-gradient(135deg,#fffdf5,#ffffff_46%,#f8fcff)] p-6 shadow-[0_24px_60px_-28px_rgba(126,87,0,0.35)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.3em] text-[#8a5d00]">
            Story Studio Ready
          </p>
          <h2 className="mt-3 font-['Plus_Jakarta_Sans'] text-3xl font-black tracking-[-0.05em] text-[#1f1b00]">
            {title}
          </h2>
          <p className="mt-3 font-body text-base leading-7 text-[#5b4c2c]">
            {lesson.childName}&apos;s {lesson.unitOrModule} mission is saved in this browser. {description}
          </p>
        </div>

        <div className="inline-flex items-center gap-3 self-start rounded-full bg-white/85 px-4 py-3 shadow-[0_14px_32px_rgba(126,87,0,0.12)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8a5d00] text-white">
            <WandSparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-['Plus_Jakarta_Sans'] text-sm font-black text-[#1f1b00]">
              {source === "live" ? "AI tailored" : "Backup mission ready"}
            </p>
            <p className="font-body text-xs text-[#5b4c2c]">Open it from the student side any time.</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/85 px-4 py-2 font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.2em] text-[#8a5d00] shadow-sm">
          {lesson.subject}
        </span>
        <span className="rounded-full bg-white/85 px-4 py-2 font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.2em] text-[#175b90] shadow-sm">
          {lesson.theme}
        </span>
        <span className="rounded-full bg-white/85 px-4 py-2 font-['Plus_Jakarta_Sans'] text-xs font-black uppercase tracking-[0.2em] text-[#176e22] shadow-sm">
          {lesson.childName}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/lessons/generated"
          className="inline-flex items-center gap-2 rounded-[1.25rem] bg-[#8a5d00] px-5 py-3 font-['Plus_Jakarta_Sans'] text-sm font-black text-white shadow-[0_18px_35px_-24px_rgba(126,87,0,0.65)]"
        >
          <Sparkles className="h-4 w-4" />
          Open story mission
        </Link>
        {secondaryHref ? (
          <Link
            href={secondaryHref}
            className="inline-flex items-center gap-2 rounded-[1.25rem] bg-white px-5 py-3 font-['Plus_Jakarta_Sans'] text-sm font-black text-[#1f1b00] shadow-[0_18px_35px_-24px_rgba(19,34,56,0.25)]"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}