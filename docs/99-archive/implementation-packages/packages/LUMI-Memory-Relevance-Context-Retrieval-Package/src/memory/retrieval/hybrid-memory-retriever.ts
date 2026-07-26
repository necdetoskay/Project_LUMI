import { and, desc, eq, inArray } from "drizzle-orm";
import {
  memories,
  memoryEmbeddings,
  memorySubjects,
} from "../../db/schema";
import type { QueryExecutor } from "../../db/transaction";
import type { EmbeddingProvider } from "../embedding/embedding-provider.types";
import { cosineSimilarity } from "../embedding/cosine-similarity";
import { calculateMemoryRelevance } from "../scoring/memory-relevance";
import { calculateRecencyScore } from "../scoring/recency-decay";
import type {
  MemoryRetrievalQuery,
  RetrievedMemory,
} from "../types";
import { budgetMemories } from "./context-budgeter";

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export async function retrieveRelevantMemories(
  tx: QueryExecutor,
  input: {
    query: MemoryRetrievalQuery;
    now: Date;
    embeddingProvider?: EmbeddingProvider;
    embeddingModel?: string;
  },
): Promise<RetrievedMemory[]> {
  const conditions = [
    eq(memories.worldId, input.query.worldId),
  ];

  if (input.query.memoryTypes?.length) {
    conditions.push(
      inArray(
        memories.memoryType,
        input.query.memoryTypes,
      ),
    );
  }

  const rows = await tx
    .select({
      memory: memories,
      embedding: memoryEmbeddings.embedding,
    })
    .from(memories)
    .leftJoin(
      memoryEmbeddings,
      eq(memoryEmbeddings.memoryId, memories.id),
    )
    .where(and(...conditions))
    .orderBy(desc(memories.occurredAt))
    .limit(Math.max(100, input.query.maxResults * 5));

  let queryVector: number[] = [];

  if (
    input.query.queryText &&
    input.embeddingProvider &&
    input.embeddingModel
  ) {
    const embedding =
      await input.embeddingProvider.embed({
        model: input.embeddingModel,
        texts: [input.query.queryText],
      });

    queryVector = embedding.vectors[0] ?? [];
  }

  const subjectRows =
    input.query.subjectIds?.length
      ? await tx
          .select()
          .from(memorySubjects)
          .where(
            inArray(
              memorySubjects.subjectId,
              input.query.subjectIds,
            ),
          )
      : [];

  const subjectByMemory =
    new Map<string, number>();

  for (const row of subjectRows) {
    const current =
      subjectByMemory.get(row.memoryId) ?? 0;

    subjectByMemory.set(
      row.memoryId,
      Math.max(
        current,
        Number(row.relevanceWeight),
      ),
    );
  }

  const ranked = rows.map(
    ({ memory, embedding }) => {
      const semanticScore =
        queryVector.length &&
        Array.isArray(embedding)
          ? Math.max(
              0,
              cosineSimilarity(
                queryVector,
                embedding as number[],
              ),
            )
          : input.query.queryText
            ? memory.summary
                .toLocaleLowerCase("tr-TR")
                .includes(
                  input.query.queryText.toLocaleLowerCase(
                    "tr-TR",
                  ),
                )
              ? 0.8
              : 0.2
            : 0.5;

      const subjectScore =
        subjectByMemory.get(memory.id) ?? 0;

      const recencyScore =
        calculateRecencyScore({
          occurredAt: memory.occurredAt,
          now: input.now,
          halfLifeDays: 30,
          minimumScore: 0.05,
        });

      const finalScore =
        calculateMemoryRelevance({
          semanticScore,
          subjectScore,
          recencyScore,
          importance: Number(memory.importance),
          emotionalSalience: Number(
            memory.emotionalSalience,
          ),
          consequenceWeight: Number(
            memory.consequenceWeight,
          ),
        });

      return {
        memoryId: memory.id,
        summary: memory.summary,
        memoryType: memory.memoryType,
        occurredAt: memory.occurredAt,
        importance: Number(memory.importance),
        emotionalSalience: Number(
          memory.emotionalSalience,
        ),
        consequenceWeight: Number(
          memory.consequenceWeight,
        ),
        semanticScore,
        subjectScore,
        recencyScore,
        finalScore,
        estimatedTokens:
          estimateTokens(memory.summary),
      };
    },
  );

  return budgetMemories(
    ranked
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, input.query.maxResults),
    input.query.tokenBudget,
  );
}
