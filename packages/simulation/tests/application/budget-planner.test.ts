import { describe, expect, it } from "vitest";
import { BudgetPlanner } from "../../src/application/budget-planner.service";
import {
  WORLD_ID,
  HOUSEHOLD_ID,
  NPC_A,
  NPC_B,
} from "../fixtures/simulation.fixtures";
import type { NpcSnapshot } from "../../src/ports";

function makeNpc(overrides: Partial<NpcSnapshot> = {}): NpcSnapshot {
  return {
    npcId: NPC_A,
    householdId: HOUSEHOLD_ID,
    characterId: "char-1",
    locationId: "loc-1",
    needTypes: ["hunger"],
    relationshipToCharacter: 0.7,
    lastInteractionAt: new Date("2026-08-01T10:00:00Z"),
    ...overrides,
  };
}

describe("BudgetPlanner", () => {
  const planner = new BudgetPlanner();

  it("allocates budget proportional to NPC relevance", () => {
    const npcs: NpcSnapshot[] = [
      makeNpc({ npcId: NPC_A, relationshipToCharacter: 0.9 }),
      makeNpc({ npcId: NPC_B, relationshipToCharacter: 0.2 }),
    ];
    const now = new Date("2026-08-03T10:00:00Z");

    const plan = planner.plan(WORLD_ID, HOUSEHOLD_ID, "normal", 200, npcs, now);

    expect(plan.totalBudget).toBe(200);
    expect(plan.timePhase).toBe("normal");
    expect(plan.allocations.length).toBeGreaterThan(0);
    expect(plan.relevanceBubble).not.toBeNull();

    const highNpc = plan.allocations.find((a) => a.npcId === NPC_A);
    const lowNpc = plan.allocations.find((a) => a.npcId === NPC_B);
    if (highNpc && lowNpc) {
      expect(highNpc.tokens).toBeGreaterThanOrEqual(lowNpc.tokens);
    }
  });

  it("reduces budget in reduced phase", () => {
    const npcs: NpcSnapshot[] = [
      makeNpc({ npcId: NPC_A, relationshipToCharacter: 0.8 }),
    ];
    const now = new Date("2026-08-05T10:00:00Z");

    const plan = planner.plan(
      WORLD_ID,
      HOUSEHOLD_ID,
      "reduced",
      200,
      npcs,
      now,
    );

    expect(plan.totalBudget).toBe(100);
  });

  it("further reduces budget in limited phase", () => {
    const npcs: NpcSnapshot[] = [
      makeNpc({ npcId: NPC_A, relationshipToCharacter: 0.8 }),
    ];
    const now = new Date("2026-08-08T10:00:00Z");

    const plan = planner.plan(
      WORLD_ID,
      HOUSEHOLD_ID,
      "limited",
      200,
      npcs,
      now,
    );

    expect(plan.totalBudget).toBe(40);
  });

  it("zero budget in frozen phase", () => {
    const npcs: NpcSnapshot[] = [makeNpc()];
    const now = new Date("2026-08-15T10:00:00Z");

    const plan = planner.plan(WORLD_ID, HOUSEHOLD_ID, "frozen", 200, npcs, now);

    expect(plan.totalBudget).toBe(0);
    expect(plan.allocations).toHaveLength(0);
  });

  it("produces a deterministic run hash for same inputs", () => {
    const npcs: NpcSnapshot[] = [
      makeNpc({ npcId: NPC_A, relationshipToCharacter: 0.8 }),
      makeNpc({ npcId: NPC_B, relationshipToCharacter: 0.5 }),
    ];
    const now = new Date("2026-08-03T10:00:00Z");

    const a = planner.plan(WORLD_ID, HOUSEHOLD_ID, "normal", 200, npcs, now);
    const b = planner.plan(WORLD_ID, HOUSEHOLD_ID, "normal", 200, npcs, now);

    expect(a.runHash).toBe(b.runHash);
  });

  it("excludes low-relevance NPCs from bubble", () => {
    const npcs: NpcSnapshot[] = [
      makeNpc({ npcId: NPC_A, relationshipToCharacter: 0.9 }),
      makeNpc({
        npcId: NPC_B,
        relationshipToCharacter: 0.1,
        lastInteractionAt: new Date("2025-01-01T00:00:00Z"),
      }),
    ];
    const now = new Date("2026-08-03T10:00:00Z");

    const plan = planner.plan(WORLD_ID, HOUSEHOLD_ID, "normal", 200, npcs, now);

    const lowNpc = plan.relevanceBubble!.entities.find(
      (e) => e.entityId === NPC_B,
    );
    expect(lowNpc).toBeFalsy();
  });
});
