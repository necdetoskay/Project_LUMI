import { ValidationError, DomainError } from "./errors";
import {
  OWNER_TYPES,
  ITEM_CATEGORIES,
  ITEM_TYPES,
  RARITIES,
  STACK_MODES,
  DURABILITY_MODES,
  TRANSFER_TYPES,
  ENTRY_STATUSES,
  INVENTORY_TYPES,
  validateItemMetadata,
  type OwnerType,
  type ItemCategory,
  type ItemType,
  type Rarity,
  type StackMode,
  type DurabilityMode,
  type TransferType,
  type OwnershipType,
  type EntryStatus,
  type CapacityMode,
  type InventoryType,
  type ItemDefinitionInput,
} from "./inventory-types";

export interface ItemDefinitionState {
  id: string;
  definitionKey: string;
  displayName: string;
  description: string | null;
  category: ItemCategory;
  itemType: ItemType;
  rarity: Rarity;
  stackMode: StackMode;
  maxStackSize: number | null;
  durabilityMode: DurabilityMode;
  defaultDurability: number | null;
  isTransferable: boolean;
  isEquippable: boolean;
  isConsumable: boolean;
  isStorySelectable: boolean;
  allowedOwnerTypes: OwnerType[];
  lifecycleStatus: "draft" | "active" | "retired" | "archived";
  metadata: Record<string, unknown>;
}

export interface ItemInstanceState {
  id: string;
  itemDefinitionId: string;
  instanceName: string | null;
  lifecycleStatus: "active" | "consumed" | "destroyed" | "lost" | "archived";
  conditionStatus: "pristine" | "good" | "worn" | "damaged" | "broken";
  durabilityCurrent: number | null;
  durabilityMax: number | null;
  quantity: number;
  customProperties: Record<string, unknown>;
  originType: "generated" | "discovered" | "gifted" | "crafted" | "story";
  originId: string | null;
}

export interface OwnershipState {
  id: string;
  itemInstanceId: string;
  ownerType: OwnerType;
  ownerId: string;
  ownershipType: OwnershipType;
  status: "active" | "transferred" | "released" | "expired";
  sourceType: string;
  sourceId: string | null;
  metadata: Record<string, unknown>;
}

export interface InventoryState {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  inventoryType: InventoryType;
  displayName: string;
  capacityMode: CapacityMode;
  capacityValue: number | null;
  isLocked: boolean;
  lifecycleStatus: "active" | "inactive" | "archived";
  metadata: Record<string, unknown>;
}

export const DEFAULT_CAPACITY: Record<
  OwnerType,
  { mode: CapacityMode; value: number }
> = {
  household: { mode: "unlimited", value: 0 },
  child_profile: { mode: "unlimited", value: 0 },
  character: { mode: "slot", value: 20 },
  location: { mode: "unlimited", value: 0 },
};

export function validateOwnerType(value: string): OwnerType {
  if (!(OWNER_TYPES as readonly string[]).includes(value as OwnerType)) {
    throw new ValidationError(
      "INVALID_OWNER_TYPE",
      `Owner type must be one of: ${OWNER_TYPES.join(", ")}`,
      "ownerType",
    );
  }
  return value as OwnerType;
}

export function validateItemCategory(value: string): ItemCategory {
  if (!(ITEM_CATEGORIES as readonly string[]).includes(value as ItemCategory)) {
    throw new ValidationError(
      "INVALID_ITEM_CATEGORY",
      `Item category must be one of: ${ITEM_CATEGORIES.join(", ")}`,
      "category",
    );
  }
  return value as ItemCategory;
}

export function validateItemType(value: string): ItemType {
  if (!(ITEM_TYPES as readonly string[]).includes(value as ItemType)) {
    throw new ValidationError(
      "INVALID_ITEM_TYPE",
      `Item type must be one of: ${ITEM_TYPES.join(", ")}`,
      "itemType",
    );
  }
  return value as ItemType;
}

export function validateRarity(value: string): Rarity {
  if (!(RARITIES as readonly string[]).includes(value as Rarity)) {
    throw new ValidationError(
      "INVALID_RARITY",
      `Rarity must be one of: ${RARITIES.join(", ")}`,
      "rarity",
    );
  }
  return value as Rarity;
}

