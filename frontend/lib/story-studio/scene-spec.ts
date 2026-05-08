import { z } from "zod";

export const PALETTE_KEY_SCHEMA = z.enum([
  "frost",
  "sunset",
  "garden",
  "cosmos",
  "river",
  "lab",
  "town",
]);

const SCENE_BASE_SCHEMA = z.object({
  title: z.string().min(1).max(80),
  instruction: z.string().min(1).max(160),
  helperText: z.string().min(1).max(160),
  rewardFact: z.string().min(1).max(220),
  paletteKey: PALETTE_KEY_SCHEMA,
});

export const CHOICE_TRANSFORM_SCENE_SCHEMA = SCENE_BASE_SCHEMA.extend({
  kind: z.literal("choice_transform"),
  surfaceLabel: z.string().min(1).max(40),
  idleEmoji: z.string().min(1).max(8),
  successEmoji: z.string().min(1).max(8),
  successMessage: z.string().min(1).max(120),
  failureMessage: z.string().min(1).max(120),
  choices: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1).max(40),
        emoji: z.string().min(1).max(8),
        isCorrect: z.boolean(),
      })
    )
    .min(3)
    .max(5),
});

export const TRANSFORM_GRID_SCENE_SCHEMA = SCENE_BASE_SCHEMA.extend({
  kind: z.literal("transform_grid"),
  cards: z
    .array(
      z.object({
        id: z.string().min(1),
        beforeLabel: z.string().min(1).max(40),
        beforeEmoji: z.string().min(1).max(8),
        afterLabel: z.string().min(1).max(40),
        afterEmoji: z.string().min(1).max(8),
        fact: z.string().min(1).max(180),
      })
    )
    .min(2)
    .max(4),
});

export const DISPATCH_BOARD_SCENE_SCHEMA = SCENE_BASE_SCHEMA.extend({
  kind: z.literal("dispatch_board"),
  startMessage: z.string().min(1).max(140),
  mismatchMessage: z.string().min(1).max(140),
  services: z.array(z.string().min(1).max(40)).min(2).max(4),
  problems: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1).max(50),
        emoji: z.string().min(1).max(8),
        service: z.string().min(1).max(40),
        fact: z.string().min(1).max(180),
      })
    )
    .min(2)
    .max(4),
});

export const NUMBER_BUILDER_SCENE_SCHEMA = SCENE_BASE_SCHEMA.extend({
  kind: z.literal("number_builder"),
  actionLabel: z.string().min(1).max(40),
  hundreds: z.number().int().min(0).max(9),
  tens: z.number().int().min(0).max(9),
  ones: z.number().int().min(0).max(9),
  idleEmoji: z.string().min(1).max(8),
  successEmoji: z.string().min(1).max(8),
  responseLine: z.string().min(1).max(180),
});

export const ARRAY_GARDEN_SCENE_SCHEMA = SCENE_BASE_SCHEMA.extend({
  kind: z.literal("array_garden"),
  actionLabel: z.string().min(1).max(40),
  rows: z.number().int().min(1).max(5),
  columns: z.number().int().min(1).max(6),
  bloomEmoji: z.string().min(1).max(8),
});

export const STATE_SLIDER_SCENE_SCHEMA = SCENE_BASE_SCHEMA.extend({
  kind: z.literal("state_slider"),
  minValue: z.number().int().min(0).max(100),
  maxValue: z.number().int().min(1).max(120),
  initialValue: z.number().int().min(0).max(100),
  stages: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1).max(24),
        emoji: z.string().min(1).max(8),
        threshold: z.number().int().min(0).max(120),
        fact: z.string().min(1).max(180),
      })
    )
    .length(3),
});

export const TOOL_METER_SCENE_SCHEMA = SCENE_BASE_SCHEMA.extend({
  kind: z.literal("tool_meter"),
  startMessage: z.string().min(1).max(140),
  successMessage: z.string().min(1).max(160),
  tools: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1).max(40),
        emoji: z.string().min(1).max(8),
        reduction: z.number().int().min(5).max(60),
      })
    )
    .min(2)
    .max(4),
  floorValue: z.number().int().min(0).max(30).default(5),
});

