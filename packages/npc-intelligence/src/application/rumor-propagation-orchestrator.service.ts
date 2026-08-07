import type { RumorPropagationInput } from "./rumor-propagation.service";
import type { NpcCharacterSnapshot } from "../ports/character-source.port";
import type { StoryOutboxPort } from "../ports/story-outbox.port";
import type { RumorPropagationEngine } from "./rumor-propagation.service";
import type { RumorLedgerService } from "./rumor-ledger.service";

export const PROPAGATION_COOLDOWN_MS = 60 * 60 * 1000;

export interface RumorPropagationOrchestratorInput {
  sourceNpcId: string;
  householdId: string;
  worldId: string;
  commitId: string;
  rumor: RumorPropagationInput["rumor"];
  characterSnapshots: Map<string, NpcCharacterSnapshot>;
  nearbyCharacterIds: string[];
  relationshipTrust: Record<string, number>;
  elapsedMs: number;
  maxRecipients?: number;
  minTrust?: number;
  seed: string;
}

export interface RumorPropagationOrchestratorResult {
  enqueued: number;
  skipped: number;
  failed: number;
  reasons: string[];
}

/**
 * Orchestrates rumor propagation end-to-end:
 * 1. Runs the propagation engine to pick recipients
 * 2. Checks the rumor ledger for duplicates
 * 3. Enqueues non-duplicate intents into the story outbox
 *
 * All steps are deterministic and household-scoped.
 */
export class RumorPropagationOrchestrator {
  constructor(
    private readonly engine: RumorPropagationEngine,
    private readonly ledger: RumorLedgerService,
    private readonly outbox: StoryOutboxPort,
  ) {}

  async propagate(
    input: RumorPropagationOrchestratorInput,
  ): Promise<RumorPropagationOrchestratorResult> {
    const propagationInput: RumorPropagationInput = {
      sourceNpcId: input.sourceNpcId,
      householdId: input.householdId,
      rumor: input.rumor,
      characterSnapshots: input.characterSnapshots,
      nearbyCharacterIds: input.nearbyCharacterIds,
      relationshipTrust: input.relationshipTrust,
      elapsedMs: input.elapsedMs,
      seed: input.seed,
      ...(input.maxRecipients !== undefined && { maxRecipients: input.maxRecipients }),
      ...(input.minTrust !== undefined && { minTrust: input.minTrust }),
    };

    const propagationResult = this.engine.propagate(propagationInput);
    const reasons = [...propagationResult.reasons];
    let enqueued = 0;
    let skipped = 0;
    let failed = 0;

    for (const intent of propagationResult.intents) {
      const gateResult = await this.ledger.gate({
        householdId: input.householdId,
        sourceNpcId: input.sourceNpcId,
        targetNpcId: intent.targetNpcId,
        factId: input.rumor.factId,
      });

      if (!gateResult.allowed) {
        skipped += 1;
        reasons.push(
          `skipped duplicate propagation to ${intent.targetNpcId} for fact ${input.rumor.factId}`,
        );
        continue;
      }

      try {
        await this.outbox.enqueue({
          householdId: input.householdId,
          worldId: input.worldId,
          commitId: input.commitId,
          idempotencyKey: `rumor:${input.sourceNpcId}:${intent.targetNpcId}:${input.rumor.factId}`,
          intentType: "npc_rumor_spread",
          payload: {
            sourceNpcId: input.sourceNpcId,
            targetNpcId: intent.targetNpcId,
            factId: input.rumor.factId,
            claim: input.rumor.claim,
            confidence: intent.confidence,
            provenance: intent.provenance,
            hops: intent.hops,
          },
          evidenceRef: null,
        });
        await this.ledger.recordPropagation({
          householdId: input.householdId,
          sourceNpcId: input.sourceNpcId,
          targetNpcId: intent.targetNpcId,
          factId: input.rumor.factId,
        });
        enqueued += 1;
      } catch (error) {
        failed += 1;
        const message =
          error instanceof Error ? error.message : String(error);
        reasons.push(
          `failed to enqueue propagation to ${intent.targetNpcId}: ${message}`,
        );
      }
    }

    if (enqueued === 0 && propagationResult.intents.length > 0) {
      reasons.push("all propagation intents were skipped or failed");
    }

    return { enqueued, skipped, failed, reasons };
  }
}