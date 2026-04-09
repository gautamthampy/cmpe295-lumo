import Link from "next/link";
import { ArrowLeft, CheckCircle2, GraduationCap, Info, Mail, LockKeyhole, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import type { PropsWithChildren, ReactNode } from "react";

type TopBarProps = {
  minimal?: boolean;
};

export function AuthTopBar({ minimal = false }: TopBarProps) {
  if (minimal) {
    return null;
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/sign-in" className="font-headline text-[2rem] font-extrabold tracking-[-0.04em] text-primary">
          LUMO: AI Study Coach
        </Link>
      </div>
    </header>
  );
}

type CenteredBrandProps = {
  title: string;
  subtitle: string;
};

export function CenteredBrand({ title, subtitle }: CenteredBrandProps) {
  return (
    <div className="space-y-3 text-center">
      <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
        <GraduationCap className="h-8 w-8 text-primary" />
      </div>
      <h1 className="font-headline text-4xl font-extrabold tracking-[-0.05em] text-primary md:text-5xl">{title}</h1>
      <p className="font-body text-lg text-on-surface-variant">{subtitle}</p>
    </div>
  );
}

type AuthCardProps = PropsWithChildren<{
  className?: string;
  accent?: boolean;
}>;

export function AuthCard({ children, className, accent = false }: AuthCardProps) {
  return (
    <section
      className={clsx(
        "relative rounded-[1.5rem] bg-surface-container-lowest p-8 shadow-ambient md:p-10",
        accent && "overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-gradient-to-r before:from-primary before:via-primary-container before:to-secondary",
        className,
      )}
    >
      {children}
    </section>
  );
}

type FieldProps = {
  label: string;
  type?: string;
  name: string;
  placeholder: string;
  icon?: LucideIcon;
  helper?: string;
  error?: string;
  autoComplete?: string;
  rightSlot?: ReactNode;
  defaultValue?: string;
};

export function FormField({
  label,
  type = "text",
  name,
  placeholder,
  icon: Icon,
  helper,
  error,
  autoComplete,
  rightSlot,
  defaultValue,
}: FieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block px-1 font-label text-sm font-semibold text-on-surface-variant">
        {label}
      </label>
      <div className="group relative">
        {Icon ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-outline transition-colors group-focus-within:text-primary">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          className={clsx(
            "block w-full rounded-xl border-none bg-surface-container-highest px-4 py-4 font-body text-base text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-fixed",
            Icon ? "pl-12" : undefined,
            rightSlot ? "pr-12" : undefined,
            error ? "ring-2 ring-error/30" : undefined,
          )}
        />
        {rightSlot ? <div className="absolute inset-y-0 right-4 flex items-center">{rightSlot}</div> : null}
      </div>
      {helper ? <p className="px-1 font-body text-xs text-tertiary">{helper}</p> : null}
      {error ? <p className="px-1 font-body text-sm text-error">{error}</p> : null}
    </div>
  );
}

type PrimaryButtonProps = {
  children: ReactNode;
  pending?: boolean;
  icon?: LucideIcon;
  type?: "button" | "submit";
};

export function PrimaryButton({ children, pending, icon: Icon, type = "submit" }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-container px-6 py-4 font-label text-lg font-bold text-on-primary shadow-lg shadow-primary/20 transition-all duration-150 hover:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span>{pending ? "Working..." : children}</span>
      {Icon ? <Icon className="h-5 w-5" /> : null}
    </button>
  );
}

export function AuthFooterNote({ children }: PropsWithChildren) {
  return <p className="mx-auto max-w-sm text-center font-body text-xs leading-relaxed text-tertiary/90">{children}</p>;
}

type StatusPanelProps = {
  title: string;
  body: string;
  tone?: "success" | "info";
  action?: ReactNode;
};

export function StatusPanel({ title, body, tone = "success", action }: StatusPanelProps) {
  const Icon = tone === "success" ? CheckCircle2 : ShieldCheck;

  return (
    <div className="rounded-[1.25rem] bg-surface-container-low p-6">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/8 text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="font-headline text-3xl font-extrabold tracking-[-0.04em] text-on-surface">{title}</h2>
      <p className="mt-3 font-body leading-7 text-on-surface-variant">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function BackLink({ href, children }: PropsWithChildren<{ href: string }>) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-label text-lg font-semibold text-primary transition-colors hover:text-primary-container">
      <ArrowLeft className="h-5 w-5" />
      <span>{children}</span>
    </Link>
  );
}

export function InfoCallout({ children }: PropsWithChildren) {
  return (
    <div className="flex items-start gap-4 rounded-[1.25rem] bg-tertiary-fixed/35 p-5 text-sm leading-6 text-tertiary">
      <Info className="mt-0.5 h-5 w-5 flex-none" />
      <p className="font-body">{children}</p>
    </div>
  );
}

export const AuthIcons = {
  Mail,
  LockKeyhole,
  Info,
};
