import {
  type Rumor,
  decayRumorForHop,
} from "../domain/rumor";
import type { NpcCharacterSnapshot } from "../ports/character-source.port";
import { NpcIntelligenceError } from "../domain/errors";
import { createSeededRng } from "../domain/seeded-rng";

export const DEFAULT_MAX_RECIPIENTS = 5;
export const DEFAULT_MIN_TRUST = 0;

export interface RumorPropagationInput {
  sourceNpcId: string;
  householdId: string;
  rumor: Rumor;
  characterSnapshots: Map<string, NpcCharacterSnapshot>;
  nearbyCharacterIds: string[];
  relationshipTrust: Record<string, number>;
  elapsedMs: number;
  maxRecipients?: number;
  minTrust?: number;
  seed: string;
}

export interface RumorPropagationIntent {
  targetNpcId: string;
  confidence: number;
  provenance: string[];
  hops: number;
  belowFloor: boolean;
}

export interface RumorPropagationResult {
  intents: RumorPropagationIntent[];
  reasons: string[];
}

/**
 * Deterministic rumor propagation engine.
 *
 * Given a rumor held by a source NPC, picks eligible recipient NPCs
 * (same household, nearby, relationship-appropriate) and computes
 * decayed confidence + extended provenance for each.
 *
 * Rules:
 * - the source NPC must be the origin or a relay in the rumor's
 *   provenance (information access gate);
 * - recipients must be in the same household (cross-family forbidden);
 * - recipients must be nearby and have a relationship with the source;
 * - confidence is decayed per hop and per elapsed time;
 * - rumors below the propagation floor are not forwarded;
 * - recipient count is bounded by maxRecipients;
 * - same input + seed produces the same recipient set.
 */
export class RumorPropagationEngine {
  propagate(input: RumorPropagationInput): RumorPropagationResult {
    const rng = createSeededRng(input.seed);
    const intents: RumorPropagationIntent[] = [];
    const reasons: string[] = [];

    this.assertInfoAccess(input);

    const maxRecipients = input.maxRecipients ?? DEFAULT_MAX_RECIPIENTS;
    const minTrust = input.minTrust ?? DEFAULT_MIN_TRUST;

    const eligible = this.filterEligibleRecipients(
      input,
      minTrust,
    );

    if (eligible.length === 0) {
      reasons.push("no eligible recipients for rumor propagation");
      return { intents, reasons };
    }

    const shuffled = this.deterministicShuffle(eligible, rng);
    const selected = shuffled.slice(0, maxRecipients);

    for (const targetNpcId of selected) {
      const result = decayRumorForHop(
        input.rumor,
        targetNpcId,
        input.elapsedMs,
      );

      if (result.belowFloor) {
        reasons.push(
          `rumor not propagated to ${targetNpcId}: below propagation floor`,
        );
        continue;
      }

      intents.push({
        targetNpcId,
        confidence: result.confidence,
        provenance: result.provenance,
        hops: result.hops,
        belowFloor: result.belowFloor,
      });
    }

    if (intents.length === 0) {
      reasons.push(
        "all eligible targets below propagation floor after decay",
      );
    }

    return { intents, reasons };
  }

  private assertInfoAccess(input: RumorPropagationInput): void {
    const { sourceNpcId, rumor } = input;
    if (rumor.originNpcId !== sourceNpcId) {
      const inProvenance = rumor.provenance.includes(sourceNpcId);
      if (!inProvenance) {
        throw new NpcIntelligenceError(
          "INFORMATION_ACCESS_DENIED",
          `NPC ${sourceNpcId} does not hold this rumor (not origin or in provenance chain)`,
        );
      }
    }
  }

  private filterEligibleRecipients(
    input: RumorPropagationInput,
    minTrust: number,
  ): string[] {
    const {
      sourceNpcId,
      householdId,
      characterSnapshots,
      nearbyCharacterIds,
      relationshipTrust,
    } = input;

    return nearbyCharacterIds.filter((targetNpcId) => {
      if (targetNpcId === sourceNpcId) return false;

      const snapshot = characterSnapshots.get(targetNpcId);
      if (!snapshot) return false;
      if (snapshot.householdId !== householdId) return false;

      const trust = relationshipTrust[targetNpcId];
      if (trust === undefined || trust <= minTrust) return false;

      return true;
    });
  }

  private deterministicShuffle(
    items: string[],
    rng: ReturnType<typeof createSeededRng>,
  ): string[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = rng.nextInt(0, i);
      const tmp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = tmp;
    }
    return shuffled;
  }
}