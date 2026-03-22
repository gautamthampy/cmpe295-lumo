import Link from "next/link";

import { AuthCard, AuthTopBar, StatusPanel } from "@/components/auth/auth-shell";

export default async function ForgotPasswordSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const params = await searchParams;
  const email = params.email ?? "your inbox";
  const token = params.token;

  return (
    <>
      <AuthTopBar />
      <main className="flex min-h-screen items-center justify-center px-6 py-24">
        <div className="w-full max-w-xl">
          <AuthCard>
            <StatusPanel
              title="Check Your Email"
              body={`If an account exists for ${email}, a password reset link is on the way. The link will expire in 24 hours.`}
              action={
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link href="/sign-in" className="rounded-xl bg-gradient-to-br from-primary to-primary-container px-5 py-3 font-label font-semibold text-on-primary shadow-lg shadow-primary/20">
                      Return to sign in
                    </Link>
                    <Link href="/forgot-password" className="rounded-xl px-5 py-3 font-label font-semibold text-primary transition-colors hover:text-primary-container">
                      Send another link
                    </Link>
                  </div>
                  {token ? (
                    <Link href={`/reset-password?token=${encodeURIComponent(token)}`} className="font-label text-sm font-semibold text-primary underline decoration-2 underline-offset-4">
                      Open development reset link
                    </Link>
                  ) : null}
                </div>
              }
            />
          </AuthCard>
        </div>
      </main>
    </>
  );
}
