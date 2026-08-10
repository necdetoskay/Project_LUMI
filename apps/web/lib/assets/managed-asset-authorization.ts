import {
  getCharacterById,
  getOwnedHousehold,
  type ManagedAssetAuthorizationPort,
} from "@lumi/profiles/application";

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

    // Sprint 55 defines every canonical subject kind in the generic model, but
    // cross-domain ownership must be resolved through stable application ports.
    // Until those resolvers are exposed, fail closed rather than querying another
    // package's tables directly or accepting an unverified subject id.
    throw new Error("MANAGED_ASSET_SUBJECT_RESOLVER_NOT_AVAILABLE");
  }
}
