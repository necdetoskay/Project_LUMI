import { DrizzleNpcSnapshotRepository } from "../db/repositories";

export interface NpcRelationshipPayload {
  householdId: string;
  worldId: string;
  childProfileId: string;
  npcId: string;
  relationshipToCharacter: number;
}

export interface NpcRelationshipApplicatorResult {
  outcome: "applied" | "duplicate";
  writes: number;
}

function parsePayload(value: unknown): NpcRelationshipPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("NPC_RELATIONSHIP_PAYLOAD_INVALID");
  }
  const raw = value as Partial<NpcRelationshipPayload>;
  if (
    typeof raw.householdId !== "string" ||
    typeof raw.worldId !== "string" ||
    typeof raw.childProfileId !== "string" ||
    typeof raw.npcId !== "string" ||
    typeof raw.relationshipToCharacter !== "number" ||
    !Number.isFinite(raw.relationshipToCharacter) ||
    raw.relationshipToCharacter < -1 ||
    raw.relationshipToCharacter > 1
  ) {
    throw new Error("NPC_RELATIONSHIP_PAYLOAD_INVALID");
  }
  return raw as NpcRelationshipPayload;
}

export class NpcRelationshipApplicator {
  constructor(
    private readonly snapshots = new DrizzleNpcSnapshotRepository(),
  ) {}

  async apply(intent: {
    payload?: unknown;
  }): Promise<NpcRelationshipApplicatorResult> {
    const payload = parsePayload(intent.payload);
    const result = await this.snapshots.setRelationship(
      payload.householdId,
      payload.worldId,
      payload.childProfileId,
      payload.npcId,
      payload.relationshipToCharacter,
    );
    if (result === "not_found") {
      throw new Error("NPC_RELATIONSHIP_SCOPE_NOT_FOUND");
    }
    return {
      outcome: result,
      writes: result === "applied" ? 1 : 0,
    };
  }
}
