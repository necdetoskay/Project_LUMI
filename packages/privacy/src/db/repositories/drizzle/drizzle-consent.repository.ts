import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import {
  consentRecords,
  type ConsentRecord,
  type NewConsentRecord,
} from "../../schema/privacy";
import type { ConsentRepository } from "../interfaces/consent.repository";

export class DrizzleConsentRepository implements ConsentRepository {
  constructor(private readonly db: QueryExecutor) {}

  async findByHousehold(
    householdId: string,
    consentType?: string,
  ): Promise<ConsentRecord[]> {
    const conditions = [eq(consentRecords.householdId, householdId)];
    if (consentType)
      conditions.push(eq(consentRecords.consentType, consentType));
    return this.db
      .select()
      .from(consentRecords)
      .where(and(...conditions))
      .orderBy(consentRecords.createdAt);
  }

  async findByChildProfile(
    childProfileId: string,
    consentType?: string,
  ): Promise<ConsentRecord[]> {
    const conditions = [eq(consentRecords.childProfileId, childProfileId)];
    if (consentType)
      conditions.push(eq(consentRecords.consentType, consentType));
    return this.db
      .select()
      .from(consentRecords)
      .where(and(...conditions))
      .orderBy(consentRecords.createdAt);
  }

  async findById(consentId: string): Promise<ConsentRecord | null> {
    const [record] = await this.db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.id, consentId))
      .limit(1);
    return record ?? null;
  }

  async create(input: NewConsentRecord): Promise<ConsentRecord> {
    const [record] = await this.db
      .insert(consentRecords)
      .values(input)
      .returning();
    if (!record) {
      throw new Error("Consent record creation returned no record");
    }
    return record;
  }

  async updateStatus(
    consentId: string,
    status: "granted" | "revoked",
    revokedAt: Date | null,
  ): Promise<ConsentRecord | null> {
    const [record] = await this.db
      .update(consentRecords)
      .set({
        status,
        revokedAt,
        updatedAt: new Date(),
      })
      .where(
        and(eq(consentRecords.id, consentId), isNull(consentRecords.revokedAt)),
      )
      .returning();
    return record ?? null;
  }
}
