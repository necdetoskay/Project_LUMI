import { DrizzleNpcSnapshotRepository } from "@lumi/npc-intelligence/db";
import {
  DrizzleLivingWorldBootstrapManifestStore,
  LivingWorldBootstrapService,
  ensureBootstrapNpcIdentity,
  getCharacterFoundationByCharacterId,
  type LivingWorldBootstrapMaterializer,
  type LivingWorldBootstrapResult,
} from "@lumi/profiles";
import { getWorldDetail } from "@lumi/world/application";

function localContextRefs(
  detail: Awaited<ReturnType<typeof getWorldDetail>>,
) {
  const refs: Array<{
    kind: "location_fact";
    authority: string;
    entityId: string;
    reused: true;
  }> = [];
  if (detail.home?.id) {
    refs.push({
      kind: "location_fact",
      authority: "world.homes",
      entityId: detail.home.id,
      reused: true,
    });
  }
  const firstLocation = detail.locations[0];
  if (firstLocation?.id) {
    refs.push({
      kind: "location_fact",
      authority: "world.locations",
      entityId: firstLocation.id,
      reused: true,
    });
  }
  return refs;
}

class CanonicalLivingWorldBootstrapMaterializer
  implements LivingWorldBootstrapMaterializer
{
  private readonly snapshots = new DrizzleNpcSnapshotRepository();
  private readonly worldDetailCache = new Map<
    string,
    Awaited<ReturnType<typeof getWorldDetail>>
  >();

  private async worldDetail(worldId: string) {
    const cached = this.worldDetailCache.get(worldId);
    if (cached) return cached;
    const detail = await getWorldDetail(worldId);
    this.worldDetailCache.set(worldId, detail);
    return detail;
  }

  async resolveLocalContext(
    input: Parameters<LivingWorldBootstrapMaterializer["resolveLocalContext"]>[0],
  ) {
    const detail = await this.worldDetail(input.foundation.worldId);
    return localContextRefs(detail);
  }

  async ensureNpc(
    input: Parameters<LivingWorldBootstrapMaterializer["ensureNpc"]>[0],
  ) {
    const identity = await ensureBootstrapNpcIdentity({
      householdId: input.foundation.householdId,
      childProfileId: input.foundation.childProfileId,
      characterId: input.foundation.characterId,
      worldId: input.foundation.worldId,
      idempotencyKey: input.idempotencyKey,
      plan: input.plan,
    });

    const existingSnapshots = await this.snapshots.listForContext(
      input.foundation.householdId,
      input.foundation.worldId,
      input.foundation.childProfileId,
      24,
    );
    const existing = existingSnapshots.find(
      (snapshot) => snapshot.npcId === identity.npcId,
    );
    const detail = await this.worldDetail(input.foundation.worldId);
    const locationId = detail.locations[0]?.id ?? null;
    const now = new Date();

    await this.snapshots.upsert({
      npcId: identity.npcId,
      householdId: input.foundation.householdId,
      worldId: input.foundation.worldId,
      childProfileId: input.foundation.childProfileId,
      characterId: input.foundation.characterId,
      locationId,
      needTypes: [...input.plan.needTypes],
      relationshipToCharacter: input.plan.relationshipSeed,
      lastInteractionAt: existing?.lastInteractionAt ?? now,
      updatedAt: now,
    });

    return {
      npcId: identity.npcId,
      npcReused: identity.reused,
      relationshipEntityId: identity.npcId,
      relationshipReused: Boolean(existing),
    };
  }
}

export async function runLivingWorldBootstrapForCharacter(
  characterId: string,
): Promise<LivingWorldBootstrapResult> {
  const foundation = await getCharacterFoundationByCharacterId(characterId);
  if (!foundation) throw new Error("CHARACTER_FOUNDATION_NOT_FOUND");

  const service = new LivingWorldBootstrapService(
    new CanonicalLivingWorldBootstrapMaterializer(),
    new DrizzleLivingWorldBootstrapManifestStore(),
  );
  return service.run(foundation);
}
