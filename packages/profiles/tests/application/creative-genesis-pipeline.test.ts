import { describe, expect, it } from "vitest";

import {
  calculateGenesisWeightedScore,
  measureGenesisDiversity,
  runCreativeGenesisPipeline,
  type GenesisConceptDraft,
  type GenesisEvaluation,
  type GenesisGenerationPort,
  type GenesisPipelineContext,
} from "../../src/application/creative-genesis-pipeline.service";
import {
  getGenerationRoutingPolicy,
  type ImpactAwareGenerationIntent,
  type ResolvedGenerationRoute,
} from "../../src/application/llm-settings";

const GOLDEN_CONTEXTS: Array<
  Pick<
    GenesisPipelineContext,
    "characterKind" | "characterIdentity" | "worldSummary"
  >
> = [
  {
    characterKind: "human",
    characterIdentity: "curious village child",
    worldSummary:
      "A river valley whose old water clocks have started running backwards.",
  },
  {
    characterKind: "magical_creature",
    characterIdentity: "newly hatched glass-winged dragon",
    worldSummary: "Floating basalt islands above a permanent storm ocean.",
  },
  {
    characterKind: "artificial_being",
    characterIdentity: "maintenance robot with impossible memories",
    worldSummary: "A deserted orbital garden slowly waking after centuries.",
  },
  {
    characterKind: "aquatic_non_human",
    characterIdentity: "young reef cartographer",
    worldSummary: "A living coral archipelago migrating across a moonlit sea.",
  },
];

describe("creative genesis pipeline", () => {
  it("detects structural duplicates and reports pairwise diversity", () => {
    const a = concept(
      "a",
      "hatched",
      "A dragon wakes under a silent lighthouse",
      "Why was the lighthouse built for dragons?",
    );
    const b = concept(
      "b",
      "hatched",
      "A dragon wakes under the silent lighthouse",
      "Why was the lighthouse built for dragons?",
    );
    const c = concept(
      "c",
      "awakened",
      "A robot hears songs from a city that never existed",
      "Who placed unlived memories in its archive?",
    );

    const metrics = measureGenesisDiversity([a, b, c]);

    expect(metrics.duplicatePairs).toHaveLength(1);
    expect(metrics.duplicatePairs[0]).toMatchObject({
      leftId: "a",
      rightId: "b",
    });
    expect(metrics.averagePairwiseDistance).toBeGreaterThan(0.3);
  });

  it("penalizes cliché risk and rewards long-horizon expansion space", () => {
    const strong = evaluation("x", 88, 12, 90, 15);
    const tired = evaluation("x", 88, 80, 45, 80);

    expect(calculateGenesisWeightedScore(strong)).toBeGreaterThan(
      calculateGenesisWeightedScore(tired),
    );
  });

  it("rejects evaluator contradictions against accepted onboarding facts", async () => {
    const context = fullContext(GOLDEN_CONTEXTS[0]!);
    const generator = scriptedGenerator({ contradictionFor: "c-3" });

    const result = await runCreativeGenesisPipeline(context, {
      generator,
      resolveRoute: fakeResolveRoute,
    });

    const contradicted = result.candidates.find(
      (candidate) => candidate.concept.id === "c-3",
    );
    expect(contradicted?.eligible).toBe(false);
    expect(contradicted?.rejectionReasons).toContain(
      "accepted_fact_contradiction",
    );
    expect(
      result.selected.map((candidate) => candidate.concept.id),
    ).not.toContain("c-3");
  });

  it("enforces exact five-by-five long-horizon proxy maps", async () => {
    const context = fullContext(GOLDEN_CONTEXTS[1]!);
    const generator = scriptedGenerator({ malformedHorizon: true });

    await expect(
      runCreativeGenesisPipeline(context, {
        generator,
        resolveRoute: fakeResolveRoute,
      }),
    ).rejects.toThrow("must contain between 5 and 5 values");
  });

  it("keeps evaluator provenance separate from generator/divergence provenance", async () => {
    const result = await runCreativeGenesisPipeline(
      fullContext(GOLDEN_CONTEXTS[2]!),
      {
        generator: scriptedGenerator({}),
        resolveRoute: fakeResolveRoute,
      },
    );

    expect(result.provenance.map((entry) => entry.intent)).toEqual([
      "character_genesis",
      "genesis_divergence",
      "genesis_evaluation",
    ]);
    expect(result.provenance[0]?.modelId).toBe("test/character-genesis");
    expect(result.provenance[2]?.modelId).toBe("test/genesis-evaluation");
  });

  it.each(GOLDEN_CONTEXTS)(
    "selects structurally meaningful candidates for $characterKind golden context",
    async (golden) => {
      const result = await runCreativeGenesisPipeline(fullContext(golden), {
        generator: scriptedGenerator({}),
        resolveRoute: fakeResolveRoute,
      });

      expect(result.schemaVersion).toBe(1);
      expect(result.initialCandidateCount).toBe(10);
      expect(result.diversity.duplicatePairs).toHaveLength(0);
      expect(result.selected.length).toBeGreaterThanOrEqual(1);
      expect(result.selected.length).toBeLessThanOrEqual(3);
      expect(result.selected[0]?.concept.premise).toContain(
        golden.characterKind,
      );
      expect(
        result.selected[0]?.evaluation.longHorizon.earlyAdventures,
      ).toHaveLength(5);
      expect(
        result.selected[0]?.evaluation.longHorizon.mediumTermArcs,
      ).toHaveLength(5);
      expect(
        result.selected[0]?.evaluation.longHorizon.meaningfulReveals,
      ).toHaveLength(5);
      expect(
        result.selected[0]?.evaluation.longHorizon.relationshipDevelopments,
      ).toHaveLength(5);
      expect(
        result.selected[0]?.evaluation.longHorizon.worldConsequences,
      ).toHaveLength(5);
    },
  );

  it("uses bounded synthesis when no first-pass candidate clears the strong-score threshold", async () => {
    const result = await runCreativeGenesisPipeline(
      fullContext(GOLDEN_CONTEXTS[3]!),
      {
        generator: scriptedGenerator({ lowScores: true }),
        resolveRoute: fakeResolveRoute,
      },
    );

    expect(result.synthesisUsed).toBe(true);
    expect(
      result.candidates.some(
        (candidate) => candidate.concept.id === "synthesis-1",
      ),
    ).toBe(true);
    expect(result.selected.length).toBeGreaterThan(0);
  });
});

