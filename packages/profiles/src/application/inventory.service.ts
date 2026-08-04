import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getProfileDb } from "./db";
import { DrizzleHouseholdRepository } from "../db/repositories/drizzle/drizzle-household.repository";
import { DrizzleChildProfileRepository } from "../db/repositories/drizzle/drizzle-child-profile.repository";
import { DrizzleCharacterRepository } from "../db/repositories/drizzle/drizzle-character.repository";
import { DrizzleInventoryRepository } from "../db/repositories/drizzle/drizzle-inventory.repository";
import { inventoryEntries } from "../db/schema/profile/inventory-entries";
import { inventoryItemInstances } from "../db/schema/profile/inventory-item-instances";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  DomainError,
  validateItemDefinitionInput,
  validateItemInstanceCreateInput,
  validateOwnerType,
  validateTransferType,
  inventoryDomainService,
  combineItemInstance,
  createInventoryEvent,
  DEFAULT_CAPACITY,
  type ItemDefinitionInput,
  type ItemInstanceCreateInput,
  type ItemDefinitionState,
  type ItemInstanceState,
  type InventoryState,
  type OwnershipState,
  type OwnerType,
  type ResolvedItemInstance,
} from "../domain";
import type { InventoryDomainEvent } from "../domain/inventory-events";
import type { Database, QueryExecutor } from "../db/client";

let _testDb: Database | undefined;
export function __setTestDb(db: Database | undefined): void {
  _testDb = db;
}
function resolveDb(): Database {
  return _testDb ?? getProfileDb();
}

function getRepos(db: unknown = resolveDb()) {
  const database = db as ReturnType<typeof getProfileDb>;
  return {
    householdRepo: new DrizzleHouseholdRepository(database),
    childRepo: new DrizzleChildProfileRepository(database),
    characterRepo: new DrizzleCharacterRepository(database),
    inventoryRepo: new DrizzleInventoryRepository(database),
    db: database,
  };
}

async function assertScope(
  householdId: string,
  userId: string,
  repos: ReturnType<typeof getRepos>,
): Promise<void> {
  const household = await repos.householdRepo.findByIdForUser(
    householdId,
    userId,
  );
  if (!household) {
    throw new AuthorizationError("User is not a member of this household");
  }
}

async function assertItemInHousehold(
  itemInstanceId: string,
  householdId: string,
  repos: ReturnType<typeof getRepos>,
): Promise<Record<string, unknown>> {
  const instance = await repos.inventoryRepo.findInstanceById(
    itemInstanceId,
    householdId,
  );
  if (!instance) {
    throw new NotFoundError("ItemInstance", itemInstanceId);
  }
  return instance as unknown as Record<string, unknown>;
}

async function ensureInventoryRecord(
  ownerType: OwnerType,
  ownerId: string,
  householdId: string,
  repos: ReturnType<typeof getRepos>,
) {
  let inv = await repos.inventoryRepo.findInventoryByOwner(
    ownerType,
    ownerId,
    "personal",
    householdId,
  );
  if (!inv) {
    const caps = DEFAULT_CAPACITY[ownerType] ?? {
      mode: "unlimited" as const,
      value: 0,
    };
    inv = await repos.inventoryRepo.createInventory({
      id: crypto.randomUUID(),
      householdId,
      ownerType,
      ownerId,
      inventoryType: "personal",
      displayName: `${ownerType} inventory`,
      capacityMode: caps.mode,
      capacityValue: caps.value,
      isLocked: false,
      lifecycleStatus: "active",
      metadata: {},
    });
  }
  return inv;
}

function toItemDefinitionState(
  rec: Record<string, unknown>,
): ItemDefinitionState {
  return {
    id: rec.id as string,
    definitionKey: rec.definitionKey as string,
    displayName: rec.displayName as string,
    description: (rec.description as string) ?? null,
    category: rec.category as ItemDefinitionState["category"],
    itemType: rec.itemType as ItemDefinitionState["itemType"],
    rarity: rec.rarity as ItemDefinitionState["rarity"],
    stackMode: rec.stackMode as ItemDefinitionState["stackMode"],
    maxStackSize: (rec.maxStackSize as number) ?? null,
    durabilityMode: rec.durabilityMode as ItemDefinitionState["durabilityMode"],
    defaultDurability: (rec.defaultDurability as number) ?? null,
    isTransferable: rec.isTransferable as boolean,
    isEquippable: rec.isEquippable as boolean,
    isConsumable: rec.isConsumable as boolean,
    isStorySelectable: rec.isStorySelectable as boolean,
    allowedOwnerTypes: rec.allowedOwnerTypes as OwnerType[],
    lifecycleStatus:
      rec.lifecycleStatus as ItemDefinitionState["lifecycleStatus"],
    metadata: rec.metadata as Record<string, unknown>,
  };
}

