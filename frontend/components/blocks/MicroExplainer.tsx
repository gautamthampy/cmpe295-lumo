interface MicroExplainerProps {
  title: string;
  prompt: string;
}

export function MicroExplainer({ title, prompt }: MicroExplainerProps) {
  return (
    <article className="rounded-[1.6rem] border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-100 p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
        Quick Learn
      </p>
      <h3 className="mt-1 text-xl font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">{prompt}</p>
    </article>
  );
}
