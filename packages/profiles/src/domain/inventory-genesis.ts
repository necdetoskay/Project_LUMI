import crypto from "node:crypto";

import {
  validateItemDefinitionInput,
  validateItemInstanceCreateInput,
  type ItemDefinitionState,
  type ItemInstanceCreateInput,
} from "./inventory";
import type {
  ItemCategory,
  ItemDefinitionInput,
  ItemType,
  Rarity,
} from "./inventory-types";

export const INVENTORY_GENESIS_ROLES = [
  "ordinary",
  "personality",
  "relationship",
  "legacy",
] as const;
export type InventoryGenesisRole = (typeof INVENTORY_GENESIS_ROLES)[number];

export const INVENTORY_GENESIS_EMOTIONAL_VALUES = [
  "low",
  "medium",
  "high",
] as const;
export type InventoryGenesisEmotionalValue =
  (typeof INVENTORY_GENESIS_EMOTIONAL_VALUES)[number];

export const INVENTORY_GENESIS_STORY_POTENTIAL = [
  "low",
  "medium",
  "high",
] as const;
export type InventoryGenesisStoryPotential =
  (typeof INVENTORY_GENESIS_STORY_POTENTIAL)[number];

export interface InventoryGenesisProvenance {
  role: InventoryGenesisRole;
  originFactIds: string[];
  givenByNpcId: string | null;
  acquiredAt: string | null;
  emotionalValue: InventoryGenesisEmotionalValue;
  storyPotential: InventoryGenesisStoryPotential;
  rationale: string;
}

export interface InventoryGenesisItemSuggestion {
  key: string;
  displayName: string;
  description: string;
  category: ItemCategory;
  itemType: ItemType;
  rarity: Rarity;
  definitionMetadata: Record<string, unknown>;
  instanceName?: string;
  originType: ItemInstanceCreateInput["originType"];
  provenance: InventoryGenesisProvenance;
}

export interface InventoryGenesisItemPlan {
  definition: ItemDefinitionInput;
  instance: Omit<ItemInstanceCreateInput, "itemDefinitionId">;
  provenance: InventoryGenesisProvenance;
}

export interface InventoryGenesisManifest {
  ownerType: "character";
  ownerId: string;
  items: InventoryGenesisItemPlan[];
  derivationRevision: "inventory-genesis.v1";
}

export interface InventoryGenesisValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
  itemKey?: string;
}

const POWER_GUARD_PATTERNS = [
  /infinite/i,
  /unlimited/i,
  /all[- ]?powerful/i,
  /omniscient/i,
  /every door/i,
  /her kapıyı/i,
  /sonsuz/i,
  /sınırsız/i,
  /yenilmez/i,
];

function slug(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("en-US")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 56) || "item"
  );
}

function shortHash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function definitionStateFromInput(
  input: ItemDefinitionInput,
): ItemDefinitionState {
  return {
    id: `preview-definition-${shortHash(input.definitionKey)}`,
    definitionKey: input.definitionKey,
    displayName: input.displayName,
    description: input.description ?? null,
    category: input.category,
    itemType: input.itemType,
    rarity: input.rarity,
    stackMode: input.stackMode,
    maxStackSize: input.maxStackSize ?? null,
    durabilityMode: input.durabilityMode,
    defaultDurability: input.defaultDurability ?? null,
    isTransferable: input.isTransferable,
    isEquippable: input.isEquippable,
    isConsumable: input.isConsumable,
    isStorySelectable: input.isStorySelectable,
    allowedOwnerTypes: input.allowedOwnerTypes,
    lifecycleStatus: "active",
    metadata: input.metadata,
  };
}

export function createInventoryGenesisManifest(input: {
  characterId: string;
  seed: string;
  suggestions: InventoryGenesisItemSuggestion[];
}): InventoryGenesisManifest {
  const seenKeys = new Set<string>();
  const items = input.suggestions.map((suggestion, index) => {
    const stableIdentity = `${input.seed}:${input.characterId}:${suggestion.key}:${index}`;
    let definitionKey = `genesis_${shortHash(`${input.seed}:${input.characterId}`)}_${slug(
      suggestion.key || suggestion.displayName,
    )}`;
    if (seenKeys.has(definitionKey)) {
      definitionKey = `${definitionKey}_${shortHash(stableIdentity).slice(0, 6)}`;
    }
    seenKeys.add(definitionKey);

    const definition: ItemDefinitionInput = {
      definitionKey,
      displayName: suggestion.displayName,
      description: suggestion.description,
      category: suggestion.category,
      itemType: suggestion.itemType,
      rarity: suggestion.rarity,
      stackMode: "non_stackable",
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: suggestion.category === "wearable",
      isConsumable: suggestion.itemType === "consumable",
      isStorySelectable: true,
      allowedOwnerTypes: ["character"],
      metadata: structuredClone(suggestion.definitionMetadata),
    };
    validateItemDefinitionInput(definition);

    const instance: Omit<ItemInstanceCreateInput, "itemDefinitionId"> = {
      ...(suggestion.instanceName
        ? { instanceName: suggestion.instanceName }
        : {}),
      quantity: 1,
      originType: suggestion.originType,
      originId:
        suggestion.provenance.originFactIds[0] ??
        suggestion.provenance.givenByNpcId ??
        undefined,
      customProperties: {
        genesisProvenance: structuredClone(suggestion.provenance),
        inventoryGenesisRevision: "inventory-genesis.v1",
      },
    };
    validateItemInstanceCreateInput(
      {
        itemDefinitionId: definitionStateFromInput(definition).id,
        ...instance,
      },
      definitionStateFromInput(definition),
    );

    return {
      definition,
      instance,
      provenance: structuredClone(suggestion.provenance),
    };
  });

  return {
    ownerType: "character",
    ownerId: input.characterId,
    items,
    derivationRevision: "inventory-genesis.v1",
  };
}

