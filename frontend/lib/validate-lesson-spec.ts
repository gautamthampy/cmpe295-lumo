import { BLOCK_CATALOG, REQUIRED_BLOCKS, isKnownBlockType } from "./component-catalog";
import {
  getCurriculumEntry,
  type CurriculumEntry,
} from "./kindergarten-curriculum";
import { MECHANIC_CATALOG } from "./mechanic-catalog";
import { LESSON_SPEC_SCHEMA, type LessonSpec, type LessonSpecDraft } from "./lesson-spec";
import { buildSeedSceneSpec } from "./scene-spec";

export interface ValidationResult {
  valid: boolean;
  lesson: LessonSpec;
  warnings: string[];
  errors: string[];
}

function validateCurriculum(lesson: LessonSpec): CurriculumEntry | undefined {
  return getCurriculumEntry(lesson.curriculumCode);
}

function hasAllRequiredBlocks(lesson: LessonSpec): boolean {
  const types = new Set(lesson.blocks.map((block) => block.type));
  return REQUIRED_BLOCKS.every((required) => types.has(required));
}

export function validateLessonSpec(
  draft: LessonSpecDraft,
  options?: { source?: "live" | "seed" }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = LESSON_SPEC_SCHEMA.safeParse(draft);

  if (!parsed.success) {
    const fallback = LESSON_SPEC_SCHEMA.parse({
      lessonId: `invalid-${Date.now()}`,
      gradeLevel: 2,
      district: "SJUSD",
      subject: "science",
      curriculumCode: "SCI-G2-ECOSYSTEMS",
      unitOrModule: "Interdependent Relationships in Ecosystems",
      conceptFamily: "ecosystems_pollination_seed_dispersal",
      theme: "garden",
      childName: "Learner",
      mechanicId: "sort_and_match",
      difficultyBand: "support",
      vocabularyLevel: "low",
      maxWordsPerPrompt: 18,
      misconceptionProbe: {
        signal: "invalid_schema",
        checkPrompt: "Can we try one simple example first?",
        expectedConfusion: "spec parsing issue",
      },
      blocks: [
        {
          id: "intro-1",
          type: "intro_card",
          title: "Welcome",
          prompt: "Let's explore how ecosystems support living things.",
          payload: {},
        },
        {
          id: "explainer-1",
          type: "micro_explainer",
          title: "Quick Learn",
          prompt: "Plants and pollinators depend on each other in ecosystems.",
          payload: {},
        },
        {
          id: "quiz-1",
          type: "quiz_block",
          title: "Check Point",
          prompt: "What helps pollination happen?",
          payload: {
            choices: ["Bees moving pollen", "A pencil", "A backpack"],
            answer: "Bees moving pollen",
          },
        },
        {
          id: "mechanic-1",
          type: "mechanic_block",
          title: "sort_and_match",
          prompt: "Sort ecosystem roles and how they help each other.",
          payload: { mechanicId: "sort_and_match" },
        },
        {
          id: "parent-summary-1",
          type: "parent_summary",
          title: "Parent Snapshot",
          prompt: "Fallback lesson loaded.",
          payload: {},
        },
      ],
      sceneSpec: buildSeedSceneSpec({
        childName: "Learner",
        subject: "science",
        conceptFamily: "ecosystems_pollination_seed_dispersal",
        theme: "garden",
      }),
      hintLadder: [
        {
          level: 1,
          strategy: "visual_cue",
          text: "Look at who depends on whom in the picture clues.",
        },
        {
          level: 2,
          strategy: "guided_question",
          text: "Which organism helps another survive?",
        },
      ],
      parentSummary:
        "A safe fallback was loaded because the generated lesson did not pass checks.",
      validationStatus: {
        schemaValid: false,
        curriculumAligned: false,
        mechanicAllowed: true,
        assetRefsValid: true,
        moderationPassed: true,
        fallbackUsed: true,
        warnings: ["Schema validation failed. Using fallback lesson."],
      },
    });
    parsed.error.issues.forEach((issue) => errors.push(issue.message));
    return {
      valid: false,
      lesson: fallback,
      warnings: fallback.validationStatus.warnings,
      errors,
    };
  }

  const lesson = parsed.data;
  const curriculumEntry = validateCurriculum(lesson);
  const hasRequiredBlocks = hasAllRequiredBlocks(lesson);
  const knownMechanic = Boolean(MECHANIC_CATALOG[lesson.mechanicId]);
  const blockTypesKnown = lesson.blocks.every((block) => isKnownBlockType(block.type));

  if (!curriculumEntry) {
    errors.push("Unknown curriculum code.");
  } else {
    if (lesson.gradeLevel !== curriculumEntry.gradeLevel) {
      errors.push("Grade level does not match curriculum entry.");
    }
    if (lesson.district !== curriculumEntry.district) {
      errors.push("District does not match curriculum entry.");
    }
    if (lesson.subject !== curriculumEntry.subject) {
      errors.push("Subject does not match curriculum entry.");
    }
    if (lesson.conceptFamily !== curriculumEntry.conceptFamily) {
      warnings.push("Concept family differs from mapped curriculum entry.");
    }
    if (!curriculumEntry.allowedMechanics.includes(lesson.mechanicId)) {
      errors.push("Mechanic is not allowed for this curriculum entry.");
    }
  }

  if (!knownMechanic) {
    errors.push("Unknown mechanic ID.");
  }

  if (!hasRequiredBlocks) {
    errors.push("Missing required lesson blocks.");
  }

  if (!blockTypesKnown) {
    errors.push("Lesson contains unsupported block type.");
  }

  const promptTooLong = lesson.blocks.some(
    (block) => block.prompt.split(/\s+/).length > lesson.maxWordsPerPrompt + 8
  );
  if (promptTooLong) {
    warnings.push("Some block prompts may be long for grade 2.");
  }

  const valid = errors.length === 0;
  lesson.validationStatus = {
    schemaValid: true,
    curriculumAligned: Boolean(curriculumEntry),
    mechanicAllowed: knownMechanic && errors.every((e) => !e.includes("Mechanic")),
    assetRefsValid: true,
    moderationPassed: true,
    fallbackUsed: !valid || options?.source === "seed",
    warnings: [...lesson.validationStatus.warnings, ...warnings],
  };

  if (!valid) {
    lesson.validationStatus.fallbackUsed = true;
    lesson.validationStatus.warnings.push("Validation checks failed.");
  }

  // Ensure this stays in sync with available block catalog.
  Object.keys(BLOCK_CATALOG).forEach((blockType) => {
    if (!["intro_card", "micro_explainer", "quiz_block", "mechanic_block", "hint_card", "parent_summary"].includes(blockType)) {
      warnings.push(`Unexpected catalog block type: ${blockType}`);
    }
  });

  return { valid, lesson, warnings, errors };
}
