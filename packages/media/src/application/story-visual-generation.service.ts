import type { AssetScope } from "../domain/asset";
import { sha256Hex } from "../domain/fingerprint";
import {
  computeStoryVisualRenderFingerprint,
  type StoryIllustrationRequirement,
  type StoryVisualEntityRequirement,
  type StoryVisualVariant,
  type StoryVisualStateRef,
} from "../domain/story-visual-manifest";
import type { VisualStyleId } from "../domain/visual-style";
import type {
  PersistedStoryVisualRender,
  StoryVisualWorkspaceRepositoryPort,
} from "../ports/repository.port";
import {
  loadStoryVisualWorkspace,
  type StoryVisualWorkspaceReadModel,
  type StoryVisualWorkspaceRequirement,
} from "./story-visual-workspace.service";
import { compileVisualPrompt } from "./visual-prompt-compiler";

export const STORY_VISUAL_PROMPT_COMPILER_VERSION = "story-visual-v1";

export type StoryVisualGenerationRequest = {
  storyId: string;
  scope: AssetScope;
  requirementKeys?: readonly string[];
  force?: boolean;
};

export type StoryVisualGenerationJob = {
  requirement: StoryVisualWorkspaceRequirement;
  prompt: string;
  renderFingerprint: string;
  subjectId: string;
  subjectType: "character" | "item" | "location" | "story_scene";
  assetKind: string;
};

export type StoryVisualGeneratedAsset = {
  assetId: string;
};

export interface StoryVisualGenerationPort {
  generate(job: StoryVisualGenerationJob): Promise<StoryVisualGeneratedAsset>;
}

export type StoryVisualGenerationResult = {
  workspace: StoryVisualWorkspaceReadModel;
  generated: number;
  reused: number;
  failed: number;
  skipped: number;
};

function findEntityRequirement(
  workspace: StoryVisualWorkspaceReadModel,
  requirement: StoryVisualWorkspaceRequirement,
): StoryVisualEntityRequirement {
  const entity = workspace.manifest?.manifest.entities.find(
    (entry) => entry.manifestEntityId === requirement.manifestEntityId,
  );
  if (!entity) throw new Error("STORY_VISUAL_ENTITY_REQUIREMENT_NOT_FOUND");
  return entity;
}

function findVariant(
  entity: StoryVisualEntityRequirement,
  variantId: string | null | undefined,
): StoryVisualVariant | null {
  if (!variantId) return null;
  return entity.variants.find((entry) => entry.id === variantId) ?? null;
}

function findState(
  entity: StoryVisualEntityRequirement,
  stateId: string | null | undefined,
): StoryVisualStateRef | null {
  if (!stateId) return null;
  return entity.requiredStates.find((entry) => entry.id === stateId) ?? null;
}

function entityPrompt(
  entity: StoryVisualEntityRequirement,
  variant: StoryVisualVariant | null,
  state: StoryVisualStateRef | null,
  styleId: VisualStyleId,
  styleVersion: number,
) {
  const assetType =
    entity.identity.kind === "character"
      ? "character"
      : entity.identity.kind === "environment"
        ? "environment"
        : "item";

  const identity = [
    `NAME: ${entity.identity.displayName}`,
    `CATEGORY: ${entity.identity.category}`,
    ...entity.identity.identityTraits,
    ...(variant
      ? [`VARIANT: ${variant.label}`, ...variant.traits]
      : []),
    ...(state ? [`STATE: ${state.label}`] : []),
  ];

  if (assetType === "item" && state) {
    return compileVisualPrompt({
      assetType,
      styleId,
      styleVersion,
      identity,
      states: [
        {
          id: state.id,
          label: state.label,
          prompt: `Show the object specifically in its ${state.label} state.`,
        },
      ],
    }).prompt;
  }

  return compileVisualPrompt({
    assetType,
    styleId,
    styleVersion,
    identity,
  }).prompt;
}

function illustrationFingerprint(input: {
  requirement: StoryIllustrationRequirement;
  storyId: string;
  styleId: VisualStyleId;
  styleVersion: number;
}) {
  return sha256Hex(
    JSON.stringify({
      storyId: input.storyId,
      illustrationId: input.requirement.id,
      sceneId: input.requirement.sceneId,
      compositionBrief: input.requirement.compositionBrief.trim(),
      styleId: input.styleId,
      styleVersion: input.styleVersion,
      promptCompilerVersion: STORY_VISUAL_PROMPT_COMPILER_VERSION,
    }),
  );
}