export function validateStackMode(value: string): StackMode {
  if (!(STACK_MODES as readonly string[]).includes(value as StackMode)) {
    throw new ValidationError(
      "INVALID_STACK_MODE",
      `Stack mode must be one of: ${STACK_MODES.join(", ")}`,
      "stackMode",
    );
  }
  return value as StackMode;
}

export function validateDurabilityMode(value: string): DurabilityMode {
  if (
    !(DURABILITY_MODES as readonly string[]).includes(value as DurabilityMode)
  ) {
    throw new ValidationError(
      "INVALID_DURABILITY_MODE",
      `Durability mode must be one of: ${DURABILITY_MODES.join(", ")}`,
      "durabilityMode",
    );
  }
  return value as DurabilityMode;
}

export function validateTransferType(value: string): TransferType {
  if (!(TRANSFER_TYPES as readonly string[]).includes(value as TransferType)) {
    throw new ValidationError(
      "INVALID_TRANSFER_TYPE",
      `Transfer type must be one of: ${TRANSFER_TYPES.join(", ")}`,
      "transferType",
    );
  }
  return value as TransferType;
}

export function validateEntryStatus(value: string): EntryStatus {
  if (!(ENTRY_STATUSES as readonly string[]).includes(value as EntryStatus)) {
    throw new ValidationError(
      "INVALID_ENTRY_STATUS",
      `Entry status must be one of: ${ENTRY_STATUSES.join(", ")}`,
      "entryStatus",
    );
  }
  return value as EntryStatus;
}

export function validateInventoryType(value: string): InventoryType {
  if (
    !(INVENTORY_TYPES as readonly string[]).includes(value as InventoryType)
  ) {
    throw new ValidationError(
      "INVALID_INVENTORY_TYPE",
      `Inventory type must be one of: ${INVENTORY_TYPES.join(", ")}`,
      "inventoryType",
    );
  }
  return value as InventoryType;
}

export function validateDefinitionKey(value: string): string {
  if (!value || value.trim().length < 1 || value.length > 120) {
    throw new ValidationError(
      "INVALID_DEFINITION_KEY",
      "Definition key must be 1-120 characters",
      "definitionKey",
    );
  }
  if (!/^[a-z0-9_]+$/.test(value)) {
    throw new ValidationError(
      "INVALID_DEFINITION_KEY_FORMAT",
      "Definition key must be lowercase alphanumeric with underscores",
      "definitionKey",
    );
  }
  return value.trim();
}

export function validateItemDefinitionInput(input: ItemDefinitionInput): void {
  validateDefinitionKey(input.definitionKey);
  if (
    !input.displayName ||
    input.displayName.trim().length < 1 ||
    input.displayName.length > 200
  ) {
    throw new ValidationError(
      "INVALID_DISPLAY_NAME",
      "Display name must be 1-200 characters",
      "displayName",
    );
  }
  validateItemCategory(input.category);
  validateItemType(input.itemType);
  validateRarity(input.rarity);
  validateStackMode(input.stackMode);
  validateDurabilityMode(input.durabilityMode);
  if (
    input.durabilityMode !== "none" &&
    (input.defaultDurability === undefined ||
      input.defaultDurability === null ||
      input.defaultDurability <= 0)
  ) {
    throw new ValidationError(
      "INVALID_DEFAULT_DURABILITY",
      "Default durability required when durability mode is not 'none'",
      "defaultDurability",
    );
  }
  if (
    input.stackMode === "stackable" &&
    (input.maxStackSize === undefined ||
      input.maxStackSize === null ||
      input.maxStackSize < 2)
  ) {
    throw new ValidationError(
      "INVALID_MAX_STACK_SIZE",
      "Max stack size must be >= 2 for stackable items",
      "maxStackSize",
    );
  }
  if (
    !Array.isArray(input.allowedOwnerTypes) ||
    input.allowedOwnerTypes.length === 0
  ) {
    throw new ValidationError(
      "MISSING_ALLOWED_OWNER_TYPES",
      "At least one allowed owner type is required",
      "allowedOwnerTypes",
    );
  }
  for (const ot of input.allowedOwnerTypes) {
    validateOwnerType(ot);
  }
  const metaResult = validateItemMetadata(input.category, input.metadata);
  if (!metaResult.valid) {
    throw new ValidationError(
      "METADATA_VALIDATION_FAILED",
      `Metadata validation failed: ${metaResult.errors.join("; ")}`,
      "metadata",
    );
  }
}

