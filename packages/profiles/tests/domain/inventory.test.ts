import { describe, it, expect } from "vitest";
import {
  validateOwnerType, validateItemCategory, validateDefinitionKey,
  validateItemDefinitionInput, validateItemInstanceCreateInput,
  validateItemMetadata, validateOriginType,
  inventoryDomainService,
  combineItemInstance, DEFAULT_CAPACITY,
  ValidationError, DomainError,
  type ItemDefinitionState, type ItemInstanceState,
  type OwnershipState, type InventoryState,
} from "../../src/domain";

const SAMPLE_DEFINITION: ItemDefinitionState = {
  id: "def-001",
  definitionKey: "magic_potion",
  displayName: "Magic Potion",
  description: "A healing potion",
  category: "food",
  itemType: "consumable",
  rarity: "common",
  stackMode: "stackable",
  maxStackSize: 10,
  durabilityMode: "none",
  defaultDurability: null,
  isTransferable: true,
  isEquippable: false,
  isConsumable: true,
  isStorySelectable: true,
  allowedOwnerTypes: ["character", "household"],
  lifecycleStatus: "active",
  metadata: { nutritionValue: 5 },
};

const SAMPLE_ACTIVE_INSTANCE: ItemInstanceState = {
  id: "inst-001",
  itemDefinitionId: "def-001",
  instanceName: null,
  lifecycleStatus: "active",
  conditionStatus: "pristine",
  durabilityCurrent: null,
  durabilityMax: null,
  quantity: 1,
  customProperties: {},
  originType: "generated",
  originId: null,
};

const SAMPLE_ACTIVE_OWNERSHIP: OwnershipState = {
  id: "own-001",
  itemInstanceId: "inst-001",
  ownerType: "character",
  ownerId: "char-001",
  ownershipType: "owned",
  status: "active",
  sourceType: "generated",
  sourceId: null,
  metadata: {},
};

const SAMPLE_INVENTORY: InventoryState = {
  id: "inv-001",
  ownerType: "character",
  ownerId: "char-001",
  inventoryType: "personal",
  displayName: "Test Inventory",
  capacityMode: "slot",
  capacityValue: 20,
  isLocked: false,
  lifecycleStatus: "active",
  metadata: {},
};

describe("S07 - Owner Type Validation", () => {
  it("accepts valid owner types", () => {
    expect(() => validateOwnerType("character")).not.toThrow();
    expect(() => validateOwnerType("household")).not.toThrow();
    expect(() => validateOwnerType("child_profile")).not.toThrow();
    expect(() => validateOwnerType("location")).not.toThrow();
  });

  it("rejects invalid owner type", () => {
    expect(() => validateOwnerType("invalid_type")).toThrow(ValidationError);
  });
});

describe("S07 - Item Category Validation", () => {
  it("accepts valid categories", () => {
    expect(() => validateItemCategory("tool")).not.toThrow();
    expect(() => validateItemCategory("food")).not.toThrow();
    expect(() => validateItemCategory("key")).not.toThrow();
  });

  it("rejects invalid category", () => {
    expect(() => validateItemCategory("invalid")).toThrow(ValidationError);
  });
});

describe("S07 - Definition Key Validation", () => {
  it("accepts valid definition keys", () => {
    expect(() => validateDefinitionKey("magic_potion")).not.toThrow();
    expect(() => validateDefinitionKey("old_map_42")).not.toThrow();
  });

  it("rejects definition key with uppercase", () => {
    expect(() => validateDefinitionKey("MagicPotion")).toThrow(ValidationError);
  });

  it("rejects empty definition key", () => {
    expect(() => validateDefinitionKey("")).toThrow(ValidationError);
  });
});

describe("S07 - Item Definition Input Validation", () => {
  it("accepts valid item definition input", () => {
    expect(() => validateItemDefinitionInput({
      definitionKey: "magic_potion",
      displayName: "Magic Potion",
      category: "food",
      itemType: "consumable",
      rarity: "common",
      stackMode: "stackable",
      maxStackSize: 10,
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: false,
      isConsumable: true,
      isStorySelectable: true,
      allowedOwnerTypes: ["character"],
      metadata: { nutritionValue: 5 },
    })).not.toThrow();
  });

  it("rejects input with invalid category metadata", () => {
    expect(() => validateItemDefinitionInput({
      definitionKey: "magic_potion",
      displayName: "Magic Potion",
      category: "food",
      itemType: "consumable",
      rarity: "common",
      stackMode: "non_stackable",
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: false,
      isConsumable: true,
      isStorySelectable: true,
      allowedOwnerTypes: ["character"],
      metadata: { unknownField: "test" },
    })).toThrow(ValidationError);
  });

  it("rejects input with missing required metadata", () => {
    expect(() => validateItemDefinitionInput({
      definitionKey: "magic_potion",
      displayName: "Magic Potion",
      category: "food",
      itemType: "consumable",
      rarity: "common",
      stackMode: "non_stackable",
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: false,
      isConsumable: true,
      isStorySelectable: true,
      allowedOwnerTypes: ["character"],
      metadata: {},
    })).toThrow(ValidationError);
  });

  it("rejects input with empty allowedOwnerTypes", () => {
    expect(() => validateItemDefinitionInput({
      definitionKey: "test_item",
      displayName: "Test",
      category: "tool",
      itemType: "persistent",
      rarity: "common",
      stackMode: "non_stackable",
      durabilityMode: "none",
      isTransferable: true,
      isEquippable: false,
      isConsumable: false,
      isStorySelectable: false,
      allowedOwnerTypes: [],
      metadata: {},
    })).toThrow(ValidationError);
  });
});

