import { DrizzleAuditRepository } from "../../db/repositories/audit/drizzle-audit.repository";
import { DrizzleGenerationRepository } from "../../db/repositories/ai/drizzle-generation.repository";
import { DrizzleOutboxRepository } from "../../db/repositories/system/drizzle-outbox.repository";
import { costRecords, tokenUsage } from "../../db/schema/ai";
import { withTransaction } from "../../db/transaction";

export async function recordGenerationCompletion(input: {
  generationAttemptId: string;
  generationRequestId: string;
  subjectId: string;
  outputPayload: Record<string, unknown>;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  costAmount?: string;
  costCurrency?: string;
}) {
  return withTransaction(async (tx) => {
    const generationRepository = new DrizzleGenerationRepository(tx);
    const auditRepository = new DrizzleAuditRepository(tx);
    const outboxRepository = new DrizzleOutboxRepository(tx);

    await generationRepository.completeAttempt({
      generationAttemptId: input.generationAttemptId,
      generationRequestId: input.generationRequestId,
      outputPayload: input.outputPayload,
      latencyMs: input.latencyMs,
    });

    await tx.insert(tokenUsage).values({
      generationAttemptId: input.generationAttemptId,
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
    });

    if (input.costAmount && input.costCurrency) {
      await tx.insert(costRecords).values({
        generationAttemptId: input.generationAttemptId,
        costType: "provider",
        amount: input.costAmount,
        currency: input.costCurrency,
      });
    }

    await auditRepository.append({
      actorType: "system",
      action: "ai.generation.completed",
      entityType: "generation_request",
      entityId: input.generationRequestId,
      afterState: input.outputPayload,
    });

    await outboxRepository.enqueue({
      aggregateType: "generation_request",
      aggregateId: input.generationRequestId,
      eventType: "ai.generation.completed",
      payload: {
        generationRequestId: input.generationRequestId,
        subjectId: input.subjectId,
      },
    });
  });
}
