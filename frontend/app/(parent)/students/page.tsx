import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard, AuthTopBar } from "@/components/auth/auth-shell";
import ParentStudentAttentionBlock from "@/components/attention/ParentStudentAttentionBlock";
import { ParentStudentCodeButton } from "@/components/auth/parent-student-code-button";
import { StudentProfileCreator } from "@/components/auth/student-profile-creator";
import { authRoutes, type ParentDashboardPayload, type SessionPayload } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "lumo_session";

async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}${authRoutes.session}`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}` },
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
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ParentDashboardPayload;
}

export default async function StudentsPage() {
  const session = await readSession();

  if (!session?.authenticated) {
    redirect("/sign-in?next=/students");
  }

  if (!session.emailVerified) {
    const emailQuery = session.email ? `?email=${encodeURIComponent(session.email)}` : "";
    redirect(`/verify-email${emailQuery}`);
  }

  const dashboard = await readParentDashboard();
  if (!dashboard) {
    redirect("/sign-in?next=/students");
  }

  return (
    <>
      <AuthTopBar />
      <main className="min-h-screen bg-surface-container-low px-6 py-24">
        <div className="mx-auto max-w-5xl space-y-8">
          <AuthCard accent className="space-y-4">
            <p className="font-label text-xs font-bold uppercase tracking-[0.3em] text-outline">Family Access</p>
            <h1 className="font-headline text-4xl font-extrabold tracking-[-0.05em] text-on-surface">Student Sign-In Codes</h1>
            <p className="max-w-3xl font-body text-base leading-7 text-on-surface-variant">
              Create learner profiles, then generate short-lived sign-in codes for the right child from the parent dashboard. Each code works once, expires quickly, and is also emailed to the parent address on file.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/portal" className="rounded-xl bg-surface-container-low px-4 py-3 font-label font-semibold text-on-surface transition-colors hover:bg-surface-container-high">
                Back to portal
              </Link>
            </div>
          </AuthCard>

          <AuthCard className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="space-y-3">
              <p className="font-label text-xs font-bold uppercase tracking-[0.3em] text-outline">Profile setup</p>
              <h2 className="font-headline text-3xl font-extrabold tracking-[-0.04em] text-on-surface">Open the student login path for every new family</h2>
              <p className="font-body text-base leading-7 text-on-surface-variant">
                New families can&apos;t receive a student sign-in code until at least one learner exists on the account. Add a profile here, then generate a code from the matching learner card.
              </p>
            </div>
            <StudentProfileCreator />
          </AuthCard>

          {dashboard.students.length === 0 ? (
            <AuthCard className="space-y-3">
              <p className="font-headline text-2xl font-extrabold text-on-surface">No student profiles yet</p>
              <p className="font-body leading-7 text-on-surface-variant">
                Create the first learner above to unlock one-time sign-in codes for this family account.
              </p>
            </AuthCard>
          ) : (
            <section className="space-y-4">
              <div className="space-y-2">
                <p className="font-label text-xs font-bold uppercase tracking-[0.3em] text-outline">Current learners</p>
                <h2 className="font-headline text-2xl font-extrabold text-on-surface">Generate a code for the right child</h2>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
              {dashboard.students.map((student) => (
                <AuthCard key={student.student_id} className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-headline text-2xl font-extrabold text-on-surface">{student.display_name}</p>
                      <p className="font-body text-sm leading-6 text-on-surface-variant">Grade {student.grade_level}</p>
                    </div>
                    <span className="rounded-full bg-primary-fixed px-3 py-1 font-label text-xs font-bold uppercase tracking-[0.2em] text-primary">{student.avatar_id}</span>
                  </div>
                  <ParentStudentCodeButton studentId={student.student_id} studentName={student.display_name} />
                  <ParentStudentAttentionBlock studentId={student.student_id} studentName={student.display_name} />
                </AuthCard>
              ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
