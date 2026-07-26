import { and, eq } from "drizzle-orm";
import { withTransaction } from "../../db/transaction";
import {
  sessionDecisions,
  storyChoices,
  storySessions,
} from "../../db/schema";
import { DrizzleAuditRepository } from "../../db/repositories/audit/drizzle-audit.repository";
import { DrizzleOutboxRepository } from "../../db/repositories/system/drizzle-outbox.repository";

export async function recordStoryDecisionService(input: {
  userId: string;
  sessionId: string;
  nodeId: string;
  choiceId: string;
  decisionSequence: number;
}) {
  return withTransaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(storySessions)
      .where(eq(storySessions.id, input.sessionId))
      .limit(1);

    if (!session || session.status !== "active") {
      throw new Error("Story session is not active");
    }

    const [choice] = await tx
      .select()
      .from(storyChoices)
      .where(and(
        eq(storyChoices.id, input.choiceId),
        eq(storyChoices.storyNodeId, input.nodeId),
      ))
      .limit(1);

    if (!choice) {
      throw new Error("Choice does not belong to node");
    }

    const [decision] = await tx
      .insert(sessionDecisions)
      .values({
        storySessionId: input.sessionId,
        storyNodeId: input.nodeId,
        storyChoiceId: input.choiceId,
        decisionSequence: input.decisionSequence,
        decidedAt: new Date(),
      })
      .returning();

    const auditRepository =
      new DrizzleAuditRepository(tx);
    const outboxRepository =
      new DrizzleOutboxRepository(tx);

    await auditRepository.append({
      actorType: "user",
      actorId: input.userId,
      action: "story.decision.recorded",
      entityType: "story_session",
      entityId: input.sessionId,
      afterState: {
        nodeId: input.nodeId,
        choiceId: input.choiceId,
        decisionSequence: input.decisionSequence,
      },
    });

    await outboxRepository.enqueue({
      aggregateType: "story_session",
      aggregateId: input.sessionId,
      eventType: "story.decision.recorded",
      payload: {
        sessionId: input.sessionId,
        nodeId: input.nodeId,
        choiceId: input.choiceId,
      },
    });

    return decision;
  });
}
