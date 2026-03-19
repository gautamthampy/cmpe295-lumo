import type { StudentProgress } from "@/lib/adaptation";
import type { LessonSpec, ParentInput } from "@/lib/lesson-spec";

interface ParentPanelProps {
  parentInput: ParentInput | null;
  lesson: LessonSpec | null;
  source: "live" | "seed" | null;
  progress: StudentProgress;
  eventLog: string[];
  adaptationReason: string;
}

export function ParentPanel({
  parentInput,
  lesson,
  source,
  progress,
  eventLog,
  adaptationReason,
}: ParentPanelProps) {
  return (
    <aside className="space-y-4 rounded-[2rem] border-4 border-slate-200 bg-white/90 p-5 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">Parent Panel</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">Live learning control room</h2>
      </div>

      <section className="rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-700">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Planner input</p>
        {parentInput ? (
          <div className="mt-2 space-y-1">
            <p>
              District: <strong>{parentInput.district}</strong>
            </p>
            <p>
              Subject: <strong>{parentInput.subject}</strong>
            </p>
            <p>
              Unit code: <strong>{parentInput.curriculumCode}</strong>
            </p>
            <p>
              Interests: <strong>{parentInput.childInterests.join(", ")}</strong>
            </p>
          </div>
        ) : (
          <p className="mt-2">No lesson generated yet.</p>
        )}
      </section>

      <section className="rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-700">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Validation and source</p>
        {lesson ? (
          <div className="mt-2 space-y-1">
            <p>
              Source: <strong>{source}</strong>
            </p>
            <p>
              Mechanic: <strong>{lesson.mechanicId}</strong>
            </p>
            <p>
              Curriculum aligned:{" "}
              <strong>{String(lesson.validationStatus.curriculumAligned)}</strong>
            </p>
            <p>
              Fallback used: <strong>{String(lesson.validationStatus.fallbackUsed)}</strong>
            </p>
            <p>
              Student flow: <strong>AI storybook -&gt; narration -&gt; mission game</strong>
            </p>
          </div>
        ) : (
          <p className="mt-2">Waiting for generated lesson.</p>
        )}
      </section>

      <section className="rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-700">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Live progress</p>
        <div className="mt-2 space-y-1">
          <p>Attempts: {progress.attempts}</p>
          <p>Correct: {progress.correct}</p>
          <p>Hints used: {progress.hintRequests}</p>
          <p>Consecutive misses: {progress.consecutiveIncorrect}</p>
        </div>
      </section>

      <section className="rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-700">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Adaptation reason</p>
        <p className="mt-1">{adaptationReason || "No adaptation yet."}</p>
      </section>

      <section className="rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-700">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Event log</p>
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
          {eventLog.length === 0 ? <li>No events yet.</li> : null}
          {eventLog.map((event, index) => (
            <li key={`${event}-${index}`}>- {event}</li>
          ))}
        </ul>
      </section>

      {lesson ? (
        <section className="rounded-[1.5rem] bg-indigo-50 p-4 text-sm text-indigo-900">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">Take-home summary</p>
          <p className="mt-1">{lesson.parentSummary}</p>
        </section>
      ) : null}
    </aside>
  );
}
