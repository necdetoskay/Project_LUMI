import type { StoryVisualRenderTarget } from "./story-visual-asset-resolver";
import type { StoryVisualImportance } from "./story-visual-manifest";
import type { VisualStyleId } from "./visual-style";

export type StoryVisualSheetPanel = {
  panelIndex: number;
  row: number;
  column: number;
  target: StoryVisualRenderTarget;
};

export type StoryVisualAssetSheet = {
  id: string;
  styleId: VisualStyleId;
  styleVersion: number;
  rows: number;
  columns: number;
  panels: readonly StoryVisualSheetPanel[];
};

export type StoryVisualAssetSheetPlan = {
  sheets: readonly StoryVisualAssetSheet[];
  panelCount: number;
  splitGroupCount: number;
};

export type StoryVisualAssetSheetPlannerInput = {
  targets: readonly StoryVisualRenderTarget[];
  styleId: VisualStyleId;
  styleVersion: number;
  maxPanelsPerSheet?: number;
  importanceByManifestEntityId?: Readonly<
    Partial<Record<string, StoryVisualImportance>>
  >;
};

type TargetGroup = {
  key: string;
  firstInputIndex: number;
  importance: StoryVisualImportance;
  targets: StoryVisualRenderTarget[];
};

const DEFAULT_MAX_PANELS_PER_SHEET = 4;
const MAX_SUPPORTED_PANELS_PER_SHEET = 16;

function importanceRank(importance: StoryVisualImportance): number {
  switch (importance) {
    case "critical":
      return 0;
    case "important":
      return 1;
    case "supporting":
      return 2;
  }
}

function groupKey(target: StoryVisualRenderTarget): string {
  return [
    target.manifestEntityId,
    target.resolvedEntityId,
    target.variant?.id ?? "base",
  ].join(":");
}

function dimensions(panelCount: number): { rows: number; columns: number } {
  if (panelCount <= 0) {
    throw new Error("STORY_VISUAL_SHEET_PANEL_COUNT_REQUIRED");
  }

  const columns = Math.ceil(Math.sqrt(panelCount));
  const rows = Math.ceil(panelCount / columns);
  return { rows, columns };
}

function assertUniqueTargets(
  targets: readonly StoryVisualRenderTarget[],
): void {
  const fingerprints = new Set<string>();

  for (const target of targets) {
    if (fingerprints.has(target.renderFingerprint)) {
      throw new Error("STORY_VISUAL_SHEET_DUPLICATE_RENDER_TARGET");
    }
    fingerprints.add(target.renderFingerprint);
  }
}

function buildGroups(input: StoryVisualAssetSheetPlannerInput): TargetGroup[] {
  const groups = new Map<string, TargetGroup>();

  input.targets.forEach((target, index) => {
    const key = groupKey(target);
    const existing = groups.get(key);
    if (existing) {
      existing.targets.push(target);
      return;
    }

    groups.set(key, {
      key,
      firstInputIndex: index,
      importance:
        input.importanceByManifestEntityId?.[target.manifestEntityId] ??
        "important",
      targets: [target],
    });
  });

  return [...groups.values()].sort((left, right) => {
    const byImportance =
      importanceRank(left.importance) - importanceRank(right.importance);
    if (byImportance !== 0) return byImportance;
    return left.firstInputIndex - right.firstInputIndex;
  });
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function planStoryVisualAssetSheets(
  input: StoryVisualAssetSheetPlannerInput,
): StoryVisualAssetSheetPlan {
  const maxPanelsPerSheet =
    input.maxPanelsPerSheet ?? DEFAULT_MAX_PANELS_PER_SHEET;

  if (
    !Number.isInteger(maxPanelsPerSheet) ||
    maxPanelsPerSheet < 1 ||
    maxPanelsPerSheet > MAX_SUPPORTED_PANELS_PER_SHEET
  ) {
    throw new Error("STORY_VISUAL_SHEET_MAX_PANELS_INVALID");
  }

  assertUniqueTargets(input.targets);
  if (input.targets.length === 0) {
    return { sheets: [], panelCount: 0, splitGroupCount: 0 };
  }

  const groups = buildGroups(input);
  const sheetTargets: StoryVisualRenderTarget[][] = [];
  let currentSheet: StoryVisualRenderTarget[] = [];
  let splitGroupCount = 0;

  const flush = () => {
    if (currentSheet.length > 0) {
      sheetTargets.push(currentSheet);
      currentSheet = [];
    }
  };

  for (const group of groups) {
    if (group.targets.length > maxPanelsPerSheet) {
      flush();
      splitGroupCount += 1;
      sheetTargets.push(...chunk(group.targets, maxPanelsPerSheet));
      continue;
    }

    if (currentSheet.length + group.targets.length > maxPanelsPerSheet) {
      flush();
    }

    currentSheet.push(...group.targets);
  }

  flush();

  const sheets = sheetTargets.map((targets, sheetIndex) => {
    const { rows, columns } = dimensions(targets.length);
    return {
      id: `sheet-${String(sheetIndex + 1).padStart(3, "0")}`,
      styleId: input.styleId,
      styleVersion: input.styleVersion,
      rows,
      columns,
      panels: targets.map((target, panelIndex) => ({
        panelIndex,
        row: Math.floor(panelIndex / columns),
        column: panelIndex % columns,
        target,
      })),
    } satisfies StoryVisualAssetSheet;
  });

  return {
    sheets,
    panelCount: input.targets.length,
    splitGroupCount,
  };
}
