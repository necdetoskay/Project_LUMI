import { describe, expect, it } from "vitest";

import { ContextBuilder } from "../../src/application/context-builder";
import { createContextInspectorProjection } from "../../src/application/context-inspector";
import {
  InMemoryEmotionalStateAdapter,
  InMemoryKnowledgeAdapter,
  InMemoryLongTermMemoryAdapter,
  InMemoryOriginPackageAdapter,
  InMemoryParentPolicyAdapter,
  InMemorySafetyPolicyAdapter,
  InMemoryWorldAdapter,
  InMemoryWorkingStoryAdapter,
} from "../../src/adapters";
import type {
  ContextRequest,
  LongTermMemoryItem,
  WorkingStoryItem,
  WorldItem,
} from "../../src/ports";
import {
  testBudget,
  testEmotionalState,
  testKnowledge,
  testOriginPackage,
  testParentPolicy,
  testSafetyPolicy,
} from "../fixtures/contexts";

const request: ContextRequest = {
  householdId: "golden-household",
  childProfileId: "deniz-7",
  worldId: "aeralis",
  storySessionId: "golden-story-session",
  generationIntent: "continuation",
  sceneFocus: "Kristal Adalar'da mavi pusulanin izini sur",
  focalCharacterId: "liora",
  snapshot: { seed: 20260815 },
};

const workingStory: WorkingStoryItem = {
  mode: "continuation",
  sceneGoal:
    "Liora, Arin'e verdigi sozu tutmak icin kirik mavi pusulayi arastirir.",
  worldFacts: [
    "Kristal Adalar Aeralis goklerinde suzulur.",
    "Liora kristal magaralarinda yasayan kanatli bir kesifcidir.",
  ],
  activeCharacterContexts: [
    {
      characterId: "liora",
      currentState: ["Merakli ve dikkatli.", "Mavi pusulayi yaninda tasiyor."],
      activeGoal: "Kirik mavi pusulayi tamir etmek.",
      relevantMemories: ["Liora, pusulayi tamir etmek icin Arin'e soz verdi."],
      relationshipNotes: ["Liora Arin'in guvenini kaybetmek istemiyor."],
      beliefNotes: ["Pusulanin eksik parcasi kristal magaralarinda olabilir."],
      behaviorGuidance: ["Kesif sirasinda ipuclarini bulmaca gibi ele al."],
    },
  ],
  playerKnownFacts: [
    "Liora kanatli bir kesifcidir.",
    "Mavi pusula kiriktir.",
    "Arin verilen sozu hatirliyor.",
  ],
  hiddenFacts: ["Pusulanin parcasi eski gozlemevinde saklidir."],
  pendingEvents: ["Kristal firtinasi yaklasiyor."],
  fixedDecisions: ["Liora Arin'e verdigi sozden vazgecmeyecek."],
  mustInclude: ["Mavi pusula ve Arin'e verilen soz sahnede anlamli olmali."],
  mustNotInclude: ["Eski gozlemevinin sirrini hemen aciklama."],
  tone: "merakli ve guvenli macera",
  ageGuidance: [
    "Yedi yas icin anlasilir dil kullan.",
    "Uzay ve bulmaca ilgisini hafifce yansit.",
  ],
  choiceOptions: [
    "Pusuladaki kristal deseni incele",
    "Ucarak yakin adayi kontrol et",
    "Arin'e yeni ipucunu anlat",
  ],
};

const relevantMemory: LongTermMemoryItem = {
  memoryId: "blue-compass-promise",
  summary: "Liora, kirik mavi pusulayi tamir etmek icin Arin'e soz verdi.",
  charactersInvolved: ["liora", "arin"],
  emotionalWeight: 0.95,
};

const world: WorldItem = {
  worldFacts: [
    "Aeralis, gokyuzunde suzulen kara parcalarindan olusan bir dunyadir.",
    "Kristal Adalar'in altinda parlak magara aglari vardir.",
  ],
  location: "Kristal Adalar",
  timeOfDay: "aksamustu",
  weather: "hafif kristal ruzgari",
  activeHazards: ["Yaklasan kristal firtinasi ucusu zorlastirabilir."],
  visibleChanges: ["Magara girisindeki kristaller mavi renkte parliyor."],
  inaccessibleAreas: ["Firtina gecene kadar kuzeydeki ada kapali."],
};

describe("ContextBuilder golden acceptance", () => {
  it("carries child-tailored story, character, world and relevant continuity into inspected context", async () => {
    const builder = new ContextBuilder(
      {
        safetyPolicySource: new InMemorySafetyPolicyAdapter(testSafetyPolicy),
        parentPolicySource: new InMemoryParentPolicyAdapter({
          ...testParentPolicy,
          householdId: request.householdId,
        }),
        workingStorySource: new InMemoryWorkingStoryAdapter(workingStory),
        emotionalStateSource: new InMemoryEmotionalStateAdapter([
          { ...testEmotionalState, characterId: "liora" },
        ]),
        // This is the post-retrieval input: the relevant continuity memory wins;
        // the unrelated red-boat harbor memory has already been filtered out.
        longTermMemorySource: new InMemoryLongTermMemoryAdapter([
          relevantMemory,
        ]),
        knowledgeSource: new InMemoryKnowledgeAdapter(testKnowledge),
        worldSource: new InMemoryWorldAdapter(world),
        originPackageSource: new InMemoryOriginPackageAdapter(
          testOriginPackage,
        ),
      },
      testBudget,
    );

    const manifest = await builder.build(request);
    const inspector = createContextInspectorProjection(manifest);
    const joinedText = inspector.sections
      .flatMap((section) => section.items.map((item) => item.text))
      .join("\n")
      .toLocaleLowerCase("tr");

    expect(manifest.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.tokenUsage.usedTokens).toBeLessThanOrEqual(
      testBudget.totalTokens,
    );
    expect(inspector.request.childProfileId).toBe("deniz-7");
    expect(inspector.request.worldId).toBe("aeralis");
    expect(inspector.request.focalCharacterId).toBe("liora");

    expect(joinedText).toContain("mavi pusula");
    expect(joinedText).toContain("arin");
    expect(joinedText).toContain("kristal adalar");
    expect(joinedText).toContain("liora");
    expect(joinedText).toContain("bulmaca");
    expect(joinedText).not.toContain("kirmizi bir tekne");

    const memorySection = inspector.sections.find(
      (section) => section.name === "long-term-memory",
    );
    expect(memorySection).toBeDefined();
    expect(
      memorySection?.items.some((item) =>
        item.id.includes("blue-compass-promise"),
      ),
    ).toBe(true);
    expect(
      memorySection?.items.some((item) =>
        item.id.includes("red-boat-at-harbor"),
      ),
    ).toBe(false);

    const worldSection = inspector.sections.find(
      (section) => section.name === "world",
    );
    expect(worldSection?.items.length).toBeGreaterThan(0);
    expect(
      worldSection?.items.some((item) => item.sourceEngine.length > 0),
    ).toBe(true);

    expect(inspector.summary.sectionCount).toBeGreaterThanOrEqual(7);
    expect(inspector.summary.itemCount).toBeGreaterThan(0);
  });
});
