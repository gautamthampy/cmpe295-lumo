"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { LessonTopBar } from "@/components/lessons/lesson-ui";
import { GeneratedMissionCallout } from "@/components/story-studio/generated-mission-callout";
import { type PlannerRecommendResponse, type PlannerRecommendation, fetchPlannerRecommendations } from "@/lib/planner";
import { readGeneratedLesson } from "@/lib/story-studio/session-state";
import { useAuthStore } from "@/lib/store/auth";


function readTokenExpirationMs(token: string | null): number | null {
  if (!token) {
    return null;
  }

  try {
    const normalized = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? "";
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function StudentLearnFallback() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fffadf_0%,#ffdeac_52%,#cae6ff_100%)]">
      <LessonTopBar active="learn" />
      <div className="px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <p className="font-body text-sm text-[#5f6c7b]">Loading your lessons...</p>
        </div>
      </div>
    </main>
  );
}

function StudentLearnPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const displayName = useAuthStore((state) => state.displayName);
  const gradeLevel = useAuthStore((state) => state.gradeLevel);
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const syncFromBrowserStorage = useAuthStore((state) => state.syncFromBrowserStorage);
  const token = useAuthStore((state) => state.token);
  const [ready, setReady] = useState(false);
  const [hasStoryLesson, setHasStoryLesson] = useState<boolean | null>(null);
  const [plannerRecs, setPlannerRecs] = useState<PlannerRecommendResponse | null>(null);
  const currentStudentPath = searchParams.toString() ? `/learn?${searchParams.toString()}` : "/learn";

  function redirectToStudentLogin(nextPath: string) {
    const destination = `/student-login?next=${encodeURIComponent(nextPath)}`;
    router.replace(destination);
  }

  useEffect(() => {
    syncFromBrowserStorage();
    setReady(true);
  }, [syncFromBrowserStorage]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (role !== "student" || !isAuthenticated()) {
      redirectToStudentLogin(currentStudentPath);
    }
  }, [currentStudentPath, isAuthenticated, ready, role]);

  useEffect(() => {
    if (!ready || role !== "student") {
      return;
    }

    const expiresAt = readTokenExpirationMs(token);
    if (expiresAt === null) {
      return;
    }

    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) {
      logout();
      redirectToStudentLogin(currentStudentPath);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      logout();
      redirectToStudentLogin(currentStudentPath);
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentStudentPath, logout, ready, role, token]);

  useEffect(() => {
    if (!ready || role !== "student" || !isAuthenticated()) {
      return;
    }

    const syncLessonState = () => {
      const lesson = readGeneratedLesson();
      setHasStoryLesson(Boolean(lesson));
    };

    syncLessonState();

    const handleFocus = () => syncLessonState();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncLessonState();
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
  }, [isAuthenticated, ready, role]);


  useEffect(() => {
    if (!ready || role !== "student" || !isAuthenticated() || !userId) {
      return;
    }

    let cancelled = false;
    fetchPlannerRecommendations(userId, { limit: 3 })
      .then((result: PlannerRecommendResponse) => {
        if (!cancelled) {
          setPlannerRecs(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlannerRecs(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ready, role, userId]);

  if (!ready) {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#fffadf_0%,#ffdeac_52%,#cae6ff_100%)]">
        <LessonTopBar active="learn" />
        <div className="px-6 py-12">
          <div className="mx-auto max-w-4xl">
            <p className="font-body text-sm text-[#5f6c7b]">Loading your lessons...</p>
          </div>
        </div>
      </main>
    );
  }

  if (role !== "student" || !isAuthenticated()) {
    return <main className="min-h-screen bg-surface-container-low" />;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fffadf_0%,#ffdeac_52%,#cae6ff_100%)]">
      <LessonTopBar active="learn" />
      <div className="px-6 py-12">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <section className="rounded-[2rem] bg-white/90 p-8 shadow-[0_28px_80px_-24px_rgba(126,87,0,0.24)] backdrop-blur-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="font-['Plus_Jakarta_Sans'] text-sm font-bold uppercase tracking-[0.3em] text-[#857556]">Student Session Active</p>
                <h1 className="mt-3 font-['Plus_Jakarta_Sans'] text-5xl font-extrabold tracking-[-0.05em] text-[#7e5700]">Hi, {displayName ?? "Learner"}!</h1>
                <p className="mt-4 max-w-2xl font-body text-lg leading-8 text-[#52452a]">{gradeLevel ? `Here are your Grade ${gradeLevel} learning paths for today.` : "What do you want to learn today?"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[#fff4cf] px-4 py-2 font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-[0.2em] text-[#7e5700]">
                  {gradeLevel ? `Grade ${gradeLevel}` : "Student dashboard"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    if (typeof window !== "undefined") {
                      window.location.replace("/student-login");
                      return;
                    }

                    router.replace("/student-login");
                  }}
                  className="rounded-[1.5rem] bg-[#7e5700] px-5 py-3 font-['Plus_Jakarta_Sans'] text-sm font-bold text-white shadow-[0_14px_30px_rgba(126,87,0,0.24)] transition-transform hover:scale-[0.99]"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </section>
          <section
            aria-label="Learning coach suggestions"
            className="rounded-[2rem] border border-[#e8ecf4] bg-white/92 p-8 shadow-[0_20px_60px_-28px_rgba(19,34,56,0.15)] backdrop-blur-sm"
          >
            <p className="font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-[0.28em] text-[#6a6f7d]">Coach suggestions</p>
            <h2 className="mt-2 font-['Plus_Jakarta_Sans'] text-2xl font-extrabold tracking-[-0.04em] text-[#132238]">What to try next</h2>
            <p className="mt-2 font-body text-sm leading-6 text-[#516071]">
              Pulled from your attention, feedback, and progress signals on the server.
            </p>
            {(plannerRecs?.recommendations?.length ?? 0) > 0 ? (
              <ol className="mt-5 space-y-4">
                {(plannerRecs?.recommendations ?? []).map((rec: PlannerRecommendation, index: number) => (
                  <li
                    key={`${rec.action}-${index}`}
                    className="rounded-[1.25rem] bg-[#f6f8fc] px-5 py-4 font-body text-sm leading-6 text-[#304255]"
                  >
                    <span className="font-['Plus_Jakarta_Sans'] font-bold text-[#132238]">{rec.action.replaceAll("_", " ")}</span>
                    <span className="mx-2 text-[#9aa3b2]">·</span>
                    {rec.reason}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 rounded-[1.25rem] bg-[#f6f8fc] px-5 py-4 font-body text-sm leading-6 text-[#516071]">
                <span className="font-['Plus_Jakarta_Sans'] font-bold text-[#132238]">Continue learning</span>
                <span className="mx-2 text-[#9aa3b2]">·</span>
                Finish a lesson quiz so focus signals can personalize these tips. Until then, pick a subject below and dive into a short lesson.
              </p>
            )}
          </section>
          <GeneratedMissionCallout
            title="Your custom story mission is ready"
            description="A parent built a personalized story mission on this device. Open it straight from your dashboard before you browse the rest of your lessons."
            secondaryHref="/lessons"
            secondaryLabel="Open the library"
          />

          {hasStoryLesson === false ? (
            <div role="status" className="rounded-[1.5rem] bg-[#fff4cf] px-5 py-4 font-body text-sm leading-6 text-[#7e5700] shadow-[0_18px_50px_-30px_rgba(126,87,0,0.35)]">
              No parent-designed Story Studio lesson is stored on this device yet. Ask a parent to build one in the portal, then come back to launch it here.
            </div>
          ) : null}

        </div>
      </div>
    </main>
  );
}

export default function StudentLearnPage() {
  return (
    <Suspense fallback={<StudentLearnFallback />}>
      <StudentLearnPageContent />
    </Suspense>
  );
}
