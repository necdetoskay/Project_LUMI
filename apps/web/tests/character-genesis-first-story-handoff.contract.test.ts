import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());

describe("Character Genesis first-story production handoff contract", () => {
  it("routes a committed package through the existing production story composer", async () => {
    const handoff = await readFile(
      resolve(root, "lib/story/genesis-first-story-context.service.ts"),
      "utf8",
    );
    const runtime = await readFile(
      resolve(root, "lib/story-context-runtime.ts"),
      "utf8",
    );

    expect(handoff).toContain("buildCommittedGenesisStoryContextProjection");
    expect(handoff).toContain("createProductionStoryContextComposer");
    expect(handoff).toContain(".build(");
    expect(runtime).toContain("StoryContextCanonicalSourceOverrides");
    expect(runtime).toContain("overrides.longTermMemorySource");
    expect(runtime).toContain("overrides.relevantNpcSource");
    expect(runtime).toContain("overrides.worldSource");
    expect(runtime).toContain("overrides.originPackageSource");
    expect(handoff).not.toContain("new ContextBuilder");
    expect(handoff).not.toContain("createStoryGenerationContextComposer");
  });

  it("projects only provider-safe fragments rather than full Genesis state", async () => {
    const handoff = await readFile(
      resolve(root, "lib/story/genesis-first-story-context.service.ts"),
      "utf8",
    );
    const domainProjection = await readFile(
      resolve(
        root,
        "../../packages/world/src/domain/character-genesis-cross-domain.ts",
      ),
      "utf8",
    );

    expect(handoff).toContain("projection.relevantMemories.memories");
    expect(handoff).toContain("projection.relevantMemories.threads");
    expect(handoff).toContain("projection.relevantMemories.storyHooks");
    expect(handoff).toContain("projection.characterState.social.npcs");
    expect(handoff).toContain("projection.worldState.stable");
    expect(domainProjection).toContain("buildCharacterVisibleOriginContext(origin)");
    expect(domainProjection).not.toContain("narrative: origin.narrative");
  });
});