function toItemInstanceState(rec: Record<string, unknown>): ItemInstanceState {
  return {
    id: rec.id as string,
    itemDefinitionId: rec.itemDefinitionId as string,
    instanceName: (rec.instanceName as string) ?? null,
    lifecycleStatus:
      rec.lifecycleStatus as ItemInstanceState["lifecycleStatus"],
    conditionStatus:
      rec.conditionStatus as ItemInstanceState["conditionStatus"],
    durabilityCurrent: (rec.durabilityCurrent as number) ?? null,
    durabilityMax: (rec.durabilityMax as number) ?? null,
    quantity: rec.quantity as number,
    customProperties: rec.customProperties as Record<string, unknown>,
    originType: rec.originType as ItemInstanceState["originType"],
    originId: (rec.originId as string) ?? null,
  };
}

function toOwnershipState(
  rec: Record<string, unknown> | null,
): OwnershipState | null {
  if (!rec) return null;
  return {
    id: rec.id as string,
    itemInstanceId: rec.itemInstanceId as string,
    ownerType: rec.ownerType as OwnerType,
    ownerId: rec.ownerId as string,
    ownershipType: rec.ownershipType as OwnershipState["ownershipType"],
    status: rec.status as OwnershipState["status"],
    sourceType: rec.sourceType as string,
    sourceId: (rec.sourceId as string) ?? null,
    metadata: rec.metadata as Record<string, unknown>,
  };
}

export interface InventorySummary {
  instance: ResolvedItemInstance;
  entryId: string | null;
  ownershipId: string | null;
  event: InventoryDomainEvent;
}

export async function createItemDefinition(
  userId: string,
  householdId: string,
  input: ItemDefinitionInput,
): Promise<ItemDefinitionState> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);
  validateItemDefinitionInput(input);

  const existing = await repos.inventoryRepo.findDefinitionByKey(
    input.definitionKey,
  );
  if (existing) {
    throw new DomainError(
      "DEFINITION_KEY_EXISTS",
      `Definition key '${input.definitionKey}' already exists`,
    );
  }

  const record = await repos.inventoryRepo.createDefinition({
    id: crypto.randomUUID(),
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
  });
  return toItemDefinitionState(record as unknown as Record<string, unknown>);
}

