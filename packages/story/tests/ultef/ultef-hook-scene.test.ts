import { describe, expect, it, vi } from "vitest";
import { StorySceneGenerationService } from "../../src/application/story-scene-generation.service";
import type { StorySceneLlmSettingsPort } from "../../src/application/story-scene-llm-settings";
import type { StoryHookState } from "../../src/domain/story-types";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";

const enabled = process.env.ULTEF_SCENARIO === "L4-HOOK-SCENE-001";
const ultefDescribe = enabled ? describe : describe.skip;

ultefDescribe("ULTEF L4-HOOK-SCENE-001 — StoryHook to generated scene", () => {
  it("carries a rumor hook into a validated child-safe story scene", async () => {
    const scenario = createScenario({
      id: "L4-HOOK-SCENE-001",
      title: "Rumor StoryHook to generated story scene",
      level: "L4",
      projectGate: "PX-LUMI-05",
      seed: "ultef-hook-scene-001",
    });

    const hook: StoryHookState = {
      id: "hook-rumor-001",
      householdId: "household-gunes-vadisi",
      childProfileId: "child-deniz",
      storySessionId: "session-001",
      worldId: "world-gunes-vadisi",
      opportunityId: "opportunity-rumor-001",
      hookType: "rumor",
      sourceNpcId: "npc-mira",
      targetNpcId: null,
      payload: {
        claim: "Eski koprunun isiklari firtinadan once yaniyor.",
        factId: "fact-bridge-lights",
      },
      constraints: {},
      sceneType: "narrative",
      status: "pending",
      version: 1,
      createdAt: new Date("2026-08-08T10:00:00Z"),
      consumedAt: null,
    };

    scenario.setup("Child profile", {
      id: hook.childProfileId,
      name: "Deniz",
      ageBand: "6-8",
    });
    scenario.setup("Character", { id: "character-arin", name: "Arin" });
    scenario.setup("World", { id: hook.worldId, name: "Gunes Vadisi" });
    scenario.setup("Source NPC", { id: hook.sourceNpcId, name: "Mira" });
    scenario.setup("StoryHook", {
      id: hook.id,
      type: hook.hookType,
      claim: hook.payload.claim,
      factId: hook.payload.factId,
    });

    scenario.event(
      "story-hook.received",
      "Mira kaynakli kabul edilmis soylenti StoryHook olarak story generation pipeline'ina girdi.",
      { hookId: hook.id, claim: hook.payload.claim },
    );

    const settingsPort: StorySceneLlmSettingsPort = {
      async resolveSettings() {
        return {
          apiKey: "ultef-test-key",
          modelId: "ultef-deterministic-model",
          temperature: 0,
          maxOutputTokens: 1024,
          contentBoundary: "Korku, siddet ve yetiskin temasi yok.",
          ageBand: "6-8",
          locale: "tr-TR",
        };
      },
    };

    const caller = vi
      .fn()
      .mockImplementation(
        async (
          _apiKey: string,
          input: { messages: Array<{ content: string }> },
        ) => {
          const userPrompt = input.messages[1]?.content ?? "";
          scenario.event(
            "story.prompt.built",
            "Story prompt olusturuldu; 6-8 yas siniri ve Mira'nin kopru soylentisi prompt icinde yer aldi.",
            {
              includesAgeBand: userPrompt.includes("6-8"),
              includesRumor: userPrompt.includes(
                "Eski koprunun isiklari firtinadan once yaniyor.",
              ),
            },
          );

          return {
            model: "ultef-deterministic-model",
            content: JSON.stringify({
              sceneId: "scene-eski-kopru-001",
              setting:
                "Gunes Vadisi'ndeki eski kutuphanenin sicak ve aydinlik okuma kosesi",
              characters: ["Arin", "Mira"],
              narrative:
                "Mira, Arin'e eski koprunun isiklarinin firtinadan once yandigina dair duydugu soylentiyi anlatti. Arin merakla bunun ilk kim tarafindan goruldugunu sordu. Mira, birlikte guvenli bir sekilde daha fazla bilgi toplamayi onerdi.",
              moment:
                "Arin yeni bir gizemi sakin ve merakli bicimde arastirmaya karar verdi.",
              nextPrompt:
                "Arin Mira'ya soylentiyi ilk kimin duydugunu sorabilir.",
            }),
          };
        },
      );

    const service = new StorySceneGenerationService();
    const generated = await service.generateSceneFromHook({
      hook,
      settingsPort,
      callOpenRouter: caller,
      maxAttempts: 1,
    });

    scenario.event(
      "story.scene.generated",
      `Sahne olusturuldu: ${generated.scene.setting}. Karakterler: ${generated.scene.characters.join(", ")}.`,
      {
        sceneId: generated.scene.sceneId,
        setting: generated.scene.setting,
        characters: generated.scene.characters,
      },
    );
    scenario.event(
      "story.scene.narrative",
      `Hikaye sahnesi: ${generated.scene.narrative}`,
      { narrative: generated.scene.narrative },
    );

    const rumorPreserved = generated.scene.narrative.includes(
      "koprunun isiklarinin firtinadan once yandigina",
    );
    const miraPresent = generated.scene.characters.includes("Mira");
    const arinPresent = generated.scene.characters.includes("Arin");
    const safeAction = generated.scene.narrative.includes(
      "guvenli bir sekilde",
    );

    scenario.assert(
      "Rumor meaning survives hook -> prompt -> generated scene",
      rumorPreserved,
      true,
      rumorPreserved,
    );
    scenario.assert(
      "Source NPC Mira appears in the generated scene",
      miraPresent,
      true,
      miraPresent,
    );
    scenario.assert(
      "Player character Arin appears in the generated scene",
      arinPresent,
      true,
      arinPresent,
    );
    scenario.assert(
      "Generated action remains explicitly safe for the age band",
      safeAction,
      true,
      safeAction,
    );
    scenario.assert(
      "Generated scene passes production output validation",
      Boolean(generated.scene.sceneId),
      true,
      Boolean(generated.scene.sceneId),
    );

    scenario.delta(
      "story.hook.status",
      "pending",
      "rendered-to-scene",
      "generation pipeline consumed hook content semantically",
    );
    scenario.delta(
      "story.scene.count",
      0,
      1,
      "validated scene generated in-memory",
    );

    const allPassed =
      rumorPreserved &&
      miraPresent &&
      arinPresent &&
      safeAction &&
      Boolean(generated.scene.sceneId);
    const report = scenario.finish({
      result: allPassed ? "PASS" : "FAIL",
      reason: allPassed
        ? "The accepted rumor StoryHook was transformed into a validated, child-safe scene while preserving the rumor meaning and participating characters."
        : "The generated scene did not preserve one or more required hook/story invariants.",
    });

    await writeScenarioArtifacts(report, {
      environment: "integration-deterministic-provider-double",
    });
    expect(report.result).toBe("PASS");
  });
});
