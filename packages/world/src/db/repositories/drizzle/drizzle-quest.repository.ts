import { eq } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import type { QuestRepository } from "../interfaces/quest.repository";
import type {
  NewQuestRecord,
  NewQuestObjectiveRecord,
} from "../../schema/world";
import { quests, questObjectives } from "../../schema/world";

export class DrizzleQuestRepository implements QuestRepository {
  async createQuest(
    tx: { insert: QueryExecutor["insert"] },
    data: NewQuestRecord,
  ) {
    const [row] = await tx.insert(quests).values(data).returning();
    return row!;
  }

  async findQuestById(
    tx: { select: QueryExecutor["select"] },
    id: string,
  ) {
    const [row] = await tx
      .select()
      .from(quests)
      .where(eq(quests.id, id))
      .limit(1);
    return row;
  }

  async findQuestsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ) {
    return tx
      .select()
      .from(quests)
      .where(eq(quests.worldId, worldId))
      .orderBy(quests.createdAt);
  }

  async findQuestsBySessionId(
    tx: { select: QueryExecutor["select"] },
    storySessionId: string,
  ) {
    return tx
      .select()
      .from(quests)
      .where(eq(quests.storySessionId, storySessionId))
      .orderBy(quests.createdAt);
  }

  async updateQuest(
    tx: { update: QueryExecutor["update"] },
    id: string,
    data: Partial<NewQuestRecord>,
  ) {
    const [row] = await tx
      .update(quests)
      .set(data)
      .where(eq(quests.id, id))
      .returning();
    return row;
  }

  async insertObjective(
    tx: { insert: QueryExecutor["insert"] },
    data: NewQuestObjectiveRecord,
  ) {
    const [row] = await tx.insert(questObjectives).values(data).returning();
    return row!;
  }

  async updateObjective(
    tx: { update: QueryExecutor["update"] },
    id: string,
    data: Partial<NewQuestObjectiveRecord>,
  ) {
    const [row] = await tx
      .update(questObjectives)
      .set(data)
      .where(eq(questObjectives.id, id))
      .returning();
    return row;
  }

  async findObjectivesByQuestId(
    tx: { select: QueryExecutor["select"] },
    questId: string,
  ) {
    return tx
      .select()
      .from(questObjectives)
      .where(eq(questObjectives.questId, questId))
      .orderBy(questObjectives.objectiveIndex);
  }
}