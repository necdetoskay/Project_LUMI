import crypto from "node:crypto";

import { DrizzleChildProfileRepository } from "../db/repositories/drizzle/drizzle-child-profile.repository";
import { DrizzleInventoryRepository } from "../db/repositories/drizzle/drizzle-inventory.repository";
import {
  AuthorizationError,
  DEFAULT_CAPACITY,
  NotFoundError,
  ValidationError,
  inventoryDomainService,
  validateItemInstanceCreateInput,
  type InventoryState,
  type ItemDefinitionState,
  type ItemInstanceState,
} from "../domain";
import { getProfileDb } from "./db";

export const STORY_REWARD_SYSTEM_AUTHORITY = "story_reward_worker" as const;
export type InventorySystemAuthority = typeof STORY_REWARD_SYSTEM_AUTHORITY;

export interface StoryRewardSystemGrantInput {
  authority: string;
  householdId: string;
  childProfileId: string;
  itemDefinitionKey: string;
  quantity: number;
  idempotencyKey: string;
  sourceQuestId: string;
}

export interface StoryRewardSystemGrantResult {
  granted: boolean;
  itemInstanceId: string;
}

function toDefinitionState(record: Record<string, unknown>): ItemDefinitionState {
  return {
    id: record.id as string,
    definitionKey: record.definitionKey as string,
    displayName: record.displayName as string,
    description: (record.description as string) ?? null,
    category: record.category as ItemDefinitionState["category"],
    itemType: record.itemType as ItemDefinitionState["itemType"],
    rarity: record.rarity as ItemDefinitionState["rarity"],
    stackMode: record.stackMode as ItemDefinitionState["stackMode"],
    maxStackSize: (record.maxStackSize as number) ?? null,
    durabilityMode: record.durabilityMode as ItemDefinitionState["durabilityMode"],
    defaultDurability: (record.defaultDurability as number) ?? null,
    isTransferable: record.isTransferable as boolean,
    isEquippable: record.isEquippable as boolean,
    isConsumable: record.isConsumable as boolean,
    isStorySelectable: record.isStorySelectable as boolean,
    allowedOwnerTypes: record.allowedOwnerTypes as ItemDefinitionState["allowedOwnerTypes"],
    lifecycleStatus: record.lifecycleStatus as ItemDefinitionState["lifecycleStatus"],
    metadata: (record.metadata as Record<string, unknown>) ?? {},
  };
}

function toInstanceState(record: Record<string, unknown>): ItemInstanceState {
  return {
    id: record.id as string,
    itemDefinitionId: record.itemDefinitionId as string,
    instanceName: (record.instanceName as string) ?? null,
    lifecycleStatus: record.lifecycleStatus as ItemInstanceState["lifecycleStatus"],
    conditionStatus: record.conditionStatus as ItemInstanceState["conditionStatus"],
    durabilityCurrent: (record.durabilityCurrent as number) ?? null,
    durabilityMax: (record.durabilityMax as number) ?? null,
    quantity: record.quantity as number,
    customProperties: (record.customProperties as Record<string, unknown>) ?? {},
    originType: record.originType as ItemInstanceState["originType"],
    originId: (record.originId as string) ?? null,
  };
}

