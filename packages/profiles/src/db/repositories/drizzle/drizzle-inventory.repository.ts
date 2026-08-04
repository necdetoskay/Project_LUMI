import { and, eq } from "drizzle-orm";
import type { QueryExecutor } from "../../client";
import {
  inventoryItemDefinitions,
  inventoryItemInstances,
  inventoryInventories,
  inventoryEntries,
  inventoryOwnerships,
  inventoryOwnershipHistory,
  inventoryTransfers,
  inventoryUsages,
  inventoryDomainEvents,
  inventoryIdempotencyLedger,
  type InventoryItemDefinitionRecord,
  type NewInventoryItemDefinitionRecord,
  type InventoryItemInstanceRecord,
  type NewInventoryItemInstanceRecord,
  type InventoryRecord,
  type NewInventoryRecord,
  type InventoryEntryRecord,
  type NewInventoryEntryRecord,
  type InventoryOwnershipRecord,
  type NewInventoryOwnershipRecord,
  type InventoryOwnershipHistoryRecord,
  type NewInventoryOwnershipHistoryRecord,
  type InventoryTransferRecord,
  type NewInventoryTransferRecord,
  type InventoryUsageRecord,
  type NewInventoryUsageRecord,
  type InventoryDomainEventRecord,
  type NewInventoryDomainEventRecord,
  type InventoryIdempotencyLedgerRecord,
  type NewInventoryIdempotencyLedgerRecord,
} from "../../schema/profile";
import type { InventoryRepository } from "../interfaces/inventory.repository";

export class DrizzleInventoryRepository implements InventoryRepository {
  constructor(private readonly db: QueryExecutor) {}

  async createDefinition(
    input: NewInventoryItemDefinitionRecord,
  ): Promise<InventoryItemDefinitionRecord> {
    const [record] = await this.db
      .insert(inventoryItemDefinitions)
      .values(input)
      .returning();
    if (!record) throw new Error("Definition creation returned no record");
    return record as InventoryItemDefinitionRecord;
  }

  async findDefinitionById(
    id: string,
  ): Promise<InventoryItemDefinitionRecord | null> {
    if (!id) throw new Error("findDefinitionById requires id");
    const [record] = await this.db
      .select()
      .from(inventoryItemDefinitions)
      .where(eq(inventoryItemDefinitions.id, id))
      .limit(1);
    return (record as InventoryItemDefinitionRecord) ?? null;
  }

  async findDefinitionByKey(
    key: string,
  ): Promise<InventoryItemDefinitionRecord | null> {
    if (!key) throw new Error("findDefinitionByKey requires key");
    const [record] = await this.db
      .select()
      .from(inventoryItemDefinitions)
      .where(eq(inventoryItemDefinitions.definitionKey, key))
      .limit(1);
    return (record as InventoryItemDefinitionRecord) ?? null;
  }

  async createInstance(
    input: NewInventoryItemInstanceRecord,
  ): Promise<InventoryItemInstanceRecord> {
    const [record] = await this.db
      .insert(inventoryItemInstances)
      .values(input)
      .returning();
    if (!record) throw new Error("Instance creation returned no record");
    return record as InventoryItemInstanceRecord;
  }

  async findInstanceById(
    id: string,
    householdId?: string,
  ): Promise<InventoryItemInstanceRecord | null> {
    if (!id) throw new Error("findInstanceById requires id");
    const conditions = [eq(inventoryItemInstances.id, id)];
    if (householdId)
      conditions.push(eq(inventoryItemInstances.householdId, householdId));
    const [record] = await this.db
      .select()
      .from(inventoryItemInstances)
      .where(and(...conditions))
      .limit(1);
    return (record as InventoryItemInstanceRecord) ?? null;
  }

