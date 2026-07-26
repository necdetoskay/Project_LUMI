import type { InventoryRecord, ItemInstanceRecord } from "../../schema/inventory";

export interface InventoryRepository {
  createInventory(input: {
    worldId: string;
    ownerCharacterId?: string;
    inventoryType: string;
    name: string;
  }): Promise<InventoryRecord>;
  createItemInstance(input: {
    itemDefinitionId: string;
    worldId: string;
  }): Promise<ItemInstanceRecord>;
  addItem(input: {
    inventoryId: string;
    itemInstanceId: string;
  }): Promise<void>;
  transferItem(input: {
    itemInstanceId: string;
    fromInventoryId: string;
    toInventoryId: string;
    reason?: string;
  }): Promise<void>;
}
