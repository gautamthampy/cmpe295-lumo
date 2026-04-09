"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, type FormEvent, useState } from "react";

import { PrimaryButton } from "@/components/auth/auth-shell";
import { authRequest, authRoutes, type StudentCreatePayload, type StudentSummary } from "@/lib/auth";

const GRADE_LEVELS = Array.from({ length: 12 }, (_, index) => index + 1);
const AVATAR_OPTIONS = [
  { value: "owl", label: "Owl" },
  { value: "fox", label: "Fox" },
  { value: "otter", label: "Otter" },
  { value: "bear", label: "Bear" },
];

export function StudentProfileCreator() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const displayName = String(formData.get("displayName") ?? "").trim();
    const gradeLevel = Number(formData.get("gradeLevel") ?? 0);
    const payload: StudentCreatePayload = {
      displayName,
      gradeLevel,
      avatarId: String(formData.get("avatarId") ?? "owl"),
      consentGiven: formData.get("consentGiven") === "on",
    };

    if (!displayName) {
      setError("Enter the learner's name first.");
      setPending(false);
      return;
    }

    if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 12) {
      setError("Choose a grade level between 1 and 12.");
      setPending(false);
      return;
    }

    try {
      const student = await authRequest<StudentSummary>(authRoutes.createStudent, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      form.reset();
      setMessage(`${student.display_name} is ready for secure student sign-in.`);
      startTransition(() => router.refresh());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create that learner profile.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4 rounded-[1.5rem] bg-surface-container-low px-5 py-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <UserPlus className="h-5 w-5" />
        </div>
        <h2 className="font-headline text-2xl font-extrabold tracking-[-0.04em] text-on-surface">Add a learner</h2>
        <p className="font-body text-sm leading-6 text-on-surface-variant">Create the student profile first, then generate a one-time sign-in code from the card below.</p>
      </div>

      {error ? <div role="alert" className="rounded-xl bg-error-container px-4 py-3 font-body text-sm text-error">{error}</div> : null}
      {message ? <div className="rounded-xl bg-primary-fixed px-4 py-3 font-body text-sm text-primary">{message}</div> : null}

      <label className="block space-y-2">
        <span className="font-label text-sm font-semibold text-on-surface-variant">Learner name</span>
        <input
          name="displayName"
          type="text"
          placeholder="e.g. Maya"
          className="block w-full rounded-xl border-none bg-surface-container-highest px-4 py-4 font-body text-base text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-fixed"
        />
      </label>

      <label className="block space-y-2">
        <span className="font-label text-sm font-semibold text-on-surface-variant">Grade level</span>
        <select
          name="gradeLevel"
          defaultValue="3"
          className="block w-full rounded-xl border-none bg-surface-container-highest px-4 py-4 font-body text-base text-on-surface focus:ring-2 focus:ring-primary-fixed"
        >
          {GRADE_LEVELS.map((gradeLevel) => (
            <option key={gradeLevel} value={gradeLevel}>
              Grade {gradeLevel}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-2">
        <legend className="font-label text-sm font-semibold text-on-surface-variant">Avatar</legend>
        <div className="grid grid-cols-2 gap-2">
          {AVATAR_OPTIONS.map((avatar, index) => (
            <label key={avatar.value} className="cursor-pointer">
              <input
                type="radio"
                name="avatarId"
                value={avatar.value}
                defaultChecked={index === 0}
                className="peer sr-only"
              />
              <span className="flex items-center justify-center rounded-xl bg-surface-container-highest px-4 py-3 font-label text-sm font-semibold text-on-surface-variant transition-colors peer-checked:bg-primary-fixed peer-checked:text-primary">
                {avatar.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 rounded-xl bg-surface-container-highest px-4 py-4 font-body text-sm leading-6 text-on-surface-variant">
        <input
          type="checkbox"
          name="consentGiven"
          defaultChecked
          className="mt-1 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary-fixed"
        />
        <span>I confirm parent consent is in place for this learner profile.</span>
      </label>

      <PrimaryButton pending={pending}>Create Learner Profile</PrimaryButton>
    </form>
  );
}