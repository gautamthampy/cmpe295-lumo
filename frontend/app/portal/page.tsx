import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthCard, AuthTopBar, StatusPanel } from "@/components/auth/auth-shell";
import { PortalLogoutButton } from "@/components/auth/portal-logout-button";
import { authRoutes, type SessionPayload } from "@/lib/auth";

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

export default async function PortalPlaceholderPage() {
  const session = await readPortalSession();

  if (!session?.authenticated) {
    redirect("/sign-in?next=/portal");
  }

  if (!session.emailVerified) {
    const emailQuery = session.email ? `?email=${encodeURIComponent(session.email)}` : "";
    redirect(`/verify-email${emailQuery}`);
  }

  return (
    <>
      <AuthTopBar />
      <main className="flex min-h-screen items-center justify-center bg-surface-container-low px-6 py-24">
        <div className="w-full max-w-3xl space-y-6">
          <AuthCard>
            <StatusPanel
              title="Parent Portal Session Active"
              body={`Signed in as ${session.email}. The authenticated shell is now guarded by the same session cookie the backend issues, so future portal work can build on a real protected route instead of a public placeholder.`}
              action={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <PortalLogoutButton />
                  <Link href="/students" className="rounded-xl px-5 py-3 font-label font-semibold text-primary transition-colors hover:text-primary-container">
                    Manage student access
                  </Link>
                  <Link href="/verify-email" className="rounded-xl px-5 py-3 font-label font-semibold text-primary transition-colors hover:text-primary-container">
                    Review verification flow
                  </Link>
                </div>
              }
            />
          </AuthCard>
          <section className="grid gap-4 md:grid-cols-3">
            <AuthCard className="space-y-3">
              <p className="font-label text-xs font-bold uppercase tracking-[0.3em] text-outline">Auth boundary</p>
              <h2 className="font-heading text-2xl text-on-surface">Session-aware portal</h2>
              <p className="font-body text-sm leading-6 text-on-surface-variant">Middleware blocks anonymous requests, and the server component validates the session cookie against the backend before rendering content.</p>
            </AuthCard>
            <AuthCard className="space-y-3">
              <p className="font-label text-xs font-bold uppercase tracking-[0.3em] text-outline">Current identity</p>
              <h2 className="font-heading text-2xl text-on-surface">{session.email}</h2>
              <p className="font-body text-sm leading-6 text-on-surface-variant">Email verification state is enforced before this route can render.</p>
            </AuthCard>
            <AuthCard className="space-y-3">
              <p className="font-label text-xs font-bold uppercase tracking-[0.3em] text-outline">Next slice</p>
              <h2 className="font-heading text-2xl text-on-surface">Student access</h2>
              <p className="font-body text-sm leading-6 text-on-surface-variant">Parents can now open a protected student access dashboard and generate short-lived student sign-in codes without leaving the authenticated portal.</p>
            </AuthCard>
          </section>
        </div>
      </main>
    </>
  );
}