function buildJob(
  workspace: StoryVisualWorkspaceReadModel,
  requirement: StoryVisualWorkspaceRequirement,
): StoryVisualGenerationJob {
  const assetSet = workspace.assetSet;
  const manifest = workspace.manifest?.manifest;
  if (!assetSet || !manifest) {
    throw new Error("STORY_VISUAL_WORKSPACE_NOT_GENERATABLE");
  }

  if (requirement.targetKind === "story-illustration") {
    const illustration = manifest.storyIllustrations.find(
      (entry) => `illustration:${entry.id}` === requirement.key,
    );
    if (!illustration) {
      throw new Error("STORY_VISUAL_ILLUSTRATION_REQUIREMENT_NOT_FOUND");
    }
    return {
      requirement,
      prompt: [
        `STYLE: ${assetSet.styleId} v${assetSet.styleVersion}.`,
        `STORY SCENE ILLUSTRATION: ${illustration.compositionBrief}`,
        "Keep all recurring character and object identities consistent with their canonical references.",
        "No text, captions, labels, logos or watermarks.",
      ].join(" "),
      renderFingerprint: illustrationFingerprint({
        requirement: illustration,
        storyId: manifest.storyId,
        styleId: assetSet.styleId,
        styleVersion: assetSet.styleVersion,
      }),
      subjectId: illustration.sceneId,
      subjectType: "story_scene",
      assetKind: "story-illustration",
    };
  }

  const entity = findEntityRequirement(workspace, requirement);
  const variant = findVariant(entity, requirement.variantId);
  const state = findState(entity, requirement.stateId);
  const renderFingerprint = computeStoryVisualRenderFingerprint({
    identity: entity.identity,
    variant,
    state,
    styleId: assetSet.styleId,
    styleVersion: assetSet.styleVersion,
    promptCompilerVersion: STORY_VISUAL_PROMPT_COMPILER_VERSION,
  });

  return {
    requirement,
    prompt: entityPrompt(
      entity,
      variant,
      state,
      assetSet.styleId,
      assetSet.styleVersion,
    ),
    renderFingerprint,
    subjectId: entity.identity.entityId,
    subjectType:
      entity.identity.kind === "environment"
        ? "location"
        : entity.identity.kind,
    assetKind:
      entity.identity.kind === "character"
        ? "character-story-render"
        : entity.identity.kind === "environment"
          ? "environment-render"
          : "item-icon",
  };
}

function matchesExistingRender(
  render: PersistedStoryVisualRender,
  requirement: StoryVisualWorkspaceRequirement,
) {
  if (render.targetKind !== requirement.targetKind) return false;
  if (requirement.targetKind === "story-illustration") {
    return render.targetId === requirement.key.replace("illustration:", "");
  }
  return (
    render.manifestEntityId === requirement.manifestEntityId &&
    (render.variantId ?? null) === (requirement.variantId ?? null) &&
    (render.stateId ?? null) === (requirement.stateId ?? null)
  );
}

async function ensureRender(
  repository: StoryVisualWorkspaceRepositoryPort,
  workspace: StoryVisualWorkspaceReadModel,
  job: StoryVisualGenerationJob,
): Promise<PersistedStoryVisualRender> {
  const existing = workspace.renders.find((render) =>
    matchesExistingRender(render, job.requirement),
  );
  if (existing) {
    if (existing.renderFingerprint !== job.renderFingerprint) {
      const updated = await repository.updateRender(existing.id, {
        assetId: null,
        status: "missing",
      });
      if (!updated) throw new Error("STORY_VISUAL_RENDER_UPDATE_FAILED");
      return updated;
    }
    return existing;
  }

  const assetSet = workspace.assetSet;
  if (!assetSet) throw new Error("STORY_VISUAL_ASSET_SET_REQUIRED");
  return repository.createRender({
    id: crypto.randomUUID(),
    assetSetId: assetSet.id,
    targetKind: job.requirement.targetKind,
    targetId:
      job.requirement.targetKind === "story-illustration"
        ? job.requirement.key.replace("illustration:", "")
        : job.requirement.manifestEntityId!,
    manifestEntityId: job.requirement.manifestEntityId ?? null,
    resolvedEntityId:
      job.requirement.targetKind === "entity-render" ? job.subjectId : null,
    variantId: job.requirement.variantId ?? null,
    stateId: job.requirement.stateId ?? null,
    renderFingerprint: job.renderFingerprint,
    assetId: null,
    status: "missing",
  });
}

export async function generateStoryVisuals(input: {
  repository: StoryVisualWorkspaceRepositoryPort;
  generator: StoryVisualGenerationPort;
  request: StoryVisualGenerationRequest;
}): Promise<StoryVisualGenerationResult> {
  let workspace = await loadStoryVisualWorkspace({
    repository: input.repository,
    storyId: input.request.storyId,
    scope: input.request.scope,
  });
  if (!workspace.manifest || !workspace.assetSet) {
    throw new Error("STORY_VISUAL_WORKSPACE_NOT_GENERATABLE");
  }

  const requestedKeys = input.request.requirementKeys
    ? new Set(input.request.requirementKeys)
    : null;
  const requirements = workspace.requirements.filter((requirement) => {
    if (requestedKeys && !requestedKeys.has(requirement.key)) return false;
    if (input.request.force) return true;
    return requirement.status !== "ready" && requirement.status !== "reused";
  });

  let generated = 0;
  let reused = 0;
  let failed = 0;
  let skipped = workspace.requirements.length - requirements.length;

  for (const requirement of requirements) {
    const job = buildJob(workspace, requirement);
    const render = await ensureRender(input.repository, workspace, job);

    if (!input.request.force) {
      const reusable = await input.repository.findReusableRender(
        job.renderFingerprint,
        input.request.scope,
      );
      if (reusable?.assetId && reusable.id !== render.id) {
        await input.repository.updateRender(render.id, {
          assetId: reusable.assetId,
          status: "reused",
        });
        reused += 1;
        continue;
      }
      if (
        render.assetId &&
        (render.status === "ready" || render.status === "reused")
      ) {
        skipped += 1;
        continue;
      }
    }

    await input.repository.updateRender(render.id, {
      assetId: null,
      status: "generating",
    });
    try {
      const result = await input.generator.generate(job);
      await input.repository.updateRender(render.id, {
        assetId: result.assetId,
        status: "ready",
      });
      generated += 1;
    } catch {
      await input.repository.updateRender(render.id, {
        assetId: null,
        status: "failed",
      });
      failed += 1;
    }
  }

  workspace = await loadStoryVisualWorkspace({
    repository: input.repository,
    storyId: input.request.storyId,
    scope: input.request.scope,
  });

  return { workspace, generated, reused, failed, skipped };
}
