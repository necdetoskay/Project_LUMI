export const OWNER_TYPES = [
  "household",
  "child_profile",
  "character",
  "location",
] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];

export const ITEM_CATEGORIES = [
  "tool",
  "key",
  "map",
  "gift",
  "wearable",
  "book",
  "companion_token",
  "food",
  "medicine",
  "artifact",
  "toy",
  "letter",
  "memory_object",
  "quest_object",
  "collectible",
  "currency_like",
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const ITEM_TYPES = [
  "persistent",
  "consumable",
  "quest",
  "story",
  "collectible",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "unique",
  "legendary",
] as const;
export type Rarity = (typeof RARITIES)[number];

export const STACK_MODES = [
  "non_stackable",
  "stackable",
  "virtual_quantity",
] as const;
export type StackMode = (typeof STACK_MODES)[number];

export const DURABILITY_MODES = [
  "none",
  "fixed",
  "degradable",
  "rechargeable",
] as const;
export type DurabilityMode = (typeof DURABILITY_MODES)[number];

export const TRANSFER_TYPES = [
  "gift",
  "loan",
  "return",
  "story_reward",
  "story_loss",
  "found",
  "drop",
  "pickup",
  "system_move",
] as const;
export type TransferType = (typeof TRANSFER_TYPES)[number];

export const OWNERSHIP_TYPES = [
  "owned",
  "borrowed",
  "entrusted",
  "discovered",
  "reserved",
] as const;
export type OwnershipType = (typeof OWNERSHIP_TYPES)[number];

export const ENTRY_STATUSES = [
  "active",
  "reserved",
  "equipped",
  "hidden",
  "removed",
] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export const CAPACITY_MODES = [
  "unlimited",
  "slot",
  "weight",
  "custom",
] as const;
export type CapacityMode = (typeof CAPACITY_MODES)[number];

export const INVENTORY_TYPES = [
  "personal",
  "shared",
  "equipped",
  "storage",
  "session",
  "quest",
] as const;
export type InventoryType = (typeof INVENTORY_TYPES)[number];

export interface ItemDefinitionInput {
  definitionKey: string;
  displayName: string;
  description?: string;
  category: ItemCategory;
  itemType: ItemType;
  rarity: Rarity;
  stackMode: StackMode;
  maxStackSize?: number;
  durabilityMode: DurabilityMode;
  defaultDurability?: number;
  isTransferable: boolean;
  isEquippable: boolean;
  isConsumable: boolean;
  isStorySelectable: boolean;
  allowedOwnerTypes: OwnerType[];
  metadata: Record<string, unknown>;
}

export interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
}

export const METADATA_SCHEMA_DEFINITIONS: Record<
  string,
  { required: string[]; optional: string[] }
> = {
  food: {
    required: ["nutritionValue"],
    optional: ["expiresAfterDays", "flavorProfile"],
  },
  medicine: {
    required: ["healAmount"],
    optional: ["sideEffects", "durationHours"],
  },
  tool: { required: [], optional: ["durability", "material", "skillRequired"] },
  key: { required: ["unlocksId"], optional: ["oneTimeUse", "description"] },
  map: {
    required: ["regionId"],
    optional: ["locations", "scale", "annotations"],
  },
  gift: { required: [], optional: ["occasion", "fromCharacter", "message"] },
  wearable: { required: ["slot"], optional: ["defense", "style", "material"] },
  book: { required: [], optional: ["title", "author", "pages", "summary"] },
  companion_token: {
    required: ["companionType"],
    optional: ["abilities", "bondLevel"],
  },
  artifact: { required: [], optional: ["origin", "power", "era"] },
  toy: { required: [], optional: ["playValue", "soundEffect"] },
  letter: {
    required: [],
    optional: ["fromCharacter", "toCharacter", "summary"],
  },
  memory_object: {
    required: ["memorySceneId"],
    optional: ["emotionalWeight", "associatedCharacter"],
  },
  quest_object: { required: ["questId"], optional: ["questStep", "isKeyItem"] },
  collectible: {
    required: [],
    optional: ["setName", "setNumber", "rarityScore"],
  },
  currency_like: {
    required: ["denomination"],
    optional: ["exchangeRate", "issuer"],
  },
};

export function validateItemMetadata(
  category: ItemCategory,
  metadata: Record<string, unknown>,
): MetadataValidationResult {
  const schema = METADATA_SCHEMA_DEFINITIONS[category];
  if (!schema) {
    return { valid: true, errors: [] };
  }
  const errors: string[] = [];
  for (const field of schema.required) {
    if (metadata[field] === undefined || metadata[field] === null) {
      errors.push(`Missing required metadata field: ${field}`);
    }
  }
  const allAllowed = new Set([...schema.required, ...schema.optional]);
  for (const key of Object.keys(metadata)) {
    if (!allAllowed.has(key)) {
      errors.push(`Unknown metadata field: ${key}`);
    }
  }
  return { valid: errors.length === 0, errors };
}
