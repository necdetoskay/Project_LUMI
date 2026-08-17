import { describe, expect, it } from "vitest";

import { buildOnboardingFoundationRecord } from "./onboarding-foundation-commit.service";
import {
  applySagaProgressionMutation,
  projectFoundationSagaForStory,
} from "./saga-progression.service";

function foundationFor(
  scenario: "mystery" | "identity" | "world-change" = "mystery",
) {
  const scenarioData = {
    mystery: {
      title: "Sessiz Sinyal",
      premise: "İstasyondaki sessiz sinyalin kaynağı bulunmalı.",
      goal: "Sinyalin kaynağını anlamak",
      motivation: "Merak ve aidiyet",
      mystery: "Sinyali kim gönderiyor?",
    },
    identity: {
      title: "Kayıp Hafıza",
      premise: "Makine geçmişinin parçalarını güvenle birleştiriyor.",
      goal: "Kim olduğunu anlamak",
      motivation: "Kimlik ve güven",
      mystery: "İlk anısı neden eksik?",
    },
    "world-change": {
      title: "Değişen Resif",
      premise: "Resifteki değişimin canlılarla bağı anlaşılmalı.",
      goal: "Resifin dengesini korumak",
      motivation: "Topluluk ve sorumluluk",
      mystery: "Resif neden parlıyor?",
    },
  }[scenario];

  return buildOnboardingFoundationRecord({
    householdId: "11111111-1111-4111-8111-111111111111",
    childProfileId: "22222222-2222-4222-8222-222222222222",
    characterId: "33333333-3333-4333-8333-333333333333",
    worldId: "44444444-4444-4444-8444-444444444444",
    cycleId: `cycle-${scenario}`,
    now: new Date("2026-08-17T12:00:00.000Z"),
    evidence: {
      characterType: { key: scenario },
      identity: {
        key: scenario,
        name: "Lumi",
        identity: "Meraklı gezgin",
        traits: ["meraklı", "nazik", "cesur"],
      },
      universe: { key: "universe", name: "LUMI" },
      world: {
        key: "world",
        name: "Yaşayan Dünya",
        description: "Değişen ama tutarlı bir dünya",
        ecology: "canlı",
        climate: "ılıman",
        magicTechnology: "dengeli",
        adventureTone: "merak",
      },
      region: {
        key: "region",
        name: "Başlangıç Bölgesi",
        biome: "çeşitli",
        tone: "güvenli merak",
        mystery: scenarioData.mystery,
        description: "İlk bağlantıların kurulduğu yer",
      },
      origin: {
        key: "origin",
        title: "İlk Uyanış",
        origin: "Karakter burada uyandı.",
        home: "Başlangıç evi",
        formativeExperience: "İlk dostluk",
        storyHook: "Uzakta açıklanamayan bir işaret belirdi.",
      },
      saga: {
        key: scenario,
        title: scenarioData.title,
        premise: scenarioData.premise,
        longTermGoal: scenarioData.goal,
        motivation: scenarioData.motivation,
        themes: ["aidiyet", "keşif"],
        futureBranches: ["yakın", "orta", "uzun"],
        specificity: "high",
      },
    },
  });
}

describe("Saga progression", () => {
  it("keeps deep truth and future reveals out of ordinary story projection", () => {
    const foundation = foundationFor();
    const projection = projectFoundationSagaForStory(foundation);
    const serialized = JSON.stringify(projection);

    expect(serialized).not.toContain(foundation.sagaCanon.deepTruth);
    expect(serialized).not.toContain(
      foundation.sagaCanon.revealLayers[1]!.reveal,
    );
    expect(projection.revealStage).toBe(0);
  });

  it("makes an explicitly unlocked, prerequisite-satisfied clue visible", () => {
    const foundation = foundationFor();
    const firstLayer = foundation.sagaCanon.revealLayers[0]!;
    const progression = applySagaProgressionMutation(
      foundation.sagaCanon,
      foundation.sagaProgression,
      {
        unlockRevealLayerIds: [firstLayer.id],
        satisfiedPrerequisites: [...firstLayer.prerequisites],
      },
      new Date("2026-08-18T12:00:00.000Z"),
    );

    expect(progression.revealStage).toBe(1);
    expect(progression.revealedClues).toContain(firstLayer.reveal);
  });

  it("advances knowledge and beliefs without mutating protected canon", () => {
    const foundation = foundationFor("identity");
    const deepTruthBefore = foundation.sagaCanon.deepTruth;
    const progression = applySagaProgressionMutation(
      foundation.sagaCanon,
      foundation.sagaProgression,
      {
        addKnownFacts: ["Eski kapıda karaktere ait bir işaret bulundu."],
        addCurrentBeliefs: ["Bu işaret geçmişine bağlı olabilir."],
      },
    );

    expect(progression.knownFacts).toContain(
      "Eski kapıda karaktere ait bir işaret bulundu.",
    );
    expect(progression.currentBeliefs).toContain(
      "Bu işaret geçmişine bağlı olabilir.",
    );
    expect(foundation.sagaCanon.deepTruth).toBe(deepTruthBefore);
  });

  it("rejects a story commit that attempts to leak deep truth into knowledge", () => {
    const foundation = foundationFor();
    expect(() =>
      applySagaProgressionMutation(
        foundation.sagaCanon,
        foundation.sagaProgression,
        { addKnownFacts: [foundation.sagaCanon.deepTruth] },
      ),
    ).toThrow(
      /SAGA_TRUTH_EQUALS_CHARACTER_KNOWLEDGE|SAGA_FORBIDDEN_REVEAL_LEAK/,
    );
  });

  it.each(["mystery", "identity", "world-change"] as const)(
    "preserves %s continuity across multiple progression commits",
    (scenario) => {
      const foundation = foundationFor(scenario);
      const one = applySagaProgressionMutation(
        foundation.sagaCanon,
        foundation.sagaProgression,
        { addKnownFacts: [`${scenario}: ilk doğrulanmış bulgu`] },
      );
      const two = applySagaProgressionMutation(foundation.sagaCanon, one, {
        addCurrentBeliefs: [`${scenario}: yeni çalışma varsayımı`],
        addUnresolvedQuestions: [`${scenario}: sıradaki soru?`],
      });

      expect(two.version).toBe(foundation.sagaProgression.version + 2);
      expect(two.knownFacts).toContain(`${scenario}: ilk doğrulanmış bulgu`);
      expect(two.unresolvedQuestions).toContain(`${scenario}: sıradaki soru?`);
      expect(foundation.sagaCanon.deepTruth).toBeTruthy();
    },
  );
});
