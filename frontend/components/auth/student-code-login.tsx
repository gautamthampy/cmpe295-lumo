"use client";

import { Mail, RotateCcw, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { AuthFooterNote, PrimaryButton } from "@/components/auth/auth-shell";
import { authRequest, authRoutes, type StudentAuthPayload, type StudentLoginCodeIssuePayload, type StudentSummary } from "@/lib/auth";
import { useAuthStore } from "@/lib/store/auth";

const CODE_LENGTH = 4;
const DEFAULT_STUDENT_DESTINATION = "/learn";

function ErrorBanner({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return <div role="alert" className="rounded-[1.25rem] bg-[#ffdad6] px-4 py-3 font-body text-sm text-[#93000a]">{error}</div>;
}

function resolvePostLoginPath(candidate: string | null) {
  const trimmed = candidate?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/student-login")) {
    return DEFAULT_STUDENT_DESTINATION;
  }

  return trimmed;
}

export function StudentCodeLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const role = useAuthStore((state) => state.role);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const syncFromBrowserStorage = useAuthStore((state) => state.syncFromBrowserStorage);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [email, setEmail] = useState("");
  const [requestedEmail, setRequestedEmail] = useState("");
  const [codeDigits, setCodeDigits] = useState<string[]>(Array.from({ length: CODE_LENGTH }, () => ""));
  const [requestPending, setRequestPending] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);
  const [selectionPending, setSelectionPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectionToken, setSelectionToken] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);

  const codeValue = useMemo(() => codeDigits.join(""), [codeDigits]);
  const nextPath = resolvePostLoginPath(searchParams.get("next"));

  useEffect(() => {
    syncFromBrowserStorage();
  }, [syncFromBrowserStorage]);

  useEffect(() => {
    if (role === "student" && isAuthenticated()) {
      router.replace(nextPath);
    }
  }, [isAuthenticated, nextPath, role, router]);

  async function requestCode(nextEmail: string) {
    setRequestPending(true);
    setError(null);
    setMessage(null);
    setSelectionToken(null);
    setStudents([]);

    try {
      const result = await authRequest<StudentLoginCodeIssuePayload>(authRoutes.requestStudentLoginCode, {
        method: "POST",
        body: JSON.stringify({ email: nextEmail }),
      });

      setRequestedEmail(nextEmail);
      setMessage(result.loginCode ? `${result.message} Development code: ${result.loginCode}` : result.message);
      setCodeDigits(Array.from({ length: CODE_LENGTH }, () => ""));
      inputRefs.current[0]?.focus();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request a login code.");
    } finally {
      setRequestPending(false);
    }
  }

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = email.trim();
    if (!nextEmail) {
      setError("Enter the parent email address first.");
      return;
    }

    await requestCode(nextEmail);
  }

  async function finishStudentAuth(result: StudentAuthPayload) {
    if (!result.accessToken || !result.student) {
      setError("Student login completed without a usable session token.");
      return;
    }

    login(result.accessToken, "student", result.student.display_name, result.student.grade_level);
    router.replace(nextPath);
  }

  async function verifyCode(code: string) {
    setVerifyPending(true);
    setError(null);

    try {
      const result = await authRequest<StudentAuthPayload>(authRoutes.verifyStudentLoginCode, {
        method: "POST",
        body: JSON.stringify({ code }),
      });

      if (result.requiresStudentSelection && result.selectionToken) {
        setSelectionToken(result.selectionToken);
        setStudents(result.students);
        setMessage(result.message);
        return;
      }

      await finishStudentAuth(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "That code could not be verified.");
      setCodeDigits(Array.from({ length: CODE_LENGTH }, () => ""));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifyPending(false);
    }
  }

  function updateDigit(index: number, rawValue: string) {
    const nextDigit = rawValue.replace(/\D/g, "").slice(-1);
    const nextDigits = [...codeDigits];
    nextDigits[index] = nextDigit;
    setCodeDigits(nextDigits);

    if (nextDigit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const nextCode = nextDigits.join("");
    if (nextCode.length === CODE_LENGTH && nextDigits.every(Boolean)) {
      void verifyCode(nextCode);
    }
  }

  function handleKeyDown(index: number, key: string) {
    if (key === "Backspace" && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleStudentSelection(studentId: string) {
    if (!selectionToken) {
      return;
    }

    setSelectionPending(true);
    setError(null);

    try {
      const result = await authRequest<StudentAuthPayload>(authRoutes.selectStudentAfterCode, {
        method: "POST",
        body: JSON.stringify({ selectionToken, studentId }),
      });
      await finishStudentAuth(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to choose that learner.");
    } finally {
      setSelectionPending(false);
    }
  }

  return (
    <div className="space-y-6 rounded-[2rem] bg-white/95 px-7 py-8 shadow-[0_28px_80px_-24px_rgba(126,87,0,0.32)] backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#7e5700] text-white shadow-[0_12px_32px_rgba(126,87,0,0.24)]">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <div className="space-y-3 text-center">
        <h1 className="font-['Plus_Jakarta_Sans'] text-4xl font-extrabold tracking-[-0.05em] text-[#7e5700]">Ask Your Parent for Help!</h1>
        <p className="font-body text-base leading-7 text-[#52452a]">Enter your parent&apos;s email to get your magic code, then type the 4-digit code below.</p>
      </div>

      <ErrorBanner error={error} />
      {message ? <div className="rounded-[1.25rem] bg-[#f6f0bb] px-4 py-3 font-body text-sm leading-6 text-[#604100]">{message}</div> : null}

      <form className="space-y-4" onSubmit={handleRequestSubmit}>
        <label className="block space-y-2">
          <span className="sr-only">Parent email address</span>
          <div className="flex items-center gap-3 rounded-[1.5rem] bg-[#f0eab6] px-4 py-4 text-[#857556] shadow-inner shadow-white/40">
            <Mail className="h-5 w-5" />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Parent's email address"
              className="w-full bg-transparent font-body text-base text-[#1e1c00] outline-none placeholder:text-[#a69574]"
              autoComplete="email"
            />
          </div>
        </label>
        <PrimaryButton pending={requestPending}>Send My Code</PrimaryButton>
      </form>

      <div className="flex items-center gap-4 py-1">
        <div className="h-px flex-1 bg-[#d8c4a0]/50" />
        <span className="font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-[0.3em] text-[#a69574]">or</span>
        <div className="h-px flex-1 bg-[#d8c4a0]/50" />
      </div>

      <div className="space-y-4 text-center">
        <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#1e1c00]">Have a code already?</h2>
        <div className="flex justify-center gap-3" role="group" aria-label="Student login code entry">
          {codeDigits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              value={digit}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event.key)}
              inputMode="numeric"
              maxLength={1}
              aria-label={`Code digit ${index + 1}`}
              className="h-16 w-14 rounded-[1.25rem] bg-[#cae6ff] text-center font-['Plus_Jakarta_Sans'] text-2xl font-extrabold text-[#004b70] outline-none ring-0 transition-transform focus:scale-105 focus:shadow-[0_0_0_4px_rgba(141,205,255,0.55)]"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => void requestCode(requestedEmail || email.trim())}
          disabled={requestPending || !(requestedEmail || email.trim())}
          className="inline-flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#004b70] transition-colors hover:text-[#006493] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Didn&apos;t get the code? Send it again
        </button>
      </div>

      {selectionToken ? (
        <div className="space-y-3 rounded-[1.5rem] bg-[#fbf5c1] p-5">
          <h3 className="font-['Plus_Jakarta_Sans'] text-xl font-extrabold text-[#7e5700]">Choose your learner</h3>
          <div className="grid gap-3">
            {students.map((student) => (
              <button
                key={student.student_id}
                type="button"
                onClick={() => void handleStudentSelection(student.student_id)}
                disabled={selectionPending}
                className="flex items-center justify-between rounded-[1.5rem] bg-white px-4 py-4 text-left shadow-[0_12px_28px_rgba(126,87,0,0.08)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                <div>
                  <p className="font-['Plus_Jakarta_Sans'] text-lg font-extrabold text-[#1e1c00]">{student.display_name}</p>
                  <p className="font-body text-sm text-[#52452a]">Grade {student.grade_level}</p>
                </div>
                <span className="rounded-full bg-[#ffdeac] px-3 py-1 font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-[0.2em] text-[#604100]">Start</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {(requestPending || verifyPending || selectionPending) ? (
        <p className="text-center font-body text-sm text-[#857556]">{verifyPending ? "Checking your code..." : selectionPending ? "Signing you in..." : "Sending a code..."}</p>
      ) : null}

      <AuthFooterNote>
        Codes work once, expire quickly, and help keep the right learner signed in safely even when more than one student uses the same family account.
      </AuthFooterNote>
    </div>
  );
}