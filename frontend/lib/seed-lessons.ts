import {
  KINDERGARTEN_CURRICULUM,
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

function buildBlocks(
  conceptFamily: ConceptFamily,
  mechanicId: TypedMechanicId,
  childName: string,
  theme: string
): LessonBlock[] {
  const templates: Record<
    ConceptFamily,
    {
      intro: string;
      explainer: string;
      quizPrompt: string;
      quizChoices: string[];
      quizAnswer: string;
      mechanicPrompt: string;
    }
  > = {
    habitats_and_survival: {
      intro: `${childName}, today we explore habitats and survival.`,
      explainer:
        "Living things survive when their habitat provides food, water, and shelter.",
      quizPrompt: "Which habitat best helps a fish survive?",
      quizChoices: ["Pond with water", "Dry desert sand", "Tree branch"],
      quizAnswer: "Pond with water",
      mechanicPrompt: `Sort each ${theme} habitat card to the animal it supports.`,
    },
    characters_and_challenges: {
      intro: `${childName}, let's analyze how characters solve problems.`,
      explainer:
        "Characters face challenges and make choices. We learn from their decisions.",
      quizPrompt: "What should a character do first when facing a problem?",
      quizChoices: ["Identify the problem", "Give up", "Ignore everyone"],
      quizAnswer: "Identify the problem",
      mechanicPrompt: `Match ${theme} character actions to the challenge outcomes.`,
    },
    government_and_community: {
      intro: `${childName}, let's see why communities use rules and leaders.`,
      explainer:
        "Government helps communities make decisions, protect people, and solve shared problems.",
      quizPrompt: "Why do communities have rules?",
      quizChoices: ["To keep people safe", "To make learning harder", "For no reason"],
      quizAnswer: "To keep people safe",
      mechanicPrompt: `Predict what happens when ${theme} community rules are followed or broken.`,
    },
    point_of_view: {
      intro: `${childName}, today we compare different points of view.`,
      explainer:
        "A story can feel different depending on who is telling it and what they know.",
      quizPrompt: "What changes with point of view?",
      quizChoices: ["How events are described", "The alphabet", "The paper color"],
      quizAnswer: "How events are described",
      mechanicPrompt: `Sort ${theme} story statements by who is speaking.`,
    },
    technology_problem_solving: {
      intro: `${childName}, let's use technology ideas to solve problems.`,
      explainer:
        "Technology tools can help us solve problems when we choose them carefully.",
      quizPrompt: "Which tool best helps measure time?",
      quizChoices: ["Timer", "Pillow", "Shoe"],
      quizAnswer: "Timer",
      mechanicPrompt: `Predict which ${theme} tool solves each classroom problem.`,
    },
    stories_and_lessons: {
      intro: `${childName}, let's find the lesson inside each story.`,
      explainer:
        "Many stories teach lessons about choices, kindness, honesty, or responsibility.",
      quizPrompt: "What is a story lesson called?",
      quizChoices: ["A moral", "A barcode", "A caption number"],
      quizAnswer: "A moral",
      mechanicPrompt: `Match ${theme} story events to their life lessons.`,
    },
    past_and_present: {
      intro: `${childName}, let's investigate how the past shapes today.`,
      explainer:
        "People and events from the past influence the choices and tools we use now.",
      quizPrompt: "What does a timeline help show?",
      quizChoices: ["Order of events", "Random letters", "Math only"],
      quizAnswer: "Order of events",
      mechanicPrompt: `Sort ${theme} events into past and present.`,
    },
    earth_systems_wind_water: {
      intro: `${childName}, let's study how wind and water shape Earth.`,
      explainer:
        "Wind and water can move soil and rocks, slowly changing landforms over time.",
      quizPrompt: "Which process can shape land?",
      quizChoices: ["Erosion by water", "Reading a poem", "Turning off lights"],
      quizAnswer: "Erosion by water",
      mechanicPrompt: `Predict what happens to ${theme} landforms after wind or water action.`,
    },
    buyers_and_sellers: {
      intro: `${childName}, let's practice buyer and seller decisions.`,
      explainer:
        "Buyers choose what to purchase, and sellers offer goods or services.",
      quizPrompt: "Who offers items for sale?",
      quizChoices: ["Seller", "Buyer", "Visitor only"],
      quizAnswer: "Seller",
      mechanicPrompt: `Sort ${theme} marketplace cards into buyer and seller roles.`,
    },
    states_of_matter: {
      intro: `${childName}, let's classify matter around us.`,
      explainer:
        "Matter can be solid, liquid, or gas depending on how particles move and spread.",
      quizPrompt: "Which is a liquid?",
      quizChoices: ["Water", "Rock", "Pencil"],
      quizAnswer: "Water",
      mechanicPrompt: `Sort ${theme} examples into solid, liquid, or gas.`,
    },
    friends_and_family: {
      intro: `${childName}, let's explore how families and communities help.`,
      explainer:
        "Families and community members support each other in different ways.",
      quizPrompt: "Which action helps a community?",
      quizChoices: ["Sharing resources", "Ignoring others", "Breaking rules"],
      quizAnswer: "Sharing resources",
      mechanicPrompt: `Match ${theme} helper roles to community needs.`,
    },
    animal_discoveries: {
      intro: `${childName}, let's discover how animals survive.`,
      explainer:
        "Animals use body structures and behaviors to find food and stay safe.",
      quizPrompt: "Why might an animal camouflage itself?",
      quizChoices: ["To hide from danger", "To read books", "To count money"],
      quizAnswer: "To hide from danger",
      mechanicPrompt: `Sort ${theme} adaptation cards by survival purpose.`,
    },
    learning_from_experiences: {
      intro: `${childName}, let's learn from new experiences.`,
      explainer:
        "Trying new things helps us build strategies, confidence, and understanding.",
      quizPrompt: "What can we gain from new experiences?",
      quizChoices: ["New learning", "Nothing", "Only confusion"],
      quizAnswer: "New learning",
      mechanicPrompt: `Compare ${theme} choices and predict better outcomes.`,
    },
    community_difference: {
      intro: `${childName}, let's see how people make a difference.`,
      explainer:
        "Community members can improve lives through service, leadership, and action.",
      quizPrompt: "Which person can make a community difference?",
      quizChoices: ["Anyone who helps", "Only famous people", "No one"],
      quizAnswer: "Anyone who helps",
      mechanicPrompt: `Sort ${theme} actions into high and low community impact.`,
    },
    changes_over_time: {
      intro: `${childName}, let's analyze changes over time.`,
      explainer:
        "Places, tools, and communities change over time due to people and natural processes.",
      quizPrompt: "What does change over time mean?",
      quizChoices: ["Things become different later", "Everything stays same forever", "Only books change"],
      quizAnswer: "Things become different later",
      mechanicPrompt: `Predict how ${theme} objects change from past to present.`,
    },
    teamwork: {
      intro: `${childName}, let's practice teamwork strategies.`,
      explainer:
        "Teams work best when members share ideas, roles, and responsibilities.",
      quizPrompt: "What helps a team succeed?",
      quizChoices: ["Clear roles", "No communication", "One person does all work"],
      quizAnswer: "Clear roles",
      mechanicPrompt: `Sort ${theme} behaviors into strong or weak teamwork.`,
    },
    addition_subtraction_20: {
      intro: `${childName}, let's solve addition and subtraction within 20.`,
      explainer:
        "We can model sums and differences using groups, number lines, or equations.",
      quizPrompt: "What is 13 - 5?",
      quizChoices: ["8", "18", "6"],
      quizAnswer: "8",
      mechanicPrompt: `Use ${theme} counters to model addition and subtraction within 20.`,
    },
    even_odd_arrays_equal_groups: {
      intro: `${childName}, let's use arrays and equal groups.`,
      explainer:
        "Equal groups help us understand even and odd numbers and early multiplication ideas.",
      quizPrompt: "Which number is even?",
      quizChoices: ["12", "9", "15"],
      quizAnswer: "12",
      mechanicPrompt: `Build ${theme} arrays and classify even or odd totals.`,
    },
    addition_subtraction_100: {
      intro: `${childName}, let's practice regrouping within 100.`,
      explainer:
        "Regrouping helps when ones are too many to keep in one place value column.",
      quizPrompt: "What is 47 + 28?",
      quizChoices: ["75", "65", "85"],
      quizAnswer: "75",
      mechanicPrompt: `Predict and test regrouping steps using ${theme} place-value cards.`,
    },
    place_value_to_1000: {
      intro: `${childName}, let's work with place value to 1,000.`,
      explainer:
        "Hundreds, tens, and ones help us read, build, and compare larger numbers.",
      quizPrompt: "How many hundreds are in 342?",
      quizChoices: ["3", "4", "2"],
      quizAnswer: "3",
      mechanicPrompt: `Sort ${theme} number cards by hundreds, tens, and ones.`,
    },
    compare_to_1000: {
      intro: `${childName}, let's compare three-digit numbers.`,
      explainer:
        "Compare hundreds first, then tens, then ones when numbers have similar parts.",
      quizPrompt: "Which is greater?",
      quizChoices: ["508", "489", "They are equal"],
      quizAnswer: "508",
      mechanicPrompt: `Compare ${theme} three-digit numbers and justify each choice.`,
    },
    addition_subtraction_1000: {
      intro: `${childName}, let's solve multi-digit operations within 1,000.`,
      explainer:
        "Use place value and regrouping to add and subtract larger numbers accurately.",
      quizPrompt: "What is 586 + 147?",
      quizChoices: ["733", "723", "743"],
      quizAnswer: "733",
      mechanicPrompt: `Test ${theme} multi-digit addition and subtraction strategies.`,
    },
    money_and_data: {
      intro: `${childName}, let's solve money and data problems.`,
      explainer:
        "We use coin values, bills, and simple data displays to make decisions.",
      quizPrompt: "Which coin is worth 25 cents?",
      quizChoices: ["Quarter", "Dime", "Nickel"],
      quizAnswer: "Quarter",
      mechanicPrompt: `Sort ${theme} money cards and compare totals.`,
    },
    length_and_measurement: {
      intro: `${childName}, let's compare and measure lengths.`,
      explainer:
        "We can measure with standard or non-standard units and compare results.",
      quizPrompt: "Which unit best measures a desk?",
      quizChoices: ["Centimeters", "Seconds", "Liters"],
      quizAnswer: "Centimeters",
      mechanicPrompt: `Predict and test ${theme} length comparisons.`,
    },
    time_shapes_fractions_equal_parts: {
      intro: `${childName}, let's connect time, shapes, and equal parts.`,
      explainer:
        "Shapes can be split into equal parts, and clocks show equal intervals of time.",
      quizPrompt: "Two equal parts of a shape are called:",
      quizChoices: ["Halves", "Edges", "Angles only"],
      quizAnswer: "Halves",
      mechanicPrompt: `Sort ${theme} examples into equal and not-equal parts.`,
    },
    ecosystems_pollination_seed_dispersal: {
      intro: `${childName}, let's explore ecosystems and pollination.`,
      explainer:
        "Plants and animals depend on each other through pollination and seed dispersal.",
      quizPrompt: "What helps move pollen between flowers?",
      quizChoices: ["Bees", "Pencils", "Books"],
      quizAnswer: "Bees",
      mechanicPrompt: `Match ${theme} ecosystem roles to pollination and seed dispersal actions.`,
    },
  };

  const base = templates[conceptFamily];
  return [
    {
      id: "intro-1",
      type: "intro_card",
      title: "Welcome Mission",
      prompt: base.intro,
      payload: {},
    },
    {
      id: "explainer-1",
      type: "micro_explainer",
      title: "Quick Learn",
      prompt: base.explainer,
      payload: {},
    },
    {
      id: "quiz-1",
      type: "quiz_block",
      title: "Check Point",
      prompt: base.quizPrompt,
      payload: {
        choices: base.quizChoices,
        answer: base.quizAnswer,
      },
    },
    {
      id: "mechanic-1",
      type: "mechanic_block",
      title: mechanicId,
      prompt: base.mechanicPrompt,
      payload: { mechanicId },
    },
    {
      id: "parent-summary-1",
      type: "parent_summary",
      title: "Parent Snapshot",
      prompt: "Summary updates after student actions.",
      payload: {},
    },
  ];
}

function chooseTheme(parentInput: ParentInput): string {
  const [firstInterest] = parentInput.childInterests;
  return firstInterest?.toLowerCase() || "community";
}

function selectEntry(parentInput: ParentInput): CurriculumEntry {
  return (
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
    entry.allowedMechanics.find((m) => allowedMechanics.includes(m)) ??
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
      expectedConfusion: "category mix-up or operation strategy mismatch",
    },
    blocks: buildBlocks(entry.conceptFamily, mechanicId, parentInput.childName, theme),
    sceneSpec: buildSeedSceneSpec({
      childName: parentInput.childName,
      subject: entry.subject,
      conceptFamily: entry.conceptFamily,
      theme,
    }),
    hintLadder: [
      { level: 1, strategy: "visual_cue", text: "Use the visual clues first." },
      { level: 2, strategy: "guided_question", text: "Which key detail should you compare first?" },
      { level: 3, strategy: "example_then_try", text: "Review one worked example, then solve a similar item." },
    ],
    parentSummary:
      "The student started at grade-level challenge. If struggle signals increase, the app shifts strategy and scaffolding.",
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
