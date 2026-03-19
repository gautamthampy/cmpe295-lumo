# Grade 2 Dynamic Lesson POC

Parent-student prototype that generates a curriculum-aligned Grade 2 lesson plan, validates it, and renders trusted interactive blocks with adaptive scaffolding.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Zod validation
- Gemini API (Google AI Studio key) for live planning
- Seeded fallback lessons for reliability

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
Root redirects to `/parent`. The student interface is at `/student`.

## Gemini configuration

Create `frontend/.env.local`:

```bash
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3-flash-preview
```

Notes:
- If `GEMINI_API_KEY` is missing or the live call fails validation, the app automatically uses seeded fallback lessons.
- The API route is `app/api/generate/route.ts` and calls Gemini `generateContent`.

## Demo scenarios

See `DEMO_SCENARIOS.md` for the primary and backup walkthrough scripts.
