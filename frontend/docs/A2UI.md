# A2UI in this app (Lumo frontend)

## There is no “A2UI API” here

This Next.js app **does not** expose routes like `/api/a2ui` or stream JSONL from an agent. The only API routes under `app/api/` are:

- `POST /api/generate` — lesson JSON (includes `sceneSpec`, blocks, etc.)
- `POST /api/learning-coach`, `story-experience`, `story-narration` — story / coach (not A2UI wire format)

**A2UI never comes over HTTP** in Lumo today. The student “mission deck” is built **in the browser**:

`LessonSpec` → `buildMissionDeckModel()` → `A2UIViewer` (`components/a2ui/mission-deck-model.ts`, `A2UIMissionDeck.tsx`).

That matches the static use case described in `@a2ui/react` (pass `components` + optional `data` props), not the full quickstart pipeline (Python agent streaming `surfaceUpdate` messages).

## Where it shows on `/student`

After **Story book complete**, `LessonRenderer` renders a grid:

| Left (wider) | Right |
|--------------|--------|
| `A2UIMissionDeck` | `AskLumoPanel` (Lumo sidekick, not A2UI) |

So the **left** white card is the mission deck.

## “Plain text” — two different cases

1. **Renderer crashed**  
   `A2UIDeckErrorBoundary` swaps in a **fallback** React card (still styled, but **no** `.a2ui-surface`).  
   Check the browser console for:  
   `[A2UIMissionDeck] @a2ui/react render failed; showing fallback card.`

2. **Renderer succeeded**  
   You will see a subtree with `.a2ui-mission-deck` and inside it `.a2ui-surface[data-surface-id]`.  
   Many nodes are catalog **`Text`** components, which intentionally look like normal headings/paragraphs.  
   **Interactive** catalog widgets are only emitted for some scene kinds right now:

   - `choice_transform` (e.g. Creature Crafter) → **Button** column  
   - `state_slider` (e.g. matter / Alchemist deck preview) → **Slider** + data `/mission/heat`  

   Other `sceneSpec.kind` values still use mostly **Text** plus the “Agentic surface type …” caption until extended in `mission-deck-model.ts`.

## Quick verification in DevTools

- Success: `document.querySelector('.a2ui-mission-deck .a2ui-surface[data-surface-id]')` is non-null.  
- Fallback: that query is null; fallback card is shown.

## Tests

- `npm run test:e2e:a2ui` — asserts live surface + Buttons (ELA) / Slider (science stub).  

See `e2e/README.md` for more.
