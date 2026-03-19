interface HintCardProps {
  hintText: string;
  reason?: string;
}

export function HintCard({ hintText, reason }: HintCardProps) {
  if (!hintText) return null;

  return (
    <aside className="rounded-3xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-100 p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
        Helpful Nudge
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{hintText}</p>
      {reason ? (
        <p className="mt-2 rounded-lg bg-white/80 px-2 py-1 text-xs font-medium text-slate-600">
          We showed this because: {reason}
        </p>
      ) : null}
    </aside>
  );
}