function fullContext(
  golden: Pick<
    GenesisPipelineContext,
    "characterKind" | "characterIdentity" | "worldSummary"
  >,
): GenesisPipelineContext {
  return {
    userId: "user-1",
    householdId: "household-1",
    childProfileId: "child-1",
    childAge: 7,
    characterKind: golden.characterKind,
    characterIdentity: golden.characterIdentity,
    worldId: "world-1",
    worldSummary: golden.worldSummary,
    regionSummary:
      "A local starting region with room for ordinary life and discovery.",
    acceptedFacts: [
      "The character is seven-story-ready",
      "The world has no time travel",
    ],
    worldConstraints: ["must_not_include: firearm"],
  };
}

function scriptedGenerator(options: {
  contradictionFor?: string;
  malformedHorizon?: boolean;
  lowScores?: boolean;
}): GenesisGenerationPort {
  return {
    async generate(request) {
      if (request.stage === "concept_expansion") {
        return makeCandidates(request.context);
      }
      if (request.stage === "divergence") {
        return request.candidates?.map((candidate, index) => ({
          ...candidate,
          centralMystery: `${candidate.centralMystery} Divergence-axis-${index}: ${DIVERGENCE_AXES[index]}`,
          tropeSignals: [`axis-${index}`, DIVERGENCE_AXES[index]!],
        }));
      }
      if (request.stage === "synthesis") {
        return {
          ...concept(
            "synthesis-1",
            "chosen_by_accident",
            `${request.context.characterKind} discovers that two apparently unrelated local rules share one hidden cause`,
            "Why does helping one ordinary neighbour alter a distant world pattern?",
          ),
          storyModes: [
            "ordinary-day",
            "friendship",
            "investigation",
            "exploration",
            "community",
            "mystery",
          ],
        };
      }
      if (request.stage === "evaluation") {
        return (request.candidates ?? []).map((candidate, index) => {
          const score =
            candidate.id === "synthesis-1"
              ? 92
              : options.lowScores
                ? 72
                : 88 - index;
          const item = evaluation(
            candidate.id,
            score,
            10 + index,
            candidate.id === "synthesis-1" ? 96 : 88 - index,
            12 + index,
          );
          if (options.contradictionFor === candidate.id) {
            item.contradictions = [
              "Conflicts with accepted onboarding fact: no time travel",
            ];
          }
          if (options.malformedHorizon && index === 0) {
            item.longHorizon.earlyAdventures = ["only one"];
          }
          return item;
        });
      }
      throw new Error(`Unexpected stage ${request.stage}`);
    },
  };
}

