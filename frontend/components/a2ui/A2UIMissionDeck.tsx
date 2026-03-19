"use client";

import { Component, type ReactNode, useEffect, useMemo } from "react";
import { A2UIViewer, initializeDefaultCatalog } from "@a2ui/react";
import { injectStyles } from "@a2ui/react/styles";
import type { LessonSpec } from "@/lib/lesson-spec";
import { buildMissionDeckModel, getSceneKindLabel } from "./mission-deck-model";

interface A2UIMissionDeckProps {
  lesson: LessonSpec;
  clueLine: string;
}

let a2uiBootstrapped = false;

class A2UIDeckErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Fallback looks like “plain text” — log the real renderer error in devtools.
    console.error("[A2UIMissionDeck] @a2ui/react render failed; showing fallback card.", error, info);
  }

  componentDidUpdate(prevProps: { children: ReactNode }) {
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function A2UIMissionDeck({ lesson, clueLine }: A2UIMissionDeckProps) {
  useEffect(() => {
    if (a2uiBootstrapped) return;
    initializeDefaultCatalog();
    injectStyles();
    a2uiBootstrapped = true;
  }, []);

  const previewLine = clueLine.trim() || lesson.sceneSpec.instruction || lesson.sceneSpec.helperText;
  const { components, data } = useMemo(
    () => buildMissionDeckModel(lesson, previewLine),
    [lesson, previewLine]
  );

  const scene = lesson.sceneSpec;
  const fallbackDeck = (
    <section className="rounded-[1.8rem] border-2 border-white/85 bg-white/90 p-5 text-slate-900 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
        Google A2UI Mission Deck
      </p>
      <h2 className="mt-2 text-2xl font-black text-slate-900">{scene.title}</h2>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">{previewLine}</p>
      <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        Agentic surface type: {getSceneKindLabel(scene.kind)}
      </p>
      {scene.kind === "state_slider" ? (
        <div className="mt-4 rounded-[1.4rem] border border-indigo-100 bg-indigo-50/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-700">
            Fallback range (A2UI renderer error)
          </p>
          <label className="mt-2 block text-sm font-semibold text-slate-800" htmlFor="lumo-fallback-heat">
            Heat ({scene.minValue}–{scene.maxValue})
          </label>
          <input
            id="lumo-fallback-heat"
            type="range"
            min={scene.minValue}
            max={scene.maxValue}
            defaultValue={scene.initialValue}
            className="mt-2 w-full accent-indigo-600"
          />
        </div>
      ) : null}
      {scene.kind === "choice_transform" ? (
        <div className="mt-4 rounded-[1.4rem] border border-cyan-100 bg-cyan-50/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
            Fallback buttons (A2UI renderer error)
          </p>
          <div className="mt-2 grid gap-2">
            {scene.choices.map((c) => (
              <button
                key={c.id}
                type="button"
                className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800"
              >
                <span className="mr-2">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.4rem] border border-cyan-100 bg-cyan-50/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Clue</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            Look for this clue: {scene.helperText}
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Reward</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            Fact to unlock: {scene.rewardFact}
          </p>
        </div>
      </div>
    </section>
  );

  return (
    <A2UIDeckErrorBoundary fallback={fallbackDeck}>
      <section className="overflow-hidden rounded-[1.8rem] border-2 border-white/85 bg-white/80 p-1 shadow-sm">
        <A2UIViewer
          root="mission-deck-card"
          components={components}
          data={data}
          className="a2ui-mission-deck"
          onAction={() => {
            /* Mission deck is illustrative; game actions live in the Lumo mechanic below */
          }}
        />
      </section>
    </A2UIDeckErrorBoundary>
  );
}
