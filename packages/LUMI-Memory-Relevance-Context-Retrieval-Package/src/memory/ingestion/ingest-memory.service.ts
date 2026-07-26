import { and, eq } from "drizzle-orm";
import {
  memories,
  memoryEmbeddings,
  memorySubjects,
} from "../../db/schema";
import type { QueryExecutor } from "../../db/transaction";
import type { EmbeddingProvider } from "../embedding/embedding-provider.types";
import {
  createMemoryFingerprint,
} from "../deduplication/memory-fingerprint";
import {
  sanitizeMemoryCandidate,
} from "../privacy/memory-privacy-filter";
import type { MemoryCandidate } from "../types";

export async function ingestMemory(
  tx: QueryExecutor,
  input: {
    candidate: MemoryCandidate;
    embeddingProvider?: EmbeddingProvider;
    embeddingModel?: string;
  },
) {
  const candidate = sanitizeMemoryCandidate(
    input.candidate,
  );

  const fingerprint =
    createMemoryFingerprint({
      worldId: candidate.worldId,
      memoryType: candidate.memoryType,
      summary: candidate.summary,
      sourceEntityType:
        candidate.sourceEntityType,
      sourceEntityId:
        candidate.sourceEntityId,
    });

  const [existing] = await tx
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.worldId, candidate.worldId),
        eq(memories.fingerprint, fingerprint),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      memory: existing,
      duplicate: true,
    };
  }

  const [memory] = await tx
    .insert(memories)
    .values({
      worldId: candidate.worldId,
      memoryType: candidate.memoryType,
      summary: candidate.summary,
      occurredAt: candidate.occurredAt,
      sourceEntityType:
        candidate.sourceEntityType,
      sourceEntityId:
        candidate.sourceEntityId,
      importance: candidate.importance ?? 0.5,
      emotionalSalience:
        candidate.emotionalSalience ?? 0,
      consequenceWeight:
        candidate.consequenceWeight ?? 0,
      privacyLevel:
        candidate.privacyLevel ?? "household",
      fingerprint,
      metadata: candidate.metadata ?? {},
    })
    .returning();

  if (!memory) {
    throw new Error("Memory could not be created");
  }

  for (const subject of candidate.subjects) {
    await tx.insert(memorySubjects).values({
      memoryId: memory.id,
      subjectType: subject.subjectType,
      subjectId: subject.subjectId,
      relevanceWeight:
        subject.relevanceWeight,
    });
  }

  if (
    input.embeddingProvider &&
    input.embeddingModel
  ) {
    const embedding =
      await input.embeddingProvider.embed({
        model: input.embeddingModel,
        texts: [candidate.summary],
      });

    const vector = embedding.vectors[0];

    if (vector?.length) {
      await tx
        .insert(memoryEmbeddings)
        .values({
          memoryId: memory.id,
          providerCode:
            input.embeddingProvider.providerCode,
          modelCode:
            embedding.model,
          dimensions:
            embedding.dimensions,
          embedding: vector,
        });
    }
  }

  return {
    memory,
    duplicate: false,
  };
}
