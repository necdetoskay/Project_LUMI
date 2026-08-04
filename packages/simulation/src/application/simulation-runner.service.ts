import type { SimulationStorePort, WorldSourcePort, NpcSourcePort } from "../ports";
import type {
  SimulationEffect,
  SimulationRunState,
  AbsenceInfo,
  AbsencePolicyResult,
} from "../domain";
import type { BudgetPlan, BudgetPlanner } from "./budget-planner.service";
import type { NpcSnapshot } from "../ports";
import { computeAbsencePolicy } from "../domain";
import { hashStable } from "../domain";

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

    const clockSnapshot = await this.worldSource.fetchClock(input.worldId, input.householdId);
    const clockHash = clockSnapshot?.clockHash ?? "";

    if (frozen) {
      const runState: SimulationRunState = {
        id: crypto.randomUUID(),
        worldId: input.worldId,
        householdId: input.householdId,
        childLastSeenAt: input.childLastSeenAt,
        childAbsentDays: absence.absentDays,
        timePhase: phase,
        budgetTokens: 0,
        runHash: hashStable({ worldId: input.worldId, phase, seed: input.seed, clockHash }),
        status: "completed",
        startedAt: input.now,
        completedAt: input.now,
        checkpointId: clockSnapshot?.checkpointId ?? null,
        createdAt: new Date(),
      };

      await this.store.saveRun(runState);
      return { runState, effects: [], committedCount: 0, frozen: true };
    }

    const npcs = await this.npcSource.fetchSnapshots(input.worldId, input.householdId);
    const budgetPlan: BudgetPlan = this.budgetPlanner.plan(
      input.worldId,
      input.householdId,
      phase,
      budgetTokens,
      npcs,
      input.now,
    );

    const effects = await this.generateEffects(
      input,
      policy,
      budgetPlan,
      npcs,
    );

    const committedEffects = effects.filter((e) => e.status === "committed");
    for (const effect of committedEffects) {
      await this.store.saveEffect(effect);
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
      runHash: budgetPlan.runHash,
      status: "completed",
      startedAt: input.now,
      completedAt: new Date(),
      checkpointId: clockSnapshot?.checkpointId ?? null,
      createdAt: new Date(),
    };

    await this.store.saveRun(runState);

    return {
      runState,
      effects,
      committedCount: committedEffects.length,
      frozen: false,
    };
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
  ): Promise<SimulationEffect[]> {
    const effects: SimulationEffect[] = [];
    const runId = crypto.randomUUID();
    const rng = createSeededRng(input.seed + runId + input.now.toISOString());
    const today = input.now.toISOString().slice(0, 10);

    const { phase, segment } = policy;

    if (phase === "frozen") {
      return effects;
    }

    for (const alloc of budgetPlan.allocations) {
      const npc = npcs.find((n) => n.npcId === alloc.npcId);
      if (!npc) continue;

      const shouldDecide = segment.allowNpcDecisions && alloc.tokens > 0 && rng.random() < 0.4;
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
            traceRef: `${runId}:npc:${npc.npcId}`,
          },
          status: "committed",
          idempotencyKey: `${runId}:effect:${npc.npcId}:${today}`,
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
          traceRef: `${runId}:env`,
        },
        status: "committed",
        idempotencyKey: `${runId}:effect:env:${today}`,
        committedAt: new Date(),
        createdAt: new Date(),
      });
    }

    const scheduledEvents = await this.worldSource.fetchScheduledEvents(
      input.worldId,
      input.householdId,
      false,
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
          traceRef: `${runId}:event:${event.id}`,
        },
        status: "committed",
        idempotencyKey: `${runId}:effect:event:${event.id}`,
        committedAt: new Date(),
        createdAt: new Date(),
      });

      await this.store.updateScheduledEventResolved(event.id, new Date());
    }

    return effects;
  }

  private pickNpcAction(npc: NpcSnapshot, phase: string, rng: SeededRng): string {
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
