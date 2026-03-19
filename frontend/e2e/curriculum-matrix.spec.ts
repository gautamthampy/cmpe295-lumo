import { test, expect } from "@playwright/test";
import { GRADE2_CURRICULUM } from "../lib/kindergarten-curriculum";
import {
  expectA2UIMissionDeckLive,
  generateLessonFromParent,
  installLessonGenerateStub,
  openStudentAndSkipToMission,
} from "./helpers";

/**
 * Every district × subject × unit in the parent dropdown must:
 * - complete generation without blocking the student handoff
 * - render the mission briefing through live Google A2UI (not error-boundary fallback)
 */
test.describe.configure({ mode: "parallel" });

test.beforeEach(async ({ context }) => {
  await installLessonGenerateStub(context);
});

for (const entry of GRADE2_CURRICULUM) {
  test(`@curriculum ${entry.district} ${entry.subject} ${entry.code}`, async ({ page }) => {
    await generateLessonFromParent(page, {
      district: entry.district,
      subject: entry.subject,
      curriculumCode: entry.code,
    });
    await openStudentAndSkipToMission(page);

    await expect(page.getByRole("heading", { level: 1, name: /explore, discover/i })).toBeVisible();
    await expectA2UIMissionDeckLive(page);

    await expect(page.getByText("Circular dependency")).toHaveCount(0);
    await expect(page.getByText(/Application error|Unhandled Runtime Error/i)).toHaveCount(0);
  });
}
