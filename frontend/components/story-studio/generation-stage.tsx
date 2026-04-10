"use client";

interface GenerationStageProps {
  childName: string;
}

const loadingMessages = [
  "Building lesson blocks and quick checks...",
  "Choosing a kid-friendly mechanic...",
  "Painting story scenes with Gemini...",
  "Preparing narration and coach prompts...",
  "Running schema and safety checks...",
];

export function GenerationStage({ childName }: GenerationStageProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32%),radial-gradient(circle_at_bottom_right,#fde68a,transparent_28%),linear-gradient(145deg,#eff6ff,#fff7ed)] p-6 shadow-[0_24px_60px_-34px_rgba(37,99,235,0.35)]">
      <p className="font-label text-xs font-bold uppercase tracking-[0.24em] text-primary">
        Story Studio
      </p>
      <h3 className="mt-2 font-headline text-3xl font-extrabold tracking-[-0.04em] text-on-surface">
        Building story + game together
      </h3>
      <p className="mt-2 max-w-2xl font-body text-sm leading-7 text-on-surface-variant">
        Lumo is preparing an illustrated warm-up story, a guided mission, and a coach-friendly
        hint layer for {childName}.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {loadingMessages.map((message, index) => (
          <div
            key={message}
            className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/75 px-4 py-3 text-sm font-semibold text-on-surface"
          >
            <span
              className="inline-block h-3 w-3 animate-pulse rounded-full bg-primary"
              style={{ animationDelay: `${index * 120}ms` }}
            />
            {message}
          </div>
        ))}
      </div>
    </section>
  );
}