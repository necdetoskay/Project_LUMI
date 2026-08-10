import { moveCharacterToLocation } from "./movement.service";
import { DomainError } from "../domain/errors";

export interface NpcActionMovePayload {
  householdId: string;
  worldId: string;
  childProfileId: string;
  npcId: string;
  characterId: string;
  decisionEvidenceId: string;
  decisionKey: string;
  selectedCandidateId: string;
  targetLocationId: string;
}

export interface NpcActionMoveApplicatorResult {
  outcome: "applied" | "duplicate";
  writes: number;
}

function parsePayload(value: unknown): NpcActionMovePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("NPC_ACTION_MOVE_INVALID_PAYLOAD");
  }
  const raw = value as Partial<NpcActionMovePayload>;
  const required: Array<keyof NpcActionMovePayload> = [
    "householdId",
    "worldId",
    "childProfileId",
    "npcId",
    "characterId",
    "decisionEvidenceId",
    "decisionKey",
    "selectedCandidateId",
    "targetLocationId",
  ];
  for (const key of required) {
    if (typeof raw[key] !== "string" || raw[key]!.length === 0) {
      throw new Error(`NPC_ACTION_MOVE_INVALID_${String(key).toUpperCase()}`);
    }
  }
  return raw as NpcActionMovePayload;
}

export class NpcActionMoveApplicator {
  async apply(intent: { payload?: unknown }): Promise<NpcActionMoveApplicatorResult> {
    const payload = parsePayload(intent.payload);
    try {
      await moveCharacterToLocation({
        characterId: payload.characterId,
        targetLocationId: payload.targetLocationId,
        householdId: payload.householdId,
        worldId: payload.worldId,
      });
      return { outcome: "applied", writes: 1 };
    } catch (error) {
      if (error instanceof DomainError && error.code === "ALREADY_AT_LOCATION") {
        return { outcome: "duplicate", writes: 0 };
      }
      throw error;
    }
  }
}
