import { describe, expect, it } from "vitest";
import { RumorPropagationEngine } from "../../src/application";
import { createRumor } from "../../src/domain/rumor";
import type { NpcCharacterSnapshot } from "../../src/ports/character-source.port";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";

const enabled = process.env.ULTEF_SCENARIO === "L3-NPC-001";
const ultefDescribe = enabled ? describe : describe.skip;

ultefDescribe("ULTEF L3-NPC-001 — NPC rumor propagation", () => {
  it("propagates a rumor only to an eligible same-household NPC with deterministic confidence decay", async () => {
    const scenario = createScenario({
      id: "L3-NPC-001",
      title: "NPC rumor propagation behavior",
      level: "L3",
      projectGate: "PX-LUMI-03",
      seed: "ultef-rumor-seed-001",
    });

    const householdId = "household-gunes-vadisi";
    const otherHouseholdId = "household-other";
    const sourceNpcId = "npc-mira";
    const sameHouseholdNpcId = "npc-bora";
    const foreignNpcId = "npc-lale";

    scenario.setup("Household", "Gunes Vadisi Household");
    scenario.setup("Source NPC", { id: sourceNpcId, name: "Mira" });
    scenario.setup("Eligible NPC", { id: sameHouseholdNpcId, name: "Bora" });
    scenario.setup("Foreign-household NPC", { id: foreignNpcId, name: "Lale" });

    const rumor = createRumor({
      householdId,
      factId: "fact-bridge-lights",
      claim: "Firtinadan once koprunun isiklari yaniyor.",
      originNpcId: sourceNpcId,
      confidence: 1,
    });

    scenario.event(
      "rumor.created",
      "Mira 'Firtinadan once koprunun isiklari yaniyor.' soylentisini olusturdu.",
      { rumorId: rumor.id, confidence: rumor.confidence },
    );

    const characterSnapshots = new Map<string, NpcCharacterSnapshot>([
      [
        sameHouseholdNpcId,
        {
          npcId: sameHouseholdNpcId,
          householdId,
        } as NpcCharacterSnapshot,
      ],
      [
        foreignNpcId,
        {
          npcId: foreignNpcId,
          householdId: otherHouseholdId,
        } as NpcCharacterSnapshot,
      ],
    ]);

    const engine = new RumorPropagationEngine();
    const result = engine.propagate({
      sourceNpcId,
      householdId,
      rumor,
      characterSnapshots,
      nearbyCharacterIds: [sameHouseholdNpcId, foreignNpcId],
      relationshipTrust: {
        [sameHouseholdNpcId]: 0.8,
        [foreignNpcId]: 0.9,
      },
      elapsedMs: 0,
      maxRecipients: 5,
      minTrust: 0,
      seed: "ultef-rumor-seed-001",
    });

    for (const intent of result.intents) {
      const targetName = intent.targetNpcId === sameHouseholdNpcId ? "Bora" : intent.targetNpcId;
      scenario.event(
        "rumor.propagated",
        `Mira'nin soylentisi ${targetName} NPC'sine aktarildi; confidence ${intent.confidence.toFixed(2)}, hop ${intent.hops}.`,
        {
          targetNpcId: intent.targetNpcId,
          confidence: intent.confidence,
          hops: intent.hops,
          provenance: intent.provenance,
        },
      );
    }

    const boraIntent = result.intents.find((item) => item.targetNpcId === sameHouseholdNpcId);
    const laleIntent = result.intents.find((item) => item.targetNpcId === foreignNpcId);

    scenario.assert(
      "Same-household trusted NPC receives the rumor",
      Boolean(boraIntent),
      true,
      Boolean(boraIntent),
    );
    scenario.assert(
      "Cross-household NPC does not receive the rumor",
      !laleIntent,
      false,
      Boolean(laleIntent),
    );
    scenario.assert(
      "First hop confidence decays from 1.00 to 0.80",
      boraIntent?.confidence === 0.8,
      0.8,
      boraIntent?.confidence ?? null,
    );
    scenario.assert(
      "Provenance records Mira then Bora",
      JSON.stringify(boraIntent?.provenance) === JSON.stringify([sourceNpcId, sameHouseholdNpcId]),
      [sourceNpcId, sameHouseholdNpcId],
      boraIntent?.provenance ?? null,
    );

    if (boraIntent) {
      scenario.delta("rumor.confidence", rumor.confidence, boraIntent.confidence, "one-hop propagation decay");
      scenario.delta("rumor.hops", rumor.hops, boraIntent.hops, "Mira -> Bora transfer");
      scenario.delta("rumor.provenance", rumor.provenance, boraIntent.provenance, "recipient appended to provenance");
    }

    const allPassed = Boolean(boraIntent) && !laleIntent && boraIntent?.confidence === 0.8;
    const report = scenario.finish({
      result: allPassed ? "PASS" : "FAIL",
      reason: allPassed
        ? "Rumor propagation respected household isolation and deterministic confidence decay."
        : "Rumor propagation behavior differed from the expected deterministic contract.",
    });

    await writeScenarioArtifacts(report, { environment: "unit-domain" });

    expect(report.result).toBe("PASS");
  });
});
