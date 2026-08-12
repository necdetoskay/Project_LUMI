import type { AssetScope } from "../domain/asset";
import type { StoryVisualEntityRequirement } from "../domain/story-visual-manifest";
import type {
  PersistedStoryVisualAssetSet,
  PersistedStoryVisualManifest,
  PersistedStoryVisualRender,
  StoryVisualWorkspaceRepositoryPort,
} from "../ports/repository.port";

export type StoryVisualWorkspaceCounts = {
  characters: number;
  items: number;
  environments: number;
  scenes: number;
  total: number;
  ready: number;
  missing: number;
  generating: number;
  failed: number;
};

export type StoryVisualWorkspaceReadModel = {
  manifest: PersistedStoryVisualManifest | null;
  assetSet: PersistedStoryVisualAssetSet | null;
  renders: readonly PersistedStoryVisualRender[];
  counts: StoryVisualWorkspaceCounts;
};

function renderCountForEntity(
  requirement: StoryVisualEntityRequirement,
): number {
  const variants = Math.max(requirement.variants.length, 1);
  const states = Math.max(requirement.requiredStates.length, 1);
  return variants * states;
}

export function summarizeStoryVisualWorkspace(input: {
  manifest: PersistedStoryVisualManifest | null;
  assetSet: PersistedStoryVisualAssetSet | null;
  renders: readonly PersistedStoryVisualRender[];
}): StoryVisualWorkspaceReadModel {
  const manifest = input.manifest?.manifest ?? null;
  const expectedEntityRenders =
    manifest?.entities.reduce(
      (total, requirement) => total + renderCountForEntity(requirement),
      0,
    ) ?? 0;
  const expectedIllustrations = manifest?.storyIllustrations.length ?? 0;
  const total = expectedEntityRenders + expectedIllustrations;

  const ready = input.renders.filter(
    (render) =>
      (render.status === "ready" || render.status === "reused") &&
      Boolean(render.assetId),
  ).length;
  const generating = input.renders.filter(
    (render) => render.status === "generating",
  ).length;
  const failed = input.renders.filter(
    (render) => render.status === "failed",
  ).length;

  return {
    manifest: input.manifest,
    assetSet: input.assetSet,
    renders: input.renders,
    counts: {
      characters:
        manifest?.entities.filter(
          (requirement) => requirement.identity.kind === "character",
        ).length ?? 0,
      items:
        manifest?.entities.filter(
          (requirement) => requirement.identity.kind === "item",
        ).length ?? 0,
      environments:
        manifest?.entities.filter(
          (requirement) => requirement.identity.kind === "environment",
        ).length ?? 0,
      scenes: expectedIllustrations,
      total,
      ready,
      missing: Math.max(total - ready, 0),
      generating,
      failed,
    },
  };
}

export async function loadStoryVisualWorkspace(input: {
  repository: StoryVisualWorkspaceRepositoryPort;
  storyId: string;
  scope: AssetScope;
}): Promise<StoryVisualWorkspaceReadModel> {
  const manifest = await input.repository.getLatestManifest(
    input.storyId,
    input.scope,
  );
  const assetSet = await input.repository.getActiveAssetSet(
    input.storyId,
    input.scope,
  );
  const renders = assetSet
    ? await input.repository.listRenders(assetSet.id)
    : ([] satisfies PersistedStoryVisualRender[]);

  return summarizeStoryVisualWorkspace({ manifest, assetSet, renders });
}
