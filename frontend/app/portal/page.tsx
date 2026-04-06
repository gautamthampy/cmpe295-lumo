import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BookOpenText,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WandSparkles,
} from "lucide-react";

import { ParentStudentCodeButton } from "@/components/auth/parent-student-code-button";
import { PortalLogoutButton } from "@/components/auth/portal-logout-button";
import { PortalStoryStudio } from "@/components/story-studio/portal-story-studio";
import {
  authRoutes,
  type ParentDashboardPayload,
  type SessionPayload,
} from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "lumo_session";

async function readPortalSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}${authRoutes.session}`, {
    headers: {
      Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as SessionPayload;
}

async function readParentDashboard(): Promise<ParentDashboardPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}${authRoutes.parentDashboard}`, {
    headers: {
      Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ParentDashboardPayload;
}

function formatParentGreeting(email?: string) {
  if (!email) {
    return "Welcome back.";
  }

  const localPart = email.split("@")[0] ?? "";
  const readableName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return readableName ? `Welcome back, ${readableName}.` : "Welcome back.";
}

function getAvatarEmoji(avatarId: string) {
  switch (avatarId) {
    case "fox":
      return "🦊";
    case "otter":
      return "🦦";
    case "bear":
      return "🐻";
    default:
      return "🦉";
  }
}

function getStudentCardTone(index: number) {
  const tones = [
    "bg-primary-fixed/65",
    "bg-secondary-fixed/70",
    "bg-tertiary-fixed/75",
    "bg-surface-container-lowest",
  ] as const;

  return tones[index % tones.length];
}

export default async function PortalPlaceholderPage() {
  const session = await readPortalSession();

  if (!session?.authenticated) {
    redirect("/sign-in?next=/portal");
  }

  if (!session.emailVerified) {
    const emailQuery = session.email ? `?email=${encodeURIComponent(session.email)}` : "";
    redirect(`/verify-email${emailQuery}`);
  }

  const dashboard = await readParentDashboard();

  if (!dashboard) {
    redirect("/sign-in?next=/portal");
  }

  const students = dashboard.students;
  const studentCountLabel = students.length === 1 ? "learner" : "learners";

  return (
    <main className="paper-noise min-h-screen bg-surface pb-20 text-on-surface">
      <header className="sticky top-0 z-40 bg-surface/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5 md:px-10 lg:px-12">
          <div>
            <Link href="/portal" className="font-headline text-[2rem] font-extrabold tracking-[-0.05em] text-primary">
              LUMO: AI Study Coach
            </Link>
            <p className="mt-1 font-body text-sm text-on-surface-variant">
              Parent portal
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/students"
              className="rounded-xl bg-surface-container-low px-4 py-3 font-label text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
            >
              Manage learners
            </Link>
            <PortalLogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 lg:px-12">
        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-[2.2rem] bg-surface-container-low p-8 shadow-ambient md:p-10">
            <p className="font-label text-xs font-bold uppercase tracking-[0.28em] text-outline">
              Supportive Academic Editorial
            </p>
            <h1 className="mt-4 max-w-4xl font-headline text-4xl font-extrabold tracking-[-0.06em] text-on-surface md:text-5xl">
              {formatParentGreeting(session.email)} A calmer place to guide learning at home.
            </h1>
            <p className="mt-4 max-w-3xl font-body text-lg leading-8 text-on-surface-variant">
              Review your family setup, open student sign-in tools, and create custom story-led
              practice without leaving the same workspace.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/students"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-container px-5 py-3 font-label text-sm font-bold text-on-primary shadow-lg shadow-primary/15"
              >
                <UsersRound className="h-4 w-4" />
                Manage learners
              </Link>
              <a
                href="#story-studio"
                className="inline-flex items-center gap-2 rounded-xl bg-surface-container-lowest px-5 py-3 font-label text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-highest"
              >
                <WandSparkles className="h-4 w-4 text-primary" />
                Create a story mission
              </a>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.6rem] bg-surface-container-lowest p-5 shadow-ambient">
                <p className="font-label text-xs font-bold uppercase tracking-[0.22em] text-outline">
                  Family overview
                </p>
                <p className="mt-3 font-headline text-3xl font-extrabold tracking-[-0.05em] text-on-surface">
                  {students.length}
                </p>
                <p className="mt-2 font-body text-sm leading-6 text-on-surface-variant">
                  {students.length === 0
                    ? "No learners added yet. Add the first learner to unlock student sign-in."
                    : `${students.length} ${studentCountLabel} ready for home or classroom sign-in.`}
                </p>
              </div>
              <div className="rounded-[1.6rem] bg-surface-container-lowest p-5 shadow-ambient">
                <p className="font-label text-xs font-bold uppercase tracking-[0.22em] text-outline">
                  Account status
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary-fixed px-3 py-1 text-secondary">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="font-label text-sm font-bold">Email verified</span>
                </div>
                <p className="mt-3 font-body text-sm leading-6 text-on-surface-variant">
                  Signed in as {session.email}. Your parent account is ready for lesson planning and
                  student access management.
                </p>
              </div>
              <div className="rounded-[1.6rem] bg-surface-container-lowest p-5 shadow-ambient">
                <p className="font-label text-xs font-bold uppercase tracking-[0.22em] text-outline">
                  Story Studio
                </p>
                <p className="mt-3 font-headline text-2xl font-extrabold tracking-[-0.05em] text-on-surface">
                  Story, mission, preview
                </p>
                <p className="mt-2 font-body text-sm leading-6 text-on-surface-variant">
                  Build a short AI-guided lesson, then open the student preview in the same browser
                  right away.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-[2.2rem] bg-surface-container-lowest p-8 shadow-ambient md:p-10">
            <p className="font-label text-xs font-bold uppercase tracking-[0.28em] text-outline">
              Today&apos;s focus
            </p>
            <h2 className="mt-4 font-headline text-3xl font-extrabold tracking-[-0.05em] text-on-surface">
              Keep family access simple and learning personal.
            </h2>
            <p className="mt-4 font-body text-base leading-7 text-on-surface-variant">
              This portal brings your learners, sign-in tools, and custom lesson creation into one
              calm parent-facing workspace.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-[1.5rem] bg-primary-fixed/65 p-4">
                <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  Quick action
                </p>
                <p className="mt-2 font-headline text-xl font-extrabold text-on-surface">
                  Add a learner or issue a sign-in code
                </p>
                <Link
                  href="/students"
                  className="mt-4 inline-flex items-center gap-2 font-label text-sm font-bold text-primary"
                >
                  Open learner tools
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="rounded-[1.5rem] bg-surface-container-low p-4">
                <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-outline">
                  Parent note
                </p>
                <p className="mt-2 font-body text-sm leading-6 text-on-surface-variant">
                  After you create a story mission below, the preview opens on this device so you can
                  review it before handing it to the student.
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2.2rem] bg-surface-container-low p-8 shadow-ambient md:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-label text-xs font-bold uppercase tracking-[0.28em] text-outline">
                  Family overview
                </p>
                <h2 className="mt-3 font-headline text-3xl font-extrabold tracking-[-0.05em] text-on-surface">
                  Your learners and sign-in tools
                </h2>
              </div>
              <Link
                href="/students"
                className="inline-flex items-center gap-2 rounded-xl bg-surface-container-lowest px-4 py-3 font-label text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-highest"
              >
                View all learner settings
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </Link>
            </div>

            {students.length === 0 ? (
              <div className="mt-6 rounded-[1.7rem] bg-surface-container-lowest p-6 shadow-ambient">
                <p className="font-headline text-2xl font-extrabold tracking-[-0.04em] text-on-surface">
                  Start by adding your first learner
                </p>
                <p className="mt-3 max-w-2xl font-body text-sm leading-7 text-on-surface-variant">
                  Once a learner profile is in place, you can generate one-time student sign-in codes
                  and build personalized story missions for them.
                </p>
                <Link
                  href="/students"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-container px-5 py-3 font-label text-sm font-bold text-on-primary shadow-lg shadow-primary/15"
                >
                  Add learner
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {students.map((student, index) => (
                  <article
                    key={student.student_id}
                    className={`rounded-[1.8rem] p-6 shadow-ambient ${getStudentCardTone(index)}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-lowest text-3xl shadow-sm">
                          {getAvatarEmoji(student.avatar_id)}
                        </div>
                        <div>
                          <p className="font-headline text-2xl font-extrabold tracking-[-0.04em] text-on-surface">
                            {student.display_name}
                          </p>
                          <p className="mt-1 font-body text-sm text-on-surface-variant">
                            Grade {student.grade_level}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-surface-container-lowest px-3 py-1 font-label text-xs font-bold uppercase tracking-[0.18em] text-outline">
                        Ready
                      </span>
                    </div>

                    <p className="mt-4 font-body text-sm leading-6 text-on-surface-variant">
                      Generate a secure code when {student.display_name} is ready to sign in on a
                      student device.
                    </p>

                    <div className="mt-5">
                      <ParentStudentCodeButton
                        studentId={student.student_id}
                        studentName={student.display_name}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2.2rem] bg-surface-container-low p-8 shadow-ambient md:p-10">
            <p className="font-label text-xs font-bold uppercase tracking-[0.28em] text-outline">
              How parents use this space
            </p>
            <h2 className="mt-3 font-headline text-3xl font-extrabold tracking-[-0.05em] text-on-surface">
              Three steps from setup to student preview
            </h2>
            <div className="mt-6 space-y-4">
              <div className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary-fixed p-3 text-primary">
                    <UsersRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-headline text-xl font-extrabold text-on-surface">
                      1. Organize learner access
                    </p>
                    <p className="mt-2 font-body text-sm leading-6 text-on-surface-variant">
                      Keep all learner profiles in one place and generate one-time sign-in codes only
                      when they are needed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-tertiary-fixed p-3 text-tertiary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-headline text-xl font-extrabold text-on-surface">
                      2. Create a story-led lesson
                    </p>
                    <p className="mt-2 font-body text-sm leading-6 text-on-surface-variant">
                      Choose a curriculum goal, a learner name, and a preferred style. LUMO turns it
                      into a short story plus an interactive mission.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-secondary-fixed p-3 text-secondary">
                    <BookOpenText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-headline text-xl font-extrabold text-on-surface">
                      3. Preview before student handoff
                    </p>
                    <p className="mt-2 font-body text-sm leading-6 text-on-surface-variant">
                      Open the student experience in this browser, review the flow, and then hand it
                      off with more confidence.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="story-studio" className="mt-8 rounded-[2.4rem] bg-surface-container-high p-4 md:p-6">
          <PortalStoryStudio />
        </section>
      </div>
    </main>
  );
}