import type { Logger } from "@lumi/logger";
import { MemoryAwareDecisionService } from "@lumi/npc-intelligence/application";
import type {
  DrizzleNpcSnapshotRepository,
  DrizzleWorkerNpcDecisionRepository,
} from "@lumi/npc-intelligence/db";

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
  constructor(
    private readonly snapshots: DrizzleNpcSnapshotRepository,
    private readonly decisions: MemoryAwareDecisionService,
    private readonly ledger: DrizzleWorkerNpcDecisionRepository,
    private readonly logger: Logger,
    private readonly limit = 64,
  ) {}

  async runForWorld(input: NpcDecisionWorldInput): Promise<NpcDecisionRunSummary> {
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

      const alreadyCommitted = await this.ledger.has(
        snapshot.householdId,
        snapshot.worldId,
        snapshot.childProfileId,
        snapshot.npcId,
        payload.decisionKey,
      );
      if (alreadyCommitted) {
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
