import { describe, expect, it } from "vitest";

import {
  buildPlayerRecap,
  containsTechnicalPresentationLeak,
  projectAdventureSummary,
  projectInventoryCandidate,
  projectOpportunityCandidate,
  semanticAdventureState,
} from "@/lib/stories/adventure-presentation";

describe("Stories UX v2 adventure presentation", () => {
  it("maps raw session status to child-facing semantic state", () => {
    expect(semanticAdventureState("active")).toBe("ongoing");
    expect(semanticAdventureState("paused")).toBe("ongoing");
    expect(semanticAdventureState("completed")).toBe("completed");
    expect(semanticAdventureState("abandoned")).toBe("archived");
  });

  it("builds player recap from narrative before technical/session metadata", () => {
    const recap = buildPlayerRecap({
      session: { id: "session-1", sessionStatus: "active" },
      definition: { title: "Fısıldayan Ormandaki İlk Işık" },
      version: { title: "v1", summary: "Sürüm özeti" },
      currentScene: {
        id: "scene-1",
        title: "Eski Meşe Ağacı",
        narrativeText:
          "Lina, eski meşe ağacının yanında parlayan izleri buldu. Işığın nereden geldiği hâlâ bilinmiyor.",
      },
    });

    expect(recap).toBe(
      "Lina, eski meşe ağacının yanında parlayan izleri buldu. Işığın nereden geldiği hâlâ bilinmiyor.",
    );
  });

  it("projects an ongoing adventure without status, playback, version or checkpoint fields", () => {
    const summary = projectAdventureSummary({
      session: { id: "session-1", sessionStatus: "active" },
      definition: { title: "Fısıldayan Ormandaki İlk Işık" },
      version: {
        title: "Fısıldayan Ormandaki İlk Işık",
        summary: "Lina ormanda gizemli bir ışığın izini sürüyor.",
      },
      currentScene: {
        id: "scene-1",
        title: "Eski Meşe Ağacı",
        narrativeText:
          "Lina, eski meşe ağacının yanında parlayan izleri buldu. Işığın sırrı henüz çözülmedi.",
      },
      location: { id: "location-1", displayName: "Eski Meşe Ağacı" },
      meaningfulItem: { id: "item-1", displayName: "Parlayan Pusula" },
      image: { kind: "story_scene", subjectId: "scene-1" },
    });

    expect(summary).toEqual({
      sessionId: "session-1",
      title: "Fısıldayan Ormandaki İlk Işık",
      semanticState: "ongoing",
      playerRecap:
        "Lina, eski meşe ağacının yanında parlayan izleri buldu. Işığın sırrı henüz çözülmedi.",
      currentSceneTitle: "Eski Meşe Ağacı",
      highlights: [
        { kind: "location", label: "Eski Meşe Ağacı", subjectId: "location-1" },
        { kind: "item", label: "Parlayan Pusula", subjectId: "item-1" },
      ],
      image: { kind: "story_scene", subjectId: "scene-1" },
    });
    expect(containsTechnicalPresentationLeak(summary)).toBe(false);
    expect("sessionStatus" in summary).toBe(false);
    expect("playbackMode" in summary).toBe(false);
    expect("version" in summary).toBe(false);
    expect("checkpoint" in summary).toBe(false);
  });

  it("maps rumor and NPC opportunities to natural source families without score/evidence leakage", () => {
    const rumor = projectOpportunityCandidate({
      id: "opp-rumor",
      type: "rumor",
      message: "Köyde herkes kaybolan orman bekçisini konuşuyor.",
      sourceNpcId: "npc-1",
      evidence: { claim: "Kaybolan Orman Bekçisi", secretRank: 9 },
    });
    const invitation = projectOpportunityCandidate({
      id: "opp-invite",
      type: "invitation",
      message: "Mira göl kıyısında seni bekliyor.",
      sourceNpcId: "npc-mira",
    });

    expect(rumor.sourceFamily).toBe("rumor");
    expect(rumor.ctaKey).toBe("investigateRumor");
    expect(rumor.title).toBe("Kaybolan Orman Bekçisi");
    expect(invitation.sourceFamily).toBe("npc_call");
    expect(invitation.ctaKey).toBe("answerNpcCall");
    expect(invitation.image).toEqual({ kind: "npc", subjectId: "npc-mira" });
    expect("score" in rumor).toBe(false);
    expect("evidence" in rumor).toBe(false);
  });

  it("projects story-selectable inventory as an item hook without rarity/category metadata", () => {
    const candidate = projectInventoryCandidate(
      { itemInstanceId: "item-1", displayName: "Parlayan Pusula" },
      "Pusula bugün daha önce gitmediğin bir yönü gösteriyor.",
    );

    expect(candidate).toEqual({
      id: "inventory:item-1",
      sourceFamily: "inventory_item",
      title: "Parlayan Pusula",
      teaser: "Pusula bugün daha önce gitmediğin bir yönü gösteriyor.",
      ctaKey: "followItem",
      image: { kind: "item", subjectId: "item-1" },
    });
    expect(containsTechnicalPresentationLeak(candidate)).toBe(false);
  });
});
