import { eq } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import type { QuestTemplateRepository } from "../interfaces/quest-template.repository";
import type {
  NewQuestTemplateRecord,
  NewQuestTemplateObjectiveRecord,
} from "../../schema/world";
import { questTemplates, questTemplateObjectives } from "../../schema/world";

export class DrizzleQuestTemplateRepository implements QuestTemplateRepository {
  async createTemplate(
    tx: { insert: QueryExecutor["insert"] },
    data: NewQuestTemplateRecord,
  ) {
    const [row] = await tx.insert(questTemplates).values(data).returning();
    return row!;
  }

  async findTemplateById(tx: { select: QueryExecutor["select"] }, id: string) {
    const [row] = await tx
      .select()
      .from(questTemplates)
      .where(eq(questTemplates.id, id))
      .limit(1);
    return row;
  }

  async findTemplateByKey(
    tx: { select: QueryExecutor["select"] },
    templateKey: string,
  ) {
    const [row] = await tx
      .select()
      .from(questTemplates)
      .where(eq(questTemplates.templateKey, templateKey))
      .limit(1);
    return row;
  }

  async listTemplates(tx: { select: QueryExecutor["select"] }) {
    return tx.select().from(questTemplates).orderBy(questTemplates.createdAt);
  }

  async insertTemplateObjective(
    tx: { insert: QueryExecutor["insert"] },
    data: NewQuestTemplateObjectiveRecord,
  ) {
    const [row] = await tx
      .insert(questTemplateObjectives)
      .values(data)
      .returning();
    return row!;
  }

  async findTemplateObjectives(
    tx: { select: QueryExecutor["select"] },
    templateId: string,
  ) {
    return tx
      .select()
      .from(questTemplateObjectives)
      .where(eq(questTemplateObjectives.templateId, templateId))
      .orderBy(questTemplateObjectives.objectiveIndex);
  }
}
