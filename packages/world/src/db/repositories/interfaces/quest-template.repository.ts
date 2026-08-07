import type {
  QuestTemplateRecord,
  NewQuestTemplateRecord,
  QuestTemplateObjectiveRecord,
  NewQuestTemplateObjectiveRecord,
} from "../../schema/world";
import type { QueryExecutor } from "../../client";

export interface QuestTemplateRepository {
  createTemplate(
    tx: { insert: QueryExecutor["insert"] },
    data: NewQuestTemplateRecord,
  ): Promise<QuestTemplateRecord>;

  findTemplateById(
    tx: { select: QueryExecutor["select"] },
    id: string,
  ): Promise<QuestTemplateRecord | undefined>;

  findTemplateByKey(
    tx: { select: QueryExecutor["select"] },
    templateKey: string,
  ): Promise<QuestTemplateRecord | undefined>;

  listTemplates(tx: {
    select: QueryExecutor["select"];
  }): Promise<QuestTemplateRecord[]>;

  insertTemplateObjective(
    tx: { insert: QueryExecutor["insert"] },
    data: NewQuestTemplateObjectiveRecord,
  ): Promise<QuestTemplateObjectiveRecord>;

  findTemplateObjectives(
    tx: { select: QueryExecutor["select"] },
    templateId: string,
  ): Promise<QuestTemplateObjectiveRecord[]>;
}