export async function acquireItem(
  userId: string,
  householdId: string,
  definitionKey: string,
  targetOwnerType: string,
  targetOwnerId: string,
  input?: ItemInstanceCreateInput,
  idempotencyKey?: string,
): Promise<InventorySummary> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);

  const validatedOwnerType = validateOwnerType(targetOwnerType);

  if (idempotencyKey) {
    const existing = await repos.inventoryRepo.findIdempotencyRecord(
      idempotencyKey,
      householdId,
      "acquire",
    );
    if (existing) {
      const inst = await repos.inventoryRepo.findInstanceById(
        existing.itemInstanceId,
        householdId,
      );
      if (inst) {
        const def = await repos.inventoryRepo.findDefinitionById(
          inst.itemDefinitionId,
        );
        const ownership = await repos.inventoryRepo.findActiveOwnershipByItem(
          inst.id,
        );
        return {
          instance: combineItemInstance(
            toItemInstanceState(inst as unknown as Record<string, unknown>),
            toItemDefinitionState(def! as unknown as Record<string, unknown>),
            toOwnershipState(ownership as unknown as Record<string, unknown>),
          ),
          entryId: null,
          ownershipId: ownership?.id ?? null,
          event: {
            id: "",
            itemInstanceId: inst.id,
            eventType: "ITEM_ACQUIRED",
            actorHouseholdId: householdId,
            actorUserId: userId,
            payload: {},
            createdAt: new Date(),
          },
        };
      }
    }
  }

  const definition =
    await repos.inventoryRepo.findDefinitionByKey(definitionKey);
  if (!definition) {
    throw new NotFoundError("ItemDefinition", definitionKey);
  }
  const defState = toItemDefinitionState(
    definition as unknown as Record<string, unknown>,
  );

  const createInput: ItemInstanceCreateInput = input ?? {
    itemDefinitionId: definition.id,
    originType: "generated",
  };
  validateItemInstanceCreateInput(createInput, defState);

  if (
    createInput.customProperties &&
    typeof createInput.customProperties === "object" &&
    Object.keys(createInput.customProperties).length > 0
  ) {
    for (const key of Object.keys(createInput.customProperties)) {
      if (
        ![
          "color",
          "size",
          "material",
          "flavor",
          "text",
          "power",
          "charge",
          "chargeMax",
          "isOpen",
          "isRead",
        ].includes(key)
      ) {
        throw new ValidationError(
          "INVALID_CUSTOM_PROPERTY",
          `Unknown custom property: ${key}`,
          key,
        );
      }
    }
  }

  const rawDb = resolveDb();
  let result: InventorySummary;

  try {
    await rawDb.transaction(async (tx) => {
      const txRepo = new DrizzleInventoryRepository(tx as never);

      const instanceId = crypto.randomUUID();

      const instance = await txRepo.createInstance({
        id: instanceId,
        itemDefinitionId: definition.id,
        householdId,
        instanceName: createInput.instanceName ?? null,
        lifecycleStatus: "active",
        conditionStatus: "pristine",
        durabilityCurrent: defState.defaultDurability,
        durabilityMax: defState.defaultDurability,
        quantity: createInput.quantity ?? 1,
        customProperties: createInput.customProperties ?? {},
        originType: createInput.originType,
        originId: createInput.originId ?? null,
      });

      const inv = await ensureInventoryRecord(
        validatedOwnerType,
        targetOwnerId,
        householdId,
        { ...repos, inventoryRepo: txRepo },
      );
      const inventoryId = inv.id;

      const targetInv: InventoryState = {
        id: inv.id,
        ownerType: validatedOwnerType,
        ownerId: targetOwnerId,
        inventoryType:
          (inv.inventoryType as InventoryState["inventoryType"]) ?? "personal",
        displayName: inv.displayName,
        capacityMode:
          (inv.capacityMode as InventoryState["capacityMode"]) ?? "unlimited",
        capacityValue: inv.capacityValue,
        isLocked: inv.isLocked,
        lifecycleStatus:
          (inv.lifecycleStatus as InventoryState["lifecycleStatus"]) ??
          "active",
        metadata: (inv.metadata as Record<string, unknown>) ?? {},
      };

      inventoryDomainService.validateAcquire(
        defState,
        toItemInstanceState(instance as unknown as Record<string, unknown>),
        validatedOwnerType,
        targetOwnerId,
        targetInv,
        null,
      );

      const ownership = await txRepo.createOwnership({
        id: crypto.randomUUID(),
        itemInstanceId: instanceId,
        ownerType: validatedOwnerType,
        ownerId: targetOwnerId,
        ownershipType: "owned",
        status: "active",
        sourceType: createInput.originType,
        sourceId: createInput.originId ?? null,
        metadata: {},
      });

      await txRepo.createEntry({
        id: crypto.randomUUID(),
        inventoryId,
        itemInstanceId: instanceId,
        sortOrder: 0,
        quantity: createInput.quantity ?? 1,
        entryStatus: "active",
        metadata: {},
      });

      await txRepo.createOwnershipHistory({
        id: crypto.randomUUID(),
        itemInstanceId: instanceId,
        toOwnerType: validatedOwnerType,
        toOwnerId: targetOwnerId,
        ownershipType: "owned",
        transferType:
          createInput.originType === "story" ? "story_reward" : "system_move",
        reason: `Acquired via ${createInput.originType}`,
        idempotencyKey: idempotencyKey ?? null,
        actorHouseholdId: householdId,
        actorUserId: userId,
      });

      const event = createInventoryEvent(
        "ITEM_ACQUIRED",
        instanceId,
        householdId,
        userId,
        {
          definitionKey,
          targetOwnerType: validatedOwnerType,
          targetOwnerId,
          quantity: createInput.quantity ?? 1,
        },
      );
      await txRepo.createDomainEvent({
        id: event.id,
        itemInstanceId: instanceId,
        eventType: "ITEM_ACQUIRED",
        actorHouseholdId: householdId,
        actorUserId: userId,
        payload: event.payload,
        idempotencyKey: idempotencyKey ?? null,
      });

      if (idempotencyKey) {
        await txRepo.createIdempotencyRecord({
          id: crypto.randomUUID(),
          idempotencyKey,
          operationType: "acquire",
          itemInstanceId: instanceId,
          actorHouseholdId: householdId,
          resultStatus: "completed",
          resultPayload: { itemInstanceId: instanceId },
        });
      }

      result = {
        instance: combineItemInstance(
          toItemInstanceState(instance as unknown as Record<string, unknown>),
          defState,
          toOwnershipState(ownership as unknown as Record<string, unknown>),
        ),
        entryId: null,
        ownershipId: ownership.id,
        event,
      };
    });
  } catch (error) {
    if (error instanceof DomainError || error instanceof ValidationError)
      throw error;
    throw error;
  }

  return result!;
}

