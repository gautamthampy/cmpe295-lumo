"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { authRequest, authRoutes, type StudentLoginCodeIssuePayload } from "@/lib/auth";

const PORTAL_REVEAL_MS = 45_000;

type ParentStudentCodeButtonProps = {
  studentId: string;
  studentName: string;
};

export function ParentStudentCodeButton({ studentId, studentName }: ParentStudentCodeButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loginCode, setLoginCode] = useState<string | null>(null);

  useEffect(() => {
    if (!loginCode) {
      return;
    }

    const timeout = window.setTimeout(() => setLoginCode(null), PORTAL_REVEAL_MS);
    return () => window.clearTimeout(timeout);
  }, [loginCode]);

  async function handleGenerateCode() {
    setPending(true);
    setError(null);

    try {
      const result = await authRequest<StudentLoginCodeIssuePayload>(authRoutes.generateStudentLoginCode(studentId), {
        method: "POST",
      });
      setMessage(result.message);
      setLoginCode(result.loginCode ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate a student login code.");
      setLoginCode(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleGenerateCode}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-container px-4 py-3 font-label text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all duration-150 hover:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <KeyRound className="h-4 w-4" />
        <span>{pending ? "Generating..." : `Generate Code for ${studentName}`}</span>
      </button>
      {message ? <p className="font-body text-sm leading-6 text-on-surface-variant">{message}</p> : null}
      {error ? <div role="alert" className="rounded-xl bg-error-container px-4 py-3 font-body text-sm text-error">{error}</div> : null}
      {loginCode ? (
        <div className="rounded-[1.25rem] bg-primary-fixed px-4 py-4 text-primary">
          <p className="font-label text-xs font-bold uppercase tracking-[0.25em]">Visible For 45 Seconds</p>
          <p className="mt-2 font-headline text-3xl font-extrabold tracking-[0.3em]">{loginCode}</p>
          <p className="mt-2 font-body text-sm leading-6 text-primary">Share this with {studentName} only if they are signing in right now. It was also sent to the parent email on file.</p>
          <Link href="/student-login" className="mt-4 inline-flex items-center gap-2 font-label text-sm font-bold text-primary underline-offset-4 hover:underline">
            Open student sign-in on this device
          </Link>
        </div>
      ) : null}
    </div>
  );
}