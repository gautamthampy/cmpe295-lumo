"use client";

import { Component, type ReactNode, useEffect } from "react";
import {
  A2UIViewer,
  initializeDefaultCatalog,
  type ComponentInstance,
} from "@a2ui/react";
import { injectStyles } from "@a2ui/react/styles";
import type { LessonSpec } from "@/lib/lesson-spec";

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

function getSceneKindLabel(kind: LessonSpec["sceneSpec"]["kind"]) {
  if (kind === "choice_transform") return "transform scene";
  if (kind === "transform_grid") return "magic change scene";
  if (kind === "dispatch_board") return "helper dispatch scene";
  if (kind === "number_builder") return "number builder scene";
  if (kind === "array_garden") return "garden array scene";
  if (kind === "state_slider") return "science slider scene";
  if (kind === "tool_meter") return "tool rescue scene";
  return "discovery scene";
}

export function A2UIMissionDeck({ lesson, clueLine }: A2UIMissionDeckProps) {
  useEffect(() => {
    if (a2uiBootstrapped) return;
    initializeDefaultCatalog();
    injectStyles();
    a2uiBootstrapped = true;
  }, []);

  const previewLine = clueLine.trim() || lesson.sceneSpec.instruction || lesson.sceneSpec.helperText;
  const fallbackDeck = (
    <section className="rounded-[1.8rem] border-2 border-white/85 bg-white/90 p-5 text-slate-900 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
        Google A2UI Mission Deck
      </p>
      <h2 className="mt-2 text-2xl font-black text-slate-900">{lesson.sceneSpec.title}</h2>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">{previewLine}</p>
      <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        Agentic surface type: {getSceneKindLabel(lesson.sceneSpec.kind)}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.4rem] border border-cyan-100 bg-cyan-50/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Clue</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            Look for this clue: {lesson.sceneSpec.helperText}
          </p>
        </div>
        <div className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
            Reward
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            Fact to unlock: {lesson.sceneSpec.rewardFact}
          </p>
        </div>
      </div>
    </section>
  );
  const components: ComponentInstance[] = [
    {
      id: "mission-deck-card",
      component: {
        Card: {
          child: "mission-deck-column",
        },
      },
    },
    {
      id: "mission-deck-column",
      component: {
        Column: {
          children: {
            explicitList: [
              "mission-deck-eyebrow",
              "mission-deck-title",
              "mission-deck-preview",
              "mission-deck-scene-tag",
              "mission-deck-helper-card",
              "mission-deck-reward-card",
            ],
          },
        },
      },
    },
    {
      id: "mission-deck-eyebrow",
      component: {
        Text: {
          text: { literalString: "Google A2UI Mission Deck" },
          usageHint: "caption",
        },
      },
    },
    {
      id: "mission-deck-title",
      component: {
        Text: {
          text: { literalString: lesson.sceneSpec.title },
          usageHint: "h2",
        },
      },
    },
    {
      id: "mission-deck-preview",
      component: {
        Text: {
          text: { literalString: previewLine },
          usageHint: "body",
        },
      },
    },
    {
      id: "mission-deck-scene-tag",
      component: {
        Text: {
          text: {
            literalString: `Agentic surface type: ${getSceneKindLabel(lesson.sceneSpec.kind)}`,
          },
          usageHint: "caption",
        },
      },
    },
    {
      id: "mission-deck-helper-card",
      component: {
        Card: {
          child: "mission-deck-helper-copy",
        },
      },
    },
    {
      id: "mission-deck-helper-copy",
      component: {
        Text: {
          text: { literalString: `Look for this clue: ${lesson.sceneSpec.helperText}` },
          usageHint: "body",
        },
      },
    },
    {
      id: "mission-deck-reward-card",
      component: {
        Card: {
          child: "mission-deck-reward-copy",
        },
      },
    },
    {
      id: "mission-deck-reward-copy",
      component: {
        Text: {
          text: { literalString: `Fact to unlock: ${lesson.sceneSpec.rewardFact}` },
          usageHint: "body",
        },
      },
    },
  ];

  return (
    <A2UIDeckErrorBoundary fallback={fallbackDeck}>
      <section className="overflow-hidden rounded-[1.8rem] border-2 border-white/85 bg-white/80 p-1 shadow-sm">
        <A2UIViewer
          root="mission-deck-card"
          components={components}
          className="a2ui-mission-deck"
        />
      </section>
    </A2UIDeckErrorBoundary>
  );
}
