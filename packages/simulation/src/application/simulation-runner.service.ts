import type {
  SimulationStorePort,
  WorldSourcePort,
  NpcSourcePort,
} from "../ports";
import type {
  SimulationEffect,
  SimulationRunState,
  AbsenceInfo,
  AbsencePolicyResult,
} from "../domain";
import type { BudgetPlan, BudgetPlanner } from "./budget-planner.service";
import type { NpcSnapshot } from "../ports";
import { computeAbsencePolicy, hashStable } from "../domain";

export interface SimulationRunInput {
  worldId: string;
  householdId: string;
  childProfileId: string;
  childLastSeenAt: Date;
  now: Date;
  seed: string;
}

export interface SimulationRunResult {
  runState: SimulationRunState;
  effects: SimulationEffect[];
  committedCount: number;
  frozen: boolean;
}

interface SeededRng {
  random(): number;
  nextInt(min: number, max: number): number;
}

function createSeededRng(seed: string): SeededRng {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return {
    random(): number {
      h ^= h << 13;
      h = Math.imul(h, 0x01000193) >>> 0;
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    },
    nextInt(min: number, max: number): number {
      return Math.floor(this.random() * (max - min + 1)) + min;
    },
  };
}

export class SimulationRunner {
  constructor(
    private readonly store: SimulationStorePort,
    private readonly worldSource: WorldSourcePort,
    private readonly npcSource: NpcSourcePort,
    private readonly budgetPlanner: { plan: BudgetPlanner["plan"] },
  ) {}

  async run(input: SimulationRunInput): Promise<SimulationRunResult> {
    const absence: AbsenceInfo = {
      childLastSeenAt: input.childLastSeenAt,
      absentDays: this.computeAbsentDays(input.childLastSeenAt, input.now),
      now: input.now,
    };

    const policy: AbsencePolicyResult = computeAbsencePolicy(absence);
    const { phase, budgetTokens, frozen } = policy;

    const clockSnapshot = await this.worldSource.fetchClock(
      input.worldId,
      input.householdId,
    );
    const clockHash = clockSnapshot?.clockHash ?? "";
    const checkpointId = clockSnapshot?.checkpointId ?? null;

    if (frozen) {
      const logicalRunKey = this.computeLogicalRunKey(
        input,
        phase,
        clockHash,
        checkpointId,
      );
      const runState: SimulationRunState = {
        id: crypto.randomUUID(),
        worldId: input.worldId,
        householdId: input.householdId,
        childLastSeenAt: input.childLastSeenAt,
        childAbsentDays: absence.absentDays,
        timePhase: phase,
        budgetTokens: 0,
        runHash: logicalRunKey,
        status: "completed",
        startedAt: input.now,
        completedAt: input.now,
        checkpointId,
        createdAt: new Date(),
      };

      await this.store.saveRun(runState);
      return { runState, effects: [], committedCount: 0, frozen: true };
    }

    const npcs = await this.npcSource.fetchSnapshots(
      input.worldId,
      input.householdId,
    );
    const budgetPlan: BudgetPlan = this.budgetPlanner.plan(
      input.worldId,
      input.householdId,
      phase,
      budgetTokens,
      npcs,
      input.now,
    );
    const logicalRunKey = this.computeLogicalRunKey(
      input,
      phase,
      clockHash,
      checkpointId,
      budgetPlan.runHash,
    );

    const effects = await this.generateEffects(
      input,
      policy,
      budgetPlan,
      npcs,
      logicalRunKey,
    );

    const committedEffects = effects.filter((e) => e.status === "committed");
    let committedCount = 0;
    for (const effect of committedEffects) {
      const inserted = await this.store.saveEffect(effect);
      if (!inserted) {
        continue;
      }
      committedCount += 1;
      await this.worldSource.recordWorldEvent(
        input.worldId,
        "SIMULATION_EFFECT_COMMITTED",
        {
          effectType: effect.effectType,
          severity: effect.severity,
          npcId: effect.npcId,
          entityId: effect.entityId,
          payload: effect.payload,
          evidence: {
            ruleId: effect.evidence.ruleId,
            source: effect.evidence.source,
            confidence: effect.evidence.confidence,
          },
        },
      );
    }

    const pendingEffects = effects.filter((e) => e.status === "pending");
    for (const effect of pendingEffects) {
      await this.store.saveEffect(effect);
    }

    const runState: SimulationRunState = {
      id: crypto.randomUUID(),
      worldId: input.worldId,
      householdId: input.householdId,
      childLastSeenAt: input.childLastSeenAt,
      childAbsentDays: absence.absentDays,
      timePhase: phase,
      budgetTokens: budgetPlan.totalBudget,
      runHash: logicalRunKey,
      status: "completed",
      startedAt: input.now,
      completedAt: new Date(),
      checkpointId,
      createdAt: new Date(),
    };

    await this.store.saveRun(runState);

    return {
      runState,
      effects,
      committedCount,
      frozen: false,
    };
  }

