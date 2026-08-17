import {
  InteractionOpportunityGenerator,
  OpportunityDeliveryService,
  type PerceptionWindow,
} from "@lumi/npc-intelligence";
import {
  DrizzleNpcSnapshotRepository,
  DrizzleOpportunityInboxRepository,
  getNpcDb,
} from "@lumi/npc-intelligence/db";
import {
  DrizzleLivingWorldBootstrapManifestStore,
  LivingWorldBootstrapService,
  ensureBootstrapNpcIdentity,
  ensureBootstrapRelationship,
  getCharacterFoundationByCharacterId,
  type CharacterFoundationRecord,
  type LivingWorldBootstrapMaterializer,
  type LivingWorldBootstrapResult,
} from "@lumi/profiles";
import { getWorldDetail } from "@lumi/world/application";

const CANONICAL_NEEDS: Readonly<Record<string, readonly string[]>> = {
  caregiver: ["love", "safety"],
  sibling: ["belonging"],
  family: ["belonging", "love"],
  friend: ["belonging"],
  neighbour: ["belonging"],
  mentor: ["learning", "purpose"],
  rival: ["achievement"],
  rescuer: ["safety", "purpose"],
  creator: ["purpose", "achievement"],
  facility_ai: ["purpose", "learning"],
  maintenance_companion: ["belonging", "purpose"],
  symbiotic_creature: ["safety", "belonging"],
  predator: ["hunger", "safety"],
  local_guardian: ["safety", "purpose"],
  first_neutral_contact: ["curiosity"],
  distant_kin_signal: ["belonging", "curiosity"],
  community_member: ["belonging"],
  unknown_presence: ["curiosity"],
  custom: ["purpose"],
};

function localContextRefs(detail: Awaited<ReturnType<typeof getWorldDetail>>) {
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
    input: Parameters<
      LivingWorldBootstrapMaterializer["resolveLocalContext"]
    >[0],
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

    const relationship = await ensureBootstrapRelationship({
      householdId: input.foundation.householdId,
      characterId: input.foundation.characterId,
      npcId: identity.npcId,
      roleType: input.plan.role.roleType,
      relationshipSeed: input.plan.relationshipSeed,
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
    const locationId = detail.locations[0]?.id ?? detail.home?.id ?? null;
    const now = new Date();

    await this.snapshots.upsert({
      npcId: identity.npcId,
      householdId: input.foundation.householdId,
      worldId: input.foundation.worldId,
      childProfileId: input.foundation.childProfileId,
      characterId: input.foundation.characterId,
      locationId,
      needTypes: [
        ...(CANONICAL_NEEDS[input.plan.role.roleType] ?? ["purpose"]),
      ],
      relationshipToCharacter: input.plan.relationshipSeed,
      lastInteractionAt: existing?.lastInteractionAt ?? now,
      updatedAt: now,
    });

    return {
      npcId: identity.npcId,
      npcReused: identity.reused && Boolean(existing),
      relationshipEntityId: relationship.entityId,
      relationshipReused: relationship.reused,
    };
  }
}

export function buildGenesisOpportunityWindow(input: {
  foundation: Pick<CharacterFoundationRecord, "householdId" | "characterId">;
  npcId: string;
  locationId: string;
  locationName: string;
  reachedAt: Date;
}): PerceptionWindow {
  return {
    npcId: input.npcId,
    householdId: input.foundation.householdId,
    atLocationId: input.locationId,
    perceivedFacts: [
      {
        factId: `genesis-location:${input.locationId}`,
        category: "location",
        claim: input.locationName,
        observedAt: input.reachedAt,
        confidence: 1,
        sensitivity: "safe",
        source: "observation",
      },
    ],
    nearbyCharacterIds: [input.foundation.characterId],
    spatialProximity: { [input.foundation.characterId]: 1 },
    timeSensitivity: 1,
    reachedAt: input.reachedAt,
  };
}

async function seedGenesisAdventureOpportunities(
  foundation: CharacterFoundationRecord,
  result: LivingWorldBootstrapResult,
): Promise<void> {
  const detail = await getWorldDetail(foundation.worldId);
  const location = detail.locations[0];
  if (!location) return;

  const delivery = new OpportunityDeliveryService(
    new DrizzleOpportunityInboxRepository(getNpcDb()),
  );
  const generator = new InteractionOpportunityGenerator();
  const now = new Date();

  for (const rolePlan of result.plan.roles) {
    if (rolePlan.relationshipSeed <= 0) continue;
    const npcRef = result.manifest.materialized.find(
      (ref) =>
        ref.kind === "npc" && ref.genesisRoleId === rolePlan.role.id,
    );
    if (!npcRef) continue;

    const generated = generator.generate({
      npcId: npcRef.entityId,
      householdId: foundation.householdId,
      childProfileId: foundation.childProfileId,
      window: buildGenesisOpportunityWindow({
        foundation,
        npcId: npcRef.entityId,
        locationId: location.id,
        locationName: location.displayName,
        reachedAt: now,
      }),
      beliefs: [],
      relationshipTrust: {
        [foundation.characterId]: rolePlan.relationshipSeed,
      },
      ownedItems: {},
      pendingConditions: {},
      forbiddenOpportunityTypes: [],
      firedCooldownKeys: new Set<string>(),
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      seed: `${result.manifest.idempotencyKey}:${npcRef.entityId}:initial-opportunity`,
      maxOpportunities: 1,
    });

    const opportunity = generated.opportunities[0];
    if (!opportunity) continue;

    await delivery.deliver({
      householdId: foundation.householdId,
      idempotencyKey: `${result.manifest.idempotencyKey}:initial-opportunity:${npcRef.entityId}:${opportunity.opportunityType}`,
      opportunity,
    });
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
  const result = await service.run(foundation);
  await seedGenesisAdventureOpportunities(foundation, result);
  return result;
}
