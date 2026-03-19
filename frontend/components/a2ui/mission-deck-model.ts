import type { ComponentInstance } from "@a2ui/react";
import type { LessonSpec } from "@/lib/lesson-spec";

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

/**
 * Builds A2UI v0.8-style component instances + initial data for {@link A2UIViewer}.
 * Emits real default-catalog components where the scene maps cleanly:
 * - `choice_transform` → **Button** column (mini-game; `onAction` is illustrative)
 * - `state_slider` → **Slider** + `/mission/heat` data
 *
 * @see https://a2ui.org/quickstart/
 */
export function buildMissionDeckModel(
  lesson: LessonSpec,
  previewLine: string
): { components: ComponentInstance[]; data: Record<string, unknown> } {
  const scene = lesson.sceneSpec;
  const specCaption = `Surface kind: ${getSceneKindLabel(scene.kind)} · A2UI default catalog`;

  const columnChildIds: string[] = [
    "mission-deck-eyebrow",
    "mission-deck-title",
    "mission-deck-preview",
  ];

  const extra: ComponentInstance[] = [];

  if (scene.kind === "choice_transform") {
    const choiceButtonIds = scene.choices.map((c) => `deck-choice-${c.id}`);
    columnChildIds.push(
      "mission-deck-divider-interactive",
      "mission-deck-transform-heading",
      "mission-deck-choice-stack",
      "mission-deck-spec-caption"
    );
    extra.push(
      {
        id: "mission-deck-divider-interactive",
        component: { Divider: { axis: "horizontal", thickness: 1 } },
      },
      {
        id: "mission-deck-transform-heading",
        component: {
          Text: {
            text: { literalString: "Mini-game: pick a body helper (A2UI Button catalog)" },
            usageHint: "h3",
          },
        },
      },
      {
        id: "mission-deck-choice-stack",
        component: {
          Column: {
            children: { explicitList: choiceButtonIds },
            distribution: "start",
            alignment: "stretch",
          },
        },
      },
      ...scene.choices.flatMap((c) => {
        const textId = `deck-choice-${c.id}-text`;
        return [
          {
            id: `deck-choice-${c.id}`,
            component: {
              Button: {
                child: textId,
                action: {
                  name: "mission_deck_transform_pick",
                  context: [
                    { key: "choiceId", value: { literalString: c.id } },
                    { key: "label", value: { literalString: c.label } },
                  ],
                },
              },
            },
          },
          {
            id: textId,
            component: {
              Text: {
                text: { literalString: `${c.emoji} ${c.label}` },
                usageHint: "body",
              },
            },
          },
        ];
      }),
      {
        id: "mission-deck-spec-caption",
        component: {
          Text: {
            text: {
              literalString: `${specCaption}. Each row is an A2UI Button (action: mission_deck_transform_pick).`,
            },
            usageHint: "caption",
          },
        },
      }
    );
  } else if (scene.kind === "state_slider") {
    columnChildIds.push(
      "mission-deck-divider-interactive",
      "mission-deck-slider-heading",
      "mission-deck-heat-slider",
      "mission-deck-stage-legend",
      "mission-deck-spec-caption"
    );
    extra.push(
      {
        id: "mission-deck-divider-interactive",
        component: { Divider: { axis: "horizontal", thickness: 1 } },
      },
      {
        id: "mission-deck-slider-heading",
        component: {
          Text: {
            text: { literalString: "Heat control (A2UI Slider component)" },
            usageHint: "h3",
          },
        },
      },
      {
        id: "mission-deck-heat-slider",
        component: {
          Slider: {
            value: { path: "/mission/heat" },
            minValue: scene.minValue,
            maxValue: scene.maxValue,
          },
        },
      },
      {
        id: "mission-deck-stage-legend",
        component: {
          Text: {
            text: {
              literalString: `Phases along the slider: ${scene.stages
                .map((s) => `${s.emoji} ${s.label} (≥${s.threshold})`)
                .join(" · ")}`,
            },
            usageHint: "body",
          },
        },
      },
      {
        id: "mission-deck-spec-caption",
        component: {
          Text: {
            text: {
              literalString: `${specCaption}. Slider value path: /mission/heat (${scene.minValue}–${scene.maxValue}).`,
            },
            usageHint: "caption",
          },
        },
      }
    );
  } else {
    columnChildIds.push("mission-deck-scene-tag");
    extra.push({
      id: "mission-deck-scene-tag",
      component: {
        Text: {
          text: {
            literalString: `Agentic surface type: ${getSceneKindLabel(scene.kind)}`,
          },
          usageHint: "caption",
        },
      },
    });
  }

  columnChildIds.push("mission-deck-helper-card", "mission-deck-reward-card");

  const components: ComponentInstance[] = [
    {
      id: "mission-deck-card",
      component: { Card: { child: "mission-deck-column" } },
    },
    {
      id: "mission-deck-column",
      component: {
        Column: {
          children: { explicitList: columnChildIds },
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
          text: { literalString: scene.title },
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
    ...extra,
    {
      id: "mission-deck-helper-card",
      component: { Card: { child: "mission-deck-helper-copy" } },
    },
    {
      id: "mission-deck-helper-copy",
      component: {
        Text: {
          text: { literalString: `Look for this clue: ${scene.helperText}` },
          usageHint: "body",
        },
      },
    },
    {
      id: "mission-deck-reward-card",
      component: { Card: { child: "mission-deck-reward-copy" } },
    },
    {
      id: "mission-deck-reward-copy",
      component: {
        Text: {
          text: { literalString: `Fact to unlock: ${scene.rewardFact}` },
          usageHint: "body",
        },
      },
    },
  ];

  const data: Record<string, unknown> =
    scene.kind === "state_slider"
      ? { mission: { heat: scene.initialValue } }
      : {};

  return { components, data };
}

export { getSceneKindLabel };
