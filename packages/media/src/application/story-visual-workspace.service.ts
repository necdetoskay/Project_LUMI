import type { AssetScope } from "../domain/asset";
import type {
  StoryIllustrationRequirement,
  StoryVisualEntityRequirement,
} from "../domain/story-visual-manifest";
import type {
  PersistedStoryVisualAssetSet,
  PersistedStoryVisualManifest,
  PersistedStoryVisualRender,
  StoryVisualRenderStatus,
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

export type StoryVisualWorkspaceRequirement = {
  key: string;
  targetKind: "entity-render" | "story-illustration";
  entityKind?: "character" | "item" | "environment";
  manifestEntityId?: string;
  displayName: string;
  variantId?: string | null;
  variantLabel?: string | null;
  stateId?: string | null;
  stateLabel?: string | null;
  sceneId?: string | null;
  status: StoryVisualRenderStatus;
  assetId?: string | null;
};

export type StoryVisualWorkspaceReadModel = {
  manifest: PersistedStoryVisualManifest | null;
  assetSet: PersistedStoryVisualAssetSet | null;
  renders: readonly PersistedStoryVisualRender[];
  requirements: readonly StoryVisualWorkspaceRequirement[];
  counts: StoryVisualWorkspaceCounts;
};

function renderCountForEntity(requirement: StoryVisualEntityRequirement): number {
  const variants = Math.max(requirement.variants.length, 1);
  const states = Math.max(requirement.requiredStates.length, 1);
  return variants * states;
}

function effectiveStatus(
  render: PersistedStoryVisualRender | undefined,
): StoryVisualRenderStatus {
  if (!render) return "missing";
  if (
    (render.status === "ready" || render.status === "reused") &&
    !render.assetId
  ) {
    return "missing";
  }
  return render.status;
}

function expandEntityRequirements(
  requirement: StoryVisualEntityRequirement,
  renders: readonly PersistedStoryVisualRender[],
): StoryVisualWorkspaceRequirement[] {
  const variants =
    requirement.variants.length > 0 ? requirement.variants : [null];
  const states =
    requirement.requiredStates.length > 0
      ? requirement.requiredStates
      : [null];

  return variants.flatMap((variant) =>
    states.map((state) => {
      const render = renders.find(
        (entry) =>
          entry.targetKind === "entity-render" &&
          entry.manifestEntityId === requirement.manifestEntityId &&
          (entry.variantId ?? null) === (variant?.id ?? null) &&
          (entry.stateId ?? null) === (state?.id ?? null),
      );

      return {
        key: [
          requirement.manifestEntityId,
          variant?.id ?? "base",
          state?.id ?? "base",
        ].join(":"),
        targetKind: "entity-render" as const,
        entityKind: requirement.identity.kind,
        manifestEntityId: requirement.manifestEntityId,
        displayName: requirement.identity.displayName,
        variantId: variant?.id ?? null,
        variantLabel: variant?.label ?? null,
        stateId: state?.id ?? null,
        stateLabel: state?.label ?? null,
        sceneId: requirement.sceneIds[0] ?? null,
        status: effectiveStatus(render),
        assetId: render?.assetId ?? null,
      };
    }),
  );
}

function expandIllustrationRequirement(
  requirement: StoryIllustrationRequirement,
  renders: readonly PersistedStoryVisualRender[],
): StoryVisualWorkspaceRequirement {
  const render = renders.find(
    (entry) =>
      entry.targetKind === "story-illustration" &&
      entry.targetId === requirement.id,
  );

  return {
    key: `illustration:${requirement.id}`,
    targetKind: "story-illustration",
    displayName: requirement.compositionBrief,
    sceneId: requirement.sceneId,
    status: effectiveStatus(render),
    assetId: render?.assetId ?? null,
  };
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

  const requirements = manifest
    ? [
        ...manifest.entities.flatMap((requirement) =>
          expandEntityRequirements(requirement, input.renders),
        ),
        ...manifest.storyIllustrations.map((requirement) =>
          expandIllustrationRequirement(requirement, input.renders),
        ),
      ]
    : [];

  const ready = requirements.filter(
    (requirement) =>
      requirement.status === "ready" || requirement.status === "reused",
  ).length;
  const generating = requirements.filter(
    (requirement) => requirement.status === "generating",
  ).length;
  const failed = requirements.filter(
    (requirement) => requirement.status === "failed",
  ).length;

  return {
    manifest: input.manifest,
    assetSet: input.assetSet,
    renders: input.renders,
    requirements,
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
