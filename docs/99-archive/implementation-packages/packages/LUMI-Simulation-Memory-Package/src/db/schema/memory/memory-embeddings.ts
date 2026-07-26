import { integer, jsonb, primaryKey, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { memorySchema } from "../schemas";
import { memories } from "./memories";

export const memoryEmbeddings = memorySchema.table(
  "memory_embeddings",
  {
    memoryId: uuid("memory_id").notNull().references(() => memories.id, { onDelete: "cascade" }),
    modelCode: varchar("model_code", { length: 160 }).notNull(),
    dimensions: integer("dimensions").notNull(),
    vectorData: jsonb("vector_data").$type<number[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.memoryId, table.modelCode], name: "memory_embeddings_pk" }),
  ],
);
