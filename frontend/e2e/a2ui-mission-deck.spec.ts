import { test, expect } from "@playwright/test";
import {
  expectA2UIMissionDeckButtonCount,
  expectA2UIMissionDeckLive,
  expectA2UIMissionDeckSlider,
  generateLessonFromParent,
  installLessonGenerateStub,
  openStudentAndSkipToMission,
} from "./helpers";

/**
 * Focused checks that the mission deck mounts real @a2ui/react catalog widgets,
 * not only Text nodes (see components/a2ui/mission-deck-model.ts).
 */
test.beforeEach(async ({ context }) => {
  await installLessonGenerateStub(context);
});

test("choice_transform deck exposes four A2UI Button controls", async ({ page }) => {
  await generateLessonFromParent(page, {
    district: "SJUSD",
    subject: "ela",
    curriculumCode: "SJUSD-G2-ELA-U1",
  });
  await openStudentAndSkipToMission(page);
  await expectA2UIMissionDeckLive(page);
  await expectA2UIMissionDeckButtonCount(page, 4);
  await expect(page.getByText(/Mini-game: pick a body helper/i)).toBeVisible();
});

test("state_slider deck exposes A2UI range input", async ({ page }) => {
  await generateLessonFromParent(page, {
    district: "SJUSD",
    subject: "science",
    curriculumCode: "SCI-G2-MATTER",
    childInterests: "experiments",
  });
  await openStudentAndSkipToMission(page);
  await expectA2UIMissionDeckLive(page);
  await expectA2UIMissionDeckSlider(page);
});
