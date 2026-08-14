import {
  getCharacterById,
  getItem,
  getOwnedHousehold,
  type ManagedAssetAuthorizationPort,
} from "@lumi/profiles/application";
import { getWorldDb } from "@lumi/world/db/client";
import { worlds, worldLocations } from "@lumi/world/db/schema/world";
import { and, eq } from "drizzle-orm";

export class WebManagedAssetAuthorizationAdapter
  implements ManagedAssetAuthorizationPort
{
  async assertCanManage(
    input: Parameters<ManagedAssetAuthorizationPort["assertCanManage"]>[0],
  ): Promise<void> {
    const household = await getOwnedHousehold(input.userId);
    if (!household || household.id !== input.householdId) {
      throw new Error("MANAGED_ASSET_FORBIDDEN");
    }

    if (input.subjectType === "character") {
      const character = await getCharacterById(
        input.userId,
        input.householdId,
        input.subjectId,
      );
      if (!character) throw new Error("MANAGED_ASSET_SUBJECT_NOT_FOUND");
      return;
    }

    if (input.subjectType === "item") {
      const item = await getItem(
        input.userId,
        input.householdId,
        input.subjectId,
      );
      if (!item) throw new Error("MANAGED_ASSET_SUBJECT_NOT_FOUND");
      return;
    }

    if (input.subjectType === "location") {
      const [location] = await getWorldDb()
        .select({ id: worldLocations.id })
        .from(worldLocations)
        .innerJoin(worlds, eq(worlds.id, worldLocations.worldId))
        .where(
          and(
            eq(worldLocations.id, input.subjectId),
            eq(worlds.householdId, input.householdId),
          ),
        )
        .limit(1);
      if (!location) throw new Error("MANAGED_ASSET_SUBJECT_NOT_FOUND");
      return;
    }

    // Sprint 55 defines every canonical subject kind in the generic model, but
    // cross-domain ownership must be resolved through stable application ports.
    // Until those resolvers are exposed, fail closed rather than querying another
    // package's tables directly or accepting an unverified subject id.
    throw new Error("MANAGED_ASSET_SUBJECT_RESOLVER_NOT_AVAILABLE");
  }
}