  private computeLogicalRunKey(
    input: SimulationRunInput,
    phase: string,
    clockHash: string,
    checkpointId: string | null,
    budgetRunHash?: string,
  ): string {
    const identity = {
      worldId: input.worldId,
      householdId: input.householdId,
      childProfileId: input.childProfileId,
      childLastSeenAt: input.childLastSeenAt.toISOString(),
      phase,
      clockHash,
      checkpointId,
      budgetRunHash: budgetRunHash ?? null,
      seed: input.seed,
      simulationDate: input.now.toISOString().slice(0, 10),
    };
    return ["a", "b", "c", "d"]
      .map((namespace) =>
        hashStable({
          namespace: `simulation-run:v1:${namespace}`,
          ...identity,
        }),
      )
      .join("");
  }

  private computeAbsentDays(childLastSeenAt: Date, now: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((now.getTime() - childLastSeenAt.getTime()) / msPerDay);
  }

  private async generateEffects(
    input: SimulationRunInput,
    policy: AbsencePolicyResult,
    budgetPlan: BudgetPlan,
    npcs: NpcSnapshot[],
    logicalRunKey: string,
  ): Promise<SimulationEffect[]> {
    const effects: SimulationEffect[] = [];
    const runId = crypto.randomUUID();
    const rng = createSeededRng(logicalRunKey);

    const { phase, segment } = policy;

    if (phase === "frozen") {
      return effects;
    }

    for (const alloc of budgetPlan.allocations) {
      const npc = npcs.find((n) => n.npcId === alloc.npcId);
      if (!npc) continue;

      const shouldDecide =
        segment.allowNpcDecisions && alloc.tokens > 0 && rng.random() < 0.4;
      if (shouldDecide) {
        effects.push({
          id: crypto.randomUUID(),
          runId,
          worldId: input.worldId,
          householdId: input.householdId,
          npcId: npc.npcId,
          entityId: null,
          effectType: "npc_routine",
          severity: "low",
          payload: {
            npcId: npc.npcId,
            action: this.pickNpcAction(npc, phase, rng),
            locationChange: rng.random() < 0.3,
          },
          evidence: {
            ruleId: "background-routine",
            source: "simulation-runner",
            confidence: 0.85,
            traceRef: `${logicalRunKey}:npc:${npc.npcId}`,
          },
          status: "committed",
          idempotencyKey: `${logicalRunKey}:effect:npc:${npc.npcId}`,
          committedAt: new Date(),
          createdAt: new Date(),
        });
      }
    }

    if (segment.allowEnvironmentChanges && rng.random() < 0.2) {
      effects.push({
        id: crypto.randomUUID(),
        runId,
        worldId: input.worldId,
        householdId: input.householdId,
        npcId: null,
        entityId: null,
        effectType: "environment_change",
        severity: "low",
        payload: {
          changeType: "weather_shift",
          description: "A gentle breeze rustles through the meadow.",
        },
        evidence: {
          ruleId: "environment-cycle",
          source: "simulation-runner",
          confidence: 0.9,
          traceRef: `${logicalRunKey}:env`,
        },
        status: "committed",
        idempotencyKey: `${logicalRunKey}:effect:env`,
        committedAt: new Date(),
        createdAt: new Date(),
      });
    }

    const scheduledEvents = await this.worldSource.fetchScheduledEvents(
      input.worldId,
      input.householdId,
      true,
    );
    for (const event of scheduledEvents) {
      await this.store.saveScheduledEvent(event);
    }
    for (const event of scheduledEvents) {
      if (event.critical || event.playerPreserved) {
        continue;
      }
      if (!segment.allowNewEvents) {
        continue;
      }
      effects.push({
        id: crypto.randomUUID(),
        runId,
        worldId: input.worldId,
        householdId: input.householdId,
        npcId: null,
        entityId: null,
        effectType: "scheduled_event_trigger",
        severity: "low",
        payload: {
          eventId: event.id,
          eventType: event.eventType,
          trigger: "background_sim",
        },
        evidence: {
          ruleId: "scheduled-event-trigger",
          source: "simulation-runner",
          confidence: 0.95,
          traceRef: `${logicalRunKey}:event:${event.id}`,
        },
        status: "committed",
        idempotencyKey: `${logicalRunKey}:effect:event:${event.id}`,
        committedAt: new Date(),
        createdAt: new Date(),
      });

      await this.store.updateScheduledEventResolved(event.id, new Date());
    }

    return effects;
  }

  private pickNpcAction(
    npc: NpcSnapshot,
    phase: string,
    rng: SeededRng,
  ): string {
    const actions = [
      "rested at home",
      "tended the garden",
      "visited the market",
      "walked to the river",
      "practiced a craft",
    ];
    const actionCount = phase === "limited" ? 3 : actions.length;
    const idx = Math.floor(rng.random() * actionCount);
    return actions[idx]!;
  }
}
