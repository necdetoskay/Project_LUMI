export const CHARACTER_VISUAL_SHEET_LAYOUT_VERSION =
  "deterministic-seven-view-crop-v2";

export type SheetRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const SEVEN_VIEW_REGIONS: readonly SheetRegion[] = [
  { left: 0, top: 0, width: 0.25, height: 0.5 },
  { left: 0.25, top: 0, width: 0.25, height: 0.5 },
  { left: 0.5, top: 0, width: 0.25, height: 0.5 },
  { left: 0.75, top: 0, width: 0.25, height: 0.5 },
  { left: 0, top: 0.5, width: 1 / 3, height: 0.5 },
  { left: 1 / 3, top: 0.5, width: 1 / 3, height: 0.5 },
  { left: 2 / 3, top: 0.5, width: 1 / 3, height: 0.5 },
];

export function getSevenViewSheetLayout(): {
  version: typeof CHARACTER_VISUAL_SHEET_LAYOUT_VERSION;
  regions: readonly SheetRegion[];
} {
  return {
    version: CHARACTER_VISUAL_SHEET_LAYOUT_VERSION,
    regions: SEVEN_VIEW_REGIONS,
  };
}
