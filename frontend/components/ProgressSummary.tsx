import type { StudentProgress } from "@/lib/adaptation";

interface ProgressSummaryProps {
  progress: StudentProgress;
}

export function ProgressSummary({ progress }: ProgressSummaryProps) {
  const accuracy =
    progress.attempts === 0 ? 0 : Math.round((progress.correct / progress.attempts) * 100);

  return (
    <section className="rounded-3xl border-2 border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700">
        Discovery Meter
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold text-slate-700">
        <p>Moves</p>
        <p className="text-right">{progress.attempts}</p>
        <p>Facts unlocked</p>
        <p className="text-right">{progress.correct}</p>
        <p>Try again moments</p>
        <p className="text-right">{progress.incorrect}</p>
        <p>Help taps</p>
        <p className="text-right">{progress.hintRequests}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 transition-all"
          style={{ width: `${Math.max(8, accuracy)}%` }}
        />
      </div>
    </section>
  );
}
