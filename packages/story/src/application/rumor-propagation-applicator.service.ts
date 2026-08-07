import type { StoryOutboxRecord } from "../db/schema/story";
import type { IndirectEffectApplicator } from "./indirect-effect-propagator.service";

export const RUMOR_SPREAD_INTENT_TYPE = "npc_rumor_spread";

/**
 * Applies `npc_rumor_spread` outbox intents by writing hearsay beliefs.
 *
 * This is a placeholder applicator that validates the intent type and
 * returns a success count. The concrete belief-writing implementation
 * is provided by the worker or a higher-level service that wires the
 * NPC intelligence package's belief service into the outbox loop.
 */
export class RumorSpreadApplicator implements IndirectEffectApplicator {
  async apply(intent: StoryOutboxRecord): Promise<{ writes: number }> {
    if (intent.intentType !== RUMOR_SPREAD_INTENT_TYPE) {
      return { writes: 0 };
    }

    const payload = intent.payload as {
      sourceNpcId: string;
      targetNpcId: string;
      factId: string;
      claim: string;
      confidence: number;
      provenance: string[];
      hops: number;
    };

    if (!payload.targetNpcId || !payload.factId) {
      return { writes: 0 };
    }

    return { writes: 1 };
  }
}