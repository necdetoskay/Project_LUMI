import { and, desc, eq, isNotNull } from "drizzle-orm";

import type { QueryExecutor } from "../../../db/client";
import {
  characterOriginPackages,
  type CharacterOriginPackageRecord,
  type NewCharacterOriginPackageRecord,
} from "../../../db/schema/profile";
import type { CharacterOriginPackageRepository } from "../interfaces/character-origin-package.repository";

export class DrizzleCharacterOriginPackageRepository
  implements CharacterOriginPackageRepository
{
  constructor(private readonly db: QueryExecutor) {}

  async findById(
    id: string,
    householdId: string,
  ): Promise<CharacterOriginPackageRecord | null> {
    const [record] = await this.db
      .select()
      .from(characterOriginPackages)
      .where(
        and(
          eq(characterOriginPackages.id, id),
          eq(characterOriginPackages.householdId, householdId),
        ),
      )
      .limit(1);
    return (record as CharacterOriginPackageRecord) ?? null;
  }

  async listByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<CharacterOriginPackageRecord[]> {
    const rows = await this.db
      .select()
      .from(characterOriginPackages)
      .where(
        and(
          eq(characterOriginPackages.childProfileId, childProfileId),
          eq(characterOriginPackages.householdId, householdId),
        ),
      )
      .orderBy(characterOriginPackages.createdAt);
    return rows as CharacterOriginPackageRecord[];
  }

  async findLatestLlmBatch(
    childProfileId: string,
    householdId: string,
  ): Promise<CharacterOriginPackageRecord[]> {
    const latest = await this.db
      .select({ batchId: characterOriginPackages.generationBatchId })
      .from(characterOriginPackages)
      .where(
        and(
          eq(characterOriginPackages.childProfileId, childProfileId),
          eq(characterOriginPackages.householdId, householdId),
          eq(characterOriginPackages.generationSource, "llm"),
          isNotNull(characterOriginPackages.generationBatchId),
        ),
      )
      .orderBy(desc(characterOriginPackages.createdAt))
      .limit(1);

    const batchId = latest[0]?.batchId;
    if (!batchId) return [];

    const rows = await this.db
      .select()
      .from(characterOriginPackages)
      .where(
        and(
          eq(characterOriginPackages.childProfileId, childProfileId),
          eq(characterOriginPackages.householdId, householdId),
          eq(characterOriginPackages.generationBatchId, batchId),
        ),
      )
      .orderBy(characterOriginPackages.createdAt);
    return rows as CharacterOriginPackageRecord[];
  }

  async findAcceptedByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<CharacterOriginPackageRecord | null> {
    const [record] = await this.db
      .select()
      .from(characterOriginPackages)
      .where(
        and(
          eq(characterOriginPackages.childProfileId, childProfileId),
          eq(characterOriginPackages.householdId, householdId),
          eq(characterOriginPackages.accepted, true),
        ),
      )
      .limit(1);
    return (record as CharacterOriginPackageRecord) ?? null;
  }

  async create(
    input: NewCharacterOriginPackageRecord,
  ): Promise<CharacterOriginPackageRecord> {
    const [record] = await this.db
      .insert(characterOriginPackages)
      .values(input)
      .returning();
    if (!record) {
      throw new Error("Origin package creation returned no record");
    }
    return record as CharacterOriginPackageRecord;
  }

  async markAccepted(
    id: string,
    householdId: string,
    childProfileId: string,
  ): Promise<CharacterOriginPackageRecord> {
    await this.db
      .update(characterOriginPackages)
      .set({ accepted: false, updatedAt: new Date() })
      .where(
        and(
          eq(characterOriginPackages.childProfileId, childProfileId),
          eq(characterOriginPackages.householdId, householdId),
          eq(characterOriginPackages.accepted, true),
        ),
      );

    await this.db
      .update(characterOriginPackages)
      .set({ accepted: true, updatedAt: new Date() })
      .where(
        and(
          eq(characterOriginPackages.id, id),
          eq(characterOriginPackages.householdId, householdId),
          eq(characterOriginPackages.childProfileId, childProfileId),
        ),
      );

    const refreshed = await this.findById(id, householdId);
    if (!refreshed) {
      throw new Error("Origin package not found after accept");
    }
    return refreshed;
  }
}
