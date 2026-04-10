# LUMO E2E Test Report

**Date:** 2026-03-05
**Branch:** `gautam/lesson-designer-v2`
**Total tests:** 179
**Passed:** 10
**Failed:** 169

---

## Summary

Most failures share two root causes:

1. **`waitForLoadState('networkidle')` timeout in `beforeEach` hooks** — The page objects call `waitForLoadState('networkidle')` during `goto()`, but the Next.js dev server + backend API interactions don't settle fast enough. This causes ~130 tests to time out before the test body even runs.

2. **`#lesson-content` selector timeout** — Lesson viewer tests wait for `#lesson-content` which depends on the `/lessons/{id}/render` API returning data. When the page is slow to hydrate or the API takes too long, all 43+ lesson-dependent tests fail.

---

## Passing Tests (10)

| File | Test |
|------|------|
| analytics.spec.ts | renders "Analytics Dashboard" heading |
| analytics.spec.ts | shows 3 summary stat cards |
| analytics.spec.ts | total active lessons count ≥ 5 |
| analytics.spec.ts | per-lesson metric list renders ≥ 5 items |
| analytics.spec.ts | each lesson card shows title and subject |
| home.spec.ts | lesson cards are clickable links to lesson viewer |
| route-protection.spec.ts | GET /learn without cookie → /student-login |
| route-protection.spec.ts | GET /diagnostic/* without cookie → /student-login |
| route-protection.spec.ts | /lessons is accessible without auth |
| route-protection.spec.ts | /lessons/analytics is accessible without auth |

---

## Failing Tests by File

### accessibility.spec.ts (17 failures)

All 17 tests fail with the **same root cause**: `waitForSelector('#lesson-content')` timeout in `beforeEach`. The lesson viewer page doesn't render `#lesson-content` within 15s.

**Tests affected:**
- page has a `<main>` landmark with accessible label
- progress bar has correct ARIA attributes
- accessibility settings button has aria-label
- accessibility button toggles aria-expanded on click
- a11y menu dialog has role="dialog" and aria-label
- font size buttons have aria-pressed
- clicking A+ font size button updates aria-pressed
- high contrast checkbox is a proper checkbox with label
- enabling high contrast changes page background to black
- Escape key closes accessibility menu
- section navigation buttons have descriptive aria-labels
- ARIA live region exists for section transitions
- skip-to-content link is in the DOM
- ArrowRight key navigates to next section
- ArrowLeft key does nothing on first section
- section sidebar buttons have aria-current="step"
- interactive elements have visible focus indicators

**Root cause:** `#lesson-content` not rendering in time. Likely the render API call is slow or the component hydration stalls.

---

### activities-basic.spec.ts (7 failures)

All fail with `#lesson-content` timeout — same root cause as accessibility tests.

- at least one interactive activity renders
- MultipleChoice: selecting an option enables "Check Answer"
- MultipleChoice: submitting shows correct/incorrect feedback
- TrueOrFalse: True and False buttons are visible
- TrueOrFalse: selecting True or False shows feedback
- FillInBlank: input field is present and editable
- activity instruction text is visible

---

### activities-drag.spec.ts (8 failures)

All fail with `#lesson-content` timeout.

- DragToSort renders item list
- DragToSort shows "Check Order" button
- DragToSort: clicking an item selects it
- DragToSort: "Check Order" button evaluates the order
- MatchPairs renders left and right columns
- MatchPairs shows a "Check Matches" button
- CategorySort renders category columns
- CategorySort renders sortable items

---

### activities-special.spec.ts (11 failures)

All fail with `#lesson-content` timeout or general 30s test timeout.

- NumberLine renders with tick mark buttons
- NumberLine: clicking a tick shows "Selected: X"
- NumberLine: "Place Marker" button appears after selection
- NumberLine: submitting shows feedback
- NumberLine tick buttons have aria-label attributes
- NumberLine: after submit, buttons are disabled
- CountingGrid renders a grid of cells
- CountingGrid: tapping cells updates count display
- WordBank renders word bank options
- HighlightText renders tokenized passage words
- HighlightText: clicking a word toggles highlight

---

### analytics.spec.ts (3 failures)

3 of 8 tests fail. The 5 passing tests work because they don't hit `networkidle` issues.

**Failing:**
- score badges show percentage values — `networkidle` timeout in beforeEach
- score badge colours: green/amber/red — `networkidle` timeout in beforeEach
- shows error alert when backend is down — `networkidle` timeout in beforeEach

**Root cause:** `waitForLoadState('networkidle')` hangs due to persistent WebSocket or polling connections from Next.js dev server.

---

### auth.spec.ts (28 failures)

All 28 tests fail with `networkidle` timeout in `beforeEach` hooks.

**Parent Login (9 tests):**
- renders LUMO logo and heading
- shows email and password inputs
- shows demo credentials hint
- has link to /register
- has link to /student-login
- successful login redirects to dashboard
- failed login shows error alert
- submit button shows loading state
- network error shows generic error message

**Registration Wizard (10 tests):**
- renders logo and step 1 heading
- step indicator shows 3 steps
- step 1 has name, email, password fields
- has link back to /login
- step 1 — successful submission advances to step 2
- step 1 — failed registration shows error alert
- step 2 — requires consent checkbox
- step 2 — avatar picker has 8 options
- step 3 — shows subject checkboxes
- step 3 — "Skip for now" → dashboard

**Student PIN Login (9 tests):**
- renders logo and heading
- shows student avatar buttons
- selecting student shows PIN pad
- back button returns to avatar grid
- backspace removes last digit
- correct PIN auto-submits → /learn
- wrong PIN shows error
- "no student profiles yet" when list empty
- loading state while fetching students

**Root cause:** `waitForLoadState('networkidle')` timeout on auth pages.

---

### editor.spec.ts (22 failures)

All 22 tests fail with `networkidle` timeout in `beforeEach`.

**Existing Editor tests (13):**
- renders heading, topic input, grade selector
- generate button disabled/enabled states
- generating populates MDX, A11y score appears
- template buttons insert content
- save draft/publish disabled states
- saving draft shows success
- error banner with role="alert"
- live preview renders HTML

**New Strategy Selector tests (9):**
- strategy selector visible with label
- defaults to "hybrid"
- has all 4 options
- changing to zpd/misconception/bkt
- strategy sent in API request
- A11y score shows strategy label
- subject selector visible

**Root cause:** `waitForLoadState('networkidle')` timeout.

---

### error-states.spec.ts (8 failures)

All 8 tests fail — test timeout exceeded (30s).

- lessons page error alert when backend unreachable
- lessons page error alert mentions docker-compose
- lesson viewer error when render endpoint fails
- lesson viewer "Back to Lessons" link on error
- analytics error alert when summary fails
- editor error when AI generation fails
- home page handles backend down gracefully
- empty state with seed command hint

**Root cause:** Route interception + `networkidle` conflicts cause overall test timeout.

---

### home.spec.ts (6 failures)

1 of 7 passes (lesson cards clickable). The other 6 fail.

- renders welcome heading — `networkidle` timeout
- shows Continue Learning section — `networkidle` timeout
- "View All" → /lessons — `networkidle` timeout
- "Start Learning" → /lessons — test timeout
- "Create a Lesson" → /lessons/editor — test timeout
- shows stat cards — `toBeVisible()` assertion failed

---

### learn.spec.ts (12 failures)

All 12 tests fail with `networkidle` timeout in `beforeEach`.

- renders personalised greeting, tagline
- shows subjects section, lesson links
- lesson links navigate, headings
- no lessons empty state
- sign out button, redirects
- unauthenticated redirect
- parent token redirect
- subject button navigation

---

### lesson-quiz.spec.ts (7 failures)

All fail with `networkidle` timeout in `beforeEach`.

---

### lesson-viewer.spec.ts (12 failures)

All fail with `networkidle` timeout in `beforeEach`.

---

### lessons-browse.spec.ts (8 failures)

- "Lesson Library" heading — `toBeVisible()` assertion failed
- 5 seeded lessons — `waitForSelector` timeout
- lesson card details — `waitForSelector` timeout
- clicking card → lesson viewer — test timeout
- Learning Path toggle — `waitForSelector` timeout
- Grid view toggle — `waitForSelector` timeout
- error alert when backend down — test timeout
- empty state — test timeout

---

### route-protection.spec.ts (9 failures)

2 of 11 pass (middleware cookie-based redirects). 9 fail.

- /login accessible — `toBeVisible()` failed (heading not found)
- /register accessible — `toBeVisible()` failed
- /student-login accessible — `toBeVisible()` failed
- Client-side /learn guards (3) — test timeout
- Client-side /students guards (2) — test timeout
- /lessons/editor accessible — `toBeVisible()` heading not found

---

### students.spec.ts (11 failures)

All 11 tests fail with test timeout or `networkidle` timeout.

---

## Root Cause Analysis

### Primary issue: `waitForLoadState('networkidle')` hangs

The Next.js 15 dev server maintains persistent connections (HMR WebSocket, RSC streaming) that prevent `networkidle` from ever resolving in many cases. This is a known Playwright + Next.js issue.

**Recommended fix:** Replace `waitForLoadState('networkidle')` in all page object `goto()` methods with:
```ts
await this.page.waitForLoadState('domcontentloaded');
// Then wait for a specific visible element instead
await this.page.waitForSelector('h1', { timeout: 10000 });
```

### Secondary issue: `#lesson-content` render timeout

The lesson viewer's `#lesson-content` div only renders after the `/lessons/{id}/render` API responds. When the backend is slow or the component hydration takes time, the 15s timeout is exceeded.

**Recommended fix:** Increase timeout to 30s or mock the render API in tests.

### Minor issue: Auth page headings not found

Some route-protection tests look for headings like "Parent Sign In" but the actual rendered heading may differ due to the `(auth)` route group layout loading sequence.

**Recommended fix:** Use more resilient selectors or wait for specific text content.
