import { describe, expect, it } from "vitest";
import {
  mapHookToScene,
  getSupportedHookTypes,
  getSupportedSceneTypes,
  selectNextSceneForHook,
} from "../../src/application/hook-scene-mapping.service";

describe("mapHookToScene", () => {
  it("maps rumor to narrative", () => {
    expect(mapHookToScene("rumor")).toBe("narrative");
  });

  it("maps gift to choice", () => {
    expect(mapHookToScene("gift")).toBe("choice");
  });

  it("maps warning to narrative", () => {
    expect(mapHookToScene("warning")).toBe("narrative");
  });

  it("maps invitation to transition", () => {
    expect(mapHookToScene("invitation")).toBe("transition");
  });

  it("maps quest_seed to narrative", () => {
    expect(mapHookToScene("quest_seed")).toBe("narrative");
  });

  it("maps social_visit to transition", () => {
    expect(mapHookToScene("social_visit")).toBe("transition");
  });

  it("maps information_share to narrative", () => {
    expect(mapHookToScene("information_share")).toBe("narrative");
  });
});

describe("getSupportedHookTypes", () => {
  it("returns all 7 hook types", () => {
    const types = getSupportedHookTypes();
    expect(types).toHaveLength(7);
    expect(types).toContain("rumor");
    expect(types).toContain("gift");
    expect(types).toContain("warning");
    expect(types).toContain("invitation");
    expect(types).toContain("quest_seed");
    expect(types).toContain("social_visit");
    expect(types).toContain("information_share");
  });
});

describe("getSupportedSceneTypes", () => {
  it("returns all 7 scene types", () => {
    const types = getSupportedSceneTypes();
    expect(types).toHaveLength(7);
    expect(types).toContain("narrative");
    expect(types).toContain("choice");
    expect(types).toContain("transition");
    expect(types).toContain("challenge");
    expect(types).toContain("ending");
    expect(types).toContain("reflection");
    expect(types).toContain("system");
  });
});

describe("selectNextSceneForHook", () => {
  const scenes = [
    { id: "s1", sceneType: "narrative", sequenceNumber: 1 },
    { id: "s2", sceneType: "choice", sequenceNumber: 2 },
    { id: "s3", sceneType: "transition", sequenceNumber: 3 },
    { id: "s4", sceneType: "narrative", sequenceNumber: 4 },
  ];

  it("prefers an unvisited scene matching the hook's scene type", () => {
    const hook = { sceneType: "choice" as const };
    const picked = selectNextSceneForHook(hook, scenes, new Set());
    expect(picked?.id).toBe("s2");
  });

  it("skips visited scenes of the matching type", () => {
    const hook = { sceneType: "narrative" as const };
    const picked = selectNextSceneForHook(hook, scenes, new Set(["s1"]));
    expect(picked?.id).toBe("s4");
  });

  it("falls back to the next unvisited scene when no type matches", () => {
    const hook = { sceneType: "ending" as const };
    const picked = selectNextSceneForHook(hook, scenes, new Set());
    expect(picked?.id).toBe("s1");
  });

  it("falls back to next unvisited scene when no hook is provided", () => {
    const picked = selectNextSceneForHook(undefined, scenes, new Set(["s1"]));
    expect(picked?.id).toBe("s2");
  });

  it("returns undefined when all scenes are visited", () => {
    const picked = selectNextSceneForHook(
      { sceneType: "narrative" as const },
      scenes,
      new Set(scenes.map((s) => s.id)),
    );
    expect(picked).toBeUndefined();
  });
});
