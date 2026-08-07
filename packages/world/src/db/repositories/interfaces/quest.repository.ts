import type {
  QuestRecord,
  NewQuestRecord,
  QuestObjectiveRecord,
  NewQuestObjectiveRecord,
} from "../../schema/world";
import type { QueryExecutor } from "../../client";

export interface QuestRepository {
  createQuest(
    tx: { insert: QueryExecutor["insert"] },
    data: NewQuestRecord,
  ): Promise<QuestRecord>;

  findQuestById(
    tx: { select: QueryExecutor["select"] },
    id: string,
  ): Promise<QuestRecord | undefined>;

  findQuestsByWorldId(
    tx: { select: QueryExecutor["select"] },
    worldId: string,
  ): Promise<QuestRecord[]>;

  findQuestsBySessionId(
    tx: { select: QueryExecutor["select"] },
    storySessionId: string,
  ): Promise<QuestRecord[]>;

  updateQuest(
    tx: { update: QueryExecutor["update"] },
    id: string,
    data: Partial<NewQuestRecord>,
  ): Promise<QuestRecord | undefined>;

  insertObjective(
    tx: { insert: QueryExecutor["insert"] },
    data: NewQuestObjectiveRecord,
  ): Promise<QuestObjectiveRecord>;

  updateObjective(
    tx: { update: QueryExecutor["update"] },
    id: string,
    data: Partial<NewQuestObjectiveRecord>,
  ): Promise<QuestObjectiveRecord | undefined>;

  findObjectivesByQuestId(
    tx: { select: QueryExecutor["select"] },
    questId: string,
  ): Promise<QuestObjectiveRecord[]>;
}
