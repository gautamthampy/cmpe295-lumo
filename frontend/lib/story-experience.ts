import { z } from "zod";
import type { LessonSpec } from "./lesson-spec";

export const STORY_SCENE_SCHEMA = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(80),
  narration: z.string().min(1).max(240),
  imagePrompt: z.string().min(1).max(500),
});

export const STORY_PLAN_SCHEMA = z.object({
  title: z.string().min(1).max(100),
  introLine: z.string().min(1).max(180),
  closingLine: z.string().min(1).max(180),
  voiceStyle: z.string().min(1).max(180),
  scenes: z.array(STORY_SCENE_SCHEMA).min(2).max(3),
});

export const STORY_EXPERIENCE_RESPONSE_SCHEMA = z.object({
  story: STORY_PLAN_SCHEMA.extend({
    scenes: z.array(
      STORY_SCENE_SCHEMA.extend({
        imageDataUrl: z.string().nullable().optional(),
      })
    ),
  }),
  narration: z.object({
    transcript: z.string().min(1),
    audioDataUrl: z.string().nullable(),
    provider: z.enum(["gemini-tts", "browser-speech", "deferred"]),
    voiceName: z.string().nullable(),
  }),
  source: z.enum(["live", "seed"]),
  warnings: z.array(z.string()),
});

export const STORY_NARRATION_RESPONSE_SCHEMA = z.object({
  transcript: z.string().min(1),
  audioDataUrl: z.string().nullable(),
  provider: z.enum(["gemini-tts", "browser-speech"]),
  voiceName: z.string().nullable(),
  warnings: z.array(z.string()),
});

export type StoryScene = z.infer<typeof STORY_SCENE_SCHEMA>;
export type StoryPlan = z.infer<typeof STORY_PLAN_SCHEMA>;
export type StoryExperienceResponse = z.infer<typeof STORY_EXPERIENCE_RESPONSE_SCHEMA>;
export type StoryNarrationResponse = z.infer<typeof STORY_NARRATION_RESPONSE_SCHEMA>;

function buildHabitatsStory(lesson: LessonSpec): StoryPlan {
  return {
    title: `${lesson.childName}'s Habitat Rescue`,
    introLine: `${lesson.childName} is joining a bright habitat rescue mission. Three animals need help getting back to the home where they can live safely.`,
    closingLine:
      "Now that the clues are clear, it is time to drag each animal to the habitat where it belongs and earn shining stars.",
    voiceStyle:
      "Warm, playful, upbeat story guide for a second grader. Speak clearly, with wonder and gentle excitement.",
    scenes: [
      {
        id: "story-1",
        title: "The Lost Animal Map",
        narration:
          "A black bear, a sea otter, and a desert tortoise are waiting with a habitat map. Each one needs the right home to stay safe and strong.",
        imagePrompt:
          `Child-friendly illustrated storybook scene for a Grade 2 learner. Show a black bear, sea otter, and desert tortoise beside a glowing map with three habitat symbols. ${lesson.theme} theme inspiration. Bright soft colors, rounded shapes, cinematic 2D illustration, no text, no letters, no watermark.`,
      },
      {
        id: "story-2",
        title: "Clues From Nature",
        narration:
          "The bear looks for tall trees and cool shade. The sea otter looks for ocean water and long kelp. The tortoise looks for dry sand and warm sun.",
        imagePrompt:
          "Friendly educational storybook panel with three habitat clues side by side: redwood forest with towering trees, kelp forest underwater with waving kelp, Mojave desert with cactus and sunlight. Playful 2D children’s illustration, rich detail, no text, no labels, no watermark.",
      },
    ],
  };
}

function buildCountStory(lesson: LessonSpec): StoryPlan {
  return {
    title: `${lesson.childName}'s Counting Parade`,
    introLine: `${lesson.childName} is helping sort sparkling groups to see which set has more, less, or the same amount.`,
    closingLine:
      "The counting parade is lined up. Look closely, compare the groups, and choose the best answer.",
    voiceStyle:
      "Cheerful and encouraging, with crisp pacing and clear pauses between counting ideas for a young learner.",
    scenes: [
      {
        id: "story-1",
        title: "The Parade Begins",
        narration:
          "Two groups roll into the parade. One group has only a few bright objects, and another has more. Careful counting will reveal the answer.",
        imagePrompt:
          `A playful educational parade scene with two bright groups of objects ready to be counted by a Grade 2 learner. ${lesson.theme} inspired details, charming 2D children's game illustration, no text, no labels, no watermark.`,
      },
      {
        id: "story-2",
        title: "Look and Compare",
        narration:
          "The trick is to slow down, count each item, and then compare the groups one by one so nothing gets missed.",
        imagePrompt:
          "Children's storybook style counting scene with visual comparison between two groups of colorful objects, clear spacing, soft light, rounded shapes, polished 2D art, no text, no watermark.",
      },
    ],
  };
}

function buildPushPullStory(lesson: LessonSpec): StoryPlan {
  return {
    title: `${lesson.childName}'s Motion Lab`,
    introLine: `${lesson.childName} is visiting a playful motion lab where every object moves when someone pushes or pulls.`,
    closingLine:
      "The experiment station is ready. Predict what will happen next, then test your idea in the challenge.",
    voiceStyle:
      "Clear science host voice for children, energetic but calm, with a curious and encouraging tone.",
    scenes: [
      {
        id: "story-1",
        title: "The Motion Lab",
        narration:
          "In the lab, a wagon, a toy, and a rolling tool are ready. Some actions push things away, and some actions pull them closer.",
        imagePrompt:
          "Friendly elementary science lab scene with simple toys and motion tools that show pushing and pulling. Bright 2D illustrated educational game art, no text, no labels, no watermark.",
      },
      {
        id: "story-2",
        title: "Predict Then Test",
        narration:
          "A good scientist looks first, thinks carefully, and then tests the best idea to see what really happens.",
        imagePrompt:
          `Polished 2D children's educational illustration of a curious student making a motion prediction before testing a toy wagon. ${lesson.theme} inspired details, no text, no watermark.`,
      },
    ],
  };
}

export function buildSeedStoryPlan(lesson: LessonSpec): StoryPlan {
  if (lesson.mechanicId === "count_and_compare") {
    return buildCountStory(lesson);
  }
  if (lesson.mechanicId === "predict_and_test") {
    return buildPushPullStory(lesson);
  }
  return buildHabitatsStory(lesson);
}

export function buildNarrationTranscript(plan: StoryPlan): string {
  return [plan.introLine, ...plan.scenes.map((scene) => scene.narration), plan.closingLine]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
