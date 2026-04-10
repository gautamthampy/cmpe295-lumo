import type { BlockId } from "./lesson-spec";

export const BLOCK_CATALOG: Record<BlockId, { title: string; required: boolean }> = {
  intro_card: { title: "Intro Card", required: true },
  micro_explainer: { title: "Micro Explainer", required: true },
  quiz_block: { title: "Quiz Block", required: true },
  mechanic_block: { title: "Mechanic Block", required: true },
  hint_card: { title: "Hint Card", required: false },
  parent_summary: { title: "Parent Summary", required: true },
};

export const REQUIRED_BLOCKS: BlockId[] = Object.entries(BLOCK_CATALOG)
  .filter(([, value]) => value.required)
  .map(([key]) => key as BlockId);

export function isKnownBlockType(blockType: string): blockType is BlockId {
  return blockType in BLOCK_CATALOG;
}