export type ItemVisualState = {
  id: string;
  label: string;
  prompt: string;
};

export type ItemVisualStateProfile = {
  category: string;
  states: readonly ItemVisualState[];
};

const profiles: readonly ItemVisualStateProfile[] = [
  {
    category: "bag",
    states: [
      { id: "closed", label: "Closed", prompt: "the bag fully closed" },
      { id: "open", label: "Open", prompt: "the same bag open, showing its opening clearly" },
    ],
  },
  {
    category: "candle",
    states: [
      { id: "unlit", label: "Unlit", prompt: "the candle unlit with an intact wick" },
      { id: "lit", label: "Lit", prompt: "the same candle lit with one small safe flame" },
      { id: "burned-down", label: "Burned down", prompt: "the same candle visibly shorter after burning" },
    ],
  },
  {
    category: "compass",
    states: [
      { id: "closed", label: "Closed", prompt: "the compass case fully closed" },
      { id: "open", label: "Open", prompt: "the exact same compass open with its dial visible" },
    ],
  },
  {
    category: "potion",
    states: [
      { id: "full", label: "Full", prompt: "the potion bottle completely full" },
      { id: "half", label: "Half full", prompt: "the exact same bottle half full" },
      { id: "empty", label: "Empty", prompt: "the exact same bottle empty" },
    ],
  },
  {
    category: "book",
    states: [
      { id: "closed", label: "Closed", prompt: "the book fully closed" },
      { id: "open", label: "Open", prompt: "the exact same book open to blank illustrated pages with no readable text" },
    ],
  },
  {
    category: "lantern",
    states: [
      { id: "off", label: "Off", prompt: "the lantern switched off" },
      { id: "on", label: "On", prompt: "the exact same lantern glowing softly" },
    ],
  },
  {
    category: "chest",
    states: [
      { id: "closed", label: "Closed", prompt: "the chest fully closed" },
      { id: "open", label: "Open", prompt: "the exact same chest open" },
      { id: "empty", label: "Empty", prompt: "the exact same chest open and visibly empty" },
    ],
  },
];

const DEFAULT_STATES: readonly ItemVisualState[] = [
  { id: "default", label: "Default", prompt: "the canonical default state of the item" },
];

export function getItemVisualStates(category: string): readonly ItemVisualState[] {
  const normalized = category.trim().toLowerCase();
  return profiles.find((profile) => profile.category === normalized)?.states ?? DEFAULT_STATES;
}

export function planItemStateGrid(
  states: readonly ItemVisualState[],
  maxPanels = 4,
): readonly (readonly ItemVisualState[])[] {
  if (!Number.isInteger(maxPanels) || maxPanels < 1 || maxPanels > 4) {
    throw new Error("ITEM_STATE_GRID_MAX_PANELS_INVALID");
  }
  const batches: ItemVisualState[][] = [];
  for (let index = 0; index < states.length; index += maxPanels) {
    batches.push(states.slice(index, index + maxPanels));
  }
  return batches;
}
