import type {
  DecisionContextBuildInput,
  DecisionContextVector,
} from "../domain";
import { hashStable } from "../domain/hash";
import { clamp01 } from "../domain/validation";

/**
 * Builds a deterministic Decision Context Vector from the evaluated parts of
 * an NPC decision.
 *
 * Rules:
 * - input values are clamped to 0..1 where they are normalized dimensions;
 * - the content hash is computed over a key-sorted serialization so the same
 *   state always produces the same hash regardless of object key order.
 */
export class DecisionContextBuilder {
  build(input: DecisionContextBuildInput): DecisionContextVector {
    const vector: DecisionContextVector = {
      npcId: input.npcId,
      householdId: input.householdId,
      traits: { ...input.traits },
      emotions: { ...input.emotions },
      influence: { ...input.influence },
      relationships: input.relationships.map((r) => ({ ...r })),
      needs: input.needs.map((n) => ({ ...n })),
      goals: input.goals.map((g) => ({ ...g })),
      timeSensitivity: clamp01(input.timeSensitivity),
      urgency: clamp01(input.urgency),
      contentHash: "",
    };

    vector.contentHash = hashStable({
      npcId: vector.npcId,
      householdId: vector.householdId,
      traits: vector.traits,
      emotions: vector.emotions,
      influence: vector.influence,
      relationships: vector.relationships,
      needs: vector.needs,
      goals: vector.goals,
      timeSensitivity: vector.timeSensitivity,
      urgency: vector.urgency,
    });

    return vector;
  }
}
