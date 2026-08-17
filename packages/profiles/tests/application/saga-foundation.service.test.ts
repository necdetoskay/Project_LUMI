import { describe, expect, it } from "vitest";

import {
  assertSagaMutationAuthority,
  buildSagaFoundation,
  projectSagaForStoryContext,
  validateRevealPolicy,
  validateTruthKnowledgeBeliefInvariant,
  type SagaFoundationContext,
  type SagaFoundationGenerationPort,
} from "../../src/application/saga-foundation.service";
import {
  getGenerationRoutingPolicy,
  type ImpactAwareGenerationIntent,
  type ResolvedGenerationRoute,
} from "../../src/application/llm-settings";
import type { SagaCanon, SagaProgression } from "../../src/domain";

const CONTEXT: SagaFoundationContext = {
  userId: "user-1",
  householdId: "household-1",
  childProfileId: "child-1",
  characterId: "character-1",
  worldId: "world-1",
  childAge: 7,
  worldSummary:
    "A floating island chain where wind bridges appear only when communities cooperate.",
  currentSituation:
    "A newly hatched glass-winged dragon is weak, alone and sheltering near a silent bridge tower.",
  acceptedFacts: [
    "The dragon hatched recently.",
    "The world has no time travel.",
  ],
  selectedGenesis: {
    id: "genesis-1",
    title: "The Silent Bridge Hatchling",
    archetypes: ["hatched", "hidden"],
    premise:
      "A fragile dragon hatches beside a bridge tower that responds to acts of trust rather than strength.",
    currentSituation:
      "The hatchling cannot yet fly and does not know why the tower reacted to its arrival.",
    longTermDesire:
      "Find a place to belong while understanding why the old bridge network recognizes it.",
    fundamentalNeed:
      "Learn that asking for help can be a form of courage rather than weakness.",
    centralMystery:
      "Why do dormant bridge towers answer to the hatchling's presence?",
    relationshipSeeds: ["cautious local child", "retired bridge keeper"],
    storyModes: ["ordinary-day", "friendship", "mystery", "exploration"],
    tropeSignals: ["hidden infrastructure", "earned belonging"],
  },
};