export async function transferItem(
  userId: string,
  householdId: string,
  itemInstanceId: string,
  fromOwnerType: string,
  fromOwnerId: string,
  toOwnerType: string,
  toOwnerId: string,
  transferType: string,
  reason?: string,
  idempotencyKey?: string,
): Promise<{
  fromOwnership: OwnershipState | null;
  toOwnership: OwnershipState;
  history: Record<string, unknown>;
  event: InventoryDomainEvent;
} | null> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);

  const validatedFromOwnerType = validateOwnerType(fromOwnerType);
  const validatedToOwnerType = validateOwnerType(toOwnerType);
  const validatedTransferType = validateTransferType(transferType);

  if (idempotencyKey) {
    const existing = await repos.inventoryRepo.findTransferByIdempotencyKey(
      idempotencyKey,
      householdId,
      itemInstanceId,
      validatedTransferType,
    );
    if (existing && existing.status === "committed") {
      return null;
    }
  }

  const instance = await assertItemInHousehold(
    itemInstanceId,
    householdId,
    repos,
  );
  const instState = toItemInstanceState(instance);

  const definition = await repos.inventoryRepo.findDefinitionById(
    instance.itemDefinitionId as string,
  );
  if (!definition)
    throw new NotFoundError(
      "ItemDefinition",
      instance.itemDefinitionId as string,
    );
  const defState = toItemDefinitionState(
    definition as unknown as Record<string, unknown>,
  );

  const sourceOwnership =
    await repos.inventoryRepo.findActiveOwnershipByItem(itemInstanceId);
  if (!sourceOwnership)
    throw new DomainError(
      "NO_ACTIVE_OWNERSHIP",
      "Item has no active ownership",
    );
  const sourceOwnState = toOwnershipState(
    sourceOwnership as unknown as Record<string, unknown>,
  )!;

  const rawDb = resolveDb();
  let result: {
    fromOwnership: OwnershipState | null;
    toOwnership: OwnershipState;
    history: Record<string, unknown>;
    event: InventoryDomainEvent;
  };

  try {
    await rawDb.transaction(async (tx) => {
      const txRepo = new DrizzleInventoryRepository(tx as never);

      const txSourceOwn = await txRepo.findActiveOwnershipByItemForUpdate(
        itemInstanceId,
        tx,
      );
      if (!txSourceOwn)
        throw new DomainError(
          "SOURCE_LOST_OWNERSHIP",
          "Source no longer has active ownership (concurrent transfer)",
        );
      if (
        txSourceOwn.ownerId !== fromOwnerId ||
        txSourceOwn.ownerType !== validatedFromOwnerType
      ) {
        throw new DomainError(
          "SOURCE_MISMATCH",
          "Current owner does not match specified source owner",
        );
      }

      await txRepo.releaseOwnership(txSourceOwn.id);

      const newOwnership = await txRepo.createOwnership({
        id: crypto.randomUUID(),
        itemInstanceId,
        ownerType: validatedToOwnerType,
        ownerId: toOwnerId,
        ownershipType: "owned",
        status: "active",
        sourceType: "transfer",
        sourceId: crypto.randomUUID(),
        metadata: {},
      });

      const sourceEntry = await txRepo.findEntryByItemInstance(itemInstanceId);
      if (sourceEntry && sourceEntry.entryStatus === "active") {
        await txRepo.updateEntry(sourceEntry.id, {
          entryStatus: "removed" as const,
        });
      }

      const targetInv = await ensureInventoryRecord(
        validatedToOwnerType,
        toOwnerId,
        householdId,
        { ...repos, inventoryRepo: txRepo },
      );
      const targetInvState: InventoryState = {
        id: targetInv.id,
        ownerType: validatedToOwnerType,
        ownerId: toOwnerId,
        inventoryType:
          (targetInv.inventoryType as InventoryState["inventoryType"]) ??
          "personal",
        displayName: targetInv.displayName,
        capacityMode:
          (targetInv.capacityMode as InventoryState["capacityMode"]) ??
          "unlimited",
        capacityValue: targetInv.capacityValue,
        isLocked: targetInv.isLocked,
        lifecycleStatus:
          (targetInv.lifecycleStatus as InventoryState["lifecycleStatus"]) ??
          "active",
        metadata: (targetInv.metadata as Record<string, unknown>) ?? {},
      };

      inventoryDomainService.validateTransfer(
        defState,
        instState,
        sourceOwnState,
        validatedToOwnerType,
        toOwnerId,
        targetInvState,
      );

      await txRepo.createEntry({
        id: crypto.randomUUID(),
        inventoryId: targetInv.id,
        itemInstanceId,
        sortOrder: 0,
        quantity: instState.quantity,
        entryStatus: "active",
        metadata: {},
      });

      await txRepo.createTransfer({
        id: crypto.randomUUID(),
        actorHouseholdId: householdId,
        itemInstanceId,
        fromOwnerType: validatedFromOwnerType,
        fromOwnerId,
        toOwnerType: validatedToOwnerType,
        toOwnerId,
        transferType: validatedTransferType,
        status: "committed",
        reason: reason ?? null,
        sourceType: "user",
        sourceId: userId,
        idempotencyKey: idempotencyKey ?? null,
        committedAt: new Date(),
      });

      await txRepo.createOwnershipHistory({
        id: crypto.randomUUID(),
        itemInstanceId,
        fromOwnerType: validatedFromOwnerType,
        fromOwnerId,
        toOwnerType: validatedToOwnerType,
        toOwnerId,
        ownershipType: "owned",
        transferType: validatedTransferType,
        reason: reason ?? null,
        idempotencyKey: idempotencyKey ?? null,
        actorHouseholdId: householdId,
        actorUserId: userId,
      });

      const event = createInventoryEvent(
        "ITEM_TRANSFERRED",
        itemInstanceId,
        householdId,
        userId,
        {
          fromOwnerType: validatedFromOwnerType,
          fromOwnerId,
          toOwnerType: validatedToOwnerType,
          toOwnerId,
          transferType: validatedTransferType,
        },
      );
      await txRepo.createDomainEvent({
        id: event.id,
        itemInstanceId,
        eventType: "ITEM_TRANSFERRED",
        actorHouseholdId: householdId,
        actorUserId: userId,
        payload: event.payload,
        idempotencyKey: idempotencyKey ?? null,
      });

      result = {
        fromOwnership: toOwnershipState(
          txSourceOwn as unknown as Record<string, unknown>,
        ),
        toOwnership: toOwnershipState(
          newOwnership as unknown as Record<string, unknown>,
        )!,
        history: {
          fromOwnerType: validatedFromOwnerType,
          fromOwnerId,
          toOwnerType: validatedToOwnerType,
          toOwnerId,
          transferType: validatedTransferType,
        },
        event,
      };
    });
  } catch (error) {
    if (error instanceof DomainError || error instanceof ValidationError)
      throw error;
    throw error;
  }

  return result!;
}

