import type {
  ArchetypeSuggestionBatchRecord,
  NewArchetypeSuggestionBatchRecord,
  PersistedArchetypeSuggestion,
} from "../../../db/schema/profile/archetype-suggestion-batches";

export interface ArchetypeSuggestionBatchRepository {
  create(
    input: NewArchetypeSuggestionBatchRecord,
  ): Promise<ArchetypeSuggestionBatchRecord>;

  findById(
    id: string,
    householdId: string,
  ): Promise<ArchetypeSuggestionBatchRecord | null>;

  findArchetypeInBatch(
    batchId: string,
    householdId: string,
    archetypeId: string,
  ): Promise<PersistedArchetypeSuggestion | null>;

  deleteExpired(now: Date): Promise<number>;
}
