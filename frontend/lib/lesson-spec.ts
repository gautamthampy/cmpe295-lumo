import { z } from "zod";
import type {
  ConceptFamily,
  DistrictId,
  MechanicFamily,
  SubjectId,
} from "./kindergarten-curriculum";
import { SCENE_SPEC_SCHEMA, type SceneSpec } from "./scene-spec";

export const BLOCK_IDS = [
  "intro_card",
  "micro_explainer",
  "quiz_block",
  "mechanic_block",
  "hint_card",
  "parent_summary",
] as const;

export type BlockId = (typeof BLOCK_IDS)[number];

export const BLOCK_ID_SCHEMA = z.enum(BLOCK_IDS);

export const DISTRICT_SCHEMA = z.enum(["SJUSD", "ESD"]);
export const SUBJECT_SCHEMA = z.enum(["ela", "math", "science", "social_studies"]);

export const CONCEPT_FAMILY_SCHEMA = z.enum([
  "habitats_and_survival",
  "characters_and_challenges",
  "government_and_community",
  "point_of_view",
  "technology_problem_solving",
  "stories_and_lessons",
  "past_and_present",
  "earth_systems_wind_water",
  "buyers_and_sellers",
  "states_of_matter",
  "friends_and_family",
  "animal_discoveries",
  "learning_from_experiences",
  "community_difference",
  "changes_over_time",
  "teamwork",
  "addition_subtraction_20",
  "even_odd_arrays_equal_groups",
  "addition_subtraction_100",
  "place_value_to_1000",
  "compare_to_1000",
  "addition_subtraction_1000",
  "money_and_data",
  "length_and_measurement",
  "time_shapes_fractions_equal_parts",
  "ecosystems_pollination_seed_dispersal",
]);

export const MECHANIC_ID_SCHEMA = z.enum([
  "count_and_compare",
  "sort_and_match",
  "predict_and_test",
]);

export const TEXT_STYLE_SCHEMA = z.enum(["visual_first", "balanced", "text_light"]);

export const PARENT_INPUT_SCHEMA = z.object({
  district: DISTRICT_SCHEMA,
  subject: SUBJECT_SCHEMA,
  curriculumCode: z.string().min(1),
  childName: z.string().min(1).max(40),
  childInterests: z.array(z.string().min(1).max(30)).min(1).max(5),
  textStyle: TEXT_STYLE_SCHEMA,
  notes: z.string().max(160).optional().default(""),
});

export const LESSON_BLOCK_SCHEMA = z.object({
  id: z.string().min(1),
  type: BLOCK_ID_SCHEMA,
  title: z.string().min(1).max(80),
  prompt: z.string().min(1).max(180),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const HINT_STEP_SCHEMA = z.object({
  level: z.number().int().min(1).max(4),
  strategy: z.enum(["visual_cue", "guided_question", "example_then_try"]),
  text: z.string().min(1).max(160),
});

export const MISCONCEPTION_PROBE_SCHEMA = z.object({
  signal: z.string().min(1).max(80),
  checkPrompt: z.string().min(1).max(120),
  expectedConfusion: z.string().min(1).max(120),
});

export const VALIDATION_METADATA_SCHEMA = z.object({
  schemaValid: z.boolean(),
  curriculumAligned: z.boolean(),
  mechanicAllowed: z.boolean(),
  assetRefsValid: z.boolean(),
  moderationPassed: z.boolean(),
  fallbackUsed: z.boolean(),
  warnings: z.array(z.string()).default([]),
});

export const LESSON_SPEC_SCHEMA = z.object({
  lessonId: z.string().min(1),
  gradeLevel: z.literal(2).default(2),
  district: DISTRICT_SCHEMA,
  subject: SUBJECT_SCHEMA,
  curriculumCode: z.string().min(1),
  unitOrModule: z.string().min(1).max(120),
  conceptFamily: CONCEPT_FAMILY_SCHEMA,
  theme: z.string().min(1).max(40),
  childName: z.string().min(1).max(40),
  mechanicId: MECHANIC_ID_SCHEMA,
  difficultyBand: z.enum(["support", "core", "stretch"]).default("core"),
  vocabularyLevel: z.enum(["low", "medium"]),
  maxWordsPerPrompt: z.number().int().min(8).max(32),
  misconceptionProbe: MISCONCEPTION_PROBE_SCHEMA,
  blocks: z.array(LESSON_BLOCK_SCHEMA).min(3).max(8),
  sceneSpec: SCENE_SPEC_SCHEMA,
  hintLadder: z.array(HINT_STEP_SCHEMA).min(2).max(4),
  parentSummary: z.string().min(1).max(240),
  validationStatus: VALIDATION_METADATA_SCHEMA,
});

export type ParentInput = z.infer<typeof PARENT_INPUT_SCHEMA>;
export type LessonSpec = z.infer<typeof LESSON_SPEC_SCHEMA>;
export type LessonBlock = z.infer<typeof LESSON_BLOCK_SCHEMA>;
export type HintStep = z.infer<typeof HINT_STEP_SCHEMA>;
export type ValidationMetadata = z.infer<typeof VALIDATION_METADATA_SCHEMA>;
export type TypedSceneSpec = SceneSpec;

export type LessonSpecDraft = Omit<LessonSpec, "validationStatus"> & {
  validationStatus?: Partial<ValidationMetadata>;
};

// Handy aliases used across app logic.
export type TypedDistrict = DistrictId;
export type TypedSubject = SubjectId;
export type TypedConceptFamily = ConceptFamily;
export type TypedMechanicId = MechanicFamily;