export function validateInventoryGenesisManifest(input: {
  manifest: InventoryGenesisManifest;
  originFactIds: Iterable<string>;
  socialNpcIds: Iterable<string>;
}): InventoryGenesisValidationIssue[] {
  const issues: InventoryGenesisValidationIssue[] = [];
  const originFactIds = new Set(input.originFactIds);
  const socialNpcIds = new Set(input.socialNpcIds);
  const definitionKeys = new Set<string>();

  if (input.manifest.items.length < 3 || input.manifest.items.length > 5) {
    issues.push({
      code: "INVENTORY_GENESIS_ATYPICAL_COUNT",
      message: "A typical starting inventory should contain 3-5 coherent items",
      severity: "warning",
    });
  }

  let mundaneCount = 0;
  let elevatedCount = 0;
  let relationshipOrLegacyCount = 0;

  for (const item of input.manifest.items) {
    const key = item.definition.definitionKey;
    if (definitionKeys.has(key)) {
      issues.push({
        code: "INVENTORY_GENESIS_DUPLICATE_DEFINITION_KEY",
        message: `Duplicate canonical definition key: ${key}`,
        severity: "error",
        itemKey: key,
      });
    }
    definitionKeys.add(key);

    try {
      validateItemDefinitionInput(item.definition);
      const definitionState = definitionStateFromInput(item.definition);
      validateItemInstanceCreateInput(
        { itemDefinitionId: definitionState.id, ...item.instance },
        definitionState,
      );
    } catch (error) {
      issues.push({
        code: "INVENTORY_GENESIS_CANONICAL_ITEM_INVALID",
        message:
          error instanceof Error
            ? error.message
            : "Canonical item validation failed",
        severity: "error",
        itemKey: key,
      });
    }

    for (const factId of item.provenance.originFactIds) {
      if (!originFactIds.has(factId)) {
        issues.push({
          code: "INVENTORY_GENESIS_ORIGIN_FACT_MISSING",
          message: `${key} references unknown origin fact ${factId}`,
          severity: "error",
          itemKey: key,
        });
      }
    }

    if (
      item.provenance.givenByNpcId &&
      !socialNpcIds.has(item.provenance.givenByNpcId)
    ) {
      issues.push({
        code: "INVENTORY_GENESIS_GIVER_MISSING",
        message: `${key} references unknown Social Genesis NPC ${item.provenance.givenByNpcId}`,
        severity: "error",
        itemKey: key,
      });
    }

    if (
      item.provenance.role === "relationship" &&
      !item.provenance.givenByNpcId &&
      item.provenance.originFactIds.length === 0
    ) {
      issues.push({
        code: "INVENTORY_GENESIS_RELATIONSHIP_PROVENANCE_REQUIRED",
        message: `${key} is relationship-related but has no NPC or origin evidence`,
        severity: "error",
        itemKey: key,
      });
    }

    if (
      item.provenance.role === "legacy" &&
      item.provenance.originFactIds.length === 0
    ) {
      issues.push({
        code: "INVENTORY_GENESIS_LEGACY_PROVENANCE_REQUIRED",
        message: `${key} is a legacy item but has no canonical origin fact`,
        severity: "error",
        itemKey: key,
      });
    }

    if (
      item.definition.rarity === "common" &&
      item.provenance.storyPotential !== "high"
    ) {
      mundaneCount += 1;
    }
    if (["rare", "unique", "legendary"].includes(item.definition.rarity)) {
      elevatedCount += 1;
    }
    if (["relationship", "legacy"].includes(item.provenance.role)) {
      relationshipOrLegacyCount += 1;
    }

    const powerText = `${item.definition.displayName} ${item.definition.description ?? ""} ${item.provenance.rationale}`;
    if (POWER_GUARD_PATTERNS.some((pattern) => pattern.test(powerText))) {
      issues.push({
        code: "INVENTORY_GENESIS_POWER_GUARD",
        message: `${key} appears to grant unbounded power or universal access`,
        severity: "error",
        itemKey: key,
      });
    }
  }

  if (
    input.manifest.items.length > 0 &&
    mundaneCount < Math.min(2, input.manifest.items.length)
  ) {
    issues.push({
      code: "INVENTORY_GENESIS_MUNDANE_GROUNDING_LOW",
      message:
        "Starting inventory should normally contain at least two grounded/common items",
      severity: "warning",
    });
  }
  if (elevatedCount > 1) {
    issues.push({
      code: "INVENTORY_GENESIS_RARITY_OVERLOAD",
      message:
        "Starting inventory contains too many rare/unique/legendary items",
      severity: "warning",
    });
  }
  if (relationshipOrLegacyCount > 2) {
    issues.push({
      code: "INVENTORY_GENESIS_HOOK_OVERLOAD",
      message: "Too many starting items are relationship/legacy hooks",
      severity: "warning",
    });
  }

  return issues;
}

export function getInventoryGenesisProvenance(
  manifest: InventoryGenesisManifest,
  definitionKey: string,
): InventoryGenesisProvenance | null {
  const item = manifest.items.find(
    (candidate) => candidate.definition.definitionKey === definitionKey,
  );
  return item ? structuredClone(item.provenance) : null;
}
