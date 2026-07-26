import { withTransaction } from "../../db/transaction";
import { DrizzleGenerationRepository } from "../../db/repositories/ai/drizzle-generation.repository";
import { DrizzleAuditRepository } from "../../db/repositories/audit/drizzle-audit.repository";
import { DrizzleOutboxRepository } from "../../db/repositories/system/drizzle-outbox.repository";
import { estimateStoryCost } from "../../lib/story/cost-estimator";

export async function createStoryGenerationRequestService(input: {
  userId: string;
  worldId: string;
  childProfileId: string;
  storyType: "static" | "interactive";
  titlePrompt?: string;
  themePrompt?: string;
  participantCharacterIds: string[];
  selectedItemInstanceId?: string;
  includeImages: boolean;
  imageCount: number;
  includeTts: boolean;
}) {
  return withTransaction(async (tx) => {
    const generationRepository =
      new DrizzleGenerationRepository(tx);
    const auditRepository =
      new DrizzleAuditRepository(tx);
    const outboxRepository =
      new DrizzleOutboxRepository(tx);

    const estimate = estimateStoryCost({
      estimatedInputTokens: 6_000,
      estimatedOutputTokens:
        input.storyType === "interactive" ? 8_000 : 5_000,
      textInputPerMillionTry: 8,
      textOutputPerMillionTry: 32,
      imageCount: input.includeImages
        ? input.imageCount
        : 0,
      imageUnitCostTry: 0.75,
      includeTts: input.includeTts,
      estimatedTtsCharacters: 12_000,
      ttsPerMillionCharactersTry: 450,
    });

    const request = await generationRepository.createRequest({
      requestType: "story",
      subjectType: "world",
      subjectId: input.worldId,
      inputPayload: {
        ...input,
        estimatedCostTry: estimate.totalCostTry,
      },
    });

    await auditRepository.append({
      actorType: "user",
      actorId: input.userId,
      action: "story.generation.requested",
      entityType: "generation_request",
      entityId: request.id,
      afterState: {
        worldId: input.worldId,
        childProfileId: input.childProfileId,
        storyType: input.storyType,
        estimatedCostTry: estimate.totalCostTry,
      },
    });

    await outboxRepository.enqueue({
      aggregateType: "generation_request",
      aggregateId: request.id,
      eventType: "story.generation.requested",
      payload: {
        generationRequestId: request.id,
        worldId: input.worldId,
      },
    });

    return {
      generationRequestId: request.id,
      estimatedCostTry: estimate.totalCostTry,
    };
  });
}
