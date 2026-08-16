import type {
  ContextRetrievalSource,
  RetrievalCandidate,
  RetrievalQuery,
  RetrievalResult,
} from "../ports";
import {
  normalizeRetrievalCandidates,
  normalizeRetrievalLimit,
} from "../ports";

export interface CanonicalNpcRuntimeRecord {
  npcId: string;
  householdId: string;
  worldId: string;
  childProfileId: string;
  characterId: string;
  locationId: string | null;
  needTypes: string[];
  relationshipToCharacter: number;
  lastInteractionAt: Date;
  updatedAt: Date;
}

export interface CanonicalNpcIdentityRecord {
  characterId: string;
  householdId: string;
  childProfileId: string;
  name: string;
  broadKind: string;
  characterType: string;
  subtype: string;
  originConcept: string;
  lifecycleStage: string;
}

export interface CanonicalNpcRuntimeReader {
  listForContext(
    householdId: string,
    worldId: string,
    childProfileId: string,
    limit?: number,
  ): Promise<CanonicalNpcRuntimeRecord[]>;
}

export interface CanonicalNpcIdentityReader {
  findNpcIdentities(input: {
    characterIds: string[];
    householdId: string;
    childProfileId: string;
  }): Promise<CanonicalNpcIdentityRecord[]>;
}

export interface CanonicalNpcContextPayload {
  name: string;
  broadKind: string;
  characterType: string;
  subtype: string;
  originConcept: string;
  lifecycleStage: string;
  needTypes: string[];
  relationshipToCharacter: number;
}

export class CanonicalNpcRetrievalAdapter
  implements ContextRetrievalSource<CanonicalNpcContextPayload>
{
  constructor(
    private readonly runtimeReader: CanonicalNpcRuntimeReader,
    private readonly identityReader: CanonicalNpcIdentityReader,
  ) {}

  async retrieve(
    query: RetrievalQuery,
  ): Promise<RetrievalResult<CanonicalNpcContextPayload>> {
    if (query.sourceKinds && !query.sourceKinds.includes("npc")) {
      return { candidates: [], truncated: false };
    }

    const limit = Math.min(normalizeRetrievalLimit(query.limit), 24);
    const runtimeRecords = await this.runtimeReader.listForContext(
      query.householdId,
      query.worldId,
      query.childProfileId,
      limit,
    );
    const scoped = runtimeRecords.filter(
      (record) =>
        record.householdId === query.householdId &&
        record.worldId === query.worldId &&
        record.childProfileId === query.childProfileId,
    );
    const identities = await this.identityReader.findNpcIdentities({
      characterIds: [...new Set(scoped.map((record) => record.characterId))],
      householdId: query.householdId,
      childProfileId: query.childProfileId,
    });
    const identityByCharacterId = new Map(
      identities
        .filter(
          (identity) =>
            identity.householdId === query.householdId &&
            identity.childProfileId === query.childProfileId,
        )
        .map((identity) => [identity.characterId, identity] as const),
    );

    const candidates = normalizeRetrievalCandidates(
      scoped.flatMap((runtime) => {
        const identity = identityByCharacterId.get(runtime.characterId);
        return identity ? [toCandidate(runtime, identity)] : [];
      }),
      limit,
    );

    return {
      candidates,
      truncated:
        runtimeRecords.length > candidates.length ||
        runtimeRecords.length >= limit,
    };
  }
}

function toCandidate(
  runtime: CanonicalNpcRuntimeRecord,
  identity: CanonicalNpcIdentityRecord,
): RetrievalCandidate<CanonicalNpcContextPayload> {
  const payload: CanonicalNpcContextPayload = {
    name: identity.name,
    broadKind: identity.broadKind,
    characterType: identity.characterType,
    subtype: identity.subtype,
    originConcept: identity.originConcept,
    lifecycleStage: identity.lifecycleStage,
    needTypes: [...runtime.needTypes],
    relationshipToCharacter: runtime.relationshipToCharacter,
  };
  const relationship = clamp01((runtime.relationshipToCharacter + 1) / 2);
  const needsSignal = Math.min(runtime.needTypes.length, 4) / 4;

  return {
    stableId: `npc:${runtime.npcId}`,
    relevance: clamp01(0.5 + relationship * 0.3 + needsSignal * 0.2),
    summary: [
      `${payload.name} is a ${payload.subtype} (${payload.characterType}).`,
      `Origin: ${payload.originConcept}`,
      payload.needTypes.length > 0
        ? `Current needs: ${payload.needTypes.join(", ")}`
        : "Current needs: none recorded",
      `Relationship tone: ${relationshipLabel(payload.relationshipToCharacter)}`,
    ].join(" "),
    payload,
    provenance: {
      sourceKind: "npc",
      sourceId: runtime.npcId,
      authority: "profiles+npc-intelligence/canonical-npc",
      occurredAt: runtime.lastInteractionAt.toISOString(),
      updatedAt: runtime.updatedAt.toISOString(),
    },
  };
}

function relationshipLabel(value: number): string {
  if (value >= 0.5) return "strongly positive";
  if (value >= 0.1) return "positive";
  if (value <= -0.5) return "strongly strained";
  if (value <= -0.1) return "strained";
  return "neutral";
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
