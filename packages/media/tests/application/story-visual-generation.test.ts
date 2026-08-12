import { describe, expect, it, vi } from "vitest";

import { generateStoryVisuals } from "../../src/application/story-visual-generation.service";
import type {
  PersistedStoryVisualAssetSet,
  PersistedStoryVisualManifest,
  PersistedStoryVisualRender,
  StoryVisualWorkspaceRepositoryPort,
} from "../../src/ports/repository.port";

const scope = {
  householdId: "10000000-0000-4000-8000-000000000010",
  childProfileId: "10000000-0000-4000-8000-000000000011",
  worldId: "10000000-0000-4000-8000-000000000012",
};

const manifest: PersistedStoryVisualManifest = {
  id: "10000000-0000-4000-8000-000000000001",
  scope,
  storyId: "10000000-0000-4000-8000-000000000020",
  manifestFingerprint: "a".repeat(64),
  createdAt: new Date("2026-08-12T00:00:00.000Z"),
  manifest: {
    schemaVersion: 1,
    storyId: "10000000-0000-4000-8000-000000000020",
    source: "story-generation",
    entities: [
      {
        manifestEntityId: "compass",
        identity: {
          entityId: "10000000-0000-4000-8000-000000000030",
          kind: "item",
          category: "compass",
          displayName: "Old Brass Compass",
          identityTraits: ["aged brass", "blue needle"],
        },
        variants: [],
        requiredStates: [{ id: "open", label: "Open" }],
        importance: "critical",
        reusable: true,
        sceneIds: ["scene-1"],
      },
    ],
    sceneBindings: [],
    storyIllustrations: [],
  },
};

const assetSet: PersistedStoryVisualAssetSet = {
  id: "10000000-0000-4000-8000-000000000040",
  manifestId: manifest.id,
  scope,
  storyId: manifest.storyId,
  manifestFingerprint: manifest.manifestFingerprint,
  styleId: "lumi-storybook",
  styleVersion: 1,
  status: "planned",
  active: true,
  createdAt: "2026-08-12T00:00:00.000Z",
};

class MemoryRepository implements StoryVisualWorkspaceRepositoryPort {
  renders: PersistedStoryVisualRender[] = [];
  reusable: PersistedStoryVisualRender | null = null;

  async createManifest() {
    return manifest;
  }
  async getLatestManifest() {
    return manifest;
  }
  async createAssetSet() {
    return assetSet;
  }
  async getActiveAssetSet() {
    return assetSet;
  }
  async setActiveAssetSet() {
    return assetSet;
  }
  async createRender(
    render: Omit<PersistedStoryVisualRender, "createdAt" | "updatedAt">,
  ) {
    const persisted = {
      ...render,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.renders.push(persisted);
    return persisted;
  }
  async updateRender(
    renderId: string,
    patch: { assetId?: string | null; status?: PersistedStoryVisualRender["status"] },
  ) {
    const render = this.renders.find((entry) => entry.id === renderId);
    if (!render) return null;
    Object.assign(render, patch, { updatedAt: new Date() });
    return render;
  }
  async findReusableRender() {
    return this.reusable;
  }
  async listRenders() {
    return this.renders;
  }
}

describe("story visual generation", () => {
  it("generates a missing requirement and persists ready lifecycle", async () => {
    const repository = new MemoryRepository();
    const generate = vi.fn().mockResolvedValue({
      assetId: "10000000-0000-4000-8000-000000000050",
    });

    const result = await generateStoryVisuals({
      repository,
      generator: { generate },
      request: { storyId: manifest.storyId, scope },
    });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.generated).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.workspace.counts.ready).toBe(1);
    expect(repository.renders[0]).toMatchObject({
      status: "ready",
      assetId: "10000000-0000-4000-8000-000000000050",
    });
  });

  it("reuses a compatible fingerprint without calling the provider", async () => {
    const repository = new MemoryRepository();
    const generate = vi.fn();

    await generateStoryVisuals({
      repository,
      generator: {
        generate: async (job) => {
          repository.reusable = {
            id: "10000000-0000-4000-8000-000000000060",
            assetSetId: "10000000-0000-4000-8000-000000000061",
            targetKind: "entity-render",
            targetId: "compass",
            manifestEntityId: "compass",
            resolvedEntityId: manifest.manifest.entities[0]!.identity.entityId,
            variantId: null,
            stateId: "open",
            renderFingerprint: job.renderFingerprint,
            assetId: "10000000-0000-4000-8000-000000000062",
            status: "ready",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          return { assetId: "unused" };
        },
      },
      request: { storyId: manifest.storyId, scope },
    });

    repository.renders = [];
    const result = await generateStoryVisuals({
      repository,
      generator: { generate },
      request: { storyId: manifest.storyId, scope },
    });

    expect(generate).not.toHaveBeenCalled();
    expect(result.reused).toBe(1);
    expect(result.workspace.counts.ready).toBe(1);
    expect(repository.renders[0]?.status).toBe("reused");
  });
});
