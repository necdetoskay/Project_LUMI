import { eq } from "drizzle-orm";
import {
  mediaPromptTemplates,
  mediaRequests,
} from "../../db/schema";
import {
  withTransaction,
} from "../../db/transaction";
import type { MediaProviderRegistry } from "../providers/provider-registry";
import type { MediaStorageProvider } from "../storage/storage-provider.types";
import { executeWithMediaFallback } from "../fallback/media-fallback.service";
import { renderMediaPrompt } from "../prompts/render-media-prompt";
import { reviewMediaRequest } from "../moderation/review-media-request";
import { persistMediaAsset } from "../persistence/persist-media-asset.service";

export class AudioGenerationOrchestrator {
  constructor(
    private readonly registry:
      MediaProviderRegistry,
    private readonly storage:
      MediaStorageProvider,
  ) {}

  async execute(
    mediaRequestId: string,
  ) {
    const bootstrap =
      await withTransaction(async (tx) => {
        const [request] = await tx
          .select()
          .from(mediaRequests)
          .where(
            eq(mediaRequests.id, mediaRequestId),
          )
          .limit(1);

        if (!request) {
          throw new Error(
            "Media request not found",
          );
        }

        const [template] = await tx
          .select()
          .from(mediaPromptTemplates)
          .where(
            eq(
              mediaPromptTemplates.code,
              request.promptTemplateCode,
            ),
          )
          .limit(1);

        if (!template) {
          throw new Error(
            "Media prompt template not found",
          );
        }

        return {
          request,
          template,
        };
      });

    const rendered = renderMediaPrompt(
      {
        code: bootstrap.template.code,
        template:
          bootstrap.template.template,
      },
      bootstrap.request.promptVariables,
    );

    const moderation =
      reviewMediaRequest({
        prompt: rendered.prompt,
        purpose:
          bootstrap.request.purpose,
      });

    if (!moderation.allowed) {
      return {
        status: "moderation_failed",
      };
    }

    const targets =
      (
        bootstrap.template.providerFallbacks ??
        []
      ) as Array<{
        providerCode: string;
        modelCode: string;
        maxAttempts: number;
      }>;

    const generation =
      await executeWithMediaFallback(
        targets,
        async (target) => {
          const provider =
            this.registry.getAudioProvider(
              target.providerCode,
            );

          return provider.generateAudio({
            model: target.modelCode,
            text:
              moderation.sanitizedPrompt ??
              rendered.prompt,
            voiceCode: String(
              bootstrap.request.voiceCode ??
                "default",
            ),
            speakingRate: Number(
              bootstrap.request.speakingRate ??
                1,
            ),
            emotionStyle:
              bootstrap.request.emotionStyle ??
              undefined,
            format: "mp3",
          });
        },
      );

    const stored =
      await this.storage.store({
        key: `worlds/${bootstrap.request.worldId}/media/${mediaRequestId}.mp3`,
        bytes:
          generation.result.bytes,
        mimeType:
          generation.result.mimeType,
      });

    return withTransaction(async (tx) => ({
      status: "ready",
      asset:
        await persistMediaAsset(
          tx,
          {
            mediaRequestId,
            storedAsset: stored,
            providerCode:
              generation.target.providerCode,
            modelCode:
              generation.target.modelCode,
            actualCostTry:
              Number(
                bootstrap.request.estimatedCostTry,
              ),
            durationMs:
              generation.result.durationMs,
            storyId:
              bootstrap.request.storyId ??
              undefined,
            storyNodeId:
              bootstrap.request.storyNodeId ??
              undefined,
            attachmentRole:
              "story_audio",
          },
        ),
    }));
  }
}
