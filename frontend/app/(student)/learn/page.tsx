"use client";

import { ArrowRight, BookOpenText, Calculator, FlaskConical, Landmark, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { GeneratedMissionCallout } from "@/components/story-studio/generated-mission-callout";
import { authRequest, authRoutes, type SubjectCatalogItem } from "@/lib/auth";
import { type LessonSummary, PLAYFUL_FALLBACK_LESSONS, fetchLessonSummaries, filterLessonsBySubject } from "@/lib/lessons";
import { type PlannerRecommendResponse, type PlannerRecommendation, fetchPlannerRecommendations } from "@/lib/planner";
import { useAuthStore } from "@/lib/store/auth";

const DEFAULT_SUBJECTS: SubjectCatalogItem[] = [
  { subject_id: "math", name: "Mathematics", slug: "math" },
  { subject_id: "science", name: "Science", slug: "science" },
  { subject_id: "language-arts-writing", name: "Language Arts - Writing", slug: "language-arts-writing" },
  { subject_id: "social-studies", name: "Social Studies", slug: "social-studies" },
];

type SubjectMood = {
  accent: string;
  badge: string;
  description: string;
  Icon: LucideIcon;
  spotlightClass: string;
  topics: string[];
};

const SUBJECT_MOODS: Record<string, SubjectMood> = {
  math: {
    accent: "text-[#7e5700]",
    badge: "Pattern Lab",
    description: "Warm up with number patterns, playful problem-solving, and bite-sized practice that nudges confidence up one step at a time.",
    Icon: Calculator,
    spotlightClass: "bg-[linear-gradient(135deg,#fff4cf_0%,#ffd58c_48%,#ffe9b8_100%)]",
    topics: ["Fractions", "Multiplication", "Place Value"],
  },
  "language-arts-writing": {
    accent: "text-[#5a3f8c]",
    badge: "Story Studio",
    description: "Build fluency through reading, vocabulary, and writing prompts that keep the tone encouraging rather than school-formal.",
    Icon: BookOpenText,
    spotlightClass: "bg-[linear-gradient(135deg,#f7ebff_0%,#dcc8ff_48%,#f4e6ff_100%)]",
    topics: ["Small Moments", "Dialogue", "Sequencing"],
  },
  science: {
    accent: "text-[#045d56]",
    badge: "Discovery Deck",
    description: "Explore observation, experiments, and curiosity-driven questions with a calm, hands-on science mood.",
    Icon: FlaskConical,
    spotlightClass: "bg-[linear-gradient(135deg,#dcfff5_0%,#9be7d5_48%,#d8fff8_100%)]",
    topics: ["Plants", "Weather", "Forces"],
  },
  "social-studies": {
    accent: "text-[#6f4a25]",
    badge: "Community Map",
    description: "Move through rules, citizenship, and community geography with a social studies path that feels concrete and local.",
    Icon: Landmark,
    spotlightClass: "bg-[linear-gradient(135deg,#fff0dd_0%,#efc28d_48%,#fff6ec_100%)]",
    topics: ["Citizenship", "Rules", "Maps"],
  },
};

function getSubjectMood(subject: SubjectCatalogItem): SubjectMood {
  return SUBJECT_MOODS[subject.slug] ?? {
    accent: "text-[#004b70]",
    badge: "Learning Path",
    description: "Choose this subject to open the next part of the student learning experience.",
    Icon: Sparkles,
    spotlightClass: "bg-[linear-gradient(135deg,#e3f3ff_0%,#c8e7ff_48%,#f3fbff_100%)]",
    topics: [subject.name, "Practice", "Review"],
  };
}

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
    <main className="min-h-screen bg-[linear-gradient(135deg,#fffadf_0%,#ffdeac_52%,#cae6ff_100%)] px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <p className="font-body text-sm text-[#5f6c7b]">Loading your lessons...</p>
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
  const [subjects, setSubjects] = useState<SubjectCatalogItem[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>(PLAYFUL_FALLBACK_LESSONS);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [lessonsError, setLessonsError] = useState<string | null>(null);
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

    let cancelled = false;
    setLoadingSubjects(true);
    setSubjectsError(null);

    const subjectPath = gradeLevel ? `${authRoutes.subjects}?grade_level=${gradeLevel}` : authRoutes.subjects;

    authRequest<SubjectCatalogItem[]>(subjectPath, { method: "GET", cache: "no-store" })
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.length) {
          setSubjects(result);
          return;
        }

        setSubjects(DEFAULT_SUBJECTS);
        setSubjectsError(
          gradeLevel
            ? `Grade ${gradeLevel} does not have a published subject catalog yet, so this screen is using the built-in LUMO starter subjects instead.`
            : "No subject catalog is published yet, so this screen is using the built-in LUMO starter subjects instead."
        );
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }
        setSubjects(DEFAULT_SUBJECTS);
        setSubjectsError(
          requestError instanceof Error
            ? `${requestError.message} This screen is using the built-in LUMO starter subjects instead.`
            : "We could not refresh the subject catalog from the backend, so this screen is using the built-in LUMO starter subjects instead."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSubjects(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [gradeLevel, isAuthenticated, ready, role]);

  useEffect(() => {
    if (!ready || role !== "student" || !isAuthenticated()) {
      return;
    }

    let cancelled = false;
    setLoadingLessons(true);
    setLessonsError(null);

    fetchLessonSummaries()
      .then((result) => {
        if (!cancelled) {
          setLessons(result);
        }
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        setLessons(PLAYFUL_FALLBACK_LESSONS);
        setLessonsError(
          requestError instanceof Error
            ? `${requestError.message} This screen is showing the built-in lesson cards instead.`
            : "We could not refresh lessons from the backend, so this screen is showing the built-in lesson cards instead."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingLessons(false);
        }
      });

    return () => {
      cancelled = true;
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
      <main className="min-h-screen bg-[linear-gradient(135deg,#fffadf_0%,#ffdeac_52%,#cae6ff_100%)] px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <p className="font-body text-sm text-[#5f6c7b]">Loading your lessons...</p>
        </div>
      </main>
    );
  }

  if (role !== "student" || !isAuthenticated()) {
    return <main className="min-h-screen bg-surface-container-low" />;
  }

  const selectedSubjectSlug = searchParams.get("subject");
  const selectedSubject = subjects.find((subject) => subject.slug === selectedSubjectSlug) ?? null;
  const spotlightSubject = selectedSubject ?? subjects[0] ?? null;
  const spotlightMood = spotlightSubject ? getSubjectMood(spotlightSubject) : null;
  const spotlightLessons = spotlightSubject ? filterLessonsBySubject(lessons, spotlightSubject.slug).slice(0, 3) : [];
  const lessonLibraryHref = spotlightSubject ? `/lessons?subject=${spotlightSubject.slug}` : "/lessons";
  const spotlightHeading = !loadingLessons && !spotlightLessons.length ? "Adventure setup" : "Ready to explore";
  const isLessonAreaLoading = loadingLessons || loadingSubjects || !spotlightSubject;

  function handleSubjectSelect(slug: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("subject", slug);
    router.replace(`/learn?${nextParams.toString()}`);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fffadf_0%,#ffdeac_52%,#cae6ff_100%)] px-6 py-12">
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
                {selectedSubject ? `Exploring ${selectedSubject.name}` : gradeLevel ? `Grade ${gradeLevel}` : "Choose a subject"}
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
        {subjectsError ? (
          <div role="alert" className="rounded-[1.5rem] bg-[#fff4cf] px-5 py-4 font-body text-sm leading-6 text-[#7e5700] shadow-[0_18px_50px_-30px_rgba(126,87,0,0.35)]">
            {subjectsError}
          </div>
        ) : null}

        <GeneratedMissionCallout
          title="Your custom story mission is ready"
          description="A parent built a personalized story mission on this device. Open it straight from your dashboard before you browse the rest of your lessons."
        />

        {isLessonAreaLoading ? <p className="font-body text-sm text-[#5f6c7b]">Loading your lessons...</p> : null}

        <section className="rounded-[2rem] bg-white/88 p-8 shadow-[0_28px_80px_-24px_rgba(0,75,112,0.18)] backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-[0.3em] text-[#6a6f7d]">Your subjects</p>
              <h2 className="mt-2 font-['Plus_Jakarta_Sans'] text-3xl font-extrabold tracking-[-0.04em] text-[#132238]">Your subjects</h2>
              <p className="mt-2 font-body text-sm leading-6 text-[#516071]">Pick a doorway into today&apos;s learning.</p>
            </div>
            {loadingSubjects && !subjects.length ? <p className="font-body text-sm text-[#5f6c7b]">Loading your subjects...</p> : null}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(subjects.length ? subjects : DEFAULT_SUBJECTS).map((subject) => {
              const mood = getSubjectMood(subject);
              const Icon = mood.Icon;
              const isSelected = selectedSubject?.slug === subject.slug;

              return (
                <button
                  key={subject.subject_id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSubjectSelect(subject.slug)}
                  className={`rounded-[1.75rem] border px-5 py-5 text-left transition-all ${
                    isSelected
                      ? "border-[#7e5700] bg-[#fff4cf] shadow-[0_20px_50px_-28px_rgba(126,87,0,0.45)]"
                      : "border-white/70 bg-white/80 shadow-[0_16px_40px_-30px_rgba(19,34,56,0.35)] hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-24px_rgba(19,34,56,0.25)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-[0.24em] text-[#6a6f7d]">{mood.badge}</p>
                      <p className="mt-2 font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#132238]">{subject.name}</p>
                    </div>
                    <div className="rounded-full bg-white/75 p-3 shadow-inner shadow-white/80">
                      <Icon className={`h-5 w-5 ${mood.accent}`} />
                    </div>
                  </div>
                  <p className="mt-4 font-body text-sm leading-6 text-[#516071]">{mood.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {spotlightSubject && spotlightMood ? (
          <section className={`rounded-[2rem] p-8 shadow-[0_28px_80px_-24px_rgba(19,34,56,0.18)] ${spotlightMood.spotlightClass}`}>
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-end">
              <div>
                <p className="font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-[0.3em] text-[#5f6c7b]">Ready to explore</p>
                <h2 className="mt-3 font-['Plus_Jakarta_Sans'] text-4xl font-extrabold tracking-[-0.05em] text-[#132238]">{spotlightHeading}</h2>
                <p className="mt-3 font-['Plus_Jakarta_Sans'] text-2xl font-extrabold tracking-[-0.04em] text-[#132238]">
                  {selectedSubject ? selectedSubject.name : `Start with ${spotlightSubject.name}`}
                </p>
                <p className="mt-4 max-w-2xl font-body text-base leading-7 text-[#304255]">{spotlightMood.description}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {spotlightMood.topics.map((topic) => (
                    <span key={topic} className="rounded-full bg-white/75 px-4 py-2 font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-[0.2em] text-[#304255] shadow-[0_10px_30px_-24px_rgba(19,34,56,0.35)]">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.75rem] bg-white/82 p-6 shadow-[0_20px_50px_-28px_rgba(19,34,56,0.3)] backdrop-blur-sm">
                <p className="font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-[0.24em] text-[#6a6f7d]">Mini lesson trail</p>
                <p className="mt-3 font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#132238]">{spotlightSubject.name}</p>
                <p className="mt-3 font-body text-sm leading-6 text-[#516071]">Pick a short lesson now, or open the full library to see the whole path.</p>

                {!isLessonAreaLoading && spotlightLessons.length ? (
                  <div className="mt-5 space-y-3">
                    {spotlightLessons.map((lesson) => (
                      <Link
                        key={lesson.lesson_id}
                        href={`/lessons/${lesson.lesson_id}`}
                        className="glass-card block rounded-[1.4rem] bg-white/90 px-4 py-4 shadow-[0_12px_24px_-16px_rgba(19,34,56,0.35)] transition-transform hover:-translate-y-0.5"
                      >
                        <p className="font-['Plus_Jakarta_Sans'] text-lg font-extrabold text-[#132238]">{lesson.title}</p>
                        <p className="mt-1 font-body text-xs uppercase tracking-[0.18em] text-[#6a6f7d]">Grade {lesson.grade_level}</p>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {!isLessonAreaLoading && !spotlightLessons.length ? (
                  <div className="mt-5 rounded-[1.4rem] bg-[#f6f7fb] px-4 py-4">
                    <h3 className="font-['Plus_Jakarta_Sans'] text-2xl font-extrabold tracking-[-0.04em] text-[#132238]">No lessons yet</h3>
                    <p className="mt-2 font-body text-sm leading-6 text-[#516071]">This subject is ready, but there are no lesson cards published for it yet.</p>
                  </div>
                ) : null}

                {lessonsError ? <p role="alert" className="mt-4 font-body text-sm leading-6 text-[#7e5700]">{lessonsError}</p> : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleSubjectSelect(spotlightSubject.slug)}
                    className="inline-flex items-center gap-2 rounded-[1.25rem] bg-[#132238] px-4 py-3 font-['Plus_Jakarta_Sans'] text-sm font-bold text-white shadow-[0_18px_35px_-24px_rgba(19,34,56,0.65)]"
                  >
                    {selectedSubject ? "Keep this subject" : "Choose this subject"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <Link
                    href={lessonLibraryHref}
                    className="inline-flex items-center gap-2 rounded-[1.25rem] bg-white px-4 py-3 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#132238] shadow-[0_18px_35px_-24px_rgba(19,34,56,0.25)]"
                  >
                    Open full library
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}
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
