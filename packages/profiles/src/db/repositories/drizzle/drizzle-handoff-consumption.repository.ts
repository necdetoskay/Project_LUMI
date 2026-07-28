import { and, eq } from "drizzle-orm";

import type { QueryExecutor } from "../../../db/client";
import {
  firstRunHandoffConsumptions,
  type FirstRunHandoffConsumptionRecord,
  type NewFirstRunHandoffConsumptionRecord,
} from "../../../db/schema/profile";
import type { HandoffConsumptionRepository } from "../interfaces/handoff-consumption.repository";

export class DrizzleHandoffConsumptionRepository
  implements HandoffConsumptionRepository
{
  constructor(private readonly db: QueryExecutor) {}

  async findByHandoffId(
    handoffId: string,
    householdId: string,
  ): Promise<FirstRunHandoffConsumptionRecord | null> {
    const [record] = await this.db
      .select()
      .from(firstRunHandoffConsumptions)
      .where(
        and(
          eq(firstRunHandoffConsumptions.handoffId, handoffId),
          eq(firstRunHandoffConsumptions.householdId, householdId),
        ),
      )
      .limit(1);
    return (record as FirstRunHandoffConsumptionRecord) ?? null;
  }

  async findByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<FirstRunHandoffConsumptionRecord[]> {
    const rows = await this.db
      .select()
      .from(firstRunHandoffConsumptions)
      .where(
        and(
          eq(firstRunHandoffConsumptions.childProfileId, childProfileId),
          eq(firstRunHandoffConsumptions.householdId, householdId),
        ),
      )
      .orderBy(firstRunHandoffConsumptions.createdAt);
    return rows as FirstRunHandoffConsumptionRecord[];
  }

  async create(
    input: NewFirstRunHandoffConsumptionRecord,
  ): Promise<FirstRunHandoffConsumptionRecord> {
    const [record] = await this.db
      .insert(firstRunHandoffConsumptions)
      .values(input)
      .returning();
    if (!record) {
      throw new Error("Handoff consumption creation returned no record");
    }
    return record as FirstRunHandoffConsumptionRecord;
  }
}
