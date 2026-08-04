import type {
  SimulationEffect,
  SimulationRunState,
  SimulationScheduledEvent,
  WorldClockState,
} from "../../src/domain";

export const WORLD_ID = "11111111-1111-1111-1111-111111111111";
export const HOUSEHOLD_ID = "22222222-2222-2222-2222-222222222222";
export const NPC_A = "33333333-3333-3333-3333-333333333333";
export const NPC_B = "44444444-4444-4444-4444-444444444444";
export const CHILD_LAST_SEEN = new Date("2026-08-01T08:00:00Z");

export function makeClock(
  overrides: Partial<WorldClockState> = {},
): WorldClockState {
  const now = new Date();
  return {
    worldId: WORLD_ID,
    householdId: HOUSEHOLD_ID,
    currentDay: 1,
    currentHour: 7,
    currentMinute: 0,
    season: "spring",
    lastAdvancedAt: null,
    clockHash: "abc123",
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeSimulationRun(
  overrides: Partial<SimulationRunState> = {},
): SimulationRunState {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    worldId: WORLD_ID,
    householdId: HOUSEHOLD_ID,
    childLastSeenAt: CHILD_LAST_SEEN,
    childAbsentDays: 3,
    timePhase: "normal",
    budgetTokens: 200,
    runHash: "runhash001",
    status: "completed",
    startedAt: now,
    completedAt: now,
    checkpointId: null,
    createdAt: now,
    ...overrides,
  };
}

export function makeCommittedEffect(
  overrides: Partial<SimulationEffect> = {},
): SimulationEffect {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    worldId: WORLD_ID,
    householdId: HOUSEHOLD_ID,
    npcId: NPC_A,
    entityId: null,
    effectType: "npc_routine",
    severity: "low",
    payload: { action: "rested at home" },
    evidence: {
      ruleId: "background-routine",
      source: "simulation-runner",
      confidence: 0.85,
      traceRef: "trace-1",
    },
    status: "committed",
    idempotencyKey: `effect-${crypto.randomUUID()}`,
    committedAt: now,
    createdAt: now,
    ...overrides,
  };
}

export function makePendingEffect(
  overrides: Partial<SimulationEffect> = {},
): SimulationEffect {
  return makeCommittedEffect({
    status: "pending",
    committedAt: null,
    ...overrides,
  });
}

export function makeScheduledEvent(
  overrides: Partial<SimulationScheduledEvent> = {},
): SimulationScheduledEvent {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    worldId: WORLD_ID,
    householdId: HOUSEHOLD_ID,
    scheduledAt: new Date(now.getTime() + 86400000),
    eventType: "world_weather_change",
    critical: false,
    playerPreserved: false,
    payload: { change: "sunny" },
    resolved: false,
    resolvedAt: null,
    createdAt: now,
    ...overrides,
  };
}

export function makeAbsenceInfo(days: number) {
  return {
    childLastSeenAt: CHILD_LAST_SEEN,
    absentDays: days,
    now: new Date(`2026-08-0${1 + Math.min(days, 9)}T12:00:00Z`),
  };
}
