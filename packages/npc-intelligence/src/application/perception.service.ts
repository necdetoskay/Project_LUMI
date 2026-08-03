import {
  CrossFamilyAccessError,
  DIRECTLY_OBSERVABLE_REACHES,
  type PerceptionBuildInput,
  type PerceptionWindow,
  type PerceivedFact,
} from "../domain";
import { isActiveBelief, type Belief } from "../domain/belief";
import { clamp01 } from "../domain/validation";

/**
 * Builds the perception window that determines which facts an NPC can use.
 *
 * Rules:
 * - facts from another household are a hard authorization error;
 * - personal-sensitivity facts never enter an NPC decision window;
 * - directly observable facts pass with their own confidence;
 * - distant facts pass only when the NPC holds an active belief about them,
 *   at min(fact.confidence, belief.confidence).
 */
export class PerceptionService {
  buildWindow(
    input: PerceptionBuildInput,
    beliefs: Belief[],
    now: Date,
  ): PerceptionWindow {
    for (const fact of input.facts) {
      if (fact.householdId !== input.householdId) {
        throw new CrossFamilyAccessError(
          `Raw fact ${fact.factId} belongs to another household.`,
        );
      }
    }

    const beliefByFactId = new Map<string, Belief>();
    for (const belief of beliefs) {
      if (belief.householdId !== input.householdId) {
        throw new CrossFamilyAccessError(
          `Belief ${belief.id} belongs to another household.`,
        );
      }
      if (!isActiveBelief(belief, now)) continue;
      const existing = beliefByFactId.get(belief.factId);
      if (!existing || belief.confidence > existing.confidence) {
        beliefByFactId.set(belief.factId, belief);
      }
    }

    const perceivedFacts: PerceivedFact[] = [];

    for (const fact of input.facts) {
      if (fact.sensitivity === "personal") continue;

      if (DIRECTLY_OBSERVABLE_REACHES.includes(fact.reach)) {
        perceivedFacts.push({
          factId: fact.factId,
          category: fact.category,
          claim: fact.claim,
          observedAt: fact.observedAt,
          confidence: clamp01(fact.confidence),
          sensitivity: fact.sensitivity,
          source: "observation",
        });
        continue;
      }

      const belief = beliefByFactId.get(fact.factId);
      if (belief) {
        perceivedFacts.push({
          factId: fact.factId,
          category: fact.category,
          claim: fact.claim,
          observedAt: fact.observedAt,
          confidence: clamp01(Math.min(fact.confidence, belief.confidence)),
          sensitivity: fact.sensitivity,
          source: "belief",
        });
      }
    }

    return {
      npcId: input.npcId,
      householdId: input.householdId,
      atLocationId: input.atLocationId,
      perceivedFacts,
      nearbyCharacterIds: input.nearbyCharacterIds,
      spatialProximity: input.spatialProximity,
      timeSensitivity: clamp01(input.timeSensitivity),
      reachedAt: input.reachedAt,
    };
  }
}