  async updateInstance(
    id: string,
    input: Partial<NewInventoryItemInstanceRecord>,
  ): Promise<InventoryItemInstanceRecord> {
    const [record] = await this.db
      .update(inventoryItemInstances)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(inventoryItemInstances.id, id))
      .returning();
    if (!record) throw new Error("Instance update returned no record");
    return record as InventoryItemInstanceRecord;
  }

  async createInventory(input: NewInventoryRecord): Promise<InventoryRecord> {
    const [record] = await this.db
      .insert(inventoryInventories)
      .values(input)
      .returning();
    if (!record) throw new Error("Inventory creation returned no record");
    return record as InventoryRecord;
  }

  async findInventoryByOwner(
    ownerType: string,
    ownerId: string,
    inventoryType?: string,
    householdId?: string,
  ): Promise<InventoryRecord | null> {
    if (!ownerType || !ownerId)
      throw new Error("findInventoryByOwner requires ownerType and ownerId");
    const conditions = [
      eq(inventoryInventories.ownerType, ownerType),
      eq(inventoryInventories.ownerId, ownerId),
    ];
    if (inventoryType)
      conditions.push(eq(inventoryInventories.inventoryType, inventoryType));
    if (householdId)
      conditions.push(eq(inventoryInventories.householdId, householdId));
    const [record] = await this.db
      .select({
        id: inventoryInventories.id,
        householdId: inventoryInventories.householdId,
        ownerType: inventoryInventories.ownerType,
        ownerId: inventoryInventories.ownerId,
        inventoryType: inventoryInventories.inventoryType,
        displayName: inventoryInventories.displayName,
        capacityMode: inventoryInventories.capacityMode,
        capacityValue: inventoryInventories.capacityValue,
        isLocked: inventoryInventories.isLocked,
        lifecycleStatus: inventoryInventories.lifecycleStatus,
        metadata: inventoryInventories.metadata,
        createdAt: inventoryInventories.createdAt,
        updatedAt: inventoryInventories.updatedAt,
        version: inventoryInventories.version,
      })
      .from(inventoryInventories)
      .where(and(...conditions))
      .limit(1);
    return (record as InventoryRecord) ?? null;
  }

  async findInventoryById(
    id: string,
    householdId?: string,
  ): Promise<InventoryRecord | null> {
    const conditions = [eq(inventoryInventories.id, id)];
    if (householdId)
      conditions.push(eq(inventoryInventories.householdId, householdId));
    const [record] = await this.db
      .select({
        id: inventoryInventories.id,
        householdId: inventoryInventories.householdId,
        ownerType: inventoryInventories.ownerType,
        ownerId: inventoryInventories.ownerId,
        inventoryType: inventoryInventories.inventoryType,
        displayName: inventoryInventories.displayName,
        capacityMode: inventoryInventories.capacityMode,
        capacityValue: inventoryInventories.capacityValue,
        isLocked: inventoryInventories.isLocked,
        lifecycleStatus: inventoryInventories.lifecycleStatus,
        metadata: inventoryInventories.metadata,
        createdAt: inventoryInventories.createdAt,
        updatedAt: inventoryInventories.updatedAt,
        version: inventoryInventories.version,
      })
      .from(inventoryInventories)
      .where(and(...conditions))
      .limit(1);
    return (record as InventoryRecord) ?? null;
  }

  async createEntry(
    input: NewInventoryEntryRecord,
  ): Promise<InventoryEntryRecord> {
    const [record] = await this.db
      .insert(inventoryEntries)
      .values(input)
      .returning();
    if (!record) throw new Error("Entry creation returned no record");
    return record as InventoryEntryRecord;
  }

  async findEntryByInventoryAndInstance(
    inventoryId: string,
    itemInstanceId: string,
  ): Promise<InventoryEntryRecord | null> {
    const [record] = await this.db
      .select()
      .from(inventoryEntries)
      .where(
        and(
          eq(inventoryEntries.inventoryId, inventoryId),
          eq(inventoryEntries.itemInstanceId, itemInstanceId),
        ),
      )
      .limit(1);
    return (record as InventoryEntryRecord) ?? null;
  }

  async findEntryByItemInstance(
    itemInstanceId: string,
  ): Promise<InventoryEntryRecord | null> {
    if (!itemInstanceId)
      throw new Error("findEntryByItemInstance requires itemInstanceId");
    const [record] = await this.db
      .select({
        id: inventoryEntries.id,
        inventoryId: inventoryEntries.inventoryId,
        itemInstanceId: inventoryEntries.itemInstanceId,
        slotKey: inventoryEntries.slotKey,
        sortOrder: inventoryEntries.sortOrder,
        quantity: inventoryEntries.quantity,
        entryStatus: inventoryEntries.entryStatus,
        metadata: inventoryEntries.metadata,
        createdAt: inventoryEntries.createdAt,
        updatedAt: inventoryEntries.updatedAt,
      })
      .from(inventoryEntries)
      .where(
        and(
          eq(inventoryEntries.itemInstanceId, itemInstanceId),
          eq(inventoryEntries.entryStatus, "active"),
        ),
      )
      .limit(1);
    return (record as InventoryEntryRecord) ?? null;
  }

  async updateEntry(
    id: string,
    input: Partial<NewInventoryEntryRecord>,
  ): Promise<InventoryEntryRecord> {
    if (!id) throw new Error("updateEntry requires id");
    const [record] = await this.db
      .update(inventoryEntries)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(inventoryEntries.id, id))
      .returning();
    if (!record) throw new Error("Entry update returned no record");
    return record as InventoryEntryRecord;
  }

  async removeEntry(id: string): Promise<void> {
    await this.db.delete(inventoryEntries).where(eq(inventoryEntries.id, id));
  }

  async createOwnership(
    input: NewInventoryOwnershipRecord,
  ): Promise<InventoryOwnershipRecord> {
    const [record] = await this.db
      .insert(inventoryOwnerships)
      .values(input)
      .returning();
    if (!record) throw new Error("Ownership creation returned no record");
    return record as InventoryOwnershipRecord;
  }

  async findActiveOwnershipByItem(
    itemInstanceId: string,
  ): Promise<InventoryOwnershipRecord | null> {
    if (!itemInstanceId)
      throw new Error("findActiveOwnershipByItem requires itemInstanceId");
    const [record] = await this.db
      .select()
      .from(inventoryOwnerships)
      .where(
        and(
          eq(inventoryOwnerships.itemInstanceId, itemInstanceId),
          eq(inventoryOwnerships.status, "active"),
        ),
      )
      .limit(1);
    return (record as InventoryOwnershipRecord) ?? null;
  }

  async findActiveOwnershipByItemForUpdate(
    itemInstanceId: string,
    tx: unknown,
  ): Promise<InventoryOwnershipRecord | null> {
    const qe = tx as QueryExecutor;
    const [record] = await qe
      .select()
      .from(inventoryOwnerships)
      .where(
        and(
          eq(inventoryOwnerships.itemInstanceId, itemInstanceId),
          eq(inventoryOwnerships.status, "active"),
        ),
      )
      .limit(1);
    return (record as InventoryOwnershipRecord) ?? null;
  }

  async releaseOwnership(id: string): Promise<void> {
    await this.db
      .update(inventoryOwnerships)
      .set({ status: "transferred" as const, releasedAt: new Date() })
      .where(eq(inventoryOwnerships.id, id));
  }

  async createOwnershipHistory(
    input: NewInventoryOwnershipHistoryRecord,
  ): Promise<InventoryOwnershipHistoryRecord> {
    const [record] = await this.db
      .insert(inventoryOwnershipHistory)
      .values(input)
      .returning();
    if (!record)
      throw new Error("Ownership history creation returned no record");
    return record as InventoryOwnershipHistoryRecord;
  }

  async createTransfer(
    input: NewInventoryTransferRecord,
  ): Promise<InventoryTransferRecord> {
    const [record] = await this.db
      .insert(inventoryTransfers)
      .values(input)
      .returning();
    if (!record) throw new Error("Transfer creation returned no record");
    return record as InventoryTransferRecord;
  }

  async findTransferByIdempotencyKey(
    key: string,
    householdId: string,
    itemInstanceId: string,
    transferType: string,
  ): Promise<InventoryTransferRecord | null> {
    const [record] = await this.db
      .select()
      .from(inventoryTransfers)
      .where(
        and(
          eq(inventoryTransfers.idempotencyKey, key),
          eq(inventoryTransfers.actorHouseholdId, householdId),
          eq(inventoryTransfers.itemInstanceId, itemInstanceId),
          eq(inventoryTransfers.transferType, transferType),
        ),
      )
      .limit(1);
    return (record as InventoryTransferRecord) ?? null;
  }

  async createUsage(
    input: NewInventoryUsageRecord,
  ): Promise<InventoryUsageRecord> {
    const [record] = await this.db
      .insert(inventoryUsages)
      .values(input)
      .returning();
    if (!record) throw new Error("Usage creation returned no record");
    return record as InventoryUsageRecord;
  }

  async createDomainEvent(
    input: NewInventoryDomainEventRecord,
  ): Promise<InventoryDomainEventRecord> {
    const [record] = await this.db
      .insert(inventoryDomainEvents)
      .values(input)
      .returning();
    if (!record) throw new Error("Domain event creation returned no record");
    return record as InventoryDomainEventRecord;
  }

  async getDomainEvents(
    itemInstanceId: string,
  ): Promise<InventoryDomainEventRecord[]> {
    const rows = await this.db
      .select()
      .from(inventoryDomainEvents)
      .where(eq(inventoryDomainEvents.itemInstanceId, itemInstanceId))
      .orderBy(inventoryDomainEvents.createdAt);
    return rows as InventoryDomainEventRecord[];
  }

  async findIdempotencyRecord(
    key: string,
    householdId: string,
    operationType: string,
  ): Promise<InventoryIdempotencyLedgerRecord | null> {
    const [record] = await this.db
      .select()
      .from(inventoryIdempotencyLedger)
      .where(
        and(
          eq(inventoryIdempotencyLedger.idempotencyKey, key),
          eq(inventoryIdempotencyLedger.actorHouseholdId, householdId),
          eq(inventoryIdempotencyLedger.operationType, operationType),
        ),
      )
      .limit(1);
    return (record as InventoryIdempotencyLedgerRecord) ?? null;
  }

  async createIdempotencyRecord(
    input: NewInventoryIdempotencyLedgerRecord,
  ): Promise<InventoryIdempotencyLedgerRecord> {
    const [record] = await this.db
      .insert(inventoryIdempotencyLedger)
      .values(input)
      .returning();
    if (!record)
      throw new Error("Idempotency record creation returned no record");
    return record as InventoryIdempotencyLedgerRecord;
  }
}
