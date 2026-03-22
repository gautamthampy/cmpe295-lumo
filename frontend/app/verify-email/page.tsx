import { Suspense } from "react";

import { AuthCard, AuthTopBar, StatusPanel } from "@/components/auth/auth-shell";
import { VerificationActions } from "@/components/auth/forms";

export default function VerifyEmailPage() {
  return (
    <>
      <AuthTopBar />
      <main className="flex min-h-screen items-center justify-center px-6 py-24">
        <div className="w-full max-w-xl">
          <AuthCard>
            <StatusPanel
              title="Verify Your Email"
              tone="info"
              body="Your account exists, but email verification is required before parent access is enabled."
              action={
                <Suspense fallback={<div className="rounded-xl bg-surface-container-low px-4 py-4 font-body text-sm text-on-surface-variant">Loading verification details...</div>}>
                  <VerificationActions />
                </Suspense>
              }
            />
          </AuthCard>
        </div>
      </main>
    </>
  );
}