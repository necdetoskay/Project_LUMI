import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { BudgetPlanner } from "../../src/application/budget-planner.service";
import { WorldClock } from "../../src/domain/clock";
import { computeAbsencePolicy } from "../../src/domain/time";
import type { NpcSnapshot } from "../../src/ports";

const SCENARIO_ID = "PX-LUMI-07-WORLD-TIME-001";
const HOUSEHOLD_ID = "household-px07-synthetic";
const WORLD_ID = "world-px07-synthetic";
const RELEVANT_NPC_ID = "npc-px07-relevant";
const IRRELEVANT_NPC_ID = "npc-px07-irrelevant";

function npc(overrides: Partial<NpcSnapshot>): NpcSnapshot {
  return {
    npcId: RELEVANT_NPC_ID,
    householdId: HOUSEHOLD_ID,
    characterId: "character-px07-synthetic",
    locationId: "location-px07-synthetic",
    needTypes: ["rest"],
    relationshipToCharacter: 0.9,
    lastInteractionAt: new Date("2026-08-08T08:00:00.000Z"),
    ...overrides,
  };
}

describe(SCENARIO_ID, () => {
  it("proves bounded elapsed-time progression, relevance filtering and ten-day freeze", async () => {
    const planner = new BudgetPlanner();
    const relevantNpc = npc({ npcId: RELEVANT_NPC_ID });
    const irrelevantNpc = npc({
      npcId: IRRELEVANT_NPC_ID,
      relationshipToCharacter: 0.05,
      lastInteractionAt: new Date("2025-01-01T00:00:00.000Z"),
    });
    const npcs = [relevantNpc, irrelevantNpc];

    const clock = WorldClock.create({
      worldId: WORLD_ID,
      householdId: HOUSEHOLD_ID,
    });
    const clockBefore = clock.getState();
    const advance = clock.advance(60);
    const clockAfter = advance.state;

    expect(clockAfter.currentDay).toBeGreaterThanOrEqual(clockBefore.currentDay);
    expect(clockAfter.version).toBeGreaterThan(clockBefore.version);

    const normalPolicy = computeAbsencePolicy({
      lastSeenAt: new Date("2026-08-07T08:00:00.000Z"),
      now: new Date("2026-08-09T08:00:00.000Z"),
      absenceDays: 2,
    });
    const normalPlan = planner.plan(
      WORLD_ID,
      HOUSEHOLD_ID,
      normalPolicy.phase,
      normalPolicy.budgetTokens,
      npcs,
      new Date("2026-08-09T08:00:00.000Z"),
    );

    expect(normalPolicy.phase).toBe("normal");
    expect(normalPolicy.frozen).toBe(false);
    expect(normalPlan.allocations.some((entry) => entry.npcId === RELEVANT_NPC_ID)).toBe(
      true,
    );
    expect(normalPlan.allocations.some((entry) => entry.npcId === IRRELEVANT_NPC_ID)).toBe(
      false,
    );

    const limitedPolicy = computeAbsencePolicy({
      lastSeenAt: new Date("2026-07-31T08:00:00.000Z"),
      now: new Date("2026-08-09T08:00:00.000Z"),
      absenceDays: 9,
    });
    const limitedPlan = planner.plan(
      WORLD_ID,
      HOUSEHOLD_ID,
      limitedPolicy.phase,
      limitedPolicy.budgetTokens,
      npcs,
      new Date("2026-08-09T08:00:00.000Z"),
    );

    expect(limitedPolicy.phase).toBe("limited");
    expect(limitedPolicy.segment.allowNpcDecisions).toBe(false);
    expect(limitedPlan.totalBudget).toBe(40);

    const frozenPolicy = computeAbsencePolicy({
      lastSeenAt: new Date("2026-07-30T08:00:00.000Z"),
      now: new Date("2026-08-09T08:00:00.000Z"),
      absenceDays: 10,
    });
    const frozenPlan = planner.plan(
      WORLD_ID,
      HOUSEHOLD_ID,
      frozenPolicy.phase,
      frozenPolicy.budgetTokens,
      npcs,
      new Date("2026-08-09T08:00:00.000Z"),
    );

    expect(frozenPolicy.phase).toBe("frozen");
    expect(frozenPolicy.frozen).toBe(true);
    expect(frozenPolicy.budgetTokens).toBe(0);
    expect(frozenPlan.totalBudget).toBe(0);
    expect(frozenPlan.allocations).toHaveLength(0);

    const report = {
      schemaVersion: 1,
      scenarioId: SCENARIO_ID,
      projectGate: "PX-LUMI-07",
      status: "PASS",
      providerCost: 0,
      scenario: {
        householdAlias: HOUSEHOLD_ID,
        worldAlias: WORLD_ID,
        relevantNpcAlias: RELEVANT_NPC_ID,
        irrelevantNpcAlias: IRRELEVANT_NPC_ID,
      },
      timeline: [
        {
          step: "clock-forward",
          expected: "world time advances and never moves backward",
          observed: {
            before: clockBefore,
            after: clockAfter,
            gameHoursElapsed: advance.gameHoursElapsed,
          },
        },
        {
          step: "two-day-normal",
          expected: "relevant NPC is considered while stale low-relevance NPC is ignored",
          observed: {
            policy: normalPolicy,
            consideredNpcIds: normalPlan.allocations.map((entry) => entry.npcId),
            ignoredNpcIds: [IRRELEVANT_NPC_ID],
            runHash: normalPlan.runHash,
          },
        },
        {
          step: "nine-day-limited",
          expected: "simulation is strongly reduced and autonomous NPC decisions are disabled",
          observed: {
            policy: limitedPolicy,
            totalBudget: limitedPlan.totalBudget,
            consideredNpcIds: limitedPlan.allocations.map((entry) => entry.npcId),
          },
        },
        {
          step: "ten-day-freeze",
          expected: "long inactivity freezes background simulation and prevents uncontrolled drift",
          observed: {
            policy: frozenPolicy,
            totalBudget: frozenPlan.totalBudget,
            consideredNpcIds: frozenPlan.allocations.map((entry) => entry.npcId),
          },
        },
      ],
      assertions: {
        timeNeverMovedBackward: true,
        relevantNpcConsidered: true,
        irrelevantNpcIgnored: true,
        limitedPhaseDisabledNpcDecisions: true,
        tenDayFreezeStoppedSimulation: true,
      },
    };

    await writeEvidence(report);
  });
});

