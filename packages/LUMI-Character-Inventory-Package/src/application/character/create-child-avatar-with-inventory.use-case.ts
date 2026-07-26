import { eq } from "drizzle-orm";
import { DrizzleCharacterRepository } from "../../db/repositories/character/drizzle-character.repository";
import { DrizzleInventoryRepository } from "../../db/repositories/inventory/drizzle-inventory.repository";
import { childProfiles } from "../../db/schema/profile";
import { traitDefinitions } from "../../db/schema/character";
import { withTransaction } from "../../db/transaction";

export async function createChildAvatarWithInventory(input: {
  worldId: string;
  childProfileId: string;
  currentLocationId?: string;
  name: string;
  slug: string;
}) {
  return withTransaction(async (tx) => {
    const [child] = await tx.select().from(childProfiles)
      .where(eq(childProfiles.id, input.childProfileId)).limit(1);
    if (!child) throw new Error("Child profile not found");

    const characterRepo = new DrizzleCharacterRepository(tx);
    const inventoryRepo = new DrizzleInventoryRepository(tx);

    const character = await characterRepo.create({
      worldId: input.worldId,
      childProfileId: input.childProfileId,
      currentLocationId: input.currentLocationId,
      name: input.name,
      slug: input.slug,
      characterType: "child_avatar",
    });

    const inventory = await inventoryRepo.createInventory({
      worldId: input.worldId,
      ownerCharacterId: character.id,
      inventoryType: "personal",
      name: `${input.name} Envanteri`,
    });

    const defaults = await tx.select().from(traitDefinitions);
    for (const trait of defaults) {
      await characterRepo.setTrait({
        characterId: character.id,
        traitDefinitionId: trait.id,
        value: trait.defaultValue,
      });
    }

    return { character, inventory };
  });
}
