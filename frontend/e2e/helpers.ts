import { expect, type BrowserContext, type Page } from "@playwright/test";
import { buildSeedLesson } from "../lib/seed-lessons";
import type { ParentInput } from "../lib/lesson-spec";

/** Stub unless `LUMO_E2E_LIVE=1` (hits real Gemini `/api/generate`; slow, needs `.env.local`). */
export function shouldStubGenerateApi() {
  return process.env.LUMO_E2E_LIVE !== "1";
}

/**
 * Prefer `context.route` so every tab/page in the test hits the stub (more reliable than `page.route`).
 */
export async function installLessonGenerateStub(context: BrowserContext) {
  if (!shouldStubGenerateApi()) return;
  await context.route(/\/api\/generate\b/, async (route) => {
    const req = route.request();
    if (req.method() !== "POST") {
      await route.continue();
      return;
    }
    try {
      const raw = req.postData() ?? "{}";
      const input = JSON.parse(raw) as ParentInput;
      const lesson = buildSeedLesson(input);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          lesson,
          source: "seed" as const,
          warnings: ["E2E: stubbed /api/generate (set LUMO_E2E_LIVE=1 for live Gemini)."],
          errors: [] as string[],
        }),
      });
    } catch {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "e2e stub failed to build seed lesson" }),
      });
    }
  });
}

/**
 * Asserts the mission deck is rendered by Google A2UI (A2UIViewer → A2UIRenderer),
 * not only the React error-boundary fallback (which has no `.a2ui-surface`).
 */
export async function expectA2UIMissionDeckLive(page: Page) {
  const deck = page.locator(".a2ui-mission-deck");
  await expect(deck).toBeVisible();
  const surface = deck.locator(".a2ui-surface[data-surface-id]");
  await expect(surface).toBeVisible();
  await expect(surface).toHaveAttribute("data-surface-id", /./);
  await expect(surface).toHaveAttribute("data-version", /./);
}

/** A2UI default catalog `Button` nodes render `.a2ui-button > button`. */
export async function expectA2UIMissionDeckButtonCount(page: Page, count: number) {
  await expect(page.locator(".a2ui-mission-deck .a2ui-button button")).toHaveCount(count);
}

export async function expectA2UIMissionDeckSlider(page: Page) {
  await expect(page.locator('.a2ui-mission-deck .a2ui-slider input[type="range"]')).toBeVisible();
}

export async function generateLessonFromParent(
  page: Page,
  params: { district: string; subject: string; curriculumCode: string; childInterests?: string }
) {
  await page.goto("/parent", { waitUntil: "load" });
  // Client bundle + Turbopack first compile can be slow; marker is set in `useLayoutEffect` on the parent form.
  await page
    .locator('[data-e2e-parent-form-ready="true"]')
    .waitFor({ state: "attached", timeout: 90_000 })
    .catch(async () => {
      // Stale dev bundle without the marker: allow extra time for first Turbopack compile + hydration.
      await page.waitForTimeout(15_000);
    });
  await page.getByRole("combobox", { name: /District/i }).selectOption(params.district);
  await page.getByRole("combobox", { name: /Subject/i }).selectOption(params.subject);

  const unitSelect = page.getByRole("combobox", { name: /Unit or Module/i });
  await expect(unitSelect.locator(`option[value="${params.curriculumCode}"]`)).toBeAttached({
    timeout: 30_000,
  });
  await unitSelect.selectOption(params.curriculumCode);

  if (params.childInterests !== undefined) {
    await page.getByRole("textbox", { name: /Child Interests/i }).fill(params.childInterests);
  }
  await page.getByRole("button", { name: /Generate Story \+ Mission/i }).click();
  // Stubbed `/api/generate` can resolve in one frame — "Mission Setup" may never paint.
  await page
    .getByText(/Mission Setup|Story \+ mission prepared|Generating story \+ lesson/i)
    .first()
    .waitFor({ state: "visible", timeout: 30_000 });
  const preparedTimeout = shouldStubGenerateApi() ? 60_000 : 170_000;
  await page.getByText("Story + mission prepared").waitFor({ state: "visible", timeout: preparedTimeout });
  await expect(page.getByRole("link", { name: /Open Student Interface/i })).toBeVisible();
}

export async function openStudentAndSkipToMission(page: Page) {
  await page.goto("/student");
  await page.getByRole("button", { name: /Skip to Game/i }).waitFor({ state: "visible", timeout: 60_000 });
  await page.getByRole("button", { name: /Skip to Game/i }).click();
  await page.getByRole("heading", { name: /Mission unlocked/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
}
