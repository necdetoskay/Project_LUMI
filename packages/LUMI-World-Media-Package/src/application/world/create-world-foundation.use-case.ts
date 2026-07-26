import {
  worldCalendars,
  worldStates,
} from "../../db/schema/world";
import { DrizzleLocationRepository } from "../../db/repositories/world/drizzle-location.repository";
import { DrizzleWorldRepository } from "../../db/repositories/world/drizzle-world.repository";
import { withTransaction } from "../../db/transaction";

export type CreateWorldFoundationInput = {
  householdId: string;
  universeName: string;
  universeSlug: string;
  worldName: string;
  worldSlug: string;
  startingRegionName: string;
  startingRegionSlug: string;
  startingLocationName: string;
  startingLocationSlug: string;
};

export async function createWorldFoundation(
  input: CreateWorldFoundationInput,
) {
  return withTransaction(async (tx) => {
    const worldRepository = new DrizzleWorldRepository(tx);
    const locationRepository = new DrizzleLocationRepository(tx);

    const universe = await worldRepository.createUniverse({
      householdId: input.householdId,
      name: input.universeName,
      slug: input.universeSlug,
    });

    const world = await worldRepository.createWorld({
      universeId: universe.id,
      name: input.worldName,
      slug: input.worldSlug,
      status: "active",
    });

    const region = await worldRepository.createRegion({
      worldId: world.id,
      name: input.startingRegionName,
      slug: input.startingRegionSlug,
    });

    const location = await locationRepository.create({
      regionId: region.id,
      name: input.startingLocationName,
      slug: input.startingLocationSlug,
      locationType: "starting_point",
    });

    await tx.insert(worldCalendars).values({
      worldId: world.id,
    });

    await tx.insert(worldStates).values({
      worldId: world.id,
      effectiveAt: new Date(),
      payload: {
        season: "spring",
        weather: "clear",
        daylight: 0.5,
      },
    });

    return {
      universe,
      world,
      region,
      location,
    };
  });
}