describe("S07 - Metadata Validation", () => {
  it("accepts valid food metadata", () => {
    const result = validateItemMetadata("food", { nutritionValue: 5, flavorProfile: "sweet" });
    expect(result.valid).toBe(true);
  });

  it("rejects food metadata with missing required field", () => {
    const result = validateItemMetadata("food", {});
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("nutritionValue");
  });

  it("rejects metadata with unknown field", () => {
    const result = validateItemMetadata("food", { nutritionValue: 5, unknownField: "test" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("unknownField");
  });

  it("accepts tool metadata (no required fields)", () => {
    const result = validateItemMetadata("tool", { material: "wood" });
    expect(result.valid).toBe(true);
  });
});

describe("S07 - Item Instance Create Input Validation", () => {
  it("accepts valid create input for stackable item", () => {
    expect(() => validateItemInstanceCreateInput(
      { itemDefinitionId: "def-001", originType: "generated", quantity: 3 },
      SAMPLE_DEFINITION,
    )).not.toThrow();
  });

  it("rejects quantity exceeding max stack", () => {
    expect(() => validateItemInstanceCreateInput(
      { itemDefinitionId: "def-001", originType: "generated", quantity: 15 },
      SAMPLE_DEFINITION,
    )).toThrow(ValidationError);
  });

  it("rejects non-stackable item with quantity > 1", () => {
    const nonStackableDef = { ...SAMPLE_DEFINITION, stackMode: "non_stackable" as const };
    expect(() => validateItemInstanceCreateInput(
      { itemDefinitionId: "def-001", originType: "generated", quantity: 2 },
      nonStackableDef,
    )).toThrow(ValidationError);
  });

  it("rejects invalid origin type", () => {
    expect(() => validateOriginType("invalid")).toThrow(ValidationError);
  });
});

describe("S07 - Inventory Domain Service: validateAcquire", () => {
  it("accepts valid acquire", () => {
    expect(() => inventoryDomainService.validateAcquire(
      SAMPLE_DEFINITION, SAMPLE_ACTIVE_INSTANCE, "character", "char-002",
      SAMPLE_INVENTORY, null,
    )).not.toThrow();
  });

  it("rejects acquire when definition is not active", () => {
    const inactiveDef = { ...SAMPLE_DEFINITION, lifecycleStatus: "retired" as const };
    expect(() => inventoryDomainService.validateAcquire(
      inactiveDef, SAMPLE_ACTIVE_INSTANCE, "character", "char-002",
      SAMPLE_INVENTORY, null,
    )).toThrow(DomainError);
  });

  it("rejects acquire when instance already has active ownership", () => {
    expect(() => inventoryDomainService.validateAcquire(
      SAMPLE_DEFINITION, SAMPLE_ACTIVE_INSTANCE, "character", "char-002",
      SAMPLE_INVENTORY, SAMPLE_ACTIVE_OWNERSHIP,
    )).toThrow(DomainError);
  });

  it("rejects acquire for disallowed owner type", () => {
    expect(() => inventoryDomainService.validateAcquire(
      SAMPLE_DEFINITION, SAMPLE_ACTIVE_INSTANCE, "location", "loc-001",
      SAMPLE_INVENTORY, null,
    )).toThrow(ValidationError);
  });

  it("rejects acquire when target inventory is locked", () => {
    const lockedInv = { ...SAMPLE_INVENTORY, isLocked: true };
    expect(() => inventoryDomainService.validateAcquire(
      SAMPLE_DEFINITION, SAMPLE_ACTIVE_INSTANCE, "character", "char-002",
      lockedInv, null,
    )).toThrow(DomainError);
  });
});

describe("S07 - Inventory Domain Service: validateTransfer", () => {
  it("rejects transfer of non-transferable item", () => {
    const nonTransferableDef = { ...SAMPLE_DEFINITION, isTransferable: false };
    expect(() => inventoryDomainService.validateTransfer(
      nonTransferableDef, SAMPLE_ACTIVE_INSTANCE, SAMPLE_ACTIVE_OWNERSHIP,
      "character", "char-002", SAMPLE_INVENTORY,
    )).toThrow(DomainError);
  });

  it("rejects transfer when source is not active owner", () => {
    const releasedOwnership = { ...SAMPLE_ACTIVE_OWNERSHIP, status: "transferred" as const };
    expect(() => inventoryDomainService.validateTransfer(
      SAMPLE_DEFINITION, SAMPLE_ACTIVE_INSTANCE, releasedOwnership,
      "character", "char-002", SAMPLE_INVENTORY,
    )).toThrow(DomainError);
  });

  it("rejects transfer to disallowed owner type", () => {
    expect(() => inventoryDomainService.validateTransfer(
      SAMPLE_DEFINITION, SAMPLE_ACTIVE_INSTANCE, SAMPLE_ACTIVE_OWNERSHIP,
      "location", "loc-001", SAMPLE_INVENTORY,
    )).toThrow(ValidationError);
  });

  it("rejects transfer when target inventory is locked", () => {
    const lockedInv = { ...SAMPLE_INVENTORY, isLocked: true };
    expect(() => inventoryDomainService.validateTransfer(
      SAMPLE_DEFINITION, SAMPLE_ACTIVE_INSTANCE, SAMPLE_ACTIVE_OWNERSHIP,
      "character", "char-002", lockedInv,
    )).toThrow(DomainError);
  });
});

describe("S07 - Inventory Domain Service: validateConsume", () => {
  it("rejects consume of non-consumable item", () => {
    const nonConsumableDef = { ...SAMPLE_DEFINITION, isConsumable: false };
    expect(() => inventoryDomainService.validateConsume(
      nonConsumableDef, SAMPLE_ACTIVE_INSTANCE, SAMPLE_ACTIVE_OWNERSHIP,
    )).toThrow(DomainError);
  });

  it("rejects consume when not active owner", () => {
    const releasedOwnership = { ...SAMPLE_ACTIVE_OWNERSHIP, status: "transferred" as const };
    expect(() => inventoryDomainService.validateConsume(
      SAMPLE_DEFINITION, SAMPLE_ACTIVE_INSTANCE, releasedOwnership,
    )).toThrow(DomainError);
  });
});

describe("S07 - Inventory Domain Service: validateArchive", () => {
  it("rejects archive of already archived item", () => {
    const archivedInstance = { ...SAMPLE_ACTIVE_INSTANCE, lifecycleStatus: "archived" as const };
    expect(() => inventoryDomainService.validateArchive(
      archivedInstance, SAMPLE_ACTIVE_OWNERSHIP,
    )).toThrow(DomainError);
  });

  it("rejects archive when not active owner", () => {
    const releasedOwnership = { ...SAMPLE_ACTIVE_OWNERSHIP, status: "transferred" as const };
    expect(() => inventoryDomainService.validateArchive(
      SAMPLE_ACTIVE_INSTANCE, releasedOwnership,
    )).toThrow(DomainError);
  });
});

describe("S07 - combineItemInstance", () => {
  it("combines instance, definition, and ownership into resolved view", () => {
    const result = combineItemInstance(SAMPLE_ACTIVE_INSTANCE, SAMPLE_DEFINITION, SAMPLE_ACTIVE_OWNERSHIP);
    expect(result.id).toBe("inst-001");
    expect(result.definitionKey).toBe("magic_potion");
    expect(result.displayName).toBe("Magic Potion");
    expect(result.ownerType).toBe("character");
    expect(result.ownerId).toBe("char-001");
    expect(result.isTransferable).toBe(true);
    expect(result.isConsumable).toBe(true);
  });

  it("returns null ownership fields when no active ownership", () => {
    const result = combineItemInstance(SAMPLE_ACTIVE_INSTANCE, SAMPLE_DEFINITION, null);
    expect(result.ownerType).toBeNull();
    expect(result.ownerId).toBeNull();
  });
});

describe("S07 - DEFAULT_CAPACITY", () => {
  it("provides slot mode with 20 for character", () => {
    const caps = DEFAULT_CAPACITY.character;
    expect(caps.mode).toBe("slot");
    expect(caps.value).toBe(20);
  });

  it("provides unlimited for household", () => {
    const caps = DEFAULT_CAPACITY.household;
    expect(caps.mode).toBe("unlimited");
  });
});

describe("S07 - Metadata Schema Definitions", () => {
  it("validates food metadata requires nutritionValue", () => {
    const result = validateItemMetadata("food", { nutritionValue: 10 });
    expect(result.valid).toBe(true);
  });

  it("validates key metadata", () => {
    const result = validateItemMetadata("key", { unlocksId: "door-001" });
    expect(result.valid).toBe(true);
  });

  it("validates medicine metadata requires healAmount", () => {
    const result = validateItemMetadata("medicine", { healAmount: 25 });
    expect(result.valid).toBe(true);
  });
});

