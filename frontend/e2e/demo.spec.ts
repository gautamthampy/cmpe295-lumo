import { test, expect } from "@playwright/test";
import {
  expectA2UIMissionDeckButtonCount,
  expectA2UIMissionDeckLive,
  expectA2UIMissionDeckSlider,
  generateLessonFromParent,
  installLessonGenerateStub,
  openStudentAndSkipToMission,
} from "./helpers";

/** Serial: each case hits `/api/generate`; parallel runs can starve or rate-limit. */
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await installLessonGenerateStub(context);
});
test.describe("@smoke POC demo", () => {
  test("ELA U1: parent → student → A2UI deck → Creature Crafter choices", async ({ page }) => {
    await generateLessonFromParent(page, {
      district: "SJUSD",
      subject: "ela",
      curriculumCode: "SJUSD-G2-ELA-U1",
    });
    await openStudentAndSkipToMission(page);

    await expect(page.getByText(/SJUSD-G2-ELA-U1|Plants and Animals/i).first()).toBeVisible();
    await expectA2UIMissionDeckLive(page);
    await expect(page.getByRole("heading", { name: "Creature Crafter" })).toBeVisible();
    await expectA2UIMissionDeckButtonCount(page, 4);

    const game = page.getByTestId("lumo-creature-crafter-mission");
    await game.getByRole("button", { name: /Scales/i }).click();
    await game.getByRole("button", { name: /Thick Fur|Blubber/i }).first().click();

    await page.getByRole("button", { name: "Easy words" }).click();
    await expect(page.getByText(/We are learning|Lumo/i).first()).toBeVisible();
  });

  test("Math M2: A2UI deck + Magic Garden interaction", async ({ page }) => {
    await generateLessonFromParent(page, {
      district: "SJUSD",
      subject: "math",
      curriculumCode: "SJUSD-G2-MATH-M2",
      childInterests: "robots, stars",
    });

    await openStudentAndSkipToMission(page);
    await expectA2UIMissionDeckLive(page);
    await expect(page.getByRole("heading", { name: "Magic Garden" })).toBeVisible();
    await page.getByRole("button", { name: /Plant Seeds/i }).click();
    await expect(page.getByText(/rows of|makes \d+/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("Science matter: A2UI deck + Alchemist slider present", async ({ page }) => {
    await generateLessonFromParent(page, {
      district: "SJUSD",
      subject: "science",
      curriculumCode: "SCI-G2-MATTER",
      childInterests: "experiments, rivers",
    });

    await openStudentAndSkipToMission(page);
    await expectA2UIMissionDeckLive(page);
    await expect(page.getByRole("heading", { name: /Alchemist/i })).toBeVisible();
    await expectA2UIMissionDeckSlider(page);
    await expect(
      page.getByTestId("lumo-alchemist-mission").getByRole("slider", { name: /Temperature/i })
    ).toBeVisible();
  });
});
