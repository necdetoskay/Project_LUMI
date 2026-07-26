import { eq } from "drizzle-orm";
import {
  mediaPromptTemplates,
  mediaRequests,
} from "../../db/schema";
import {
  withTransaction,
} from "../../db/transaction";
import { DrizzleAuditRepository } from "../../db/repositories/audit/drizzle-audit.repository";
import { DrizzleOutboxRepository } from "../../db/repositories/system/drizzle-outbox.repository";
import type { MediaProviderRegistry } from "../providers/provider-registry";
import type { MediaStorageProvider } from "../storage/storage-provider.types";
import { executeWithMediaFallback } from "../fallback/media-fallback.service";
import { renderMediaPrompt } from "../prompts/render-media-prompt";
import { reviewMediaRequest } from "../moderation/review-media-request";
import { persistMediaAsset } from "../persistence/persist-media-asset.service";

export class ImageGenerationOrchestrator {
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
            eq(
              mediaRequests.id,
              mediaRequestId,
            ),
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

        await tx
          .update(mediaRequests)
          .set({
            status: "generating",
            startedAt: new Date(),
          })
          .where(
            eq(
              mediaRequests.id,
              mediaRequestId,
            ),
          );

        return {
          request,
          template,
        };
      });

    const rendered =
      renderMediaPrompt(
        {
          code:
            bootstrap.template.code,
          template:
            bootstrap.template.template,
          negativePrompt:
            bootstrap.template.negativePrompt ??
            undefined,
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
      await withTransaction(async (tx) => {
        await tx
          .update(mediaRequests)
          .set({
            status:
              "moderation_failed",
            failureReason: {
              reasons:
                moderation.reasons,
            },
          })
          .where(
            eq(
              mediaRequests.id,
              mediaRequestId,
            ),
          );
      });

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
            this.registry.getImageProvider(
              target.providerCode,
            );

          return provider.generateImage({
            model: target.modelCode,
            prompt:
              moderation.sanitizedPrompt ??
              rendered.prompt,
            negativePrompt:
              rendered.negativePrompt,
            width: Number(
              bootstrap.request.width ??
                768,
            ),
            height: Number(
              bootstrap.request.height ??
                768,
            ),
            seed:
              bootstrap.request.seed ??
              undefined,
            consistencyMetadata:
              bootstrap.request
                .consistencyMetadata ??
              {},
          });
        },
      );

    const extension =
      generation.result.mimeType ===
      "image/png"
        ? "png"
        : "jpg";

    const stored =
      await this.storage.store({
        key: `worlds/${bootstrap.request.worldId}/media/${mediaRequestId}.${extension}`,
        bytes:
          generation.result.bytes,
        mimeType:
          generation.result.mimeType,
      });

    return withTransaction(async (tx) => {
      const asset =
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
            width:
              generation.result.width,
            height:
              generation.result.height,
            storyId:
              bootstrap.request.storyId ??
              undefined,
            storyNodeId:
              bootstrap.request.storyNodeId ??
              undefined,
            attachmentRole:
              bootstrap.request.purpose,
          },
        );

      const audit =
        new DrizzleAuditRepository(tx);
      const outbox =
        new DrizzleOutboxRepository(tx);

      await audit.append({
        actorType: "system",
        action:
          "media.image.generated",
        entityType: "media_asset",
        entityId: asset.id,
        afterState: {
          providerCode:
            generation.target.providerCode,
          modelCode:
            generation.target.modelCode,
          mediaRequestId,
        },
      });

      await outbox.enqueue({
        aggregateType: "media_asset",
        aggregateId: asset.id,
        eventType:
          "media.asset.ready",
        payload: {
          mediaAssetId: asset.id,
          mediaRequestId,
          worldId:
            bootstrap.request.worldId,
        },
      });

      return {
        status: "ready",
        asset,
      };
    });
  }
}