export interface ItemInstanceCreateInput {
  itemDefinitionId: string;
  instanceName?: string;
  quantity?: number;
  customProperties?: Record<string, unknown>;
  originType: "generated" | "discovered" | "gifted" | "crafted" | "story";
  originId?: string;
}

export function validateItemInstanceCreateInput(
  input: ItemInstanceCreateInput,
  definition: ItemDefinitionState,
): void {
  if (!input.itemDefinitionId) {
    throw new ValidationError(
      "MISSING_DEFINITION_ID",
      "Item definition ID is required",
      "itemDefinitionId",
    );
  }
  validateOriginType(input.originType);
  if (definition.durabilityMode !== "none") {
    if (input.customProperties && typeof input.customProperties !== "object") {
      throw new ValidationError(
        "INVALID_CUSTOM_PROPERTIES",
        "Custom properties must be an object",
        "customProperties",
      );
    }
  }
  const qty = input.quantity ?? 1;
  if (qty < 1) {
    throw new ValidationError(
      "INVALID_QUANTITY",
      "Quantity must be >= 1",
      "quantity",
    );
  }
  if (definition.stackMode === "non_stackable" && qty > 1) {
    throw new ValidationError(
      "NON_STACKABLE_QUANTITY",
      "Non-stackable items cannot have quantity > 1",
      "quantity",
    );
  }
  if (
    definition.stackMode === "stackable" &&
    definition.maxStackSize &&
    qty > definition.maxStackSize
  ) {
    throw new ValidationError(
      "EXCEEDS_MAX_STACK",
      `Quantity ${qty} exceeds max stack size ${definition.maxStackSize}`,
      "quantity",
    );
  }
}

export function validateOriginType(value: string): void {
  const valid = ["generated", "discovered", "gifted", "crafted", "story"];
  if (!valid.includes(value)) {
    throw new ValidationError(
      "INVALID_ORIGIN_TYPE",
      `Origin type must be one of: ${valid.join(", ")}`,
      "originType",
    );
  }
}

export interface ResolvedItemInstance {
  id: string;
  itemDefinitionId: string;
  definitionKey: string;
  displayName: string;
  category: ItemCategory;
  itemType: ItemType;
  rarity: Rarity;
  stackMode: StackMode;
  quantity: number;
  isTransferable: boolean;
  isEquippable: boolean;
  isConsumable: boolean;
  lifecycleStatus: string;
  conditionStatus: string;
  ownerType: OwnerType | null;
  ownerId: string | null;
  ownershipStatus: string | null;
}

export function combineItemInstance(
  instance: ItemInstanceState,
  definition: ItemDefinitionState,
  ownership: OwnershipState | null,
): ResolvedItemInstance {
  return {
    id: instance.id,
    itemDefinitionId: instance.itemDefinitionId,
    definitionKey: definition.definitionKey,
    displayName: definition.displayName,
    category: definition.category,
    itemType: definition.itemType,
    rarity: definition.rarity,
    stackMode: definition.stackMode,
    quantity: instance.quantity,
    isTransferable: definition.isTransferable,
    isEquippable: definition.isEquippable,
    isConsumable: definition.isConsumable,
    lifecycleStatus: instance.lifecycleStatus,
    conditionStatus: instance.conditionStatus,
    ownerType: ownership?.ownerType ?? null,
    ownerId: ownership?.ownerId ?? null,
    ownershipStatus: ownership?.status ?? null,
  };
}

