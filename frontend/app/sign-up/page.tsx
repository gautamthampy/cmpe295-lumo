import { GraduationCap } from "lucide-react";

import { AuthCard, AuthTopBar } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/forms";

export default function SignUpPage() {
  return (
    <>
      <AuthTopBar />
      <main className="flex min-h-screen items-center justify-center bg-surface-container-low px-6 py-24">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-lg shadow-primary/10">
              <GraduationCap className="h-8 w-8" />
            </div>
          </div>
          <AuthCard accent>
            <header className="mb-8 text-center">
              <h1 className="font-headline text-5xl font-extrabold tracking-[-0.06em] text-on-surface">Create Your Parent Account</h1>
              <p className="mx-auto mt-4 max-w-md font-body text-base leading-7 text-on-surface-variant">
                Join our supportive academic community to monitor and nurture your child&apos;s educational journey.
              </p>
            </header>
            <SignUpForm />
          </AuthCard>
        </div>
      </main>
    </>
  );
}
