"use client";

interface GenerationStageProps {
  childName: string;
}

const loadingMessages = [
  "Building your lesson blocks...",
  "Checking Grade 2-safe vocabulary...",
  "Choosing the best activity mechanic...",
  "Designing storybook scenes and narration...",
  "Running safety and curriculum checks...",
];

export function GenerationStage({ childName }: GenerationStageProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border-4 border-indigo-200 bg-[radial-gradient(circle_at_top_left,#e0e7ff,transparent_35%),radial-gradient(circle_at_bottom_right,#fde68a,transparent_30%),linear-gradient(145deg,#eef2ff,#fff7ed)] p-6 shadow-[0_24px_60px_-34px_rgba(79,70,229,0.45)]">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-700">Mission Setup</p>
      <h3 className="mt-2 text-3xl font-black text-slate-900">Building story + game together</h3>
      <p className="mt-2 max-w-2xl text-sm font-medium text-slate-700">
        The planner is preparing a Grade 2 adventure for {childName}: first an illustrated
        storybook with narration, then a hands-on challenge that matches the lesson goal.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {loadingMessages.map((message, index) => (
          <div
            key={message}
            className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            <span
              className="inline-block h-3 w-3 animate-pulse rounded-full bg-indigo-500"
              style={{ animationDelay: `${index * 120}ms` }}
            />
            {message}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/90 bg-white/80 p-4 text-sm text-slate-700">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
          Warm-up Prompt
        </p>
        <p className="mt-2 font-medium">
          What clue would help you tell if an animal belongs in a forest, ocean, or desert?
        </p>
      </div>
    </section>
  );
}
