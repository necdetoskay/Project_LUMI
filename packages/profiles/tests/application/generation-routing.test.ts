import { afterEach, describe, expect, it } from "vitest";

import {
  IMPACT_AWARE_GENERATION_INTENTS,
  assertGenerationIntentMayMutate,
  buildGenerationTraceRoutingMetadata,
  getGenerationRoutingPolicy,
  getTierDefaultModelForTesting,
  type ResolvedGenerationRoute,
} from "../../src/application/llm-settings";
import { LLM_TASK_TYPES } from "../../src/db/schema/profile/llm-task-model-settings";

describe("impact-aware generation routing", () => {
  const original = {
    s: process.env.LUMI_TIER_S_DEFAULT_MODEL,
    a: process.env.LUMI_TIER_A_DEFAULT_MODEL,
    b: process.env.LUMI_TIER_B_DEFAULT_MODEL,
    general: process.env.LUMI_DEFAULT_OPENROUTER_MODEL,
  };

  afterEach(() => {
    restore("LUMI_TIER_S_DEFAULT_MODEL", original.s);
    restore("LUMI_TIER_A_DEFAULT_MODEL", original.a);
    restore("LUMI_TIER_B_DEFAULT_MODEL", original.b);
    restore("LUMI_DEFAULT_OPENROUTER_MODEL", original.general);
  });

  it("maps foundation-critical work to Tier S without tier downgrade", () => {
    for (const intent of [
      "character_genesis",
      "genesis_divergence",
      "genesis_evaluation",
      "saga_foundation",
    ] as const) {
      const policy = getGenerationRoutingPolicy(intent);
      expect(policy.tier).toBe("S");
      expect(policy.defaultReasoningLevel).toBe("high");
      expect(policy.allowTierDowngrade).toBe(false);
    }
  });

  it("keeps evaluator routing independently configurable from the generator", () => {
    const generator = getGenerationRoutingPolicy("character_genesis");
    const evaluator = getGenerationRoutingPolicy("genesis_evaluation");

    expect(evaluator.taskType).toBe("genesis_evaluation");
    expect(generator.taskType).toBe("character_genesis");
    expect(evaluator.taskType).not.toBe(generator.taskType);
  });

  it("maps bootstrap work to Tier A and presentation work to Tier B", () => {
    expect(getGenerationRoutingPolicy("living_world_bootstrap").tier).toBe("A");
    expect(
      getGenerationRoutingPolicy("adventure_opportunity_generation").tier,
    ).toBe("A");
    expect(getGenerationRoutingPolicy("adventure_teaser").tier).toBe("B");
    expect(getGenerationRoutingPolicy("story_recap").tier).toBe("B");
  });

  it("prevents Tier B operational generation from mutating protected canon", () => {
    expect(() =>
      assertGenerationIntentMayMutate("adventure_teaser", "genesis"),
    ).toThrow("Tier B generation may not mutate protected Genesis or Saga Canon");

    expect(() =>
      assertGenerationIntentMayMutate("story_recap", "saga_canon"),
    ).toThrow("Tier B generation may not mutate protected Genesis or Saga Canon");

    expect(() =>
      assertGenerationIntentMayMutate("adventure_teaser", "presentation"),
    ).not.toThrow();
  });

  it("requires explicit mutation capability even for stronger tiers", () => {
    expect(() =>
      assertGenerationIntentMayMutate("genesis_evaluation", "genesis"),
    ).toThrow("genesis_evaluation (S) may not mutate genesis");

    expect(() =>
      assertGenerationIntentMayMutate("saga_foundation", "saga_canon"),
    ).not.toThrow();
  });

  it("registers every impact-aware intent as a configurable LLM task", () => {
    for (const intent of IMPACT_AWARE_GENERATION_INTENTS) {
      expect(LLM_TASK_TYPES).toContain(intent);
    }
  });

  it("selects tier-specific environment defaults before the general default", () => {
    process.env.LUMI_TIER_S_DEFAULT_MODEL = "vendor/strong-foundation-model";
    process.env.LUMI_TIER_A_DEFAULT_MODEL = "vendor/balanced-model";
    process.env.LUMI_TIER_B_DEFAULT_MODEL = "vendor/fast-model";
    process.env.LUMI_DEFAULT_OPENROUTER_MODEL = "vendor/general-model";

    expect(getTierDefaultModelForTesting("S")).toBe(
      "vendor/strong-foundation-model",
    );
    expect(getTierDefaultModelForTesting("A")).toBe("vendor/balanced-model");
    expect(getTierDefaultModelForTesting("B")).toBe("vendor/fast-model");
  });

  it("allows an explicit general deployment model for Tier S", () => {
    delete process.env.LUMI_TIER_S_DEFAULT_MODEL;
    process.env.LUMI_DEFAULT_OPENROUTER_MODEL = "vendor/general-model";

    expect(getTierDefaultModelForTesting("S")).toBe("vendor/general-model");
  });

  it("does not silently use the built-in cheap fallback for Tier S", () => {
    delete process.env.LUMI_TIER_S_DEFAULT_MODEL;
    delete process.env.LUMI_DEFAULT_OPENROUTER_MODEL;

    expect(getTierDefaultModelForTesting("S")).toBeNull();
    expect(getTierDefaultModelForTesting("A")).toBe(
      "aion-labs/aion-3.0-mini",
    );
    expect(getTierDefaultModelForTesting("B")).toBe(
      "aion-labs/aion-3.0-mini",
    );
  });

  it("produces trace metadata containing intent, tier, model and route source", () => {
    const route: ResolvedGenerationRoute = {
      ...getGenerationRoutingPolicy("character_genesis"),
      provider: "openrouter",
      modelId: "vendor/strong-model",
      reasoningLevel: "high",
      temperature: 0.9,
      maxOutputTokens: 3200,
      source: "household_setting",
      traceMetadata: {
        generationIntent: "character_genesis",
        criticalityTier: "S",
        routeSource: "household_setting",
      },
    };

    expect(buildGenerationTraceRoutingMetadata(route)).toEqual({
      generationIntent: "character_genesis",
      criticalityTier: "S",
      routeSource: "household_setting",
      modelId: "vendor/strong-model",
      reasoningLevel: "high",
    });
  });
});

function restore(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
