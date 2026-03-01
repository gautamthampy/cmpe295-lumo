import Link from 'next/link';

const agents = [
  {
    name: 'Lesson Designer',
    owner: 'Gautam',
    status: 'Phase 3 Active',
    icon: '📚',
    description: 'Renders MDX lesson content to semantic HTML with WCAG 2.1 AA accessibility scoring, AI-powered generation, and adaptive difficulty.',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  {
    name: 'Quiz Agent',
    owner: 'Alshama',
    status: 'Phase 2',
    icon: '🎯',
    description: 'Generates adaptive quizzes with misconception-based distractors targeting common student errors.',
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  {
    name: 'Feedback Agent',
    owner: 'Bhavya',
    status: 'Phase 2',
    icon: '💬',
    description: 'Provides tiered hints and motivational support to guide students through misconceptions.',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    name: 'Attention Agent',
    owner: 'Nivedita',
    status: 'Phase 2',
    icon: '👁️',
    description: 'Monitors student engagement and triggers adaptive interventions when focus drops.',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16" aria-label="LUMO home page">
      {/* Header */}
      <header className="text-center mb-14">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg"
          style={{ background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-secondary-base))' }}>
          <span className="text-3xl" role="img" aria-label="LUMO">🌟</span>
        </div>
        <h1 className="text-6xl font-bold tracking-tight mb-3">
          <span className="text-gradient">LUMO</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-xl mx-auto leading-relaxed">
          A multi-agent AI study coach for elementary education
        </p>
        <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-sm font-medium text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          Phase 3 · Lesson Designer Active
        </div>
      </header>

      {/* Agent cards */}
      <section aria-labelledby="agents-heading" className="w-full max-w-4xl mb-12">
        <h2 id="agents-heading" className="text-sm font-semibold uppercase tracking-widest text-slate-400 text-center mb-6">
          Four Specialized Agents
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="list">
          {agents.map((agent) => (
            <div
              key={agent.name}
              role="listitem"
              className="glass-card"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-hidden="true">{agent.icon}</span>
                  <div>
                    <h3 className="font-bold text-slate-800">{agent.name}</h3>
                    <span className="text-xs text-slate-400">{agent.owner}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${agent.badge}`}>
                  {agent.status}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{agent.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Link
          href="/lessons"
          className="btn-primary text-base px-8 py-3 rounded-2xl focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ '--tw-ring-color': 'var(--color-primary-base)' } as React.CSSProperties}
        >
          Browse Lesson Library →
        </Link>
        <Link
          href="/lessons/editor"
          className="px-8 py-3 glass rounded-2xl text-sm font-semibold text-slate-700 hover:shadow-lg transition-all"
        >
          ✨ Create with AI
        </Link>
      </div>

      <footer className="mt-16 text-center text-xs text-slate-400 space-y-1">
        <p>FastAPI · PostgreSQL · Next.js 15 · React 19 · Tailwind CSS · Google Gemini</p>
        <p>Team: Alshama · Bhavya · Gautam · Nivedita</p>
      </footer>
    </main>
  );
}
