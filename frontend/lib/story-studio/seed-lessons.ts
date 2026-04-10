import {
  KINDERGARTEN_CURRICULUM,
  getCurriculumEntry,
  type ConceptFamily,
  type CurriculumEntry,
} from "./kindergarten-curriculum";
import {
  LESSON_SPEC_SCHEMA,
  type LessonBlock,
  type LessonSpec,
  type ParentInput,
  type TypedMechanicId,
} from "./lesson-spec";
import { getAllowedMechanicsForConcept } from "./mechanic-catalog";
import { buildSeedSceneSpec } from "./scene-spec";

function conceptSummary(conceptFamily: ConceptFamily) {
  switch (conceptFamily) {
    case "habitats_and_survival":
    case "animal_discoveries":
      return "Animals need the right body helpers and habitat clues to stay safe.";
    case "past_and_present":
    case "changes_over_time":
      return "Tools and communities change over time to solve new problems.";
    case "government_and_community":
    case "community_difference":
    case "buyers_and_sellers":
      return "People in a community help in different ways to solve shared problems.";
    case "place_value_to_1000":
    case "compare_to_1000":
      return "Big numbers are made from hundreds, tens, and ones.";
    case "even_odd_arrays_equal_groups":
    case "addition_subtraction_20":
      return "Rows, groups, and counting strategies help us spot totals quickly.";
    case "states_of_matter":
      return "Heat can change matter from solid to liquid to gas.";
    case "earth_systems_wind_water":
    case "ecosystems_pollination_seed_dispersal":
      return "Water, wind, plants, and animals shape the world around us.";
    default:
      return "Today we are learning one big idea through play, clues, and quick checks.";
  }
}

function buildMechanicPrompt(mechanicId: TypedMechanicId, theme: string, title: string) {
  if (mechanicId === "count_and_compare") {
    return `Count the ${theme} clues and compare them to solve the ${title.toLowerCase()} challenge.`;
  }
  if (mechanicId === "predict_and_test") {
    return `Make a prediction, test it, and watch what changes in this ${theme} challenge.`;
  }
  return `Sort the ${theme} clues into the right groups to explore ${title.toLowerCase()}.`;
}

function buildBlocks(
  entry: CurriculumEntry,
  mechanicId: TypedMechanicId,
  childName: string,
  theme: string
): LessonBlock[] {
  const summary = conceptSummary(entry.conceptFamily);
  const mechanicPrompt = buildMechanicPrompt(mechanicId, theme, entry.title);

  return [
    {
      id: "intro-1",
      type: "intro_card",
      title: "Welcome Mission",
      prompt: `${childName}, your ${theme} adventure is ready.`,
      payload: {},
    },
    {
      id: "explainer-1",
      type: "micro_explainer",
      title: "Big Idea",
      prompt: summary,
      payload: {},
    },
    {
      id: "quiz-1",
      type: "quiz_block",
      title: "Quick Check",
      prompt: `Which clue best matches ${entry.title.toLowerCase()}?`,
      payload: {
        choices: [
          `The clue that fits ${entry.title.toLowerCase()}`,
          "A clue from recess",
          "A clue with no connection",
        ],
        answer: `The clue that fits ${entry.title.toLowerCase()}`,
      },
    },
    {
      id: "mechanic-1",
      type: "mechanic_block",
      title: "Play It",
      prompt: mechanicPrompt,
      payload: { mechanicId },
    },
    {
      id: "parent-summary-1",
      type: "parent_summary",
      title: "Parent Snapshot",
      prompt: "The lesson is ready with a story introduction, a quick check, and a hands-on mission.",
      payload: {},
    },
  ];
}

function chooseTheme(parentInput: ParentInput): string {
  const [firstInterest] = parentInput.childInterests;
  return firstInterest?.toLowerCase() || "learning";
}

function selectEntry(parentInput: ParentInput): CurriculumEntry {
  return (
    getCurriculumEntry(parentInput.curriculumCode) ??
    KINDERGARTEN_CURRICULUM.find(
      (entry) =>
        entry.district === parentInput.district &&
        entry.subject === parentInput.subject &&
        entry.code === parentInput.curriculumCode
    ) ??
    KINDERGARTEN_CURRICULUM.find(
      (entry) =>
        entry.district === parentInput.district && entry.subject === parentInput.subject
    ) ??
    KINDERGARTEN_CURRICULUM[0]
  );
}

export function buildSeedLesson(parentInput: ParentInput): LessonSpec {
  const entry = selectEntry(parentInput);
  const theme = chooseTheme(parentInput);
  const allowedMechanics = getAllowedMechanicsForConcept(entry.conceptFamily);
  const mechanicId = (
    entry.allowedMechanics.find((mechanic) => allowedMechanics.includes(mechanic)) ??
    allowedMechanics[0] ??
    "sort_and_match"
  ) as TypedMechanicId;

  return LESSON_SPEC_SCHEMA.parse({
    lessonId: `seed-${entry.code}-${Date.now()}`,
    gradeLevel: 2,
    district: entry.district,
    subject: entry.subject,
    curriculumCode: entry.code,
    unitOrModule: entry.title,
    conceptFamily: entry.conceptFamily,
    theme,
    childName: parentInput.childName,
    mechanicId,
    difficultyBand: "core",
    vocabularyLevel: entry.vocabularyLevel,
    maxWordsPerPrompt: entry.maxWordsPerPrompt,
    misconceptionProbe: {
      signal: "confusion_on_core_concept",
      checkPrompt: "Explain your choice using one short reason.",
      expectedConfusion: "category mix-up or strategy mismatch",
    },
    blocks: buildBlocks(entry, mechanicId, parentInput.childName, theme),
    sceneSpec: buildSeedSceneSpec({
      childName: parentInput.childName,
      subject: entry.subject,
      conceptFamily: entry.conceptFamily,
      theme,
    }),
    hintLadder: [
      { level: 1, strategy: "visual_cue", text: "Use the visual clues first." },
      {
        level: 2,
        strategy: "guided_question",
        text: "Which key detail should you compare first?",
      },
      {
        level: 3,
        strategy: "example_then_try",
        text: "Watch one example, then try the next move yourself.",
      },
    ],
    parentSummary:
      "The student starts with a story-led warm-up. If struggle signals rise, Lumo increases scaffolding and hint clarity.",
    validationStatus: {
      schemaValid: true,
      curriculumAligned: true,
      mechanicAllowed: true,
      assetRefsValid: true,
      moderationPassed: true,
      fallbackUsed: true,
      warnings: ["Using seeded lesson fallback."],
    },
  });
}