export async function consumeItem(
  userId: string,
  householdId: string,
  itemInstanceId: string,
  quantity: number = 1,
  idempotencyKey?: string,
): Promise<InventoryDomainEvent> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);

  if (idempotencyKey) {
    const existing = await repos.inventoryRepo.findIdempotencyRecord(
      idempotencyKey,
      householdId,
      "consume",
    );
    if (existing) {
      return {
        id: "",
        itemInstanceId,
        eventType: "ITEM_CONSUMED",
        actorHouseholdId: householdId,
        actorUserId: userId,
        payload: {},
        createdAt: new Date(),
      };
    }
  }

  const instance = await assertItemInHousehold(
    itemInstanceId,
    householdId,
    repos,
  );
  const instState = toItemInstanceState(instance);

  const definition = await repos.inventoryRepo.findDefinitionById(
    instance.itemDefinitionId as string,
  );
  if (!definition)
    throw new NotFoundError(
      "ItemDefinition",
      instance.itemDefinitionId as string,
    );
  const defState = toItemDefinitionState(
    definition as unknown as Record<string, unknown>,
  );

  const ownership =
    await repos.inventoryRepo.findActiveOwnershipByItem(itemInstanceId);
  if (!ownership)
    throw new DomainError("NO_ACTIVE_OWNERSHIP", "Item has no active owner");
  const ownState = toOwnershipState(
    ownership as unknown as Record<string, unknown>,
  )!;

  inventoryDomainService.validateConsume(defState, instState, ownState);

  const rawDb = resolveDb();
  let event: InventoryDomainEvent;

  try {
    await rawDb.transaction(async (tx) => {
      const txRepo = new DrizzleInventoryRepository(tx as never);

      const newQty = instState.quantity - quantity;
      if (newQty <= 0) {
        await txRepo.updateInstance(itemInstanceId, {
          lifecycleStatus: "consumed",
          quantity: 0,
        });
        const entry = await txRepo.findEntryByItemInstance(itemInstanceId);
        if (entry && entry.entryStatus === "active") {
          await txRepo.updateEntry(entry.id, {
            entryStatus: "removed" as const,
            quantity: 0,
          });
        }
        await txRepo.releaseOwnership(ownership.id);
      } else {
        await txRepo.updateInstance(itemInstanceId, {
          quantity: newQty,
        });
        const entry = await txRepo.findEntryByItemInstance(itemInstanceId);
        if (entry && entry.entryStatus === "active") {
          await txRepo.updateEntry(entry.id, { quantity: newQty });
        }
      }

      await txRepo.createUsage({
        id: crypto.randomUUID(),
        itemInstanceId,
        usedByOwnerType: ownState.ownerType,
        usedByOwnerId: ownState.ownerId,
        usageType: "consume",
        usageContext: null,
        quantityUsed: quantity,
        validationStatus: "valid",
        applicationStatus: "applied",
        idempotencyKey: idempotencyKey ?? null,
        actorHouseholdId: householdId,
        actorUserId: userId,
      });

      event = createInventoryEvent(
        "ITEM_CONSUMED",
        itemInstanceId,
        householdId,
        userId,
        {
          quantity,
          remainingQuantity: Math.max(0, newQty),
        },
      );
      await txRepo.createDomainEvent({
        id: event.id,
        itemInstanceId,
        eventType: "ITEM_CONSUMED",
        actorHouseholdId: householdId,
        actorUserId: userId,
        payload: event.payload,
        idempotencyKey: idempotencyKey ?? null,
      });

      if (idempotencyKey) {
        await txRepo.createIdempotencyRecord({
          id: crypto.randomUUID(),
          idempotencyKey,
          operationType: "consume",
          itemInstanceId,
          actorHouseholdId: householdId,
          resultStatus: "completed",
          resultPayload: { consumed: quantity },
        });
      }
    });
  } catch (error) {
    if (error instanceof DomainError || error instanceof ValidationError)
      throw error;
    throw error;
  }

  return event!;
}