export async function grantStoryRewardAsSystem(
  input: StoryRewardSystemGrantInput,
): Promise<StoryRewardSystemGrantResult> {
  if (input.authority !== STORY_REWARD_SYSTEM_AUTHORITY) {
    throw new AuthorizationError("Inventory system authority is not allowed");
  }
  if (!input.householdId || !input.childProfileId || !input.sourceQuestId) {
    throw new ValidationError(
      "INVALID_SYSTEM_GRANT_SCOPE",
      "System reward grant requires household, child profile and quest scope",
    );
  }
  if (!input.idempotencyKey.startsWith("quest-reward:")) {
    throw new ValidationError(
      "INVALID_SYSTEM_GRANT_IDEMPOTENCY",
      "Story reward grants require a quest-reward idempotency key",
    );
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new ValidationError(
      "INVALID_SYSTEM_GRANT_QUANTITY",
      "Story reward quantity must be a positive integer",
    );
  }

  const db = getProfileDb();
  const childRepo = new DrizzleChildProfileRepository(db);
  const inventoryRepo = new DrizzleInventoryRepository(db);

  const child = await childRepo.findById(input.childProfileId, input.householdId);
  if (!child) {
    throw new AuthorizationError(
      "Child profile is not active in the requested household",
    );
  }

  const existing = await inventoryRepo.findIdempotencyRecord(
    input.idempotencyKey,
    input.householdId,
    "acquire",
  );
  if (existing) {
    return { granted: false, itemInstanceId: existing.itemInstanceId };
  }

  const definition = await inventoryRepo.findDefinitionByKey(
    input.itemDefinitionKey,
  );
  if (!definition) {
    throw new NotFoundError("ItemDefinition", input.itemDefinitionKey);
  }
  const definitionState = toDefinitionState(
    definition as unknown as Record<string, unknown>,
  );
  const createInput = {
    itemDefinitionId: definition.id,
    quantity: input.quantity,
    originType: "story" as const,
    originId: input.sourceQuestId,
  };
  validateItemInstanceCreateInput(createInput, definitionState);

  let result: StoryRewardSystemGrantResult | undefined;
  await db.transaction(async (tx) => {
    const repo = new DrizzleInventoryRepository(tx as never);

    const replay = await repo.findIdempotencyRecord(
      input.idempotencyKey,
      input.householdId,
      "acquire",
    );
    if (replay) {
      result = { granted: false, itemInstanceId: replay.itemInstanceId };
      return;
    }

    const itemInstanceId = crypto.randomUUID();
    const instance = await repo.createInstance({
      id: itemInstanceId,
      itemDefinitionId: definition.id,
      householdId: input.householdId,
      instanceName: null,
      lifecycleStatus: "active",
      conditionStatus: "pristine",
      durabilityCurrent: definitionState.defaultDurability,
      durabilityMax: definitionState.defaultDurability,
      quantity: input.quantity,
      customProperties: {},
      originType: "story",
      originId: input.sourceQuestId,
    });

    let inventory = await repo.findInventoryByOwner(
      "child_profile",
      input.childProfileId,
      "personal",
      input.householdId,
    );
    if (!inventory) {
      const capacity = DEFAULT_CAPACITY.child_profile ?? {
        mode: "unlimited" as const,
        value: 0,
      };
      inventory = await repo.createInventory({
        id: crypto.randomUUID(),
        householdId: input.householdId,
        ownerType: "child_profile",
        ownerId: input.childProfileId,
        inventoryType: "personal",
        displayName: "child_profile inventory",
        capacityMode: capacity.mode,
        capacityValue: capacity.value,
        isLocked: false,
        lifecycleStatus: "active",
        metadata: {},
      });
    }

    const inventoryState: InventoryState = {
      id: inventory.id,
      ownerType: "child_profile",
      ownerId: input.childProfileId,
      inventoryType: (inventory.inventoryType as InventoryState["inventoryType"]) ?? "personal",
      displayName: inventory.displayName,
      capacityMode: (inventory.capacityMode as InventoryState["capacityMode"]) ?? "unlimited",
      capacityValue: inventory.capacityValue,
      isLocked: inventory.isLocked,
      lifecycleStatus: (inventory.lifecycleStatus as InventoryState["lifecycleStatus"]) ?? "active",
      metadata: (inventory.metadata as Record<string, unknown>) ?? {},
    };

    inventoryDomainService.validateAcquire(
      definitionState,
      toInstanceState(instance as unknown as Record<string, unknown>),
      "child_profile",
      input.childProfileId,
      inventoryState,
      null,
    );

    const ownership = await repo.createOwnership({
      id: crypto.randomUUID(),
      itemInstanceId,
      ownerType: "child_profile",
      ownerId: input.childProfileId,
      ownershipType: "owned",
      status: "active",
      sourceType: "story",
      sourceId: input.sourceQuestId,
      metadata: { authority: STORY_REWARD_SYSTEM_AUTHORITY },
    });

    await repo.createEntry({
      id: crypto.randomUUID(),
      inventoryId: inventory.id,
      itemInstanceId,
      sortOrder: 0,
      quantity: input.quantity,
      entryStatus: "active",
      metadata: {},
    });

    await repo.createOwnershipHistory({
      id: crypto.randomUUID(),
      itemInstanceId,
      toOwnerType: "child_profile",
      toOwnerId: input.childProfileId,
      ownershipType: "owned",
      transferType: "story_reward",
      reason: "Quest reward granted by story reward worker",
      idempotencyKey: input.idempotencyKey,
      actorHouseholdId: input.householdId,
      actorUserId: null,
    });

    const eventId = crypto.randomUUID();
    const eventPayload = {
      definitionKey: input.itemDefinitionKey,
      targetOwnerType: "child_profile",
      targetOwnerId: input.childProfileId,
      quantity: input.quantity,
      authority: STORY_REWARD_SYSTEM_AUTHORITY,
      sourceQuestId: input.sourceQuestId,
    };
    await repo.createDomainEvent({
      id: eventId,
      itemInstanceId,
      eventType: "ITEM_ACQUIRED",
      actorHouseholdId: input.householdId,
      actorUserId: null,
      payload: eventPayload,
      idempotencyKey: input.idempotencyKey,
    });

    await repo.createIdempotencyRecord({
      id: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      operationType: "acquire",
      itemInstanceId,
      actorHouseholdId: input.householdId,
      resultStatus: "completed",
      resultPayload: {
        itemInstanceId,
        authority: STORY_REWARD_SYSTEM_AUTHORITY,
        ownershipId: ownership.id,
      },
    });

    result = { granted: true, itemInstanceId };
  });

  if (!result) {
    throw new Error("SYSTEM_INVENTORY_GRANT_NO_RESULT");
  }
  return result;
}
