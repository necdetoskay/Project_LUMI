import { eq } from "drizzle-orm";
import {
  aiModels,
  generationAttempts,
  generationRequests,
  safetyReviews,
} from "../../db/schema";
import {
  withTransaction,
} from "../../db/transaction";
import { DrizzleAuditRepository } from "../../db/repositories/audit/drizzle-audit.repository";
import { DrizzleOutboxRepository } from "../../db/repositories/system/drizzle-outbox.repository";
import { recordGenerationCompletion } from "../../application/ai/record-generation-completion.use-case";
import { ModelFallbackService } from "../../ai/fallback/model-fallback.service";
import type { ModelFallbackPlan } from "../../ai/fallback/model-fallback.types";
import type { AiProviderRegistry } from "../../ai/providers/provider-registry";
import {
  generatedStorySchema,
  type GeneratedStory,
} from "../schemas/generated-story.schema";
import { validateStoryGraph } from "../validation/story-graph.validator";
import { buildStoryContext } from "../context/build-story-context.service";
import { renderStoryPrompt } from "../prompts/render-story-prompt";
import { reviewStorySafety } from "../safety/story-safety.service";
import { persistGeneratedStory } from "../persistence/persist-generated-story.service";

export class StoryGenerationOrchestrator {
  constructor(
    private readonly registry: AiProviderRegistry,
    private readonly fallbackPlan: ModelFallbackPlan,
  ) {}

  async execute(
    generationRequestId: string,
  ): Promise<{
    storyId: string;
    storyVersionId: string;
  }> {
    const request = await withTransaction(
      async (tx) => {
        const [record] = await tx
          .select()
          .from(generationRequests)
          .where(
            eq(
              generationRequests.id,
              generationRequestId,
            ),
          )
          .limit(1);

        if (!record) {
          throw new Error(
            "Generation request not found",
          );
        }

        await tx
          .update(generationRequests)
          .set({
            status: "running",
            updatedAt: new Date(),
          })
          .where(
            eq(
              generationRequests.id,
              generationRequestId,
            ),
          );

        return record;
      },
    );

    const payload =
      request.inputPayload as Record<
        string,
        unknown
      >;

    const context = await withTransaction(
      async (tx) =>
        buildStoryContext(tx, {
          worldId: String(payload.worldId),
          childProfileId: String(
            payload.childProfileId,
          ),
          participantCharacterIds:
            payload.participantCharacterIds as string[],
          selectedItemInstanceId:
            payload.selectedItemInstanceId
              ? String(
                  payload.selectedItemInstanceId,
                )
              : undefined,
        }),
    );

    const prompt = renderStoryPrompt({
      context,
      storyType: payload.storyType as
        | "static"
        | "interactive",
      titlePrompt: payload.titlePrompt
        ? String(payload.titlePrompt)
        : undefined,
      themePrompt: payload.themePrompt
        ? String(payload.themePrompt)
        : undefined,
    });

    const fallbackService =
      new ModelFallbackService(this.registry);

    const generation =
      await fallbackService.execute<GeneratedStory>(
        this.fallbackPlan,
        {
          systemPrompt:
            "You generate structured, child-safe LUMI stories.",
          userPrompt: prompt,
          temperature: 0.75,
          maxOutputTokens: 12_000,
          responseSchema:
            generatedStorySchema.toJSONSchema?.() ??
            {},
        },
      );

    const parsed = generatedStorySchema.parse(
      generation.result.output,
    );

    const graphValidation =
      validateStoryGraph(parsed);

    if (!graphValidation.valid) {
      throw new Error(
        `Generated story graph invalid: ${graphValidation.errors.join("; ")}`,
      );
    }

    const safety =
      await reviewStorySafety(parsed);

    const persistenceResult =
      await withTransaction(async (tx) => {
        const [model] = await tx
          .select()
          .from(aiModels)
          .where(
            eq(
              aiModels.code,
              generation.result.model,
            ),
          )
          .limit(1);

        if (!model) {
          throw new Error(
            "Generated model not found in registry",
          );
        }

        const [attempt] = await tx
          .insert(generationAttempts)
          .values({
            generationRequestId,
            modelId: model.id,
            attemptNumber:
              generation.attemptNumber,
            status: "completed",
            providerRequestId:
              generation.result.providerRequestId,
            latencyMs:
              generation.result.latencyMs,
            completedAt: new Date(),
          })
          .returning();

        if (!attempt) {
          throw new Error(
            "Generation attempt persistence failed",
          );
        }

        await tx.insert(safetyReviews).values({
          generationRequestId,
          reviewType: "automated",
          decision: safety.decision,
          reasons: {
            reasons: safety.reasons,
          },
        });

        if (safety.decision === "block") {
          throw new Error(
            "Generated story failed safety review",
          );
        }

        const persisted =
          await persistGeneratedStory(tx, {
            worldId: String(payload.worldId),
            childProfileId: String(
              payload.childProfileId,
            ),
            generationRequestId,
            storyType: payload.storyType as
              | "static"
              | "interactive",
            story:
              safety.revisedStory ?? parsed,
          });

        const auditRepository =
          new DrizzleAuditRepository(tx);
        const outboxRepository =
          new DrizzleOutboxRepository(tx);

        await auditRepository.append({
          actorType: "system",
          action:
            "story.generation.persisted",
          entityType: "story",
          entityId: persisted.storyId,
          afterState: {
            storyVersionId:
              persisted.storyVersionId,
            generationRequestId,
          },
        });

        await outboxRepository.enqueue({
          aggregateType: "story",
          aggregateId: persisted.storyId,
          eventType:
            "story.generation.completed",
          payload: {
            storyId: persisted.storyId,
            storyVersionId:
              persisted.storyVersionId,
            generationRequestId,
          },
        });

        return {
          ...persisted,
          attemptId: attempt.id,
        };
      });

    await recordGenerationCompletion({
      generationAttemptId:
        persistenceResult.attemptId,
      generationRequestId,
      subjectId:
        persistenceResult.storyId,
      outputPayload: {
        storyId: persistenceResult.storyId,
        storyVersionId:
          persistenceResult.storyVersionId,
      },
      inputTokens:
        generation.result.usage.inputTokens,
      outputTokens:
        generation.result.usage.outputTokens,
      latencyMs:
        generation.result.latencyMs,
      costAmount: "0",
      costCurrency: "TRY",
    });

    return {
      storyId: persistenceResult.storyId,
      storyVersionId:
        persistenceResult.storyVersionId,
    };
  }
}
