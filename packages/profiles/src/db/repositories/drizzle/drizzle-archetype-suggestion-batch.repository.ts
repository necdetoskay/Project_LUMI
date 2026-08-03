import { and, eq, lt } from "drizzle-orm";

import type { QueryExecutor } from "../../../db/client";
import {
  archetypeSuggestionBatches,
  type ArchetypeSuggestionBatchRecord,
  type NewArchetypeSuggestionBatchRecord,
  type PersistedArchetypeSuggestion,
} from "../../../db/schema/profile";
import type { ArchetypeSuggestionBatchRepository } from "../interfaces/archetype-suggestion-batch.repository";

export class DrizzleArchetypeSuggestionBatchRepository
  implements ArchetypeSuggestionBatchRepository
{
  constructor(private readonly db: QueryExecutor) {}

  async create(
    input: NewArchetypeSuggestionBatchRecord,
  ): Promise<ArchetypeSuggestionBatchRecord> {
    const [record] = await this.db
      .insert(archetypeSuggestionBatches)
      .values(input)
      .returning();
    if (!record) {
      throw new Error("Archetype suggestion batch creation returned no record");
    }
    return record as ArchetypeSuggestionBatchRecord;
  }

  async findById(
    id: string,
    householdId: string,
  ): Promise<ArchetypeSuggestionBatchRecord | null> {
    const [record] = await this.db
      .select()
      .from(archetypeSuggestionBatches)
      .where(
        and(
          eq(archetypeSuggestionBatches.id, id),
          eq(archetypeSuggestionBatches.householdId, householdId),
        ),
      )
      .limit(1);
    return (record as ArchetypeSuggestionBatchRecord) ?? null;
  }

  async findArchetypeInBatch(
    batchId: string,
    householdId: string,
    archetypeId: string,
  ): Promise<PersistedArchetypeSuggestion | null> {
    const batch = await this.findById(batchId, householdId);
    if (!batch) return null;
    const found = batch.archetypes.find((a) => a.id === archetypeId);
    return found ?? null;
  }

  async deleteExpired(now: Date): Promise<number> {
    const result = await this.db
      .delete(archetypeSuggestionBatches)
      .where(lt(archetypeSuggestionBatches.expiresAt, now))
      .returning({ id: archetypeSuggestionBatches.id });
    return result.length;
  }
}