export const FALLBACK_TAP_SCENE_SCHEMA = SCENE_BASE_SCHEMA.extend({
  kind: z.literal("fallback_tap"),
  buttonLabel: z.string().min(1).max(40),
});

export const SCENE_SPEC_SCHEMA = z.discriminatedUnion("kind", [
  CHOICE_TRANSFORM_SCENE_SCHEMA,
  TRANSFORM_GRID_SCENE_SCHEMA,
  DISPATCH_BOARD_SCENE_SCHEMA,
  NUMBER_BUILDER_SCENE_SCHEMA,
  ARRAY_GARDEN_SCENE_SCHEMA,
  STATE_SLIDER_SCENE_SCHEMA,
  TOOL_METER_SCENE_SCHEMA,
  FALLBACK_TAP_SCENE_SCHEMA,
]);

export type SceneSpec = z.infer<typeof SCENE_SPEC_SCHEMA>;

export interface SceneSpecContext {
  childName: string;
  subject: string;
  conceptFamily: string;
  theme: string;
}

export function buildSeedSceneSpec(context: SceneSpecContext): SceneSpec {
  if (
    context.conceptFamily === "habitats_and_survival" ||
    context.conceptFamily === "animal_discoveries"
  ) {
    return {
      kind: "choice_transform",
      title: "Creature Crafter",
      instruction: "Pick every body helper that keeps the creature warm in its snowy home.",
      helperText: "More than one answer can be right — look for helpers that trap heat.",
      rewardFact:
        "Thick fur and blubber trap heat, like wearing a winter coat in cold weather.",
      paletteKey: "frost",
      surfaceLabel: "Snowy Home",
      idleEmoji: "🐾",
      successEmoji: "🐻‍❄️",
      successMessage: `${context.childName}'s creature feels cozy and ready to move.`,
      failureMessage: "That one does not keep the creature warm here. Try another helper.",
      choices: [
        { id: "scales", label: "Scales", emoji: "🦎", isCorrect: false },
        { id: "thick_fur", label: "Thick Fur", emoji: "🧥", isCorrect: true },
        { id: "blubber", label: "Blubber Layer", emoji: "🫧", isCorrect: true },
        { id: "thin_skin", label: "Thin Skin", emoji: "🍃", isCorrect: false },
      ],
    };
  }

  if (
    context.conceptFamily === "past_and_present" ||
    context.conceptFamily === "changes_over_time"
  ) {
    return {
      kind: "transform_grid",
      title: "Magic Attic",
      instruction: "Tap an old object and watch it change into a newer tool.",
      helperText: "Think about what the old tool was used for, then look for the modern version.",
      rewardFact: "People make new tools to save time and solve old problems in easier ways.",
      paletteKey: "sunset",
      cards: [
        {
          id: "washboard",
          beforeLabel: "Washboard",
          beforeEmoji: "🪵",
          afterLabel: "Washing Machine",
          afterEmoji: "🧺",
          fact: "Before electricity, washing clothes by hand took a long time.",
        },
        {
          id: "candle",
          beforeLabel: "Candle",
          beforeEmoji: "🕯️",
          afterLabel: "Streetlight",
          afterEmoji: "💡",
          fact: "Electric lights help streets and homes stay brighter at night.",
        },
        {
          id: "carriage",
          beforeLabel: "Horse Carriage",
          beforeEmoji: "🛻",
          afterLabel: "School Bus",
          afterEmoji: "🚌",
          fact: "Modern travel helps more people move safely and quickly.",
        },
      ],
    };
  }

  if (
    context.conceptFamily === "government_and_community" ||
    context.conceptFamily === "community_difference" ||
    context.conceptFamily === "buyers_and_sellers"
  ) {
    return {
      kind: "dispatch_board",
      title: "Town Fixer",
      instruction: "Pick a town problem, then send the best helper team.",
      helperText: "Match the problem to the team that knows how to fix it.",
      rewardFact: "Different helpers in a town do different jobs to keep people safe.",
      paletteKey: "town",
      startMessage: "Choose a town problem first, then send the right team.",
      mismatchMessage: "That team is not the best match. Try another helper team.",
      services: ["Public Works", "City Electric Crew", "Fire Department"],
      problems: [
        {
          id: "pothole",
          label: "Road pothole",
          emoji: "🕳️",
          service: "Public Works",
          fact: "Road crews fix streets so travel stays safer.",
        },
        {
          id: "streetlight",
          label: "Dark street corner",
          emoji: "🌃",
          service: "City Electric Crew",
          fact: "Light crews keep public lights working at night.",
        },
        {
          id: "tree_rescue",
          label: "Cat in a tree",
          emoji: "🌳",
          service: "Fire Department",
          fact: "Emergency helpers jump in when a rescue is needed.",
        },
      ],
    };
  }

  if (
    context.conceptFamily === "place_value_to_1000" ||
    context.conceptFamily === "compare_to_1000"
  ) {
    return {
      kind: "number_builder",
      title: "Monster Factory",
      instruction: "Slide the giant, medium, and tiny parts to build a number monster.",
      helperText: "Big pieces come first: hundreds, then tens, then ones.",
      rewardFact: "Place value shows how much each digit is worth.",
      paletteKey: "cosmos",
      actionLabel: "Bring Monster to Life",
      hundreds: 3,
      tens: 4,
      ones: 2,
      idleEmoji: "🧩",
      successEmoji: "👾",
      responseLine: "I am built from giant hundreds, stretchy tens, and tiny ones.",
    };
  }

  if (
    context.conceptFamily === "even_odd_arrays_equal_groups" ||
    context.conceptFamily === "addition_subtraction_20"
  ) {
    return {
      kind: "array_garden",
      title: "Magic Garden",
      instruction: "Choose rows and columns, then plant the seeds to make a glowing array.",
      helperText: "Count the rows first. Then count how many are in each row.",
      rewardFact: "Rows and columns help your eyes see totals faster.",
      paletteKey: "garden",
      actionLabel: "Plant Seeds",
      rows: 3,
      columns: 4,
      bloomEmoji: "🌼",
    };
  }

  if (context.conceptFamily === "states_of_matter") {
    return {
      kind: "state_slider",
      title: "Alchemist's Pot",
      instruction: "Move the heat slider and watch ice, water, and steam appear.",
      helperText: "Watch what happens when the heat gets higher and higher.",
      rewardFact: "Heat changes how fast tiny pieces move inside matter.",
      paletteKey: "lab",
      minValue: 0,
      maxValue: 100,
      initialValue: 10,
      stages: [
        { id: "solid", label: "solid", emoji: "🧊", threshold: 0, fact: "A solid keeps its shape." },
        { id: "liquid", label: "liquid", emoji: "💧", threshold: 33, fact: "A liquid can flow and pour." },
        { id: "gas", label: "gas", emoji: "☁️", threshold: 70, fact: "A gas spreads into the air." },
      ],
    };
  }

  if (
    context.conceptFamily === "earth_systems_wind_water" ||
    context.conceptFamily === "ecosystems_pollination_seed_dispersal"
  ) {
    return {
      kind: "tool_meter",
      title: "River Rescue",
      instruction: "Place roots, rocks, and logs to make the riverbank stronger.",
      helperText: "Choose the tools that help hold the dirt in place.",
      rewardFact: "Roots and heavy barriers help stop soil from washing away.",
      paletteKey: "river",
      startMessage: "Build up the riverbank before the rushing water carries the soil away.",
      successMessage: "The bank is strong now. Water can splash past without washing the soil away.",
      tools: [
        { id: "roots", label: "Tree Roots", emoji: "🌱", reduction: 35 },
        { id: "rocks", label: "Heavy Rocks", emoji: "🪨", reduction: 30 },
        { id: "logs", label: "River Logs", emoji: "🪵", reduction: 20 },
      ],
      floorValue: 5,
    };
  }

  return {
    kind: "fallback_tap",
    title: "Curiosity Button",
    instruction: "Tap to unlock the big idea.",
    helperText: "Watch for the clue that appears after you tap.",
    rewardFact: `${context.theme} can make this idea easier to remember.`,
    paletteKey: "sunset",
    buttonLabel: "Unlock Fact",
  };
}