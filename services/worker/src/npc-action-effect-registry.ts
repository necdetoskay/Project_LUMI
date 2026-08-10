import type { Logger } from "@lumi/logger";
import type {
  CanonicalNpcSnapshot,
  NpcWorldEffectIntent,
  WorkerNpcDecisionEvidence,
} from "@lumi/npc-intelligence/db";
import {
  enqueueNpcActionMoveIntent,
  enqueueNpcActionRelationshipIntent,
} from "@lumi/story/application";

export interface NpcActionEffectContext {
  snapshot: CanonicalNpcSnapshot;
  evidence: WorkerNpcDecisionEvidence;
  selectedCandidateId: string;
}

export type NpcActionEffectEnqueuer = (
  effect: NpcWorldEffectIntent,
  context: NpcActionEffectContext,
) => Promise<{ outcome: "enqueued" | "duplicate"; outboxId: string }>;

export class NpcActionEffectRegistry {
  private readonly handlers: Record<
    NpcWorldEffectIntent["type"],
    NpcActionEffectEnqueuer
  >;

  constructor(private readonly logger: Logger) {
    this.handlers = {
      move_character: async (effect, context) => {
        if (effect.type !== "move_character") {
          throw new Error("NPC_EFFECT_REGISTRY_TYPE_MISMATCH");
        }
        return enqueueNpcActionMoveIntent({
          householdId: context.snapshot.householdId,
          worldId: context.snapshot.worldId,
          childProfileId: context.snapshot.childProfileId,
          npcId: context.snapshot.npcId,
          characterId: context.snapshot.characterId,
          decisionEvidenceId: context.evidence.id,
          decisionKey: context.evidence.decisionKey,
          selectedCandidateId: context.selectedCandidateId,
          targetLocationId: effect.targetLocationId,
        });
      },
      set_relationship: async (effect, context) => {
        if (effect.type !== "set_relationship") {
          throw new Error("NPC_EFFECT_REGISTRY_TYPE_MISMATCH");
        }
        return enqueueNpcActionRelationshipIntent({
          householdId: context.snapshot.householdId,
          worldId: context.snapshot.worldId,
          childProfileId: context.snapshot.childProfileId,
          npcId: context.snapshot.npcId,
          characterId: context.snapshot.characterId,
          decisionEvidenceId: context.evidence.id,
          decisionKey: context.evidence.decisionKey,
          selectedCandidateId: context.selectedCandidateId,
          relationshipToCharacter: effect.relationshipToCharacter,
        });
      },
    };
  }

  async ensureEffect(
    effect: NpcWorldEffectIntent,
    context: NpcActionEffectContext,
  ): Promise<void> {
    const result = await this.handlers[effect.type](effect, context);
    this.logger.info(
      "worker.npc_decision.effect_outbox",
      "NPC decision effect outbox ensured",
      {
        worldId: context.snapshot.worldId,
        npcId: context.snapshot.npcId,
        decisionKey: context.evidence.decisionKey,
        effectType: effect.type,
        outboxId: result.outboxId,
        outcome: result.outcome,
      },
    );
  }
}
