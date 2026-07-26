import { and, eq } from "drizzle-orm";
import type { QueryExecutor } from "../../transaction";
import { inventories, inventoryEntries, itemHistory, itemInstances } from "../../schema/inventory";
import type { InventoryRepository } from "./inventory.repository";

export class DrizzleInventoryRepository implements InventoryRepository {
  constructor(private readonly executor: QueryExecutor) {}

  async createInventory(input: {
    worldId: string;
    ownerCharacterId?: string;
    inventoryType: string;
    name: string;
  }) {
    const [record] = await this.executor.insert(inventories).values(input).returning();
    if (!record) throw new Error("Inventory creation returned no record");
    return record;
  }

  async createItemInstance(input: {
    itemDefinitionId: string;
    worldId: string;
  }) {
    const [record] = await this.executor.insert(itemInstances).values(input).returning();
    if (!record) throw new Error("Item instance creation returned no record");
    return record;
  }

  async addItem(input: { inventoryId: string; itemInstanceId: string }): Promise<void> {
    await this.executor.insert(inventoryEntries).values(input);
    await this.executor.insert(itemHistory).values({
      itemInstanceId: input.itemInstanceId,
      toInventoryId: input.inventoryId,
      eventType: "added",
    });
  }

  async transferItem(input: {
    itemInstanceId: string;
    fromInventoryId: string;
    toInventoryId: string;
    reason?: string;
  }): Promise<void> {
    await this.executor.delete(inventoryEntries).where(and(
      eq(inventoryEntries.inventoryId, input.fromInventoryId),
      eq(inventoryEntries.itemInstanceId, input.itemInstanceId),
    ));
    await this.executor.insert(inventoryEntries).values({
      inventoryId: input.toInventoryId,
      itemInstanceId: input.itemInstanceId,
    });
    await this.executor.insert(itemHistory).values({
      itemInstanceId: input.itemInstanceId,
      fromInventoryId: input.fromInventoryId,
      toInventoryId: input.toInventoryId,
      eventType: "transferred",
      metadata: { reason: input.reason },
    });
  }
}
