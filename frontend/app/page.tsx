import Link from 'next/link';

const agents = [
  {
    name: 'Lesson Designer',
    owner: 'Gautam',
    status: 'Phase 2 Active',
    color: 'green',
    description:
      'Renders MDX lesson content to semantic HTML with real WCAG 2.1 AA accessibility scoring.',
    phase2: 'MDX renderer + accessibility checker live.',
  },
  {
    name: 'Quiz Agent',
    owner: 'Alshama',
    status: 'Phase 2',
    color: 'blue',
    description:
      'Generates adaptive quizzes with misconception-based distractors.',
    phase2: 'Deterministic heuristics + Postgres API integration.',
  },
  {
    name: 'Feedback Agent',
    owner: 'Bhavya',
    status: 'Phase 2',
    color: 'purple',
    description:
      'Provides tiered hints and motivational support to guide students.',
    phase2: 'Single-level hint loop + re-quiz trigger.',
  },
  {
    name: 'Attention Agent',
    owner: 'Nivedita',
    status: 'Phase 2',
    color: 'orange',
    description:
      'Monitors student engagement and triggers interventions when focus drops.',
    phase2: 'Event ingestion + latency metrics + dashboard.',
  },
];

const colorMap: Record<string, string> = {
  green: 'bg-green-100 text-green-800 border-green-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-white" aria-label="LUMO home page">
      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-green-700 mb-4">LUMO</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Multi-Agent AI Tutoring System for Elementary Education
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Phase 1 Complete · Phase 2 In Progress
          </div>
        </header>

        {/* Agent Cards */}
        <section aria-labelledby="agents-heading">
          <h2 id="agents-heading" className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Four Specialized Agents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12" role="list">
            {agents.map((agent) => (
              <div
                key={agent.name}
                role="listitem"
                className={`rounded-xl border p-6 ${colorMap[agent.color]} transition-shadow hover:shadow-md`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold">{agent.name}</h3>
                  <span className="text-xs font-medium opacity-70">{agent.owner}</span>
                </div>
                <p className="text-sm mb-3 opacity-80">{agent.description}</p>
                <p className="text-xs font-medium opacity-70">Phase 2: {agent.phase2}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/lessons"
            className="inline-block px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg transition-colors focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            Browse Lesson Library →
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            5 Grade 3 Math micro-lessons ready to explore
          </p>
        </div>

        {/* Stack */}
        <footer className="mt-20 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>
            FastAPI · PostgreSQL · Next.js 15 · React 19 · Tailwind CSS · Google Gemini
          </p>
          <p className="mt-1">Team: Alshama · Bhavya · Gautam · Nivedita</p>
        </footer>
      </div>
    </main>
  );
}
