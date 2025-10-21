export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4 text-center">
          LUMO - AI Study Coach
        </h1>
        <p className="text-xl text-center mb-8">
          Multi-agent AI Study Coach for Elementary Education
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4">
          <h2 className="text-2xl font-semibold mb-4">Phase 1: Environment Setup</h2>
          <p className="mb-2">✅ Docker Compose configured (Postgres, MinIO, Redis)</p>
          <p className="mb-2">✅ Database schema defined</p>
          <p className="mb-2">✅ Event schema and API contracts created</p>
          <p className="mb-2">✅ Privacy guardrails documented</p>
          <p className="mb-2">✅ Backend structure with FastAPI</p>
          <p className="mb-2">✅ Frontend structure with Next.js</p>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Ready for Phase 2: Baseline Reproduction
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Lesson Designer</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Minimal lesson renderer with accessibility checks (Phase 2)
            </p>
          </div>
          <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Quiz Agent</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Deterministic quiz heuristics and API stub (Phase 2)
            </p>
          </div>
          <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Feedback Agent</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Single level hint loop and re-quiz trigger (Phase 2)
            </p>
          </div>
          <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Attention Agent</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Event ingestion and simple latency metrics (Phase 2)
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

