import type { Logger } from "@lumi/logger";
import type { MemoryAwareDecisionService } from "@lumi/npc-intelligence/application";
import type {
  CanonicalNpcDecisionPayload,
  CanonicalNpcSnapshot,
  DrizzleNpcSnapshotRepository,
  DrizzleWorkerNpcDecisionRepository,
  WorkerNpcDecisionEvidence,
} from "@lumi/npc-intelligence/db";

import { NpcActionEffectRegistry } from "./npc-action-effect-registry";

export interface NpcDecisionWorldInput {
  householdId: string;
  worldId: string;
  childProfileId: string;
  now: Date;
}

export interface NpcDecisionRunSummary {
  applied: number;
  duplicates: number;
  skippedNotReady: number;
}

export interface NpcDecisionJobPort {
  runForWorld(input: NpcDecisionWorldInput): Promise<NpcDecisionRunSummary>;
}

function serializeResult(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

export class NpcDecisionJobRunner implements NpcDecisionJobPort {
  private readonly effects: NpcActionEffectRegistry;

  constructor(
    private readonly snapshots: DrizzleNpcSnapshotRepository,
    private readonly decisions: MemoryAwareDecisionService,
    private readonly ledger: DrizzleWorkerNpcDecisionRepository,
    private readonly logger: Logger,
    private readonly limit = 64,
    effects?: NpcActionEffectRegistry,
  ) {
    this.effects = effects ?? new NpcActionEffectRegistry(logger);
  }

  private async enqueueSelectedEffect(
    snapshot: CanonicalNpcSnapshot,
    payload: CanonicalNpcDecisionPayload,
    evidence: WorkerNpcDecisionEvidence,
  ): Promise<void> {
    const selectedCandidateId = evidence.selectedCandidateId;
    if (!selectedCandidateId) return;
    const effect = payload.effectsByCandidateId?.[selectedCandidateId];
    if (!effect) return;

    await this.effects.ensureEffect(effect, {
      snapshot,
      evidence,
      selectedCandidateId,
    });
  }

  async runForWorld(
    input: NpcDecisionWorldInput,
  ): Promise<NpcDecisionRunSummary> {
    const summary: NpcDecisionRunSummary = {
      applied: 0,
      duplicates: 0,
      skippedNotReady: 0,
    };
    const snapshots = await this.snapshots.listDecisionReady(
      input.householdId,
      input.worldId,
      input.childProfileId,
      this.limit,
    );

    for (const snapshot of snapshots) {
      const payload = snapshot.decisionPayload;
      if (!payload) {
        summary.skippedNotReady += 1;
        continue;
      }
      if (
        payload.context.npcId !== snapshot.npcId ||
        payload.context.householdId !== snapshot.householdId
      ) {
        summary.skippedNotReady += 1;
        this.logger.error(
          "worker.npc_decision.scope_mismatch",
          "decision payload context does not match snapshot scope",
          {
            worldId: snapshot.worldId,
            npcId: snapshot.npcId,
            decisionKey: payload.decisionKey,
          },
        );
        continue;
      }

      const existing = await this.ledger.get(
        snapshot.householdId,
        snapshot.worldId,
        snapshot.childProfileId,
        snapshot.npcId,
        payload.decisionKey,
      );
      if (existing) {
        await this.enqueueSelectedEffect(snapshot, payload, existing);
        summary.duplicates += 1;
        continue;
      }

      const result = await this.decisions.decide({
        householdId: snapshot.householdId,
        worldId: snapshot.worldId,
        childProfileId: snapshot.childProfileId,
        npcId: snapshot.npcId,
        candidates: payload.candidates,
        context: payload.context,
        policy: payload.policy,
        seed: payload.seed,
        now: input.now,
      });

      const commit = await this.ledger.commit({
        householdId: snapshot.householdId,
        worldId: snapshot.worldId,
        childProfileId: snapshot.childProfileId,
        npcId: snapshot.npcId,
        decisionKey: payload.decisionKey,
        selectedCandidateId: result.selection.selectedCandidateId,
        usedMemoryIds: result.usedMemoryIds,
        resultJson: serializeResult(result),
        decidedAt: input.now,
      });

      const evidence = await this.ledger.get(
        snapshot.householdId,
        snapshot.worldId,
        snapshot.childProfileId,
        snapshot.npcId,
        payload.decisionKey,
      );
      if (!evidence) {
        throw new Error("NPC_DECISION_EVIDENCE_MISSING_AFTER_COMMIT");
      }
      await this.enqueueSelectedEffect(snapshot, payload, evidence);

      if (commit === "applied") {
        summary.applied += 1;
        this.logger.info(
          "worker.npc_decision.applied",
          "memory-aware NPC decision committed",
          {
            worldId: snapshot.worldId,
            npcId: snapshot.npcId,
            decisionKey: payload.decisionKey,
            selectedCandidateId: result.selection.selectedCandidateId,
          },
        );
      } else {
        summary.duplicates += 1;
      }
    }

    return summary;
  }
}
