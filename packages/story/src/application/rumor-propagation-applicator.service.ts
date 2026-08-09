import type { StoryOutboxRecord } from "../db/schema/story";
import type { IndirectEffectApplicator } from "./indirect-effect-propagator.service";

export const RUMOR_SPREAD_INTENT_TYPE = "npc_rumor_spread";

export interface RumorBeliefWriterPort {
  writeHearsay(input: {
    householdId: string;
    worldId?: string;
    sourceNpcId: string;
    targetNpcId: string;
    factId: string;
    claim: string;
    confidence: number;
    provenance: string[];
    hops: number;
  }): Promise<{ writes: number }>;
}

/** Applies rumor outbox intents through a composition-root supplied writer. */
export class RumorSpreadApplicator implements IndirectEffectApplicator {
  constructor(private readonly writer?: RumorBeliefWriterPort) {}

  async apply(intent: StoryOutboxRecord): Promise<{ writes: number }> {
    if (intent.intentType !== RUMOR_SPREAD_INTENT_TYPE) return { writes: 0 };

    const payload = intent.payload as {
      sourceNpcId: string;
      targetNpcId: string;
      factId: string;
      claim: string;
      confidence: number;
      provenance: string[];
      hops: number;
    };
    if (!payload.targetNpcId || !payload.factId || !payload.claim)
      return { writes: 0 };
    if (!this.writer) {
      throw new Error("RUMOR_BELIEF_WRITER_NOT_CONFIGURED");
    }

    return this.writer.writeHearsay({
      householdId: intent.householdId,
      worldId: intent.worldId,
      sourceNpcId: payload.sourceNpcId,
      targetNpcId: payload.targetNpcId,
      factId: payload.factId,
      claim: payload.claim,
      confidence: payload.confidence,
      provenance: payload.provenance,
      hops: payload.hops,
    });
  }
}
