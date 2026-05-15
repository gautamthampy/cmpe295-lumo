import type { ParentInput } from "./lesson-spec";
import type { CurriculumEntry } from "./kindergarten-curriculum";

export const PLANNER_SYSTEM_PROMPT = `You are a Grade 2 lesson planning assistant.
Return JSON only.
Return one object that matches the requested shape exactly. Do not rename keys.
Allowed blocks: intro_card, micro_explainer, quiz_block, mechanic_block, hint_card, parent_summary.
Allowed mechanics: count_and_compare, sort_and_match, predict_and_test.
Match the given curriculum concept and keep wording short, Grade 2 friendly, and concrete.
Include misconceptionProbe, hintLadder, and parentSummary.
No markdown, HTML, or code.
`;

export function buildPlannerUserPrompt(parentInput: ParentInput, entry: CurriculumEntry): string {
  return JSON.stringify({
    grade: 2,
    child: {
      name: parentInput.childName,
      interests: parentInput.childInterests.slice(0, 3),
      style: parentInput.textStyle,
      notes: parentInput.notes || "",
    },
    curriculum: {
      district: entry.district,
      subject: entry.subject,
      code: entry.code,
      title: entry.title,
      concept: entry.conceptFamily,
      vocab: entry.vocabularyLevel,
      maxWords: entry.maxWordsPerPrompt,
      mechanics: entry.allowedMechanics,
    },
    output: {
      blocks: "3-6",
      requiredBlockTypes: [
        "intro_card",
        "micro_explainer",
        "quiz_block",
        "mechanic_block",
        "parent_summary",
      ],
      hints: "2-3",
      concise: true,
      requiredShape: {
        lessonId: "short unique string",
        gradeLevel: 2,
        district: entry.district,
        subject: entry.subject,
        curriculumCode: entry.code,
        unitOrModule: entry.title,
        conceptFamily: entry.conceptFamily,
        theme: "one child-friendly theme from the interests",
        childName: parentInput.childName,
        mechanicId: "one allowed mechanic",
        difficultyBand: "core",
        vocabularyLevel: entry.vocabularyLevel,
        maxWordsPerPrompt: entry.maxWordsPerPrompt,
        misconceptionProbe: {
          signal: "short snake_case signal",
          checkPrompt: "one short question",
          expectedConfusion: "short description",
        },
        blocks: [
          {
            id: "intro-1",
            type: "intro_card",
            title: "short title",
            prompt: "short grade 2 friendly text",
            payload: {},
          },
        ],
        hintLadder: [
          {
            level: 1,
            strategy: "visual_cue",
            text: "short hint",
          },
          {
            level: 2,
            strategy: "guided_question",
            text: "short hint",
          },
        ],
        parentSummary: "one sentence",
      },
    },
  });
}
