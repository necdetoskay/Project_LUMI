import {
  computeStoryVisualEntityFingerprint,
  computeStoryVisualRenderFingerprint,
  type StoryVisualEntityIdentity,
  type StoryVisualEntityRequirement,
  type StoryVisualManifest,
  type StoryVisualStateRef,
  type StoryVisualVariant,
} from "./story-visual-manifest";
import type { VisualStyleId } from "./visual-style";

export type ExistingVisualEntity = {
  entityId: string;
  identity: StoryVisualEntityIdentity;
};

export type StoryVisualEntityResolution = {
  manifestEntityId: string;
  resolvedEntityId: string;
  source: "canonical-ref" | "identity-match" | "new-entity";
  entityFingerprint: string;
};

export type ExistingVisualRender = {
  assetId: string;
  renderFingerprint: string;
};

export type StoryVisualRenderTarget = {
  manifestEntityId: string;
  resolvedEntityId: string;
  variant: StoryVisualVariant | null;
  state: StoryVisualStateRef | null;
  renderFingerprint: string;
};

export type StoryVisualAssetResolutionPlan = {
  entityResolutions: readonly StoryVisualEntityResolution[];
  reusableRenders: readonly (StoryVisualRenderTarget & { assetId: string })[];
  missingRenders: readonly StoryVisualRenderTarget[];
};

function sameConcreteIdentity(
  requirement: StoryVisualEntityRequirement,
  candidate: ExistingVisualEntity,
): boolean {
  if (requirement.identity.kind !== candidate.identity.kind) return false;

  return (
    computeStoryVisualEntityFingerprint(requirement.identity) ===
    computeStoryVisualEntityFingerprint(candidate.identity)
  );
}

export function resolveStoryVisualEntities(input: {
  manifest: StoryVisualManifest;
  existingEntities: readonly ExistingVisualEntity[];
}): readonly StoryVisualEntityResolution[] {
  return input.manifest.entities.map((requirement) => {
    const canonicalRef = requirement.identity.canonicalRef?.trim();
    if (canonicalRef) {
      const canonicalCandidate = input.existingEntities.find(
        (candidate) =>
          candidate.entityId === canonicalRef ||
          candidate.identity.canonicalRef === canonicalRef,
      );

      if (canonicalCandidate) {
        return {
          manifestEntityId: requirement.manifestEntityId,
          resolvedEntityId: canonicalCandidate.entityId,
          source: "canonical-ref" as const,
          entityFingerprint: computeStoryVisualEntityFingerprint(
            canonicalCandidate.identity,
          ),
        };
      }
    }

    const identityCandidate = input.existingEntities.find((candidate) =>
      sameConcreteIdentity(requirement, candidate),
    );

    if (identityCandidate) {
      return {
        manifestEntityId: requirement.manifestEntityId,
        resolvedEntityId: identityCandidate.entityId,
        source: "identity-match" as const,
        entityFingerprint: computeStoryVisualEntityFingerprint(
          identityCandidate.identity,
        ),
      };
    }

    return {
      manifestEntityId: requirement.manifestEntityId,
      resolvedEntityId: requirement.identity.entityId,
      source: "new-entity" as const,
      entityFingerprint: computeStoryVisualEntityFingerprint(
        requirement.identity,
      ),
    };
  });
}

function renderDimensions(
  requirement: StoryVisualEntityRequirement,
): readonly {
  variant: StoryVisualVariant | null;
  state: StoryVisualStateRef | null;
}[] {
  const variants: readonly (StoryVisualVariant | null)[] =
    requirement.variants.length > 0 ? requirement.variants : [null];
  const states: readonly (StoryVisualStateRef | null)[] =
    requirement.requiredStates.length > 0 ? requirement.requiredStates : [null];

  return variants.flatMap((variant) =>
    states.map((state) => ({ variant, state })),
  );
}

export function planMissingStoryVisualAssets(input: {
  manifest: StoryVisualManifest;
  existingEntities: readonly ExistingVisualEntity[];
  existingRenders: readonly ExistingVisualRender[];
  styleId: VisualStyleId;
  styleVersion: number;
  promptCompilerVersion: string;
}): StoryVisualAssetResolutionPlan {
  const entityResolutions = resolveStoryVisualEntities(input);
  const resolutionByManifestId = new Map(
    entityResolutions.map((resolution) => [
      resolution.manifestEntityId,
      resolution,
    ]),
  );
  const existingRenderByFingerprint = new Map(
    input.existingRenders.map((render) => [render.renderFingerprint, render]),
  );

  const targets = input.manifest.entities.flatMap((requirement) => {
    const resolution = resolutionByManifestId.get(requirement.manifestEntityId);
    if (!resolution) {
      throw new Error("STORY_VISUAL_ENTITY_RESOLUTION_MISSING");
    }

    const resolvedIdentity: StoryVisualEntityIdentity = {
      ...requirement.identity,
      entityId: resolution.resolvedEntityId,
      canonicalRef:
        requirement.identity.canonicalRef ?? resolution.resolvedEntityId,
    };

    return renderDimensions(requirement).map(({ variant, state }) => ({
      manifestEntityId: requirement.manifestEntityId,
      resolvedEntityId: resolution.resolvedEntityId,
      variant,
      state,
      renderFingerprint: computeStoryVisualRenderFingerprint({
        identity: resolvedIdentity,
        variant,
        state,
        styleId: input.styleId,
        styleVersion: input.styleVersion,
        promptCompilerVersion: input.promptCompilerVersion,
      }),
    }));
  });

  const reusableRenders: (StoryVisualRenderTarget & { assetId: string })[] = [];
  const missingRenders: StoryVisualRenderTarget[] = [];

  for (const target of targets) {
    const existing = existingRenderByFingerprint.get(target.renderFingerprint);
    if (existing) {
      reusableRenders.push({ ...target, assetId: existing.assetId });
    } else {
      missingRenders.push(target);
    }
  }

  return {
    entityResolutions,
    reusableRenders,
    missingRenders,
  };
}