const DIVERGENCE_AXES = [
  "social belonging",
  "ecological change",
  "memory provenance",
  "ordinary responsibility",
  "migration",
  "reciprocal friendship",
  "lost craft",
  "community trust",
  "nonhuman communication",
  "seasonal transformation",
] as const;

function makeCandidates(
  context: GenesisPipelineContext,
): GenesisConceptDraft[] {
  return DIVERGENCE_AXES.map((axis, index) =>
    concept(
      `c-${index + 1}`,
      ["rooted", "lost", "awakened", "hatched", "arrived"][index % 5]!,
      `${context.characterKind} ${context.characterIdentity} begins with ${axis} in ${context.worldSummary} Pattern-${index}.`,
      `What hidden rule connects ${axis} to the character's presence? Mystery-${index}.`,
    ),
  );
}

function concept(
  id: string,
  archetype: string,
  premise: string,
  mystery: string,
): GenesisConceptDraft {
  return {
    id,
    title: `Genesis ${id}`,
    archetypes: [archetype],
    premise,
    currentSituation: `The character faces a concrete local problem unique to ${id}.`,
    longTermDesire: `Understand the larger meaning behind ${id} without losing ordinary relationships.`,
    fundamentalNeed:
      "Learn when to ask for help and when to act independently.",
    centralMystery: mystery,
    relationshipSeeds: [`relationship-${id}`, `mentor-question-${id}`],
    storyModes: ["discovery", "friendship", "ordinary-day", `mode-${id}`],
    tropeSignals: [`trope-${id}`],
  };
}

function evaluation(
  candidateId: string,
  baseScore: number,
  clicheRisk: number,
  expansionSpace: number,
  exhaustionRisk: number,
): GenesisEvaluation {
  return {
    candidateId,
    scores: {
      originality: baseScore,
      internalCoherence: baseScore,
      childSuitability: baseScore,
      worldCompatibility: baseScore,
      emotionalDepth: baseScore,
      mysteryPotential: baseScore,
      relationshipPotential: baseScore,
      growthPotential: baseScore,
      revealPotential: baseScore,
      adventureDiversity: baseScore,
      longHorizonPotential: baseScore,
      narrativeYield: baseScore,
    },
    clicheRisk,
    contradictions: [],
    rationale: `Candidate ${candidateId} remains coherent while opening multiple independent story axes.`,
    longHorizon: {
      earlyAdventures: five("early", candidateId),
      mediumTermArcs: five("arc", candidateId),
      meaningfulReveals: five("reveal", candidateId),
      relationshipDevelopments: five("relationship", candidateId),
      worldConsequences: five("consequence", candidateId),
      exhaustionRisk,
      expansionSpace,
    },
  };
}

function five(prefix: string, id: string): string[] {
  return Array.from(
    { length: 5 },
    (_, index) => `${prefix}-${id}-${index + 1}`,
  );
}

async function fakeResolveRoute(
  _userId: string,
  _householdId: string,
  intent: ImpactAwareGenerationIntent,
): Promise<ResolvedGenerationRoute> {
  const policy = getGenerationRoutingPolicy(intent);
  return {
    ...policy,
    provider: "openrouter",
    modelId: `test/${intent.replaceAll("_", "-")}`,
    reasoningLevel: policy.defaultReasoningLevel,
    temperature: policy.defaultTemperature,
    maxOutputTokens: policy.defaultMaxOutputTokens,
    source: "tier_default",
    traceMetadata: {
      generationIntent: intent,
      criticalityTier: policy.tier,
      routeSource: "tier_default",
    },
  };
}
