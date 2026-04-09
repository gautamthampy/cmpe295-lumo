import { LockKeyhole } from "lucide-react";

import { AuthCard, AuthTopBar, BackLink } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forms";

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthTopBar />
      <main className="flex min-h-screen items-center justify-center px-6 pb-12 pt-28">
        <div className="w-full max-w-lg">
          <AuthCard className="space-y-10">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low text-primary">
                <LockKeyhole className="h-8 w-8" />
              </div>
            </div>
            <div className="space-y-4 text-center">
              <h1 className="font-headline text-5xl font-extrabold tracking-[-0.06em] text-on-surface">Reset Your Password</h1>
              <p className="mx-auto max-w-md font-body text-lg leading-8 text-on-surface-variant">
                Enter the email address associated with your account and we will send you a link to reset your password.
              </p>
            </div>
            <ForgotPasswordForm />
            <div className="text-center">
              <BackLink href="/sign-in">Back to Sign In</BackLink>
            </div>
          </AuthCard>
          <div className="mt-10 grid grid-cols-3 gap-4 opacity-45">
            <div className="h-1 rounded-full bg-primary-fixed" />
            <div className="h-1 rounded-full bg-secondary-fixed" />
            <div className="h-1 rounded-full bg-tertiary-fixed" />
          </div>
        </div>
      </main>
    </>
  );
}
