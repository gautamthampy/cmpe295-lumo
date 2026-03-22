"use client";

import { ArrowRight, LockKeyhole, Mail, RotateCcw, Send } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { AuthFooterNote, FormField, InfoCallout, PrimaryButton } from "@/components/auth/auth-shell";
import { AuthMessage, ForgotPasswordPayload, SignInPayload, SignUpPayload, authRequest, authRoutes } from "@/lib/auth";

function useSubmissionState() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    pending,
    error,
    setPending,
    setError,
  };
}

function ErrorBanner({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return <div className="rounded-xl bg-error-container px-4 py-3 font-body text-sm text-error">{error}</div>;
}

export function SignInForm() {
  const router = useRouter();
  const { pending, error, setPending, setError } = useSubmissionState();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    try {
      const result = await authRequest<SignInPayload>(authRoutes.signIn, {
        method: "POST",
        body: JSON.stringify({
          email,
          password: formData.get("password"),
          rememberMe: formData.get("remember") === "on",
        }),
      });

      setSuccessMessage(result.message);
      router.push(result.nextPath ?? "/portal");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to sign in.";
      if (message.includes("verification")) {
        router.push("/verify-email?email=" + encodeURIComponent(email));
        return;
      }
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <ErrorBanner error={error} />
      {successMessage ? <div className="rounded-xl bg-primary-fixed px-4 py-3 font-body text-sm text-primary">{successMessage}</div> : null}
      <FormField name="email" label="Email Address" type="email" placeholder="e.g. parent@example.com" autoComplete="email" />
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <label htmlFor="password" className="font-label text-sm font-semibold text-on-surface-variant">
            Password
          </label>
          <Link href="/forgot-password" className="font-label text-sm font-semibold text-primary transition-colors hover:text-primary-container">
            Forgot Password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="block w-full rounded-xl border-none bg-surface-container-highest px-4 py-4 font-body text-base text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-fixed"
        />
      </div>
      <label className="flex items-center gap-3 font-body text-sm text-on-surface-variant">
        <input id="remember" name="remember" type="checkbox" className="h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary-fixed" />
        <span>Keep me signed in for 30 days</span>
      </label>
      <PrimaryButton pending={pending}>Sign In</PrimaryButton>
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-outline-variant/20" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-surface-container-lowest px-4 font-label text-xs uppercase tracking-[0.3em] text-outline">or continue with</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button type="button" disabled className="rounded-xl bg-surface-container-low px-4 py-3 font-label font-semibold text-on-surface-variant opacity-80">
          Google
        </button>
        <button type="button" disabled className="rounded-xl bg-surface-container-low px-4 py-3 font-label font-semibold text-on-surface-variant opacity-80">
          Apple
        </button>
      </div>
      <div className="space-y-6 pt-2 text-center">
        <p className="font-body text-lg text-on-surface-variant">
          Don&apos;t have an account?
          <Link href="/sign-up" className="ml-2 font-label font-bold text-primary transition-colors hover:text-primary-container">
            Sign Up
          </Link>
        </p>
        <AuthFooterNote>
          By signing in, you agree to our terms and receive important academic updates for your student&apos;s progress.
        </AuthFooterNote>
      </div>
    </form>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const { pending, error, setPending, setError } = useSubmissionState();
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setConfirmError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setConfirmError("Passwords must match.");
      setPending(false);
      return;
    }

    try {
      const result = await authRequest<SignUpPayload>(authRoutes.signUp, {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          password,
        }),
      });

      const email = encodeURIComponent(String(formData.get("email") ?? ""));
      const token = result.verificationToken ? `&token=${encodeURIComponent(result.verificationToken)}` : "";
      router.push(`/verify-email?email=${email}${token}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <ErrorBanner error={error} />
      <FormField name="email" label="Email Address" type="email" placeholder="e.g. parent@academic.com" icon={Mail} autoComplete="email" />
      <FormField name="password" label="Password" type="password" placeholder="Min. 8 characters" icon={LockKeyhole} autoComplete="new-password" helper="Use at least 8 characters for V1." />
      <FormField name="confirmPassword" label="Confirm Password" type="password" placeholder="Repeat password" icon={RotateCcw} autoComplete="new-password" error={confirmError ?? undefined} />
      <PrimaryButton pending={pending}>Create Account</PrimaryButton>
      <div className="flex items-center gap-4 py-1">
        <div className="h-px flex-1 bg-outline-variant/25" />
        <span className="font-label text-[10px] font-bold uppercase tracking-[0.35em] text-outline">Verification Required</span>
        <div className="h-px flex-1 bg-outline-variant/25" />
      </div>
      <p className="text-center font-body text-lg text-on-surface-variant">
        Already have an account?
        <Link href="/sign-in" className="ml-2 font-label font-bold text-primary transition-colors hover:text-primary-container">
          Sign In
        </Link>
      </p>
      <InfoCallout>
        By creating an account, you agree to receive automated academic progress updates for your enrolled students. You can manage notification preferences in your settings later.
      </InfoCallout>
    </form>
  );
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const { pending, error, setPending, setError } = useSubmissionState();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    try {
      const result = await authRequest<ForgotPasswordPayload>(authRoutes.forgotPassword, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const token = result.resetToken ? `&token=${encodeURIComponent(result.resetToken)}` : "";
      router.push(`/forgot-password/sent?email=${encodeURIComponent(email)}${token}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send reset link.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <ErrorBanner error={error} />
      <FormField
        name="email"
        label="Email Address"
        type="email"
        placeholder="name@example.com"
        helper="Link expires in 24 hours for security."
        rightSlot={<Mail className="h-5 w-5 text-outline transition-colors group-focus-within:text-primary" />}
      />
      <PrimaryButton pending={pending} icon={ArrowRight}>
        Send Reset Link
      </PrimaryButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { pending, error, setPending, setError } = useSubmissionState();
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setConfirmError(null);

    if (!token) {
      setError("This reset link is missing its token. Request a new password reset email.");
      setPending(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setConfirmError("Passwords must match.");
      setPending(false);
      return;
    }

    try {
      const result = await authRequest<AuthMessage>(authRoutes.resetPassword, {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });

      setSuccessMessage(result.message);
      setTimeout(() => router.push("/sign-in"), 1200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <ErrorBanner error={error} />
      {successMessage ? <div className="rounded-xl bg-primary-fixed px-4 py-3 font-body text-sm text-primary">{successMessage}</div> : null}
      <FormField name="password" label="New Password" type="password" placeholder="Choose a secure password" icon={LockKeyhole} autoComplete="new-password" helper="At least 8 characters for the initial policy." />
      <FormField name="confirmPassword" label="Confirm New Password" type="password" placeholder="Repeat your new password" icon={Send} autoComplete="new-password" error={confirmError ?? undefined} />
      <PrimaryButton pending={pending}>Save New Password</PrimaryButton>
    </form>
  );
}

export function VerificationActions() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "your inbox";
  const token = searchParams.get("token");
  const { pending, error, setPending, setError } = useSubmissionState();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function verifyWithToken() {
      if (!token) {
        return;
      }

      setPending(true);
      setError(null);

      try {
        const result = await authRequest<AuthMessage>("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        setMessage(result.message);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to verify email.");
      } finally {
        setPending(false);
      }
    }

    void verifyWithToken();
  }, [token, setError, setPending]);

  async function handleResend() {
    setPending(true);
    setError(null);

    try {
      const result = await authRequest<SignUpPayload>(authRoutes.resendVerification, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const nextMessage = result.verificationToken
        ? `${result.message} Development verification token: ${result.verificationToken}`
        : result.message;
      setMessage(nextMessage);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to resend verification.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-body text-base leading-7 text-on-surface-variant">
        We sent a verification link to <span className="font-semibold text-on-surface">{email}</span>. Open the link to activate your account before signing in.
      </p>
      {message ? <div className="rounded-xl bg-primary-fixed px-4 py-3 font-body text-sm text-primary">{message}</div> : null}
      {error ? <div className="rounded-xl bg-error-container px-4 py-3 font-body text-sm text-error">{error}</div> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={handleResend} disabled={pending} type="button" className="rounded-xl bg-surface-container-low px-5 py-3 font-label font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60">
          {pending ? "Sending..." : "Resend verification"}
        </button>
        <Link href="/sign-in" className="rounded-xl px-5 py-3 font-label font-semibold text-primary transition-colors hover:text-primary-container">
          Return to sign in
        </Link>
      </div>
    </div>
  );
}
