import { describe, expect, it } from "vitest";
import {
  ABSENCE_POLICY,
  computeAbsencePolicy,
  FREEZE_DAY_THRESHOLD,
} from "../../src/domain/time";
import { WorldClock } from "../../src/domain/clock";
import {
  makeAbsenceInfo,
  makeClock,
  WORLD_ID,
  HOUSEHOLD_ID,
} from "../fixtures/simulation.fixtures";

describe("computeAbsencePolicy", () => {
  it("returns normal phase for 1 day absence", () => {
    const result = computeAbsencePolicy(makeAbsenceInfo(1));
    expect(result.phase).toBe("normal");
    expect(result.budgetTokens).toBe(200);
    expect(result.frozen).toBe(false);
  });

  it("returns normal phase for 3 day absence (inclusive lower bound)", () => {
    const result = computeAbsencePolicy(makeAbsenceInfo(3));
    expect(result.phase).toBe("normal");
  });

  it("returns reduced phase for 4 day absence", () => {
    const result = computeAbsencePolicy(makeAbsenceInfo(4));
    expect(result.phase).toBe("reduced");
    expect(result.budgetTokens).toBe(100);
  });

  it("returns reduced phase for 7 day absence", () => {
    const result = computeAbsencePolicy(makeAbsenceInfo(7));
    expect(result.phase).toBe("reduced");
  });

  it("returns limited phase for 8 day absence", () => {
    const result = computeAbsencePolicy(makeAbsenceInfo(8));
    expect(result.phase).toBe("limited");
    expect(result.budgetTokens).toBe(40);
  });

  it("returns limited phase for 9 day absence", () => {
    const result = computeAbsencePolicy(makeAbsenceInfo(9));
    expect(result.phase).toBe("limited");
  });

  it("returns frozen phase for 10 day absence", () => {
    const result = computeAbsencePolicy(makeAbsenceInfo(10));
    expect(result.phase).toBe("frozen");
    expect(result.frozen).toBe(true);
    expect(result.budgetTokens).toBe(0);
  });

  it("returns frozen phase for 14 day absence", () => {
    const result = computeAbsencePolicy(makeAbsenceInfo(14));
    expect(result.phase).toBe("frozen");
    expect(result.frozen).toBe(true);
  });

  it("policy segments match acceptance criteria", () => {
    expect(ABSENCE_POLICY[0]?.phase).toBe("normal");
    expect(ABSENCE_POLICY[0]?.minDays).toBe(0);
    expect(ABSENCE_POLICY[0]?.maxDays).toBe(4);

    expect(ABSENCE_POLICY[1]?.phase).toBe("reduced");
    expect(ABSENCE_POLICY[1]?.minDays).toBe(4);
    expect(ABSENCE_POLICY[1]?.maxDays).toBe(8);

    expect(ABSENCE_POLICY[2]?.phase).toBe("limited");
    expect(ABSENCE_POLICY[2]?.minDays).toBe(8);
    expect(ABSENCE_POLICY[2]?.maxDays).toBe(10);

    expect(ABSENCE_POLICY[3]?.phase).toBe("frozen");
    expect(ABSENCE_POLICY[3]?.minDays).toBe(10);
    expect(ABSENCE_POLICY[3]?.maxDays).toBe(Infinity);
  });

  it("FREEZE_DAY_THRESHOLD is 10", () => {
    expect(FREEZE_DAY_THRESHOLD).toBe(10);
  });

  it("limited phase segments allow NpcDecisions=false", () => {
    const limited = computeAbsencePolicy(makeAbsenceInfo(8));
    expect(limited.segment.allowNpcDecisions).toBe(false);
  });

  it("normal phase segment allows NpcDecisions=true and environment changes", () => {
    const normal = computeAbsencePolicy(makeAbsenceInfo(1));
    expect(normal.segment.allowNpcDecisions).toBe(true);
    expect(normal.segment.allowEnvironmentChanges).toBe(true);
    expect(normal.segment.allowNewEvents).toBe(true);
  });
});

describe("WorldClock", () => {
  it("creates a clock with day 1, hour 7 by default", () => {
    const clock = WorldClock.create({
      worldId: WORLD_ID,
      householdId: HOUSEHOLD_ID,
    });
    const state = clock.getState();

    expect(state.worldId).toBe(WORLD_ID);
    expect(state.householdId).toBe(HOUSEHOLD_ID);
    expect(state.currentDay).toBe(1);
    expect(state.currentHour).toBe(7);
    expect(state.currentMinute).toBe(0);
    expect(state.season).toBe("spring");
    expect(state.clockHash).not.toBe("");
    expect(state.version).toBe(1);
  });

  it("computes timeOfDay correctly", () => {
    const clock = WorldClock.fromState(
      makeClock({ currentHour: 6, currentMinute: 0 }),
    );
    expect(clock.timeOfDay).toBe("dawn");

    const clock2 = WorldClock.fromState(
      makeClock({ currentHour: 12, currentMinute: 0 }),
    );
    expect(clock2.timeOfDay).toBe("noon");

    const clock3 = WorldClock.fromState(
      makeClock({ currentHour: 22, currentMinute: 0 }),
    );
    expect(clock3.timeOfDay).toBe("dusk");

    const clock4 = WorldClock.fromState(
      makeClock({ currentHour: 3, currentMinute: 0 }),
    );
    expect(clock4.timeOfDay).toBe("night");
  });

  it("advances time correctly", () => {
    const clock = WorldClock.fromState(
      makeClock({ currentDay: 1, currentHour: 7, currentMinute: 0 }),
    );
    const result = clock.advance(3600);

    expect(result.gameHoursElapsed).toBeCloseTo(120, 0);
  });

  it("wraps hours and increments day", () => {
    const clock = WorldClock.fromState(
      makeClock({ currentDay: 1, currentHour: 23, currentMinute: 0 }),
    );
    const result = clock.advance(60);

    expect(result.state.currentDay).toBe(2);
    expect(result.state.currentHour).toBe(1);
  });

  it("produces a stable clock hash for the same state", () => {
    const clock1 = WorldClock.create({
      worldId: WORLD_ID,
      householdId: HOUSEHOLD_ID,
    });
    const clock2 = WorldClock.create({
      worldId: WORLD_ID,
      householdId: HOUSEHOLD_ID,
    });
    expect(clock1.getState().clockHash).toBe(clock2.getState().clockHash);
  });

  it("changes hash when state changes", () => {
    const clock = WorldClock.fromState(
      makeClock({ currentHour: 7, clockHash: "initial" }),
    );
    clock.advance(3600);
    expect(clock.rekey()).not.toBe("initial");
  });

  it("computes season correctly", () => {
    const clock = WorldClock.fromState(
      makeClock({ currentDay: 1, season: "spring" }),
    );
    expect(clock.season).toBe("spring");
  });
});