describe("saga foundation", () => {
  it("builds protected canon, mutable progression and three narrative time scales", async () => {
    const result = await buildSagaFoundation(CONTEXT, deps());

    expect(result.schemaVersion).toBe(1);
    expect(result.timeScales.immediateNeed.horizon).toBe("one_to_few_stories");
    expect(result.timeScales.mediumArc.horizon).toBe("five_to_twenty_stories");
    expect(result.timeScales.coreSaga.horizon).toBe("long_horizon");
    expect(result.timeScales.coreSaga.goal).not.toBe(
      result.timeScales.immediateNeed.goal,
    );
    expect(result.canon.provenance.generationIntent).toBe("saga_foundation");
    expect(result.canon.provenance.model).toBe("test/saga-foundation");
    expect(result.progression.sagaCanonId).toBe(result.canon.id);
  });

  it("keeps deep truth distinct from character knowledge and current belief", async () => {
    const result = await buildSagaFoundation(CONTEXT, deps());

    expect(result.progression.knownFacts).not.toContain(result.canon.deepTruth);
    expect(result.progression.currentBeliefs).not.toContain(
      result.canon.deepTruth,
    );
    expect(() =>
      validateTruthKnowledgeBeliefInvariant(result.canon, {
        ...result.progression,
        knownFacts: [result.canon.deepTruth],
      }),
    ).toThrow("deep truth must remain distinct");
  });

  it("does not expose protected truth or future reveal layers to early story context", async () => {
    const result = await buildSagaFoundation(CONTEXT, deps());
    const projection = projectSagaForStoryContext(
      result.canon,
      result.progression,
    );
    const serialized = JSON.stringify(projection);

    expect(serialized).not.toContain(result.canon.deepTruth);
    expect(serialized).not.toContain(result.canon.forbiddenEarlyReveals[0]);
    expect(serialized).not.toContain(result.canon.revealLayers[1]?.reveal);
    expect(projection.centralQuestion).toBe(result.canon.centralQuestion);
  });

  it("rejects an early clue that leaks a future reveal", async () => {
    const result = await buildSagaFoundation(CONTEXT, deps());
    const leaked: SagaProgression = {
      ...result.progression,
      revealedClues: [result.canon.revealLayers[1]!.reveal],
    };

    expect(() => validateRevealPolicy(result.canon, leaked)).toThrow(
      "not-yet-eligible truth",
    );
  });

  it("rejects a reveal stage beyond configured layers", async () => {
    const result = await buildSagaFoundation(CONTEXT, deps());

    expect(() =>
      validateRevealPolicy(result.canon, {
        ...result.progression,
        revealStage: result.canon.revealLayers.length + 1,
      }),
    ).toThrow("cannot exceed the configured reveal layers");
  });

  it("allows a weak starting character to grow without rewriting protected truth", async () => {
    const result = await buildSagaFoundation(CONTEXT, deps());
    const canonBefore = JSON.stringify(result.canon);
    const laterProgression: SagaProgression = {
      ...result.progression,
      version: 7,
      knownFacts: [
        ...result.progression.knownFacts,
        "The hatchling can now cross short gaps with controlled glides.",
      ],
      currentBeliefs: [
        "Belonging may depend more on reciprocal trust than inherited power.",
      ],
      revealedClues: [result.canon.revealLayers[0]!.reveal],
      revealStage: 1,
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    };

    validateRevealPolicy(result.canon, laterProgression);
    expect(JSON.stringify(result.canon)).toBe(canonBefore);
    expect(laterProgression.knownFacts).toContain(
      "The hatchling can now cross short gaps with controlled glides.",
    );
  });

  it("rejects malformed model output before foundation records are created", async () => {
    const broken = deps({ malformed: true });

    await expect(buildSagaFoundation(CONTEXT, broken)).rejects.toThrow(
      "must contain between 2 and 8 reveal layers",
    );
  });

  it("prevents operational routes from mutating protected Saga Canon", () => {
    const policy = getGenerationRoutingPolicy("adventure_teaser");
    const route: ResolvedGenerationRoute = {
      ...policy,
      provider: "openrouter",
      modelId: "test/teaser",
      reasoningLevel: policy.defaultReasoningLevel,
      temperature: policy.defaultTemperature,
      maxOutputTokens: policy.defaultMaxOutputTokens,
      source: "tier_default",
      traceMetadata: {
        generationIntent: "adventure_teaser",
        criticalityTier: policy.tier,
        routeSource: "tier_default",
      },
    };

    expect(() => assertSagaMutationAuthority(route, "saga_canon")).toThrow(
      "Tier B generation may not mutate protected Genesis or Saga Canon",
    );
  });
});

function deps(options: { malformed?: boolean } = {}) {
  const generator: SagaFoundationGenerationPort = {
    async generate() {
      const draft = foundationDraft();
      if (options.malformed) draft.canon.revealLayers = [];
      return draft;
    },
  };

  return {
    generator,
    resolveRoute: fakeResolveRoute,
    now: () => new Date("2026-08-17T07:00:00.000Z"),
    createId: () => "saga-canon-1",
    promptProvenance: {
      promptKey: "character_genesis.saga_foundation",
      promptVersion: 3,
      requestId: "req-saga-1",
      rngSeed: "seed-saga-1",
    },
  };
}