export async function archiveItem(
  userId: string,
  householdId: string,
  itemInstanceId: string,
  reason?: string,
  idempotencyKey?: string,
): Promise<InventoryDomainEvent> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);

  if (idempotencyKey) {
    const existing = await repos.inventoryRepo.findIdempotencyRecord(
      idempotencyKey,
      householdId,
      "archive",
    );
    if (existing) {
      return {
        id: "",
        itemInstanceId,
        eventType: "ITEM_ARCHIVED",
        actorHouseholdId: householdId,
        actorUserId: userId,
        payload: {},
        createdAt: new Date(),
      };
    }
  }

  const instance = await assertItemInHousehold(
    itemInstanceId,
    householdId,
    repos,
  );
  const instState = toItemInstanceState(instance);

  const ownership =
    await repos.inventoryRepo.findActiveOwnershipByItem(itemInstanceId);
  if (!ownership)
    throw new DomainError("NO_ACTIVE_OWNERSHIP", "Item has no active owner");
  const ownState = toOwnershipState(
    ownership as unknown as Record<string, unknown>,
  )!;

  inventoryDomainService.validateArchive(instState, ownState);

  const rawDb = resolveDb();
  let event: InventoryDomainEvent;

  try {
    await rawDb.transaction(async (tx) => {
      const txRepo = new DrizzleInventoryRepository(tx as never);

      await txRepo.updateInstance(itemInstanceId, {
        lifecycleStatus: "archived",
        archivedAt: new Date(),
      });

      const entry = await txRepo.findEntryByItemInstance(itemInstanceId);
      if (entry && entry.entryStatus === "active") {
        await txRepo.updateEntry(entry.id, { entryStatus: "removed" as const });
      }

      await txRepo.releaseOwnership(ownership.id);

      event = createInventoryEvent(
        "ITEM_ARCHIVED",
        itemInstanceId,
        householdId,
        userId,
        {
          reason: reason ?? null,
        },
      );
      await txRepo.createDomainEvent({
        id: event.id,
        itemInstanceId,
        eventType: "ITEM_ARCHIVED",
        actorHouseholdId: householdId,
        actorUserId: userId,
        payload: event.payload,
        idempotencyKey: idempotencyKey ?? null,
      });

      if (idempotencyKey) {
        await txRepo.createIdempotencyRecord({
          id: crypto.randomUUID(),
          idempotencyKey,
          operationType: "archive",
          itemInstanceId,
          actorHouseholdId: householdId,
          resultStatus: "completed",
          resultPayload: { archived: true },
        });
      }
    });
  } catch (error) {
    if (error instanceof DomainError || error instanceof ValidationError)
      throw error;
    throw error;
  }

  return event!;
}

