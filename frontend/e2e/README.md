# Playwright E2E

## What is asserted for Google A2UI

The mission briefing uses `@a2ui/react` `A2UIViewer`, which mounts an inner **A2UIRenderer** surface. Tests require:

- `.a2ui-mission-deck .a2ui-surface[data-surface-id]`
- non-empty `data-version` on that surface

That distinguishes a **live A2UI render** from the local React fallback inside `A2UIMissionDeck`’s error boundary (fallback has no `.a2ui-surface`).

For **Creature Crafter** (`choice_transform`), the deck also builds a column of real **A2UI `Button`** components (`buildMissionDeckModel` in `components/a2ui/mission-deck-model.ts`). `npm run test:e2e:a2ui` asserts `.a2ui-button button` counts. For **matter / Alchemist** (`state_slider`), the deck includes an A2UI **`Slider`** (range input under `.a2ui-slider`).

## `/api/generate` stub vs live Gemini

- **Default**: tests stub `POST /api/generate` with a deterministic seed lesson (`e2e/helpers.ts`). Fast and offline-friendly.
- **Live**: set `LUMO_E2E_LIVE=1` (PowerShell: `$env:LUMO_E2E_LIVE='1'`) so the real Next route runs (needs working Gemini + `frontend/.env.local`). Slower.

## Local dev server

Next.js only allows **one** `next dev` per app directory. Playwright uses `reuseExistingServer: !process.env.CI`, so it reuses `http://127.0.0.1:3000` when you already have `npm run dev` running.

**Restart `next dev` after changing client components** used on `/parent` (e.g. `ParentPromptForm`). Tests wait for `data-e2e-parent-form-ready` on the form after hydration; a stale server can make flows flaky until you restart.

## Commands

```bash
# All tests (demo + full curriculum matrix)
npm run test:e2e

# Primary demo flows only
npm run test:e2e:demo

# Every parent dropdown unit (parallel)
npm run test:e2e:curriculum

# A2UI mission deck (Button / Slider catalog smoke)
npm run test:e2e:a2ui

# Tagged subset
npx playwright test --grep @smoke
npx playwright test --grep @curriculum

# Against an already-running dev server (no Playwright webServer spawn)
set PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
set CI=true
npx playwright test --project=chromium
```

First-time setup: `npx playwright install chromium`
