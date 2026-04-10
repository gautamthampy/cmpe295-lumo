import { AuthCard, CenteredBrand } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/forms";

export default function SignInPage() {
  return (
    <main className="paper-noise flex min-h-screen items-center justify-center px-6 py-12">
      <div className="relative z-10 w-full max-w-[38rem] space-y-10">
        <CenteredBrand title="LUMO:AI Study Coach" subtitle="Welcome Back, Parent" />
        <AuthCard className="space-y-8">
          <SignInForm />
        </AuthCard>
      </div>
    </main>
  );
}