export async function getItem(
  userId: string,
  householdId: string,
  itemInstanceId: string,
): Promise<ResolvedItemInstance | null> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);

  const instance = await repos.inventoryRepo.findInstanceById(
    itemInstanceId,
    householdId,
  );
  if (!instance) return null;

  const definition = await repos.inventoryRepo.findDefinitionById(
    instance.itemDefinitionId,
  );
  if (!definition) return null;

  const ownership =
    await repos.inventoryRepo.findActiveOwnershipByItem(itemInstanceId);

  return combineItemInstance(
    toItemInstanceState(instance as unknown as Record<string, unknown>),
    toItemDefinitionState(definition as unknown as Record<string, unknown>),
    toOwnershipState(ownership as unknown as Record<string, unknown>),
  );
}

export async function getItemHistory(
  userId: string,
  householdId: string,
  itemInstanceId: string,
): Promise<InventoryDomainEvent[]> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);

  const instance = await repos.inventoryRepo.findInstanceById(
    itemInstanceId,
    householdId,
  );
  if (!instance) throw new NotFoundError("ItemInstance", itemInstanceId);

  const events = await repos.inventoryRepo.getDomainEvents(itemInstanceId);
  return events as unknown as InventoryDomainEvent[];
}

export async function listInventory(
  userId: string,
  householdId: string,
  ownerType: string,
  ownerId: string,
): Promise<ResolvedItemInstance[]> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);

  const inv = await repos.inventoryRepo.findInventoryByOwner(
    ownerType,
    ownerId,
    "personal",
    householdId,
  );
  if (!inv) return [];

  const rows = await (repos.db as QueryExecutor)
    .select({
      id: inventoryItemInstances.id,
      itemDefinitionId: inventoryItemInstances.itemDefinitionId,
      instanceName: inventoryItemInstances.instanceName,
      lifecycleStatus: inventoryItemInstances.lifecycleStatus,
      conditionStatus: inventoryItemInstances.conditionStatus,
      durabilityCurrent: inventoryItemInstances.durabilityCurrent,
      durabilityMax: inventoryItemInstances.durabilityMax,
      quantity: inventoryItemInstances.quantity,
      customProperties: inventoryItemInstances.customProperties,
      originType: inventoryItemInstances.originType,
      originId: inventoryItemInstances.originId,
    })
    .from(inventoryEntries)
    .innerJoin(
      inventoryItemInstances,
      eq(inventoryEntries.itemInstanceId, inventoryItemInstances.id),
    )
    .where(
      and(
        eq(inventoryEntries.inventoryId, inv.id),
        eq(inventoryEntries.entryStatus, "active"),
      ),
    );

  const results: ResolvedItemInstance[] = [];
  for (const inst of rows) {
    const def = await repos.inventoryRepo.findDefinitionById(
      inst.itemDefinitionId,
    );
    if (!def) continue;
    const ownership = await repos.inventoryRepo.findActiveOwnershipByItem(
      inst.id,
    );
    results.push(
      combineItemInstance(
        toItemInstanceState(inst as unknown as Record<string, unknown>),
        toItemDefinitionState(def as unknown as Record<string, unknown>),
        toOwnershipState(ownership as unknown as Record<string, unknown>),
      ),
    );
  }
  return results;
}
