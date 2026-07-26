import { DrizzleInventoryRepository } from "../../db/repositories/inventory/drizzle-inventory.repository";
import { withSerializableTransaction } from "../../db/transaction";

export async function transferItem(input: {
  itemInstanceId: string;
  fromInventoryId: string;
  toInventoryId: string;
  reason?: string;
}): Promise<void> {
  await withSerializableTransaction(async (tx) => {
    await new DrizzleInventoryRepository(tx).transferItem(input);
  });
}
