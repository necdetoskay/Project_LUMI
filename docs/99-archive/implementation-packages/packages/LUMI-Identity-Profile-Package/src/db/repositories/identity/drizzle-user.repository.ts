import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../transaction";
import {
  users,
  type NewUserRecord,
  type UserRecord,
} from "../../schema/identity";
import type { UserRepository } from "./user.repository";

export class DrizzleUserRepository implements UserRepository {
  constructor(
    private readonly executor: QueryExecutor,
  ) {}

  async findById(id: string): Promise<UserRecord | null> {
    const [record] = await this.executor
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    return record ?? null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const [record] = await this.executor
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    return record ?? null;
  }

  async create(input: NewUserRecord): Promise<UserRecord> {
    const [record] = await this.executor
      .insert(users)
      .values(input)
      .returning();

    if (!record) {
      throw new Error("User creation returned no record");
    }

    return record;
  }

  async deactivate(id: string): Promise<void> {
    await this.executor
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }
}
