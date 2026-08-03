import type {
  InventoryItemDefinitionRecord, NewInventoryItemDefinitionRecord,
  InventoryItemInstanceRecord, NewInventoryItemInstanceRecord,
  InventoryRecord, NewInventoryRecord,
  InventoryEntryRecord, NewInventoryEntryRecord,
  InventoryOwnershipRecord, NewInventoryOwnershipRecord,
  InventoryOwnershipHistoryRecord, NewInventoryOwnershipHistoryRecord,
  InventoryTransferRecord, NewInventoryTransferRecord,
  InventoryUsageRecord, NewInventoryUsageRecord,
  InventoryDomainEventRecord, NewInventoryDomainEventRecord,
  InventoryIdempotencyLedgerRecord, NewInventoryIdempotencyLedgerRecord,
} from "../../../db";

export interface InventoryRepository {
  createDefinition(input: NewInventoryItemDefinitionRecord): Promise<InventoryItemDefinitionRecord>;
  findDefinitionById(id: string): Promise<InventoryItemDefinitionRecord | null>;
  findDefinitionByKey(key: string): Promise<InventoryItemDefinitionRecord | null>;

  createInstance(input: NewInventoryItemInstanceRecord): Promise<InventoryItemInstanceRecord>;
  findInstanceById(id: string, householdId?: string): Promise<InventoryItemInstanceRecord | null>;
  updateInstance(id: string, input: Partial<NewInventoryItemInstanceRecord>): Promise<InventoryItemInstanceRecord>;

  createInventory(input: NewInventoryRecord): Promise<InventoryRecord>;
  findInventoryByOwner(ownerType: string, ownerId: string, inventoryType?: string, householdId?: string): Promise<InventoryRecord | null>;
  findInventoryById(id: string, householdId?: string): Promise<InventoryRecord | null>;

  createEntry(input: NewInventoryEntryRecord): Promise<InventoryEntryRecord>;
  findEntryByInventoryAndInstance(inventoryId: string, itemInstanceId: string): Promise<InventoryEntryRecord | null>;
  findEntryByItemInstance(itemInstanceId: string): Promise<InventoryEntryRecord | null>;
  updateEntry(id: string, input: Partial<NewInventoryEntryRecord>): Promise<InventoryEntryRecord>;
  removeEntry(id: string): Promise<void>;

  createOwnership(input: NewInventoryOwnershipRecord): Promise<InventoryOwnershipRecord>;
  findActiveOwnershipByItem(itemInstanceId: string): Promise<InventoryOwnershipRecord | null>;
  findActiveOwnershipByItemForUpdate(itemInstanceId: string, tx: unknown): Promise<InventoryOwnershipRecord | null>;
  releaseOwnership(id: string): Promise<void>;

  createOwnershipHistory(input: NewInventoryOwnershipHistoryRecord): Promise<InventoryOwnershipHistoryRecord>;

  createTransfer(input: NewInventoryTransferRecord): Promise<InventoryTransferRecord>;
  findTransferByIdempotencyKey(key: string, householdId: string, itemInstanceId: string, transferType: string): Promise<InventoryTransferRecord | null>;

  createUsage(input: NewInventoryUsageRecord): Promise<InventoryUsageRecord>;

  createDomainEvent(input: NewInventoryDomainEventRecord): Promise<InventoryDomainEventRecord>;
  getDomainEvents(itemInstanceId: string): Promise<InventoryDomainEventRecord[]>;

  findIdempotencyRecord(key: string, householdId: string, operationType: string): Promise<InventoryIdempotencyLedgerRecord | null>;
  createIdempotencyRecord(input: NewInventoryIdempotencyLedgerRecord): Promise<InventoryIdempotencyLedgerRecord>;
}