function foundationDraft(): {
  coreTension: {
    question: string;
    opposingForces: [string, string];
    whyItPersists: string;
    ordinaryLifePressure: string;
  };
  timeScales: {
    immediateNeed: { goal: string; horizon: "one_to_few_stories" };
    mediumArc: { goal: string; horizon: "five_to_twenty_stories" };
    coreSaga: { goal: string; horizon: "long_horizon" };
  };
  canon: Omit<
    SagaCanon,
    | "id"
    | "householdId"
    | "childProfileId"
    | "characterId"
    | "worldId"
    | "version"
    | "provenance"
  >;
  progression: Omit<SagaProgression, "sagaCanonId" | "version" | "updatedAt">;
} {
  return {
    coreTension: {
      question:
        "Can the hatchling earn belonging through mutual trust while learning why the bridge network recognizes it?",
      opposingForces: [
        "the wish to belong without owing anyone",
        "a world whose bridges open only through reciprocal dependence",
      ],
      whyItPersists:
        "Every new relationship can help the hatchling survive while also making independence feel more complicated.",
      ordinaryLifePressure:
        "Food, shelter, friendship and learning to glide remain immediate concerns even when the larger mystery is quiet.",
    },
    timeScales: {
      immediateNeed: {
        goal: "Find safe shelter and one trustworthy local ally.",
        horizon: "one_to_few_stories",
      },
      mediumArc: {
        goal: "Learn how three nearby bridge towers react to different forms of cooperation.",
        horizon: "five_to_twenty_stories",
      },
      coreSaga: {
        goal: "Understand the bridge network's true relationship to the hatchling and decide what kind of belonging to build from that truth.",
        horizon: "long_horizon",
      },
    },
    canon: {
      centralQuestion:
        "Why does the ancient bridge network recognize a dragon that has never lived here before?",
      deepTruth:
        "The bridge network was designed to recognize patterns of reciprocal care, and the hatchling carries an inherited resonance from creatures that once helped communities maintain those bonds without ruling them.",
      longTermDesire:
        "Find a place to belong while understanding why the old bridge network recognizes it.",
      fundamentalFear:
        "That every relationship is only valuable because others need the hatchling for an ancient role.",
      stakes:
        "If the hatchling mistakes recognition for destiny, it may either isolate itself or become trapped in a role that prevents genuine belonging.",
      hiddenForces: [
        "abandoned bridge protocols that react to cooperative behaviour",
        "communities preserving contradictory legends about old dragon helpers",
      ],
      possibleTransformations: [
        "from fragile isolation to reciprocal belonging",
        "from seeking a predetermined identity to choosing a role freely",
        "from dependence-as-shame to interdependence-as-strength",
      ],
      revealLayers: [
        {
          id: "layer-1",
          order: 1,
          label: "Recognition is behavioural",
          reveal:
            "A bridge tower responds more strongly to an act of mutual help than to the hatchling's physical power.",
          prerequisites: ["one trusted relationship exists"],
        },
        {
          id: "layer-2",
          order: 2,
          label: "The old dragon role",
          reveal:
            "Old dragons were bridge companions who strengthened cooperation; they were not rulers or chosen monarchs.",
          prerequisites: [
            "two bridge towers understood",
            "a conflicting legend encountered",
          ],
        },
        {
          id: "layer-3",
          order: 3,
          label: "Resonance is not destiny",
          reveal:
            "The hatchling's inherited resonance can awaken the network, but the network cannot decide what life the hatchling should choose.",
          prerequisites: ["the hatchling has refused one imposed role"],
        },
      ],
      forbiddenEarlyReveals: [
        "The hatchling carries inherited resonance from the old bridge-companion dragons.",
        "The bridge network cannot impose destiny on the hatchling.",
      ],
    },
    progression: {
      knownFacts: [
        "The hatchling recently emerged near a silent bridge tower.",
        "The tower briefly lit when a local child shared shelter.",
      ],
      currentBeliefs: [
        "The tower may have reacted because dragons once owned or controlled the bridges.",
      ],
      revealedClues: [],
      falseLeads: [
        "A damaged mural seems to show a dragon above kneeling villagers.",
      ],
      unresolvedQuestions: [
        "Why did the tower react to the shared shelter?",
        "Were dragons builders, rulers, helpers, or something else?",
      ],
      revealStage: 0,
    },
  };
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
