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
        return request.candidates?.map((candidate, index) => {
          const shape = DIVERGENCE_SHAPES[index];
          if (!shape) throw new Error(`Missing divergence shape ${index}`);
          return {
            ...candidate,
            premise: `${request.context.characterKind} ${shape.premise}`,
            currentSituation: shape.currentSituation,
            longTermDesire: shape.longTermDesire,
            fundamentalNeed: shape.fundamentalNeed,
            centralMystery: shape.centralMystery,
            relationshipSeeds: shape.relationshipSeeds,
            storyModes: shape.storyModes,
            tropeSignals: [shape.axis, `shape-${index}`],
          };
        });
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

const DIVERGENCE_SHAPES = [
  {
    axis: "social-belonging",
    premise:
      "arrives during a village bell ceremony where every household recognizes a different name for the newcomer.",
    currentSituation:
      "Three families each insist the newcomer belongs with them, but none can explain the same missing portrait.",
    longTermDesire:
      "Discover what belonging means without allowing strangers to decide identity on the character's behalf.",
    fundamentalNeed:
      "Build trust through chosen relationships rather than inherited labels.",
    centralMystery:
      "Why do unrelated homes remember the same child-shaped absence in mutually incompatible ways?",
    relationshipSeeds: ["patient potter", "jealous foster cousin"],
    storyModes: ["community", "friendship", "domestic", "identity"],
  },
  {
    axis: "ecological-change",
    premise:
      "finds a dry riverbed filling overnight with silver reeds while local animals quietly relocate uphill.",
    currentSituation:
      "A fishing family needs help moving stranded eggs before the reeds harden into glass at sunrise.",
    longTermDesire:
      "Understand why the landscape is changing and learn how to protect life without freezing the world in place.",
    fundamentalNeed:
      "Accept that caring for a place sometimes means helping it transform.",
    centralMystery:
      "What is teaching the river to grow plants where water should be, and why did the change begin now?",
    relationshipSeeds: ["young fisher", "retired flood keeper"],
    storyModes: ["ecology", "rescue", "exploration", "stewardship"],
  },
  {
    axis: "memory-provenance",
    premise:
      "discovers a box of photographs showing celebrations and mistakes the character remembers emotionally but never lived.",
    currentSituation:
      "One photograph changes whenever the character makes a choice, while an elderly archivist refuses to look at it.",
    longTermDesire:
      "Learn which memories deserve trust and whether borrowed experiences can still create real responsibility.",
    fundamentalNeed:
      "Separate identity from memory without dismissing the feelings those memories carry.",
    centralMystery:
      "Who recorded unlived moments with accurate private emotions, and why does only one image continue changing?",
    relationshipSeeds: [
      "reluctant archivist",
      "child who appears in no photograph",
    ],
    storyModes: ["memory", "investigation", "emotion", "archive"],
  },
  {
    axis: "ordinary-responsibility",
    premise:
      "agrees to deliver warm bread across town and discovers every normal shortcut has been rerouted by tiny handwritten signs.",
    currentSituation:
      "The delivery matters to an ill neighbour, yet following the signs reveals people quietly solving each other's problems.",
    longTermDesire:
      "Understand who coordinates the hidden chain of ordinary kindness and why the character was added to it.",
    fundamentalNeed:
      "Learn that small promises can matter as much as spectacular quests.",
    centralMystery:
      "Who knows everyone's unmet everyday need well enough to redirect strangers without ever being seen?",
    relationshipSeeds: ["bakery apprentice", "housebound mapmaker"],
    storyModes: ["ordinary-day", "errand", "kindness", "neighbourhood"],
  },
  {
    axis: "migration",
    premise:
      "wakes as an island's nesting cliffs detach from the horizon and begin following an ancient flock toward unknown weather.",
    currentSituation:
      "Families argue over leaving, staying, or boarding the moving cliffs before the seasonal passage closes.",
    longTermDesire:
      "Find a way to keep meaningful ties while learning why home itself has begun to migrate.",
    fundamentalNeed:
      "Accept that home can be a relationship and practice rather than a fixed coordinate.",
    centralMystery:
      "What signal awakened a migration route no living resident remembers, and what waits at its forgotten destination?",
    relationshipSeeds: ["homesick navigator", "fearless nest watcher"],
    storyModes: ["journey", "navigation", "family", "weather"],
  },
  {
    axis: "reciprocal-friendship",
    premise:
      "is rescued from a collapsing footbridge by a local rival who immediately asks for help hiding a deeply embarrassing failure.",
    currentSituation:
      "The rival's secret is harmless but exposes a larger problem that neither child can solve alone.",
    longTermDesire:
      "Turn rivalry into a relationship where both characters can be strong, wrong, frightened, and useful at different times.",
    fundamentalNeed:
      "Practice reciprocity instead of treating allies as helpers orbiting the protagonist.",
    centralMystery:
      "Why does the bridge repair itself differently after each act of cooperation between people who dislike one another?",
    relationshipSeeds: ["proud rival", "bridge caretaker"],
    storyModes: ["rivalry", "friendship", "repair", "comedy"],
  },
  {
    axis: "lost-craft",
    premise:
      "inherits a broken instrument whose strings vibrate near objects repaired with techniques nobody remembers learning.",
    currentSituation:
      "A market stall collapses and the instrument points toward an unnoticed joint made with the same vanished craft.",
    longTermDesire:
      "Recover a lost way of making things while deciding which forgotten techniques should return and which should remain abandoned.",
    fundamentalNeed:
      "Value patient practice and judgment over instant mastery.",
    centralMystery:
      "Why can the instrument recognize a craft erased from written history, and who deliberately removed its teaching lineage?",
    relationshipSeeds: ["impatient tinkerer", "quiet carpenter"],
    storyModes: ["craft", "puzzle", "history", "making"],
  },
  {
    axis: "community-trust",
    premise:
      "receives three official maps of the same district, each accurate on its own but impossible when placed together.",
    currentSituation:
      "Neighbours plan a festival route and must choose which map to trust before anyone realizes the disagreement is systematic.",
    longTermDesire:
      "Help people compare partial truths without turning uncertainty into accusation or blind obedience.",
    fundamentalNeed: "Learn to ask better questions before choosing sides.",
    centralMystery:
      "Why are all three maps honestly measured yet mutually incompatible, and what changes when nobody is observing the streets?",
    relationshipSeeds: ["junior surveyor", "skeptical festival organizer"],
    storyModes: ["mapping", "community", "mystery", "negotiation"],
  },
  {
    axis: "nonhuman-communication",
    premise:
      "notices moss lanterns blinking in patterns that local residents dismiss as weather until the pattern answers a joke.",
    currentSituation:
      "The lights lead toward a damaged greenhouse where plants are being moved in precise but unexplained arrangements.",
    longTermDesire:
      "Develop a respectful language with a form of life whose needs and concepts may not resemble human conversation.",
    fundamentalNeed:
      "Listen for meaning without forcing every intelligence into familiar categories.",
    centralMystery:
      "Are the lantern patterns one speaker, a colony, or a message passing through many organisms for another purpose?",
    relationshipSeeds: ["curious gardener", "protective groundskeeper"],
    storyModes: ["communication", "science", "garden", "humour"],
  },
  {
    axis: "seasonal-transformation",
    premise:
      "discovers that every shadow in the region points north at noon on the first cold day instead of following its owner.",
    currentSituation:
      "Children turn the event into a game while adults quietly close an old observatory that has not opened in decades.",
    longTermDesire:
      "Learn why seasons alter different rules of the world and how communities adapt without losing wonder.",
    fundamentalNeed:
      "Balance curiosity with patience when answers are only available at certain times.",
    centralMystery:
      "What does the northern convergence measure, and why does the abandoned observatory track shadows rather than stars?",
    relationshipSeeds: ["observatory caretaker", "inventive younger friend"],
    storyModes: ["season", "observation", "festival", "astronomy"],
  },
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