export class InventoryDomainService {
  validateAcquire(
    definition: ItemDefinitionState,
    instance: ItemInstanceState,
    targetOwnerType: OwnerType,
    targetOwnerId: string,
    targetInventory: InventoryState,
    currentOwnership: OwnershipState | null,
  ): void {
    if (definition.lifecycleStatus !== "active") {
      throw new DomainError(
        "DEFINITION_NOT_ACTIVE",
        `Item definition '${definition.definitionKey}' is not active`,
      );
    }
    if (instance.lifecycleStatus !== "active") {
      throw new DomainError(
        "INSTANCE_NOT_ACTIVE",
        `Item instance '${instance.id}' is not active`,
      );
    }
    if (
      !(definition.allowedOwnerTypes as readonly string[]).includes(
        targetOwnerType,
      )
    ) {
      throw new ValidationError(
        "OWNER_TYPE_NOT_ALLOWED",
        `Owner type '${targetOwnerType}' is not allowed for this item`,
        "ownerType",
      );
    }
    if (currentOwnership && currentOwnership.status === "active") {
      throw new DomainError(
        "ITEM_ALREADY_OWNED",
        `Item instance '${instance.id}' already has an active owner`,
      );
    }
    if (definition.stackMode === "non_stackable" && instance.quantity > 1) {
      throw new DomainError(
        "NON_STACKABLE_MULTIPLE",
        "Non-stackable items cannot be acquired in quantity > 1",
      );
    }
    if (targetInventory.isLocked) {
      throw new DomainError(
        "INVENTORY_LOCKED",
        `Target inventory '${targetInventory.id}' is locked`,
      );
    }
    if (
      targetInventory.capacityMode === "slot" &&
      targetInventory.capacityValue !== null
    ) {
      this.validateCapacity(targetInventory);
    }
  }

  validateTransfer(
    definition: ItemDefinitionState,
    instance: ItemInstanceState,
    sourceOwnership: OwnershipState,
    targetOwnerType: OwnerType,
    targetOwnerId: string,
    targetInventory: InventoryState,
  ): void {
    if (!definition.isTransferable) {
      throw new DomainError(
        "ITEM_NOT_TRANSFERABLE",
        `Item '${definition.definitionKey}' is not transferable`,
      );
    }
    if (instance.lifecycleStatus !== "active") {
      throw new DomainError(
        "INSTANCE_NOT_ACTIVE",
        `Item instance '${instance.id}' is not active`,
      );
    }
    if (sourceOwnership.status !== "active") {
      throw new DomainError(
        "SOURCE_NOT_ACTIVE_OWNER",
        "Source does not have active ownership of this item",
      );
    }
    if (
      !(definition.allowedOwnerTypes as readonly string[]).includes(
        targetOwnerType,
      )
    ) {
      throw new ValidationError(
        "OWNER_TYPE_NOT_ALLOWED",
        `Owner type '${targetOwnerType}' is not allowed for this item`,
        "ownerType",
      );
    }
    if (targetInventory.isLocked) {
      throw new DomainError(
        "INVENTORY_LOCKED",
        `Target inventory '${targetInventory.id}' is locked`,
      );
    }
    if (
      targetInventory.capacityMode === "slot" &&
      targetInventory.capacityValue !== null
    ) {
      this.validateCapacity(targetInventory);
    }
  }

  validateConsume(
    definition: ItemDefinitionState,
    instance: ItemInstanceState,
    ownership: OwnershipState,
  ): void {
    if (!definition.isConsumable) {
      throw new DomainError(
        "ITEM_NOT_CONSUMABLE",
        `Item '${definition.definitionKey}' is not consumable`,
      );
    }
    if (instance.lifecycleStatus !== "active") {
      throw new DomainError(
        "INSTANCE_NOT_ACTIVE",
        `Item instance '${instance.id}' is not active`,
      );
    }
    if (ownership.status !== "active") {
      throw new DomainError(
        "NOT_OWNER",
        "Cannot consume an item you do not own",
      );
    }
    if (instance.quantity < 1) {
      throw new DomainError(
        "ZERO_QUANTITY",
        "Cannot consume an item with zero quantity",
      );
    }
  }

  validateArchive(
    instance: ItemInstanceState,
    ownership: OwnershipState,
  ): void {
    if (instance.lifecycleStatus === "archived") {
      throw new DomainError(
        "ALREADY_ARCHIVED",
        `Item instance '${instance.id}' is already archived`,
      );
    }
    if (ownership.status !== "active") {
      throw new DomainError(
        "NOT_OWNER",
        "Cannot archive an item you do not own",
      );
    }
  }

  private validateCapacity(inventory: InventoryState): void {
    if (inventory.capacityValue !== null && inventory.capacityValue <= 0) {
      throw new DomainError(
        "INVENTORY_FULL",
        `Inventory '${inventory.id}' is full`,
      );
    }
  }
}

export const inventoryDomainService = new InventoryDomainService();
