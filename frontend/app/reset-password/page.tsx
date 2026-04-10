import { Suspense } from "react";

import { LockKeyhole } from "lucide-react";

import { AuthCard, AuthTopBar, BackLink } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/forms";

export default function ResetPasswordPage() {
  return (
    <>
      <AuthTopBar />
      <main className="flex min-h-screen items-center justify-center bg-surface-container-low px-6 py-24">
        <div className="w-full max-w-lg">
          <AuthCard className="space-y-8">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low text-primary">
                <LockKeyhole className="h-8 w-8" />
              </div>
            </div>
            <div className="space-y-4 text-center">
              <h1 className="font-headline text-5xl font-extrabold tracking-[-0.06em] text-on-surface">Choose a New Password</h1>
              <p className="mx-auto max-w-md font-body text-lg leading-8 text-on-surface-variant">
                Finish the password reset flow by choosing a new password for your parent account.
              </p>
            </div>
            <Suspense fallback={<div className="rounded-xl bg-surface-container-low px-4 py-4 font-body text-sm text-on-surface-variant">Loading reset form...</div>}>
              <ResetPasswordForm />
            </Suspense>
            <div className="text-center">
              <BackLink href="/sign-in">Back to Sign In</BackLink>
            </div>
          </AuthCard>
        </div>
      </main>
    </>
  );
}
