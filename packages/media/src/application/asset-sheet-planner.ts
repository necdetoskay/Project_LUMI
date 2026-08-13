import { sha256Hex } from "../domain/fingerprint";

export const STORY_VISUAL_SHEET_MAX_CELLS = 4;
export const STORY_VISUAL_SHEET_GRID_COLUMNS = 2;
export const STORY_VISUAL_SHEET_GRID_ROWS = 2;
export const STORY_VISUAL_SHEET_OUTPUT_MAX_PX = 300;

export type AssetSheetCandidate = {
  requirementKey: string;
  prompt: string;
  renderFingerprint: string;
  subjectId: string;
  subjectType: "character" | "item" | "location" | "story_scene";
  assetKind: string;
};

export type AssetSheetCell = AssetSheetCandidate & {
  cellIndex: number;
  row: number;
  column: number;
};

export type StoryVisualAssetSheetPlan = {
  sheetFingerprint: string;
  compatibilityKey: string;
  columns: typeof STORY_VISUAL_SHEET_GRID_COLUMNS;
  rows: typeof STORY_VISUAL_SHEET_GRID_ROWS;
  outputMaxPx: typeof STORY_VISUAL_SHEET_OUTPUT_MAX_PX;
  cells: readonly AssetSheetCell[];
  prompt: string;
};

function compatibilityKey(candidate: AssetSheetCandidate) {
  if (candidate.subjectType === "item") return `item:${candidate.assetKind}`;
  if (candidate.subjectType === "location") {
    return `environment:${candidate.assetKind}`;
  }
  return null;
}

function compileSheetPrompt(cells: readonly AssetSheetCell[]) {
  const cellLines = cells.map(
    (cell) =>
      `CELL ${cell.cellIndex + 1} (row ${cell.row + 1}, column ${cell.column + 1}): ${cell.prompt}`,
  );
  const unused = STORY_VISUAL_SHEET_MAX_CELLS - cells.length;

  return [
    "Create one precise 2x2 visual asset sheet with four equal square cells.",
    "Each requested asset must stay entirely inside its own cell with generous safe margins and no overlap across cell boundaries.",
    "Use the exact same visual style across all populated cells, but preserve each concrete entity and state as visually independent.",
    "Use a simple clean background inside each populated cell. No text, labels, numbers, logos, borders, watermarks or captions in the rendered image.",
    ...cellLines,
    unused > 0
      ? `Leave the final ${unused} unused cell${unused === 1 ? "" : "s"} visually empty and neutral.`
      : "Populate all four cells.",
    "The cells are ordered left-to-right, top-to-bottom. Do not swap or merge cells.",
  ].join(" ");
}

export function planStoryVisualAssetSheets(
  candidates: readonly AssetSheetCandidate[],
): StoryVisualAssetSheetPlan[] {
  const groups = new Map<string, AssetSheetCandidate[]>();

  for (const candidate of candidates) {
    const key = compatibilityKey(candidate);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(candidate);
    groups.set(key, group);
  }

  const plans: StoryVisualAssetSheetPlan[] = [];
  for (const [key, candidatesForKey] of groups) {
    for (
      let offset = 0;
      offset < candidatesForKey.length;
      offset += STORY_VISUAL_SHEET_MAX_CELLS
    ) {
      const chunk = candidatesForKey.slice(
        offset,
        offset + STORY_VISUAL_SHEET_MAX_CELLS,
      );
      if (chunk.length < 2) continue;
      const cells = chunk.map((candidate, cellIndex) => ({
        ...candidate,
        cellIndex,
        row: Math.floor(cellIndex / STORY_VISUAL_SHEET_GRID_COLUMNS),
        column: cellIndex % STORY_VISUAL_SHEET_GRID_COLUMNS,
      }));
      const sheetFingerprint = sha256Hex(
        JSON.stringify({
          compatibilityKey: key,
          cells: cells.map((cell) => ({
            requirementKey: cell.requirementKey,
            renderFingerprint: cell.renderFingerprint,
            cellIndex: cell.cellIndex,
          })),
          grid: [STORY_VISUAL_SHEET_GRID_COLUMNS, STORY_VISUAL_SHEET_GRID_ROWS],
          outputMaxPx: STORY_VISUAL_SHEET_OUTPUT_MAX_PX,
          plannerVersion: "story-visual-sheet-v1",
        }),
      );
      plans.push({
        sheetFingerprint,
        compatibilityKey: key,
        columns: STORY_VISUAL_SHEET_GRID_COLUMNS,
        rows: STORY_VISUAL_SHEET_GRID_ROWS,
        outputMaxPx: STORY_VISUAL_SHEET_OUTPUT_MAX_PX,
        cells,
        prompt: compileSheetPrompt(cells),
      });
    }
  }

  return plans;
}
