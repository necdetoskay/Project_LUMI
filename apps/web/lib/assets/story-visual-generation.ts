import { createCharacterVisualStorageAdapter } from "@/lib/assets/character-visual-storage";
import type {
  StoryVisualGenerationJob,
  StoryVisualGenerationPort,
} from "@lumi/media/application";
import {
  getOwnedHousehold,
  registerManagedAssetMetadata,
  type ManagedAssetAuthorizationPort,
} from "@lumi/profiles/application";
import { OpenRouterImageGenerationAdapter } from "@lumi/profiles/adapters";

class StoryVisualManagedAssetAuthorizationAdapter
  implements ManagedAssetAuthorizationPort
{
  async assertCanManage(
    input: Parameters<ManagedAssetAuthorizationPort["assertCanManage"]>[0],
  ): Promise<void> {
    const household = await getOwnedHousehold(input.userId);
    if (!household || household.id !== input.householdId) {
      throw new Error("MANAGED_ASSET_FORBIDDEN");
    }
  }
}

export class WebStoryVisualGenerationAdapter
  implements StoryVisualGenerationPort
{
  private readonly provider: OpenRouterImageGenerationAdapter;
  private readonly storage = createCharacterVisualStorageAdapter();
  private readonly authorizationPort =
    new StoryVisualManagedAssetAuthorizationAdapter();

  constructor(
    apiKey: string,
    private readonly parentId: string,
    private readonly householdId: string,
  ) {
    this.provider = new OpenRouterImageGenerationAdapter({ apiKey });
  }

  async generate(job: StoryVisualGenerationJob): Promise<{ assetId: string }> {
    const result = await this.provider.generate({
      jobId: crypto.randomUUID(),
      prompt: job.prompt,
      model: "krea/krea-2-medium-turbo",
      candidateCount: 1,
      aspectRatio: job.subjectType === "story_scene" ? "4:3" : "1:1",
      resolution: "1K",
      strategy: "direct",
    });
    const image = result.images[0];
    if (!image) throw new Error("STORY_VISUAL_IMAGE_EMPTY");

    const stored = await this.storage.store({
      householdId: this.householdId,
      characterId: job.subjectId,
      jobId: crypto.randomUUID(),
      candidateIndex: 0,
      bytesBase64: image.bytesBase64,
      mimeType: image.mimeType,
    });

    const asset = await registerManagedAssetMetadata(
      this.parentId,
      {
        householdId: this.householdId,
        subjectType: job.subjectType,
        subjectId: job.subjectId,
        assetKind: job.assetKind,
        storageRef: stored.storageRef,
        mimeType: image.mimeType,
        width: image.width ?? null,
        height: image.height ?? null,
        provider: result.provider,
        model: result.model,
        originType: "generated",
        sourceSystem: "story-visual-generation-v1",
        provenance: {
          renderFingerprint: job.renderFingerprint,
          requirementKey: job.requirement.key,
          targetKind: job.requirement.targetKind,
          variantId: job.requirement.variantId ?? null,
          stateId: job.requirement.stateId ?? null,
          providerRequestId: result.providerRequestId ?? null,
        },
      },
      { authorizationPort: this.authorizationPort },
    );

    return { assetId: asset.id };
  }
}
