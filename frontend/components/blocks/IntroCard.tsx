interface IntroCardProps {
  title: string;
  prompt: string;
  theme: string;
}

export function IntroCard({ title, prompt, theme }: IntroCardProps) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border-2 border-fuchsia-200 bg-gradient-to-r from-fuchsia-100 via-pink-50 to-amber-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-700">
          Mission Intro
        </p>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-fuchsia-800">
          Theme: {theme}
        </span>
      </div>
      <h3 className="mt-2 text-xl font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm font-medium text-slate-700">{prompt}</p>
    </article>
  );
}