async function writeEvidence(report: Record<string, unknown>) {
  const repoRoot = path.resolve(process.cwd(), "../..");
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${SCENARIO_ID}`;
  const outDir = path.join(repoRoot, "artifacts", "ultef", "runs", runId);

  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, `${SCENARIO_ID}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  const timeline = (report.timeline as Array<Record<string, unknown>>)
    .map((entry, index) => {
      const observed = JSON.stringify(entry.observed, null, 2);
      return [
        `## ${index + 1}. ${entry.step}`,
        "",
        `Expected: ${entry.expected}`,
        "",
        "Observed:",
        "",
        "```json",
        observed,
        "```",
      ].join("\n");
    })
    .join("\n\n");

  await writeFile(
    path.join(outDir, `${SCENARIO_ID}.md`),
    [
      `# ${SCENARIO_ID}`,
      "",
      "Status: **PASS**",
      "Project gate: **PX-LUMI-07 — World Time Progression**",
      "Provider cost: **0**",
      "",
      "This runtime evidence proves bounded world-time progression using the production simulation policy, clock and budget planner.",
      "",
      timeline,
      "",
      "## Why PASS",
      "",
      "- World time advanced and did not move backward.",
      "- A relevant recent NPC entered the relevance budget while a stale low-relevance NPC was ignored.",
      "- Nine-day inactivity entered limited mode and disabled autonomous NPC decisions.",
      "- Ten-day inactivity entered frozen mode with zero simulation budget and zero NPC allocations.",
      "",
    ].join("\n"),
    "utf8",
  );
}
