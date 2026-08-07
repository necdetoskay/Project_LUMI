import type { Belief } from "../domain/belief";
import { validateBelief } from "../domain/belief";
import type { Rumor } from "../domain/rumor";
import type { RumorPropagationIntent } from "./rumor-propagation.service";

export interface HearsayAdoptionInput {
  rumor: Rumor;
  intent: RumorPropagationIntent;
}

export interface HearsayAdoptionResult {
  belief: Belief;
}

/**
 * Converts a rumor propagation intent into a hearsay Belief for the
 * target NPC. The belief inherits the rumor's fact/claim/household
 * and uses the decayed confidence + extended provenance from the intent.
 *
 * Rules:
 * - source is always "hearsay";
 * - status is always "active" on adoption;
 * - lastVerifiedAt is null until the belief is verified;
 * - the resulting belief is validated before return.
 */
export class HearsayAdoptionService {
  adopt(input: HearsayAdoptionInput): HearsayAdoptionResult {
    const belief: Belief = {
      id: crypto.randomUUID(),
      npcId: input.intent.targetNpcId,
      householdId: input.rumor.householdId,
      factId: input.rumor.factId,
      claim: input.rumor.claim,
      confidence: input.intent.confidence,
      source: "hearsay",
      provenance: [...input.intent.provenance],
      createdAt: new Date(),
      lastVerifiedAt: null,
      expiresAt: input.rumor.expiresAt,
      status: "active",
    };

    validateBelief(belief);

    return { belief };
  }
}
