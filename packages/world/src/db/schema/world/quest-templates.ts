import {
  index,
  integer,
  jsonb,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "./common";
import { profileSchema } from "./schemas";

export const questTemplates = profileSchema.table(
  "quest_templates",
  {
    id: primaryId(),
    templateKey: varchar("template_key", { length: 120 }).notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    reward: jsonb("reward"),
    version: integer("version").notNull().default(1),
    ...timestampColumns,
  },
  (table) => [uniqueIndex("uq_quest_template_key").on(table.templateKey)],
);

export type QuestTemplateRecord = typeof questTemplates.$inferSelect;
export type NewQuestTemplateRecord = typeof questTemplates.$inferInsert;

export const questTemplateObjectives = profileSchema.table(
  "quest_template_objectives",
  {
    id: primaryId(),
    templateId: uuid("template_id").notNull(),
    objectiveIndex: integer("objective_index").notNull(),
    objectiveKey: varchar("objective_key", { length: 120 }).notNull(),
    title: text("title").notNull(),
  },
  (table) => [
    uniqueIndex("uq_quest_template_objective").on(
      table.templateId,
      table.objectiveIndex,
    ),
    index("quest_template_objective_template_idx").on(table.templateId),
  ],
);

export type QuestTemplateObjectiveRecord =
  typeof questTemplateObjectives.$inferSelect;
export type NewQuestTemplateObjectiveRecord =
  typeof questTemplateObjectives.$inferInsert;
