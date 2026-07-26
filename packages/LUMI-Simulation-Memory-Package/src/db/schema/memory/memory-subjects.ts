import { index, primaryKey, real, uuid, varchar } from "drizzle-orm/pg-core";
import { memorySchema } from "../schemas";
import { memories } from "./memories";

export const memorySubjects = memorySchema.table(
  "memory_subjects",
  {
    memoryId: uuid("memory_id").notNull().references(() => memories.id, { onDelete: "cascade" }),
    subjectType: varchar("subject_type", { length: 80 }).notNull(),
    subjectId: uuid("subject_id").notNull(),
    relevanceWeight: real("relevance_weight").notNull().default(0.5),
  },
  (table) => [
    primaryKey({ columns: [table.memoryId, table.subjectType, table.subjectId], name: "memory_subjects_pk" }),
    index("memory_subjects_subject_idx").on(table.subjectType, table.subjectId),
  ],
);
