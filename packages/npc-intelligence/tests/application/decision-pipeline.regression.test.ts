import { describe, expect, it } from "vitest";
import { CandidateGenerator } from "../../src/application/candidate-generator.service";
import { DecisionContextBuilder } from "../../src/application/decision-context-builder.service";
import { DecisionSelector } from "../../src/application/decision-selector.service";
import {
  GoalEvaluator,
  toNeedPressureLookup,
} from "../../src/application/goal-evaluator.service";
import { NeedEvaluator } from "../../src/application/need-evaluator.service";
import { PerceptionService } from "../../src/application/perception.service";
import { UtilityEvaluator } from "../../src/application/utility-evaluator.service";
import type {
  DecisionContextVector,
  PerceptionBuildInput,
  RawWorldFact,
} from "../../src/domain";
import { makeDefaultWeightPolicy } from "../fixtures/decision.fixtures";

const HOUSEHOLD = "11111111-1111-1111-1111-111111111111";
const NPC = "22222222-2222-2222-2222-222222222222";

function makeFact(overrides: Partial<RawWorldFact> = {}): RawWorldFact {
  return {
    factId: "fact-loc-1",
    householdId: HOUSEHOLD,
    category: "location",
    claim: "the meadow is calm",
    locationId: "loc-1",
    originNpcId: null,
    observedAt: new Date("2026-01-01T10:00:00Z"),
    confidence: 0.9,
    sensitivity: "safe",
    reach: "current_location",
    ...overrides,
  };
}

function perceptionInput(timeSensitivity = 0.2): PerceptionBuildInput {
  return {
    npcId: NPC,
    householdId: HOUSEHOLD,
    atLocationId: "loc-1",
    facts: [
      makeFact(),
      makeFact({
        factId: "fact-item-1",
        category: "item",
        claim: "a warm blanket",
      }),
    ],
    nearbyCharacterIds: ["npc-helper"],
    spatialProximity: { "npc-helper": 0.9 },
    timeSensitivity,
    reachedAt: new Date("2026-01-01T10:00:00Z"),
  };
}

interface PipelineOutput {
  selectedCandidateId: string | null;
  eliminationCount: number;
  candidateCount: number;
  contentHash: string;
}

function runPipeline(seed: string, timeSensitivity = 0.2): PipelineOutput {
  const now = new Date("2026-01-01T10:00:00Z");

  const perception = new PerceptionService().buildWindow(
    perceptionInput(timeSensitivity),
    [],
    now,
  );

  const needResult = new NeedEvaluator().evaluate({
    needs: [
      { needType: "safety", value: 0.8, decay: 0.4 },
      { needType: "belonging", value: 0.6, decay: 0.3 },
    ],
    timeSensitivity: perception.timeSensitivity,
    conditions: [],
  });

  const goalResult = new GoalEvaluator().evaluate({
    goals: [
      {
        id: "goal-1",
        needType: "safety",
        description: "Find a safe place",
        priority: 0.8,
        status: "active",
        createdAt: now,
        completedAt: null,
      },
    ],
    needPressures: toNeedPressureLookup(needResult.pressures),
    timeSensitivity: perception.timeSensitivity,
  });

  const vector: DecisionContextVector = new DecisionContextBuilder().build({
    npcId: NPC,
    householdId: HOUSEHOLD,
    traits: { curiosity: 0.6, sociability: 0.7, compassion: 0.8 },
    emotions: { fear: 0.6, trust: 0.5 },
    influence: {
      emotional: 0.5,
      social: 0.6,
      cultural: 0.5,
      educational: 0.5,
      political: 0.5,
      environmental: 0.5,
      familial: 0.5,
      spiritual: 0.5,
      historical: 0.5,
    },
    relationships: [
      {
        targetCharacterId: "npc-helper",
        trust: 0.9,
        affinity: 0.8,
        familiarity: 0.7,
        relationshipType: "friend",
      },
    ],
    needs: needResult.pressures,
    goals: goalResult.evaluations,
    timeSensitivity: perception.timeSensitivity,
    urgency: needResult.urgency,
  });

  const generation = new CandidateGenerator().generate({
    npcId: NPC,
    householdId: HOUSEHOLD,
    vector,
    window: perception,
    safety: {
      contentBoundary: "strict",
      forbiddenCandidateKinds: [],
      requireParentApprovalForConditional: true,
    },
    seed,
    maxCandidates: 20,
  });

  const scores = new UtilityEvaluator().evaluate(
    generation.candidates,
    vector,
    makeDefaultWeightPolicy(),
  );

  const selection = new DecisionSelector().select(
    generation.candidates,
    scores,
    vector,
    seed,
  );

  return {
    selectedCandidateId: selection.selectedCandidateId,
    eliminationCount: selection.eliminations.length,
    candidateCount: generation.candidates.length,
    contentHash: vector.contentHash,
  };
}

describe("NPC decision pipeline (regression)", () => {
  it("produces a decision for the same inputs deterministically", () => {
    const a = runPipeline("seed-A");
    const b = runPipeline("seed-A");

    expect(a).toEqual(b);
    expect(a.selectedCandidateId).not.toBeNull();
  });

  it("selects a safe, personality-aligned candidate from what the NPC perceives", () => {
    const result = runPipeline("seed-B");

    expect(result.candidateCount).toBeGreaterThan(0);
    expect(result.selectedCandidateId).not.toBeNull();
    expect(result.eliminationCount).toBe(0);
  });

  it("is sensitive to time urgency in the generated candidates", () => {
    const calm = runPipeline("seed-C", 0.1);
    const urgent = runPipeline("seed-C", 0.9);

    expect(calm.contentHash).not.toBe(urgent.contentHash);
  });

  it("never lets the pipeline act on unperceived facts", () => {
    const now = new Date("2026-01-01T10:00:00Z");
    const perception = new PerceptionService().buildWindow(
      { ...perceptionInput(), facts: [] },
      [],
      now,
    );

    expect(perception.perceivedFacts).toHaveLength(0);
  });
});
