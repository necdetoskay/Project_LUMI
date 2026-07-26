import { db } from "../../client";
import { itemDefinitions } from "../../schema/inventory";

const data = [
  {
    code: "old_map",
    name: "Eski Harita",
    itemType: "quest",
    metadata: { storyHooks: ["hidden_route", "forgotten_island"] },
  },
  {
    code: "brass_key",
    name: "Pirinç Anahtar",
    itemType: "key",
    metadata: { storyHooks: ["locked_door", "ancient_chest"] },
  },
  {
    code: "healing_herb",
    name: "Şifalı Ot",
    itemType: "consumable",
    isStackable: true,
    metadata: { effects: { recovery: 0.2 } },
  },
];

export async function seedItems(): Promise<void> {
  await db.insert(itemDefinitions)
    .values(data)
    .onConflictDoNothing({ target: itemDefinitions.code });
}
